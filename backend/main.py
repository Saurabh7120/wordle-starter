from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import game

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Hello World"}


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
def list_games():
    return game.list_games()


@app.get("/games/{game_id}")
def get_game(game_id: str):
    return _run(game.get_game, game_id)


@app.post("/games/{game_id}/guesses")
def make_guess(game_id: str, body: Guess):
    return _run(game.make_guess, game_id, body.guess)
