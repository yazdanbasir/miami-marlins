# /schedule Endpoint — Test Suite

Tests cover three perspectives: **software engineering** (contract, errors), **data engineering** (accuracy, integrity), and **MLB domain** (seasonal behavior, game states, edge cases).

Service runs at `http://localhost:8000`. Start with `uvicorn app:app`.

---

## 1. Response Contract

### T1 — No date defaults to today
```bash
curl "http://localhost:8000/schedule"
```
**Expect:** 11 keys, all affiliate IDs present, games populated for teams playing today.
**Result:** ✅ 11 keys. 6 teams with games (146, 467, 479, 554, 564, 4124), 5 empty. All "Not Started" (called pre-game).

---

### T2 — Always exactly 11 keys
```bash
curl "http://localhost:8000/schedule?date=2026-04-01" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))"
```
**Expect:** `11`
**Result:** ✅ `11`

---

### T3 — Admin teams always return `{}`
Admin teams are Marlins Prospects (385), Alternate Training Site (3276), and Marlins Organization (3277). These are logistical entries, not competing teams — they should never have games.
```bash
curl "http://localhost:8000/schedule?date=2026-04-01"  # check keys 385, 3276, 3277
curl "http://localhost:8000/schedule?date=2026-05-12"
curl "http://localhost:8000/schedule?date=2026-05-20"
```
**Expect:** `{}` for 385, 3276, 3277 on every date.
**Result:** ✅ Confirmed empty across all three dates.

---

### T4 — Not Started: all required fields present
```bash
curl "http://localhost:8000/schedule?date=2026-05-20"
```
**Expect:** Every non-empty entry has: `teamName`, `level`, `state`, `gameTime`, `venue`, `opponent`, `opponentParentClub`, `probablePitchers`.
**Result:** ✅ All 6 teams with games passed field check (146, 467, 479, 554, 564, 4124).

---

### T5 — Completed: all required fields present
```bash
curl "http://localhost:8000/schedule?date=2026-04-01"
```
**Expect:** Every non-empty entry has: `teamName`, `level`, `state`, `opponent`, `opponentParentClub`, `finalScore`, `winningPitcher`, `losingPitcher`, `savePitcher`.
**Result:** ✅ All 2 teams with games passed field check (146, 564).

---

## 2. Date Parameter

### T6 — Off-season date (January)
```bash
curl "http://localhost:8000/schedule?date=2026-01-15"
```
**Expect:** All 11 teams return `{}`.
**Result:** ✅ All 11 empty.

---

### T7 — Invalid date: wrong separator
```bash
curl "http://localhost:8000/schedule?date=2026/04/01"
```
**Expect:** 422 with pattern mismatch error.
**Result:** ✅ 422 — `String should match pattern '^\d{4}-\d{2}-\d{2}$'`

---

### T8 — Invalid date: reversed format
```bash
curl "http://localhost:8000/schedule?date=04-01-2026"
```
**Expect:** 422.
**Result:** ✅ 422 — pattern mismatch.

---

### T9 — Invalid date: non-date string
```bash
curl "http://localhost:8000/schedule?date=abc"
```
**Expect:** 422.
**Result:** ✅ 422 — pattern mismatch.

---

### T10 — Impossible date: passes regex but invalid calendar ⚠️
```bash
curl "http://localhost:8000/schedule?date=2026-13-01"
```
**Expect:** Ideally 422, but our regex `^\d{4}-\d{2}-\d{2}$` only validates format not calendar validity.
**Result:** ⚠️ Returns 502 (MLB API rejects with 400). The regex gap means impossible dates like month 13 slip through to the upstream API. Not a crash, but not a clean 422 either.
**Note for improvement:** Add calendar validation (e.g. `datetime.strptime`) to return a proper 422 before hitting MLB API.

---

## 3. Game States

### T11 — Completed game
```bash
curl "http://localhost:8000/schedule?date=2026-04-01"
```
**Expect:** State = "Completed" with final score, winning/losing/save pitchers.
**Result:** ✅ Miami Marlins and Jacksonville Jumbo Shrimp both show "Completed".

---

### T12 — Not Started game
```bash
curl "http://localhost:8000/schedule?date=2026-05-20"
```
**Expect:** State = "Not Started" with gameTime, venue, probable pitchers.
**Result:** ✅ 6 teams show "Not Started". Probable pitchers present where announced, null otherwise.

---

### T13 — In Progress game
Cannot be forced with a static date. Must be run during a live game.
**Expect:** State = "In Progress" with score, inning, outs, runnersOnBase, currentPitcher, currentBatter.
**Result:** ⏳ Not yet validated. Run during an active Marlins or affiliate game.

---

## 4. Data Accuracy

### T14 — Known result: Marlins vs White Sox, 2026-04-01
```bash
curl "http://localhost:8000/schedule?date=2026-04-01"  # check key "146"
```
**Expect:**
- `finalScore`: `{"us": 10, "them": 0}`
- `winningPitcher`: `"Sandy Alcantara"`
- `losingPitcher`: `"Shane Smith"`
- `savePitcher`: `null`
- `opponent`: `"Chicago White Sox"`
- `opponentParentClub`: `null` (MLB team, no parent)

**Result:** ✅ 7/7 checks passed.

---

### T15 — Known result: Jacksonville vs Sugar Land, 2026-04-01
```bash
curl "http://localhost:8000/schedule?date=2026-04-01"  # check key "564"
```
**Expect:**
- `finalScore`: `{"us": 3, "them": 10}`
- `winningPitcher`: `"J.P. France"`
- `losingPitcher`: `"Dax Fulton"`
- `opponent`: `"Sugar Land Space Cowboys"`
- `opponentParentClub`: `"Houston Astros"`

**Result:** ✅ All correct.

---

### T16 — opponentParentClub null for MLB opponents
```bash
curl "http://localhost:8000/schedule?date=2026-04-01"  # check key "146"
```
**Expect:** `opponentParentClub: null` (Chicago White Sox is an MLB team).
**Result:** ✅ `null`

---

### T17 — opponentParentClub populated for MiLB opponents
```bash
curl "http://localhost:8000/schedule?date=2026-04-01"  # check key "564"
```
**Expect:** `opponentParentClub: "Houston Astros"` (Sugar Land Space Cowboys = Houston AAA affiliate).
**Result:** ✅ `"Houston Astros"`

---

### T18 — Opening Day 2026
```bash
curl "http://localhost:8000/schedule?date=2026-03-27"  # check key "146"
```
**Expect:** Marlins opening day game.
**Result:** ✅ Marlins beat Colorado Rockies 2-1. Sandy Alcantara (W), Kyle Freeland (L), Pete Fairbanks (S).

---

## 5. MLB Domain / Seasonal Edge Cases

### T19 — FCL and DSL empty in April
FCL (467) and DSL (619, 2127) seasons run June–August. They should not have games in April.
```bash
curl "http://localhost:8000/schedule?date=2026-04-15"  # check keys 467, 619, 2127
```
**Expect:** All three return `{}`.
**Result:** ✅ All three empty in April.

---

### T20 — FCL active in June/July
```bash
curl "http://localhost:8000/schedule?date=2026-06-15"  # check key 467
```
**Expect:** FCL Marlins (467) has a game.
**Result:** ✅ FCL Marlins shows "Not Started" on 2026-06-15.

---

### T21 — DSL teams (619, 2127) in June
```bash
curl "http://localhost:8000/schedule?date=2026-06-15"  # check keys 619, 2127
```
**Expect:** DSL may be active (their season starts mid-June in the Dominican Republic).
**Result:** ⚠️ Both still empty on 2026-06-15. DSL may start later in June or early July — worth rechecking with a July date.

---

### T22 — All-Star break (MLB off, MiLB continues)
```bash
curl "http://localhost:8000/schedule?date=2026-07-14"
```
**Expect:** MLB team (146) likely empty; minor league teams may still play (MiLB does not take the All-Star break).
**Result:** ✅ As expected — 146 empty, FCL Marlins (467) has a game. MiLB keeps playing through the break.

---

### T23 — Doubleheader: known limitation ⚠️
Beloit Sky Carp (554) played a doubleheader on 2026-04-03 (two games vs Wisconsin Timber Rattlers, gamePks 819510 and 819513).
```bash
curl "http://localhost:8000/schedule?date=2026-04-03"  # check key "554"
```
**Expect (ideally):** Both games returned.
**Result:** ⚠️ Only one game returned. `indexGamesByTeam` overwrites on the second iteration, so the last game seen wins. Scores showed 0-0 with null pitchers (game 2 may have been suspended/unresolved).

**Known limitation:** The current data model (one entry per team per day) cannot represent doubleheaders. Doubleheaders were found on: 2026-04-03 (554), 2026-04-09 (479), 2026-04-23 (4124), 2026-05-02 (4124), 2026-05-05 (467), 2026-05-06 (554). All would silently return only one game.

**Note for improvement:** Store games as a list per team (`{teamId: [game1, game2]}`) to support doubleheaders.

---

## Summary

| # | Test | Result |
|---|------|--------|
| T1 | No date → today | ✅ |
| T2 | Always 11 keys | ✅ |
| T3 | Admin teams always `{}` | ✅ |
| T4 | Not Started fields | ✅ |
| T5 | Completed fields | ✅ |
| T6 | Off-season all empty | ✅ |
| T7 | Invalid separator → 422 | ✅ |
| T8 | Reversed format → 422 | ✅ |
| T9 | Non-date string → 422 | ✅ |
| T10 | Impossible date (month 13) | ⚠️ 502 not 422 — regex gap |
| T11 | Completed state | ✅ |
| T12 | Not Started state | ✅ |
| T13 | In Progress state | ⏳ Needs live game |
| T14 | Known result: MIA 4/1 | ✅ |
| T15 | Known result: JAX 4/1 | ✅ |
| T16 | MLB opponent parentClub null | ✅ |
| T17 | MiLB opponent parentClub populated | ✅ |
| T18 | Opening Day 2026-03-27 | ✅ |
| T19 | FCL/DSL empty in April | ✅ |
| T20 | FCL active in June | ✅ |
| T21 | DSL active in June | ⚠️ Still empty — recheck July |
| T22 | All-Star break behavior | ✅ |
| T23 | Doubleheader handling | ⚠️ Known limitation — drops second game |

**17 passed / 2 warnings / 1 pending (live game) / 2 known gaps identified**
