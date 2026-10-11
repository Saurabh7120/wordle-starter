import pytest
from fastapi.testclient import TestClient

import game
from main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(game, "DB_PATH", tmp_path / "t.db")
    return TestClient(app)


def new(client, length=5, word=None):
    g = client.post("/games", json={"length": length}).json()
    if word:
        with game.db() as c:
            c.execute("UPDATE games SET word = ? WHERE id = ?", (word, g["id"]))
    return g


def guess(client, gid, w):
    return client.post(f"/games/{gid}/guesses", json={"guess": w})


@pytest.mark.parametrize(
    "g,a,exp",
    [
        ("speed", "abide", ["gray", "gray", "yellow", "gray", "yellow"]),
        ("allee", "apple", ["green", "yellow", "gray", "gray", "green"]),
        ("eerie", "geese", ["yellow", "green", "gray", "gray", "green"]),
        ("crane", "crane", ["green"] * 5),
        ("aaaaa", "abbbb", ["green"] + ["gray"] * 4),
    ],
)
def test_score(g, a, exp):
    assert game.score(g, a) == exp


@pytest.mark.parametrize("n", range(5, 9))
def test_create_each_length(client, n):
    g = new(client, n)
    assert (g["length"], g["max_guesses"], g["status"], g["word"], g["guesses"]) == (n, n + 1, "in_progress", None, [])
    assert client.get(f"/games/{g['id']}").json() == g


@pytest.mark.parametrize("n", [4, 9, 0, "x"])
def test_bad_length(client, n):
    assert client.post("/games", json={"length": n}).status_code == 422


def test_win_and_reveal(client):
    g = new(client, 5, "crane")
    r = guess(client, g["id"], "CRANE")
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "won" and j["word"] == "crane" and j["guesses"][0]["feedback"] == ["green"] * 5
    r = guess(client, g["id"], "crane")
    assert r.status_code == 409 and isinstance(r.json()["detail"], str)


@pytest.mark.parametrize("n", range(5, 9))
def test_loss_at_n_plus_1_no_leak(client, n):
    secret = game.ANSWERS[n][0]
    wrong = next(w for w in game.ANSWERS[n] if w != secret)
    g = new(client, n, secret)
    for i in range(n + 1):
        j = guess(client, g["id"], wrong).json()
        if i < n:
            assert j["status"] == "in_progress" and j["word"] is None and secret not in str(j)
            assert secret not in client.get("/games").text
    assert j["status"] == "lost" and j["word"] == secret and len(j["guesses"]) == n + 1
    assert guess(client, g["id"], wrong).status_code == 409


def test_invalid_guesses(client):
    g = new(client, 5, "crane")
    for bad in ["abc", "crane1", "zzzzz", "cran ", "crânes", "", "toolong"]:
        r = guess(client, g["id"], bad)
        assert r.status_code == 422 and isinstance(r.json()["detail"], str), bad
    assert client.get(f"/games/{g['id']}").json()["guesses"] == []


def test_unknown_game_and_list_order(client):
    assert client.get("/games/nope").status_code == 404
    assert guess(client, "nope", "crane").status_code == 404
    a, b = new(client), new(client, 6)
    assert [x["id"] for x in client.get("/games").json()] == [b["id"], a["id"]]


def test_answers_subset_of_valid():
    for n in range(5, 9):
        assert set(game.ANSWERS[n]) <= game.VALID[n]
