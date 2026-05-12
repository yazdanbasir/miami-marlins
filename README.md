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
