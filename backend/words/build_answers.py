"""One-off: rebuild answers5-8.txt from Datamuse (api.datamuse.com). Not used at runtime or in tests.
Usage: python words/build_answers.py [raw_dir]   (raw API responses are saved to raw_dir, default: ./raw)"""
import json
import sys
import time
import urllib.request
from pathlib import Path
from string import ascii_lowercase

HERE = Path(__file__).parent
RAW = Path(sys.argv[1] if len(sys.argv) > 1 else "raw")
RAW.mkdir(parents=True, exist_ok=True)
BLOCKED = {l.strip() for l in (HERE / "blocked.txt").read_text().splitlines() if l.strip() and l[0] != "#"}


def fetch(n: int, letter: str) -> list[dict]:
    f = RAW / f"{n}{letter}.json"
    if f.exists():
        return json.loads(f.read_text())
    url = f"https://api.datamuse.com/words?sp={letter}{'%3F' * (n - 1)}&md=fp&max=1000"
    req = urllib.request.Request(url, headers={"User-Agent": "wordle-starter-wordlist-build/1.0 (one-off)"})
    for attempt in range(3):  # max 2 retries
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                data = json.load(r)
            break
        except Exception as e:
            if attempt == 2:
                sys.exit(f"Datamuse failed for {url}: {e}")
            time.sleep(2)
    f.write_text(json.dumps(data))
    time.sleep(0.3)
    return data


for n in range(5, 9):
    valid = set((HERE / f"valid{n}.txt").read_text().split())
    best: dict[str, float] = {}
    for letter in ascii_lowercase:
        for e in fetch(n, letter):
            w, tags = e.get("word", ""), e.get("tags", [])
            if not (len(w) == n and w.isascii() and w.isalpha() and w.islower()) or "prop" in tags:
                continue
            freq = next((float(t[2:]) for t in tags if t.startswith("f:")), None)
            if freq is None or not {"n", "v", "adj", "adv"} & set(tags):
                continue
            if (w[-1] == "s" and w[-2:] not in ("ss", "us", "is")) or w not in valid or w in BLOCKED:
                continue
            best[w] = max(freq, best.get(w, 0))
    top = sorted(best, key=lambda w: (-best[w], w))[:600]
    assert len(top) >= 400, (n, len(top))
    (HERE / f"answers{n}.txt").write_text("\n".join(top) + "\n")
    print(n, len(top), "candidates", len(best), "cutoff freq", best[top[-1]])
