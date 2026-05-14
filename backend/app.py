from datetime import date as Date, datetime
from pathlib import Path

import requests
import sqlite3
from fastapi import FastAPI, HTTPException, Query

BASE_URL = "https://statsapi.mlb.com/api/v1"
DB_PATH  = Path(__file__).parent.parent / "data" / "marlins.db"

app = FastAPI()

# DB ───────────────────────────────────────────────────────────────────────
def loadAffiliates() -> list[dict]:
    # Pull every active affiliate team out of the local database
    if not DB_PATH.exists():
        raise HTTPException(status_code=500, detail="Database not found")
    con = sqlite3.connect(DB_PATH)
    rows = con.execute(
        "SELECT id, name, sportName, sportId FROM affiliates WHERE active = 1"
    ).fetchall()
    con.close()
    if not rows:
        raise HTTPException(status_code=500, detail="No active affiliates in database")
    return [{"id": r[0], "name": r[1], "level": r[2], "sportId": r[3]} for r in rows]

# MLB API ───────────────────────────────────────────────────────────────────
def fetchSchedule(teamIds: list[int], sportIds: list[int], date: str | None) -> dict:
    # Get MLB API for the schedule for all our affiliate teams on a given date
    params = {
        "sportId": ",".join(str(i) for i in sportIds),
        "teamId":  ",".join(str(i) for i in teamIds),
        # hydrate pulls in extra data we might need so we don't have to make separate calls
        "hydrate": "probablePitcher,linescore,decisions",
    }
    if date:
        params["date"] = date
    try:
        r = requests.get(f"{BASE_URL}/schedule", params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"MLB API error: {e}")

def fetchLiveFeed(gamePk: int) -> dict:
    # Live feed endpoint = v1.1
    try:
        r = requests.get(
            f"https://statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live",
            timeout=10,
        )
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"MLB API live feed error: {e}")

def fetchOpponentParentOrgs(teamIds: list[int]) -> dict[int, str | None]:
    # For each opponent, get parent club
    if not teamIds:
        return {}
    try:
        r = requests.get(
            f"{BASE_URL}/teams",
            params={
                "teamIds": ",".join(str(i) for i in teamIds),
                "fields":  "teams,id,parentOrgName,sport",
            },
            timeout=10,
        )
        r.raise_for_status()
        result = {}
        for team in r.json().get("teams", []):
            result[team["id"]] = team.get("parentOrgName")
        return result
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"MLB API team info error: {e}")

# Transform ─────────────────────────────────────────────────────────────────
def indexGamesByTeam(scheduleData: dict, affiliateIds: set[int]) -> dict[int, list[dict]]:
    # Flatten schedule response into a team ID → games lookup form
    # Only keep games where one of our affiliates is playing
    gamesByTeam: dict[int, list] = {}
    for dateEntry in scheduleData.get("dates", []):
        for game in dateEntry.get("games", []):
            homeId = game["teams"]["home"]["team"]["id"]
            awayId = game["teams"]["away"]["team"]["id"]
            for tid in (homeId, awayId):
                if tid in affiliateIds:
                    gamesByTeam.setdefault(tid, []).append(game)
    for games in gamesByTeam.values():
        games.sort(key=lambda g: g.get("gameNumber", 1))
    return gamesByTeam

def getSides(game: dict, ourTeamId: int) -> tuple[dict, dict]:
    # Return (this team, that team) regardless of home or away
    home = game["teams"]["home"]
    away = game["teams"]["away"]
    if home["team"]["id"] == ourTeamId:
        return home, away
    return away, home

def buildNotStarted(game: dict, ourTeamId: int, parentOrgs: dict) -> dict:
    # Game hasn't started yet, just show who we're playing and the probable pitchers
    ourSide, theirSide = getSides(game, ourTeamId)
    opponentId = theirSide["team"]["id"]
    ourProbable   = (ourSide.get("probablePitcher") or {}).get("fullName")
    theirProbable = (theirSide.get("probablePitcher") or {}).get("fullName")
    return {
        "state":              "Not Started",
        "gameTime":           game.get("gameDate"),
        "venue":              game["venue"]["name"],
        "opponent":           theirSide["team"]["name"],
        "opponentParentClub": parentOrgs.get(opponentId),
        "probablePitchers":   {"us": ourProbable, "them": theirProbable},
    }

def buildInProgress(game: dict, ourTeamId: int, parentOrgs: dict, liveFeed: dict) -> dict:
    # Pull the current score, inning, base runners, and matchup from the live feed
    ourSide, theirSide = getSides(game, ourTeamId)
    opponentId = theirSide["team"]["id"]

    liveData  = liveFeed.get("liveData", {})
    linescore = liveData.get("linescore", {})
    lsTeams   = linescore.get("teams", {})
    offense   = linescore.get("offense", {})

    isHome    = game["teams"]["home"]["team"]["id"] == ourTeamId
    ourRuns   = lsTeams.get("home" if isHome else "away", {}).get("runs", 0)
    theirRuns = lsTeams.get("away" if isHome else "home", {}).get("runs", 0)

    # Only include bases that actually have a runner on them
    runners = [base for base in ("first", "second", "third") if offense.get(base)]

    matchup = liveData.get("plays", {}).get("currentPlay", {}).get("matchup", {})

    return {
        "state":              "In Progress",
        "venue":              game["venue"]["name"],
        "opponent":           theirSide["team"]["name"],
        "opponentParentClub": parentOrgs.get(opponentId),
        "score":              {"us": ourRuns, "them": theirRuns},
        "inning":             linescore.get("currentInning"),
        "inningHalf":         linescore.get("inningHalf"),
        "outs":               linescore.get("outs"),
        "runnersOnBase":      runners,
        "currentPitcher":     (matchup.get("pitcher") or {}).get("fullName"),
        "currentBatter":      (matchup.get("batter") or {}).get("fullName"),
    }

def buildCompleted(game: dict, ourTeamId: int, parentOrgs: dict) -> dict:
    # If game over, show the final score and pitching decisions
    ourSide, theirSide = getSides(game, ourTeamId)
    opponentId = theirSide["team"]["id"]

    decisions = game.get("decisions", {})

    return {
        "state":              "Completed",
        "opponent":           theirSide["team"]["name"],
        "opponentParentClub": parentOrgs.get(opponentId),
        "finalScore":         {"us": ourSide.get("score", 0), "them": theirSide.get("score", 0)},
        "winningPitcher":     (decisions.get("winner") or {}).get("fullName"),
        "losingPitcher":      (decisions.get("loser") or {}).get("fullName"),
        "savePitcher":        (decisions.get("save") or {}).get("fullName"),
    }

def buildGameEntry(affiliate: dict, game: dict, parentOrgs: dict, liveFeed: dict | None) -> dict:
    # Call the right builder depending on whether the game hasn't started, is live, or is done
    state     = game["status"]["abstractGameState"]
    ourTeamId = affiliate["id"]
    base = {"teamName": affiliate["name"], "level": affiliate["level"]}

    if state == "Preview":
        base.update(buildNotStarted(game, ourTeamId, parentOrgs))
    elif state == "Live":
        base.update(buildInProgress(game, ourTeamId, parentOrgs, liveFeed or {}))
    else:
        base.update(buildCompleted(game, ourTeamId, parentOrgs))
    return base

# Endpoint ──────────────────────────────────────────────────────────────────
@app.get("/schedule")
def schedule(date: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")):
    if date:
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid date: {date}")
    else:
        date = Date.today().isoformat()

    # Load our affiliate teams from the DB, then fetch everything we need from the MLB API
    affiliates   = loadAffiliates()
    teamIds      = [a["id"] for a in affiliates]
    sportIds     = list({a["sportId"] for a in affiliates if a["sportId"]})
    affiliateIds = set(teamIds)

    scheduleData = fetchSchedule(teamIds, sportIds, date)
    gamesByTeam  = indexGamesByTeam(scheduleData, affiliateIds)

    # Collect every opponent team ID so we can look up their parent org in one batch call
    opponentIds = set()
    for ourId, games in gamesByTeam.items():
        for game in games:
            home = game["teams"]["home"]["team"]["id"]
            away = game["teams"]["away"]["team"]["id"]
            opponentIds.add(away if home == ourId else home)
    parentOrgs = fetchOpponentParentOrgs(list(opponentIds))

    # Only fetch live feeds for games that are actually in progress right now
    liveFeeds = {}
    for games in gamesByTeam.values():
        for game in games:
            if game["status"]["abstractGameState"] == "Live":
                pk = game["gamePk"]
                if pk not in liveFeeds:
                    liveFeeds[pk] = fetchLiveFeed(pk)

    # Build the final response.
    # 0 games → {}  |  1 game → {…}  |  2 games (doubleheader) → [{…}, {…}]
    response = {}
    for affiliate in affiliates:
        aid    = affiliate["id"]
        games  = gamesByTeam.get(aid, [])
        built  = [
            buildGameEntry(affiliate, game, parentOrgs, liveFeeds.get(game["gamePk"]))
            for game in games
        ]
        if len(built) == 0:
            response[str(aid)] = {}
        elif len(built) == 1:
            response[str(aid)] = built[0]
        else:
            response[str(aid)] = built

    return response