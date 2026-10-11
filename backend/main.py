import os

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import game

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("CORS_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "healthy"}


class NewGame(BaseModel):
    length: int = Field(ge=5, le=8)


class Guess(BaseModel):
    guess: str


def _run(fn, *args):
    try:
        return fn(*args)
    except game.GameError as e:
        raise HTTPException(e.status, e.detail)


@app.post("/games", status_code=201)
def create_game(body: NewGame):
    return game.create_game(body.length)


@app.get("/games")
def list_games(limit: int = Query(5, ge=1, le=50), offset: int = Query(0, ge=0, le=2**31)):
    return game.list_games(limit, offset)


@app.get("/games/{game_id}")
def get_game(game_id: str):
    return _run(game.get_game, game_id)


@app.post("/games/{game_id}/guesses")
def make_guess(game_id: str, body: Guess):
    return _run(game.make_guess, game_id, body.guess)
