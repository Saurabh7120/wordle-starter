# Wordle Club

A full-stack Wordle game with a FastAPI backend and a React frontend. Play as many games as you like, each with a word length of 5 to 8 letters.

## How to play

- Pick a word length from 5 to 8 and start a game. You get **one more guess than the word has letters**: a 5-letter word gives 6 guesses, a 7-letter word gives 8.
- Type your guess with the keyboard or the on-screen keys, then press Enter. Every guess must be a real word.
- After each guess, every letter is colored:
  - **Green**: the letter is in the word and in the right place.
  - **Yellow**: the letter is in the word but in a different place.
  - **Gray**: the letter is not in the word.
- A letter can appear more than once. If you guess two of the same letter, they are colored according to how many times the letter really appears in the answer.
- Answers are never plural.
- Win by guessing the word, and the board celebrates with confetti. Run out of guesses and the word is revealed.
- Start new games at any time and switch between them in **Your games** (5 per page).

## Features

- Unlimited games, saved in a database, so you can leave and come back.
- Word length from 5 to 8 letters, with length + 1 guesses.
- Physical and on-screen keyboards, with keys colored by what you have learned.
- Wrong guesses shake the row, and wins trigger confetti. Both respect the system "reduce motion" setting.
- Light and dark themes, a mobile-friendly layout, and screen-reader labels.
- Answers are common words chosen from a reviewed list. Guesses are checked against a much larger dictionary.

## Tech stack

- **Backend:** Python, FastAPI, SQLite (standard library).
- **Frontend:** React 19, Vite.
- **Tests:** pytest (backend) and Vitest with Testing Library (frontend).

## Getting started

### Backend

With Docker (hot reload on code and word-list changes):

```bash
docker compose up --build
```

Or without Docker:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --reload --port 8000
```

The API runs at `http://localhost:8000`, and interactive API docs are at `http://localhost:8000/docs`. Games are stored in `backend/data/wordle.db`, which is created on first run.

To stop the Docker container: `docker compose down`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### Tests

```bash
# backend
cd backend && pip install -r requirements-dev.txt && pytest

# frontend
cd frontend && npm test
```

### Configuration

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `CORS_ORIGIN` | backend (docker compose passes it through) | `http://localhost:5173` | The one frontend origin the API allows. Never use `*`. |
| `VITE_API_URL` | frontend | `http://localhost:8000` | Backend URL, e.g. `VITE_API_URL=http://localhost:9000 npm run dev`. |

## Project structure

```
.
├── backend/
│   ├── main.py            # routes
│   ├── game.py            # scoring, game logic, SQLite storage
│   ├── test_game.py       # tests
│   ├── words/             # answer, guess and blocked word lists
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── App.jsx        # main component
│       ├── api.js         # API client
│       └── components/    # board, keyboard, game list, help, confetti
├── docker-compose.yml
└── README.md
```

## API

| Endpoint | Description | Errors |
|---|---|---|
| `POST /games` `{"length": 5-8}` | Create a game (`length + 1` guesses) | 422 bad length |
| `GET /games?limit=5&offset=0` | List games, newest first: `{"games": [...], "total": N}` (`limit` 1-50, default 5; `offset` 0 or more) | 422 bad limit/offset |
| `GET /games/{id}` | Game state. `word` is `null` until the game ends | 404 |
| `POST /games/{id}/guesses` `{"guess": "..."}` | Submit a guess. Returns the updated game with `green`/`yellow`/`gray` feedback for each letter | 404, 409 game finished, 422 wrong length or not a word |
| `GET /health` | Health check | |

A game looks like this:

```json
{
  "id": "…",
  "length": 5,
  "max_guesses": 6,
  "status": "in_progress",
  "guesses": [{ "word": "crane", "feedback": ["green", "gray", "gray", "yellow", "gray"] }],
  "word": null
}
```

`status` is `in_progress`, `won` or `lost`.

## Word lists

- **Answers:** `backend/words/answers{5-8}.txt` hold 600 common words per length. They were built once from the Datamuse API with `cd backend && python words/build_answers.py /tmp/datamuse-raw`. The API is never called while the app runs.
- **Blocklist:** `backend/words/blocked.txt` removes unsuitable words from the answers. Those words are still valid as guesses.
- **Valid guesses:** `backend/words/valid{5-8}.txt` (from `/usr/share/dict/web2`, filtered to lowercase letters).
- After editing the lists, the Docker container reloads automatically (`.txt` files included). Without Docker, restart the backend.
