import json
from contextlib import closing
import random
import sqlite3
import uuid
from pathlib import Path

HERE = Path(__file__).parent
DB_PATH = HERE / "data" / "wordle.db"


class GameError(Exception):
    def __init__(self, status: int, detail: str):
        self.status, self.detail = status, detail


def _words(kind: str, n: int) -> list[str]:
    return (HERE / "words" / f"{kind}{n}.txt").read_text().split()


BLOCKED = {l.strip() for l in (HERE / "words" / "blocked.txt").read_text().splitlines() if l.strip() and l[0] != "#"}
ANSWERS = {n: [w for w in _words("answers", n) if w not in BLOCKED] for n in range(5, 9)}
VALID = {n: set(_words("valid", n)) for n in range(5, 9)}
assert all(ANSWERS.values()), "empty answer list"


def score(guess: str, answer: str) -> list[str]:
    fb = ["gray"] * len(answer)
    left: dict[str, int] = {}
    for i, (g, a) in enumerate(zip(guess, answer)):
        if g == a:
            fb[i] = "green"
        else:
            left[a] = left.get(a, 0) + 1
    for i, g in enumerate(guess):
        if fb[i] != "green" and left.get(g, 0) > 0:
            fb[i] = "yellow"
            left[g] -= 1
    return fb


def db() -> sqlite3.Connection:
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_db() -> None:
    DB_PATH.parent.mkdir(exist_ok=True)
    with closing(db()) as c, c:
        c.execute(
            "CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, word TEXT NOT NULL, "
            "length INTEGER NOT NULL, max_guesses INTEGER NOT NULL, status TEXT NOT NULL, "
            "guesses_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
        )
        c.execute("CREATE INDEX IF NOT EXISTS games_created ON games(created_at)")


init_db()


def tx():
    # sqlite3's own `with` commits but never closes; closing() does the close
    return closing(db())


def _view(r: sqlite3.Row) -> dict:
    done = r["status"] != "in_progress"
    return {
        "id": r["id"],
        "length": r["length"],
        "max_guesses": r["max_guesses"],
        "status": r["status"],
        "guesses": json.loads(r["guesses_json"]),
        "word": r["word"] if done else None,
    }


def create_game(length: int) -> dict:
    gid = str(uuid.uuid4())
    with tx() as c, c:
        c.execute(
            "INSERT INTO games (id, word, length, max_guesses, status, guesses_json) "
            "VALUES (?, ?, ?, ?, 'in_progress', '[]')",
            (gid, random.choice(ANSWERS[length]), length, length + 1),
        )
        return _view(c.execute("SELECT * FROM games WHERE id = ?", (gid,)).fetchone())


def list_games(limit: int, offset: int) -> dict:
    with tx() as c, c:
        # rowid breaks created_at (1s resolution) ties
        rows = c.execute(
            "SELECT * FROM games ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?", (limit, offset)
        )
        games = [_view(r) for r in rows]
        return {"games": games, "total": c.execute("SELECT COUNT(*) FROM games").fetchone()[0]}


def get_game(gid: str) -> dict:
    with tx() as c, c:
        r = c.execute("SELECT * FROM games WHERE id = ?", (gid,)).fetchone()
    if not r:
        raise GameError(404, "Game not found")
    return _view(r)


def make_guess(gid: str, guess: str) -> dict:
    guess = guess.strip().lower()
    with tx() as c, c:
        c.execute("BEGIN IMMEDIATE")  # serialize concurrent guesses on the same game
        r = c.execute("SELECT * FROM games WHERE id = ?", (gid,)).fetchone()
        if not r:
            raise GameError(404, "Game not found")
        if r["status"] != "in_progress":
            raise GameError(409, "Game is already finished")
        n = r["length"]
        if not (guess.isascii() and guess.isalpha()):
            raise GameError(422, "Guess must contain only letters")
        if len(guess) != n:
            raise GameError(422, f"Guess must be {n} letters")
        if guess not in VALID[n]:
            raise GameError(422, "Not in word list")
        guesses = json.loads(r["guesses_json"])
        fb = score(guess, r["word"])
        guesses.append({"word": guess, "feedback": fb})
        status = "won" if guess == r["word"] else "lost" if len(guesses) >= r["max_guesses"] else "in_progress"
        c.execute(
            "UPDATE games SET guesses_json = ?, status = ? WHERE id = ?",
            (json.dumps(guesses), status, gid),
        )
        return _view(c.execute("SELECT * FROM games WHERE id = ?", (gid,)).fetchone())
