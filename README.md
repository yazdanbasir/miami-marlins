# Miami Marlins Data Pipeline

## Step 1 — Load affiliates into database
Wrote `loadAffiliates.py` to read `affiliates.json` and insert all 11 affiliate teams into `marlins.db` (SQLite), table `affiliates`. Script is idempotent and validates required fields before inserting.

- FOR LATER: adding some sort of logic that updates the list with time (maybe scheduled runs like once a month etc)

## Step 2 — Validate database entries
Confirmed all 11 rows and 28 columns loaded correctly. NULLs are expected and legitimate:

| Column | NULLs | Reason |
|---|---|---|
| `springLeagueId` / `springVenueId` | 10 | Only the MLB team has a spring league/venue |
| `divisionId` / `divisionName` | 3 | Marlins Prospects, Alternate Training Site, and Marlins Organization don't belong to a division |
| `franchiseName` / `clubName` | 1 | Marlins Alternate Training Site is a logistical roster entry, not a real franchise |
| `leagueId` | 1 | Marlins Organization has no numeric league ID in the source data |
| `parentOrgId` / `parentOrgName` | 1 | Miami Marlins is the parent org itself, so it has no parent |

## Step 3 — Fetch schedule data (exploratory)
Wrote `fetchSchedule.py` to call the MLB Stats API schedule endpoint and print the response. Takes `--sportId`, `--teamId`, and an optional `--date` (YYYY-MM-DD).

Payload returns:
- **Game identity** — `gamePk`, `gameGuid`, `gameType`, `season`, `gameDate`, `officialDate`
- **Status** — `abstractGameState`, `detailedState` (e.g. Final, In Progress)
- **Teams** — home/away team ID, name, score, win/loss record, winner flag
- **Venue** — venue ID and name
- **Series info** — `gamesInSeries`, `seriesGameNumber`, `seriesDescription`
- **Game metadata** — `dayNight`, `doubleHeader`, `scheduledInnings`, `isTie`
- **Content link** — link to game content/media

## Step 4 — Validate combined vs individual API calls
Confirmed that passing all affiliate IDs in a single call returns the exact same results as making separate calls per team and merging. One call is equivalent to N individual calls unioned together.

## Step 5 — Build the /schedule wrapper service

**The problem:** The MLB API returns games grouped by date. Our wrapper needs to return data grouped by team — one entry per affiliate, regardless of whether they played. Two different shapes of the same data.

**The solution:** Invert the structure using a hash set.
- Load all 11 affiliate IDs from the DB into a set (O(1) lookup)
- Iterate every game in the MLB response and check if home or away team ID is in that set
- If yes, store that game keyed by the affiliate's team ID
- Then iterate all 11 affiliates — if they have an entry in the map, build their game object(s) as a list; if not, return `[]`

This is a classic hash map inversion: one pass through the data O(n), constant-time lookups O(1), giving O(n) overall. A list-based lookup would work too given k=11 is fixed, but the set is the correct instinct and scales cleanly if the affiliate list ever grows.

## Step 6 — Comprehensive endpoint testing
Full details in `TESTS.md`. 19 passed, 1 pending (live game).

- **Response contract** — always 11 keys, correct shape, empty lists not nulls
- **Admin teams** — 385, 3276, 3277 always return `[]` across all dates
- **Required fields** — all state-specific fields present for Not Started and Completed
- **Off-season date** — January date returns all 11 empty
- **Invalid date formats** — wrong separator, reversed order, non-date string all return 422
- **Completed game accuracy** — scores, pitcher names, parent clubs verified against known results
- **Opening Day 2026** — Marlins beat Rockies 2-1, Sandy Alcantara W, Pete Fairbanks S
- **opponentParentClub** — null for MLB opponents, populated for MiLB opponents
- **Seasonal behavior** — FCL/DSL empty in April, FCL active in June, MiLB plays through All-Star break
- **In Progress state** — not yet validated, requires a live game ⏳

## Step 7 — Fix two gaps identified in testing

- **Impossible date (T10)** — added `datetime.strptime` validation after the regex check; impossible calendar dates like month 13 now return a clean 422 instead of passing through to the MLB API
- **Doubleheaders (T23)** — `indexGamesByTeam` now uses `setdefault` + `append` instead of overwrite, and sorts by `gameNumber`; response values are always lists (`[]`, `[{...}]`, `[{...},{...}]`)
