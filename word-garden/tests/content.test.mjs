import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PACK_VERSION, PUZZLES } from '../puzzles.js';

const lexicon = new Set(readFileSync(fileURLToPath(new URL('../data/bonus-lexicon.txt', import.meta.url)), 'utf8').trim().split('\n'));
const families = JSON.parse(readFileSync(fileURLToPath(new URL('../data/families.json', import.meta.url)), 'utf8'));
const counts = word => [...word].reduce((result, letter) => result.set(letter, (result.get(letter) ?? 0) + 1), new Map());
const fitsRack = (word, rack) => [...counts(word)].every(([letter, count]) => count <= (counts(rack).get(letter) ?? 0));
const key = (row, col) => `${row},${col}`;

test('pack has 36 distinct reviewed racks in three tiers', () => {
  assert.equal(PACK_VERSION, 1);
  assert.equal(PUZZLES.length, 36);
  assert.deepEqual(PUZZLES.reduce((result, puzzle) => {
    result[puzzle.difficulty] = (result[puzzle.difficulty] ?? 0) + 1;
    return result;
  }, {}), { gentle: 12, steady: 12, challenge: 12 });
  assert.equal(new Set(PUZZLES.map(puzzle => puzzle.id)).size, PUZZLES.length);
  assert.equal(new Set(PUZZLES.map(puzzle => puzzle.title)).size, PUZZLES.length);
  assert.equal(new Set(PUZZLES.map(puzzle => [...puzzle.letters].sort().join(''))).size, PUZZLES.length);
});

test('common inflections and authored additions stay recognizable', () => {
  for (const family of families) for (const word of family.required) {
    assert.ok(lexicon.has(word), `${word} from the reviewed families is missing`);
  }
  const bonusFor = rack => PUZZLES.find(puzzle => puzzle.letters === rack).bonus;
  for (const word of ['CARS', 'ACES']) assert.ok(bonusFor('SCARE').includes(word));
  for (const word of ['TEN', 'TENS']) assert.ok(bonusFor('STONE').includes(word));
  assert.ok(bonusFor('HEART').includes('HER'));
  assert.ok(bonusFor('FIELD').includes('LED'));
  assert.ok(bonusFor('SINGER').includes('REINS'));
});

for (const puzzle of PUZZLES) {
  test(`${puzzle.id}: compact, connected crossword and valid bonus words`, () => {
    assert.match(puzzle.id, /^garden-\d{3}$/);
    assert.match(puzzle.letters, /^[A-Z]{5,6}$/);
    assert.ok(puzzle.rows >= 4 && puzzle.rows <= 7, `${puzzle.id}: height ${puzzle.rows}`);
    assert.ok(puzzle.cols >= 4 && puzzle.cols <= 7, `${puzzle.id}: width ${puzzle.cols}`);
    assert.ok(puzzle.words.length >= 5 && puzzle.words.length <= 7);
    assert.equal(new Set(puzzle.words.map(entry => entry.word)).size, puzzle.words.length);
    assert.ok(puzzle.words.some(entry => entry.word === puzzle.letters));

    const cells = new Map();
    const owners = new Map();
    for (const [index, entry] of puzzle.words.entries()) {
      assert.match(entry.word, /^[A-Z]{4,6}$/);
      assert.ok(fitsRack(entry.word, puzzle.letters), `${entry.word} exceeds rack`);
      assert.ok(entry.direction === 'across' || entry.direction === 'down');
      assert.ok(Number.isInteger(entry.row) && Number.isInteger(entry.col));
      const [dr, dc] = entry.direction === 'across' ? [0, 1] : [1, 0];
      assert.ok(entry.row >= 0 && entry.col >= 0);
      assert.ok(entry.row + (entry.word.length - 1) * dr < puzzle.rows);
      assert.ok(entry.col + (entry.word.length - 1) * dc < puzzle.cols);
      for (const [beforeRow, beforeCol] of [[entry.row - dr, entry.col - dc], [entry.row + entry.word.length * dr, entry.col + entry.word.length * dc]]) {
        assert.ok(!cells.has(key(beforeRow, beforeCol)), `${entry.word} boundary touches another word`);
      }
      for (let offset = 0; offset < entry.word.length; offset++) {
        const position = key(entry.row + offset * dr, entry.col + offset * dc);
        const letter = entry.word[offset];
        if (cells.has(position)) assert.equal(cells.get(position), letter, `${entry.word} crosses with a different letter`);
        cells.set(position, letter);
        const at = owners.get(position) ?? [];
        assert.ok(!at.some(owner => puzzle.words[owner].direction === entry.direction), `${entry.word} overlaps a parallel word`);
        at.push(index);
        owners.set(position, at);
      }
    }

    assert.equal(Math.min(...[...cells.keys()].map(position => Number(position.split(',')[0]))), 0);
    assert.equal(Math.min(...[...cells.keys()].map(position => Number(position.split(',')[1]))), 0);
    assert.equal(Math.max(...[...cells.keys()].map(position => Number(position.split(',')[0]))), puzzle.rows - 1);
    assert.equal(Math.max(...[...cells.keys()].map(position => Number(position.split(',')[1]))), puzzle.cols - 1);

    // Every horizontal/vertical run with two or more cells must be an answer.
    const runs = [];
    for (const direction of ['across', 'down']) {
      const [dr, dc] = direction === 'across' ? [0, 1] : [1, 0];
      for (let row = 0; row < puzzle.rows; row++) for (let col = 0; col < puzzle.cols; col++) {
        if (!cells.has(key(row, col)) || cells.has(key(row - dr, col - dc))) continue;
        let word = '';
        for (let offset = 0; cells.has(key(row + offset * dr, col + offset * dc)); offset++) {
          word += cells.get(key(row + offset * dr, col + offset * dc));
        }
        if (word.length > 1) runs.push({ word, row, col, direction });
      }
    }
    assert.deepEqual(runs.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
      [...puzzle.words].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
      'unexpected adjacency or an incomplete answer run');

    const reached = new Set([0]);
    for (let changed = true; changed;) {
      changed = false;
      for (const indices of owners.values()) if (indices.some(index => reached.has(index))) {
        for (const index of indices) if (!reached.has(index)) { reached.add(index); changed = true; }
      }
    }
    assert.equal(reached.size, puzzle.words.length, 'all answers must connect through shared cells');

    assert.ok(Array.isArray(puzzle.bonus) && puzzle.bonus.length >= 4);
    assert.deepEqual(puzzle.bonus, [...new Set(puzzle.bonus)].sort());
    for (const word of puzzle.bonus) {
      assert.match(word, /^[A-Z]{3,6}$/);
      assert.ok(fitsRack(word, puzzle.letters), `${word} exceeds rack`);
      assert.ok(!puzzle.words.some(entry => entry.word === word), `${word} is both answer and bonus`);
      assert.ok(lexicon.has(word), `${word} is missing from the reviewed bonus lexicon`);
    }
  });
}
