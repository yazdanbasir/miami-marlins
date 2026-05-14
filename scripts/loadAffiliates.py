import argparse
import json
import sqlite3
import sys
from pathlib import Path

DDL = """
CREATE TABLE IF NOT EXISTS affiliates (
    id                  INTEGER PRIMARY KEY,
    name                TEXT    NOT NULL,
    season              INTEGER NOT NULL,
    allStarStatus       TEXT,
    teamCode            TEXT,
    fileCode            TEXT,
    abbreviation        TEXT,
    teamName            TEXT,
    locationName        TEXT,
    firstYearOfPlay     TEXT,
    shortName           TEXT,
    franchiseName       TEXT,
    clubName            TEXT,
    active              INTEGER NOT NULL,
    link                TEXT,
    parentOrgName       TEXT,
    parentOrgId         INTEGER,
    venueId             INTEGER,
    venueName           TEXT,
    leagueId            INTEGER,
    leagueName          TEXT,
    divisionId          INTEGER,
    divisionName        TEXT,
    sportId             INTEGER,
    sportName           TEXT,
    springLeagueId      INTEGER,
    springLeagueName    TEXT,
    springVenueId       INTEGER
);
"""

INSERT = """
INSERT OR REPLACE INTO affiliates VALUES (
    :id, :name, :season, :allStarStatus, :teamCode, :fileCode,
    :abbreviation, :teamName, :locationName, :firstYearOfPlay,
    :shortName, :franchiseName, :clubName, :active, :link,
    :parentOrgName, :parentOrgId,
    :venueId, :venueName,
    :leagueId, :leagueName,
    :divisionId, :divisionName,
    :sportId, :sportName,
    :springLeagueId, :springLeagueName, :springVenueId
)
"""


def validateTeams(teams: list) -> list[str]:
    errors = []
    if not teams:
        errors.append("'teams' list is empty")
        return errors
    for i, team in enumerate(teams):
        prefix = f"teams[{i}]"
        if not isinstance(team.get("id"), int):
            errors.append(f"{prefix}: 'id' must be an int")
        if not isinstance(team.get("name"), str) or not team["name"]:
            errors.append(f"{prefix}: 'name' must be a non-empty string")
        if not isinstance(team.get("season"), int):
            errors.append(f"{prefix}: 'season' must be an int")
        if not isinstance(team.get("active"), bool):
            errors.append(f"{prefix}: 'active' must be a boolean")
    return errors


def transformTeam(team: dict) -> dict:
    venue = team.get("venue") or {}
    league = team.get("league") or {}
    division = team.get("division") or {}
    sport = team.get("sport") or {}
    springLeague = team.get("springLeague") or {}
    springVenue = team.get("springVenue") or {}

    leagueId = league.get("id")
    if not isinstance(leagueId, int):
        leagueId = None

    return {
        "id":               team["id"],
        "name":             team["name"],
        "season":           team["season"],
        "allStarStatus":    team.get("allStarStatus"),
        "teamCode":         team.get("teamCode"),
        "fileCode":         team.get("fileCode"),
        "abbreviation":     team.get("abbreviation"),
        "teamName":         team.get("teamName"),
        "locationName":     team.get("locationName"),
        "firstYearOfPlay":  team.get("firstYearOfPlay"),
        "shortName":        team.get("shortName"),
        "franchiseName":    team.get("franchiseName"),
        "clubName":         team.get("clubName"),
        "active":           1 if team["active"] else 0,
        "link":             team.get("link"),
        "parentOrgName":    team.get("parentOrgName"),
        "parentOrgId":      team.get("parentOrgId"),
        "venueId":          venue.get("id"),
        "venueName":        venue.get("name"),
        "leagueId":         leagueId,
        "leagueName":       league.get("name"),
        "divisionId":       division.get("id"),
        "divisionName":     division.get("name"),
        "sportId":          sport.get("id"),
        "sportName":        sport.get("name"),
        "springLeagueId":   springLeague.get("id"),
        "springLeagueName": springLeague.get("name"),
        "springVenueId":    springVenue.get("id"),
    }


def main():
    parser = argparse.ArgumentParser(description="Load Marlins affiliates JSON into SQLite.")
    DATA_DIR = Path(__file__).parent.parent / "data"
    parser.add_argument("--json", default=str(DATA_DIR / "affiliates.json"), help="Path to affiliates JSON file")
    parser.add_argument("--db",   default=str(DATA_DIR / "marlins.db"),      help="Path to SQLite database file")
    args = parser.parse_args()

    jsonPath = Path(args.json)
    dbPath = Path(args.db)

    if not jsonPath.exists():
        print(f"Error: JSON file not found: {jsonPath}", file=sys.stderr)
        sys.exit(1)

    with jsonPath.open() as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON — {e}", file=sys.stderr)
            sys.exit(1)

    if "teams" not in data or not isinstance(data["teams"], list):
        print("Error: JSON must have a top-level 'teams' list", file=sys.stderr)
        sys.exit(1)

    teams = data["teams"]
    errors = validateTeams(teams)
    if errors:
        print("Validation failed:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        sys.exit(1)

    rows = [transformTeam(t) for t in teams]

    try:
        con = sqlite3.connect(dbPath)
        con.executescript(DDL)
        with con:
            con.executemany(INSERT, rows)
        count = con.execute("SELECT COUNT(*) FROM affiliates").fetchone()[0]
        con.close()
    except sqlite3.Error as e:
        print(f"Database error: {e}", file=sys.stderr)
        sys.exit(1)

    if count != len(rows):
        print(f"Error: expected {len(rows)} rows but found {count}", file=sys.stderr)
        sys.exit(1)

    print(f"Loaded {count} affiliates into '{dbPath}':\n")
    print(f"  {'ID':<6} {'Name':<40} {'Level'}")
    print(f"  {'-'*6} {'-'*40} {'-'*20}")
    for r in rows:
        print(f"  {r['id']:<6} {r['name']:<40} {r['sportName'] or ''}")


if __name__ == "__main__":
    main()
