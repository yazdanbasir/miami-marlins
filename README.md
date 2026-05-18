# Miami Marlins Affiliate Schedule

Application that provides a single `/schedule` endpoint returning real-time game data for all Miami Marlins affiliate teams, backed by the MLB Stats API. Includes a React UI for browsing the schedule and exploring the API.

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **pip** and **npm**

## Project Structure

```
Marlins/
├── backend/          # FastAPI service — the /schedule endpoint
├── data/             # SQLite database (pre-loaded) and source JSON
├── frontend/         # React + Vite UI
├── scripts/          # Utility scripts used during development
└── files/            # Technical notes, test documentation, project brief
```
## Running the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --port 1997
```

The API will be available at `http://localhost:1997`.

**Endpoint:**
```
GET /schedule?date=YYYY-MM-DD
```
`date` is optional — omitting it returns today's schedule.

## Running the Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:2003`.

## Using the App

Open `http://localhost:2003` in your browser. The app has two sections:

- **API Reference** — documents the `/schedule` endpoint, its parameter, and the full response schema for each game state (Not Started, In Progress, Completed)
- **Schedule Explorer** — fetches live data from the backend and displays each affiliate's game for the selected date, grouped by game state

## Notes

- `data/marlins.db` is pre-loaded with all 11 Marlins affiliates. No database setup is needed.
- Port numbers are a nod to the Marlins' two World Series titles: **1997** (backend) and **2003** (frontend).
- `scripts/loadAffiliates.py` — loads affiliate data from `data/affiliates.json` into the database (already done, included for reference)
- `scripts/fetchSchedule.py` — CLI tool for exploring the raw MLB Stats API schedule response directly