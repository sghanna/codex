#!/usr/bin/env python3
"""Build the fixed Word Garden pack from reviewed word families.

Only the generated puzzles.js is loaded by the game. This script has no external
dependencies and uses a fixed seed, so repeated runs produce identical boards.
"""

from __future__ import annotations

import argparse
from collections import Counter
import json
from pathlib import Path
import random


ROOT = Path(__file__).resolve().parents[1]
FAMILIES = ROOT / "data" / "families.json"
LEXICON = ROOT / "data" / "bonus-lexicon.txt"
OUTPUT = ROOT / "puzzles.js"
MAX_SIDE = 8
ATTEMPTS = 2100


def fits_rack(word: str, rack: str) -> bool:
    return not Counter(word) - Counter(rack)


def bounds(cells: dict[tuple[int, int], tuple[str, frozenset[str]]]):
    rr = [point[0] for point in cells]
    cc = [point[1] for point in cells]
    return min(rr), max(rr), min(cc), max(cc)


def place(cells, word, row, col, direction):
    dr, dc = (0, 1) if direction == "across" else (1, 0)
    if (row - dr, col - dc) in cells or (row + len(word) * dr, col + len(word) * dc) in cells:
        return None
    intersections = 0
    updated = dict(cells)
    for index, letter in enumerate(word):
        position = (row + index * dr, col + index * dc)
        current = cells.get(position)
        if current:
            if current[0] != letter or direction in current[1]:
                return None
            intersections += 1
            updated[position] = (letter, current[1] | {direction})
        else:
            neighbors = ((position[0] - 1, position[1]), (position[0] + 1, position[1])) if direction == "across" else ((position[0], position[1] - 1), (position[0], position[1] + 1))
            if any(neighbor in cells for neighbor in neighbors):
                return None
            updated[position] = (letter, frozenset({direction}))
    if cells and intersections == 0:
        return None
    top, bottom, left, right = bounds(updated)
    if bottom - top + 1 > MAX_SIDE or right - left + 1 > MAX_SIDE:
        return None
    return updated, intersections


def options(cells, word):
    result = []
    seen = set()
    for (r, c), (letter, directions) in cells.items():
        if len(directions) == 2:
            continue
        direction = "down" if "across" in directions else "across"
        dr, dc = (1, 0) if direction == "down" else (0, 1)
        for index, candidate in enumerate(word):
            if letter != candidate:
                continue
            row, col = r - index * dr, c - index * dc
            key = (row, col, direction)
            if key in seen:
                continue
            seen.add(key)
            trial = place(cells, word, row, col, direction)
            if trial:
                new_cells, crosses = trial
                top, bottom, left, right = bounds(new_cells)
                height, width = bottom - top + 1, right - left + 1
                result.append((height * width * 4 + abs(height - width) * 2 - crosses * 3,
                               row, col, direction, new_cells))
    result.sort(key=lambda entry: (entry[0], entry[1], entry[2], entry[3]))
    return result


def construct(family, index):
    rack = family["letters"]
    candidates = family["required"]
    assert candidates[0] == rack, f"First required answer must use the rack: {rack}"
    assert len(set(candidates)) == len(candidates), rack
    assert all(word.isalpha() and word.isupper() and len(word) >= 4 and fits_rack(word, rack) for word in candidates), rack
    target = 5 if family["difficulty"] == "gentle" else 6
    seed = sum((i + 1) * ord(letter) for i, letter in enumerate(rack)) + index * 104729
    rng = random.Random(seed)
    first = place({}, rack, 0, 0, "across")
    assert first
    best = None
    best_score = None
    for _ in range(ATTEMPTS):
        cells = first[0]
        placed = [(rack, 0, 0, "across")]
        remaining = candidates[1:].copy()
        rng.shuffle(remaining)
        # Prefer longer entries early often enough to keep each board interesting.
        if rng.random() < 0.35:
            remaining.sort(key=lambda word: -len(word))
        for word in remaining:
            possibilities = options(cells, word)
            if not possibilities:
                continue
            # Sample among near-best legal placements to escape local minima.
            top = possibilities[:min(len(possibilities), 5)]
            weights = [6, 4, 3, 2, 1][:len(top)]
            choice = rng.choices(top, weights=weights)[0]
            _, row, col, direction, cells = choice
            placed.append((word, row, col, direction))
            if len(placed) >= target + 1:
                break
        top, bottom, left, right = bounds(cells)
        height, width = bottom - top + 1, right - left + 1
        score = (min(len(placed), target), -(max(height, width)), -(height * width), len(placed))
        if best_score is None or score > best_score:
            best, best_score = (cells, placed), score
    assert best and len(best[1]) >= 4, f"Unable to build {rack}"
    cells, placed = best
    top, bottom, left, right = bounds(cells)
    words = [{"word": word, "row": row - top, "col": col - left, "direction": direction}
             for word, row, col, direction in placed]
    words.sort(key=lambda entry: (entry["row"], entry["col"], entry["direction"], entry["word"]))
    return {"id": f"garden-{index + 1:03}", "title": family["title"],
            "difficulty": family["difficulty"], "letters": rack,
            "rows": bottom - top + 1, "cols": right - left + 1, "words": words}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if puzzles.js differs from generated output")
    args = parser.parse_args()
    families = json.loads(FAMILIES.read_text())
    lexicon = set(LEXICON.read_text().splitlines())
    assert len(families) == 36
    assert len({"".join(sorted(family["letters"])) for family in families}) == 36
    puzzles = []
    for index, family in enumerate(families):
        puzzle = construct(family, index)
        required = {entry["word"] for entry in puzzle["words"]}
        puzzle["bonus"] = sorted(word for word in lexicon if word not in required and fits_rack(word, puzzle["letters"]))
        assert len(puzzle["bonus"]) >= 4, (puzzle["letters"], puzzle["bonus"])
        puzzles.append(puzzle)
    source = ("// Generated by scripts/generate_puzzles.py from reviewed word families.\n"
              "// Bonus vocabulary is CC BY-SA 4.0; attribution and terms: data/DICTIONARY.md.\n"
              "export const PACK_VERSION = 1;\n"
              "export const PUZZLES = " + json.dumps(puzzles, indent=2, ensure_ascii=False) + ";\n")
    if args.check:
        assert OUTPUT.read_text() == source, "puzzles.js is stale; run scripts/generate_puzzles.py"
    else:
        OUTPUT.write_text(source)
    for puzzle in puzzles:
        print(f"{puzzle['id']} {puzzle['difficulty']:<9} {puzzle['letters']} "
              f"{puzzle['rows']}x{puzzle['cols']} {len(puzzle['words'])} answers {len(puzzle['bonus'])} bonus")


if __name__ == "__main__":
    main()
