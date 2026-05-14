import argparse
import json
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

import requests

BASE_URL = "https://statsapi.mlb.com/api/v1"
DB_PATH  = Path(__file__).parent.parent / "data" / "marlins.db"


def parseDate(value: str) -> str:
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return value
    except ValueError:
        raise argparse.ArgumentTypeError(f"Date must be YYYY-MM-DD, got: {value}")


def loadAffiliateIds() -> tuple[list[int], list[int]]:
    if not DB_PATH.exists():
        print(f"Error: database not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)
    con = sqlite3.connect(DB_PATH)
    rows = con.execute("SELECT id, sportId FROM affiliates WHERE active = 1").fetchall()
    con.close()
    if not rows:
        print("Error: no active affiliates found in database", file=sys.stderr)
        sys.exit(1)
    teamIds  = sorted({r[0] for r in rows})
    sportIds = sorted({r[1] for r in rows if r[1] is not None})
    return teamIds, sportIds


def fetchSchedule(teamIds: list[int], sportIds: list[int], date: str | None = None) -> dict:
    url = f"{BASE_URL}/schedule"
    params = {
        "sportId": ",".join(str(i) for i in sportIds),
        "teamId":  ",".join(str(i) for i in teamIds),
    }
    if date:
        params["date"] = date
    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    return response.json()


def main():
    parser = argparse.ArgumentParser(description="Fetch Marlins affiliate schedule from MLB Stats API.")
    parser.add_argument("--date", type=parseDate, default=None, help="Specific date (YYYY-MM-DD)")
    args = parser.parse_args()

    teamIds, sportIds = loadAffiliateIds()

    try:
        data = fetchSchedule(teamIds, sportIds, args.date)
    except requests.RequestException as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    print(json.dumps(data, indent=2))


if __name__ == "__main__":
    main()
