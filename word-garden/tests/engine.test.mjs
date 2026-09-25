import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createState,
  getCells,
  isComplete,
  revealHint,
  submitWord,
  validateState,
} from '../engine.js';

const puzzle = {
  id: 'garden-test',
  letters: 'CATR',
  words: [
    { word: 'CAT', row: 0, col: 0, direction: 'across' },
    { word: 'TAR', row: 0, col: 2, direction: 'down' },
  ],
  bonus: ['ACT', 'CAR'],
};

test('initial cells, guesses, and state transitions are pure', () => {
  const initial = createState(puzzle);
  assert.deepEqual(initial, { puzzleId: puzzle.id, found: [], bonus: [], revealed: [] });
  assert.equal(isComplete(puzzle, initial), false);
  assert.deepEqual(getCells(puzzle, initial).map(({ key, letter, revealed }) => [key, letter, revealed]), [
    ['0,0', 'C', false],
    ['0,1', 'A', false],
    ['0,2', 'T', false],
    ['1,2', 'A', false],
    ['2,2', 'R', false],
  ]);

  const result = submitWord(puzzle, initial, ' cat ');
  assert.deepEqual(result, { state: { ...initial, found: ['CAT'] }, kind: 'found', word: 'CAT' });
  assert.deepEqual(initial.found, []);
  assert.notStrictEqual(result.state, initial);
  assert.notStrictEqual(result.state.found, initial.found);
  assert.deepEqual(getCells(puzzle, result.state).filter(({ revealed }) => revealed).map(({ key }) => key), [
    '0,0', '0,1', '0,2',
  ]);
});

test('malformed and short guesses leave progress intact', () => {
  const state = submitWord(puzzle, createState(puzzle), 'CAT').state;
  for (const value of [null, 12, [], {}, 'C A T', 'CÁT', 'CAT!', '😀', 'CATT']) {
    const result = submitWord(puzzle, state, value);
    assert.equal(result.kind, 'invalid');
    assert.deepEqual(result.state, state);
  }
  assert.equal(submitWord(puzzle, state, '  ').kind, 'invalid');
  assert.deepEqual(submitWord(puzzle, state, 'ca'), { state, kind: 'short', word: 'CA' });
});

test('rack multiplicity uses each physical letter at most once', () => {
  const repeated = {
    id: 'duplicates', letters: 'AABC',
    words: [{ word: 'ABA', row: 0, col: 0, direction: 'across' },
      { word: 'CAB', row: 2, col: 0, direction: 'across' }],
    bonus: ['AAB'],
  };
  const initial = createState(repeated);
  assert.equal(submitWord(repeated, initial, 'AAA').kind, 'invalid');
  assert.equal(submitWord(repeated, initial, 'ABA').kind, 'found');
  const bonus = submitWord(repeated, initial, 'AAB');
  assert.equal(bonus.kind, 'bonus');
  assert.equal(submitWord(repeated, bonus.state, 'aab').kind, 'duplicate');
  assert.deepEqual(initial, createState(repeated));
});

test('required and bonus words are recognized only once', () => {
  const first = submitWord(puzzle, createState(puzzle), 'ACT');
  assert.equal(first.kind, 'bonus');
  assert.equal(submitWord(puzzle, first.state, 'act').kind, 'duplicate');
  const found = submitWord(puzzle, first.state, 'CAT');
  assert.equal(found.kind, 'found');
  assert.equal(submitWord(puzzle, found.state, 'cat').kind, 'duplicate');
  assert.deepEqual(found.state.bonus, ['ACT']);
  assert.equal(submitWord(puzzle, found.state, 'TAC').kind, 'invalid');
});

test('crossing and hinted cells can complete an answer', () => {
  const partial = { ...createState(puzzle), revealed: ['0,0', '0,1'] };
  const finishByCrossing = submitWord(puzzle, partial, 'TAR');
  assert.equal(finishByCrossing.kind, 'complete');
  assert.deepEqual(finishByCrossing.state.found, ['TAR', 'CAT']);
  assert.equal(isComplete(puzzle, finishByCrossing.state), true);
  assert.ok(getCells(puzzle, finishByCrossing.state).every(({ revealed }) => revealed));

  const start = submitWord(puzzle, createState(puzzle), 'CAT').state;
  const firstHint = revealHint(puzzle, start);
  assert.equal(firstHint.kind, 'hint');
  assert.deepEqual(firstHint.cell, { row: 1, col: 2, key: '1,2', letter: 'A', revealed: true });
  const finalHint = revealHint(puzzle, firstHint.state);
  assert.equal(finalHint.kind, 'complete');
  assert.deepEqual(finalHint.state.found, ['CAT', 'TAR']);
  assert.deepEqual(finalHint.state.revealed, ['1,2', '2,2']);
});

test('hints alone finish every occupied cell and completed actions are no-ops', () => {
  let state = createState(puzzle);
  let result;
  for (let count = 0; count < getCells(puzzle, state).length; count += 1) {
    result = revealHint(puzzle, state);
    assert.ok(result.kind === 'hint' || result.kind === 'complete');
    state = result.state;
    if (result.kind === 'complete') break;
  }
  assert.equal(result.kind, 'complete');
  assert.equal(isComplete(puzzle, state), true);
  assert.ok(getCells(puzzle, state).every(({ revealed }) => revealed));
  assert.deepEqual(revealHint(puzzle, state), { state, kind: 'complete' });
  assert.deepEqual(submitWord(puzzle, state, 'ACT'), { state, kind: 'complete' });
  assert.deepEqual(submitWord(puzzle, state, 'nonsense'), { state, kind: 'complete' });
});

test('save validation normalizes fully visible answers and harmless casing', () => {
  const raw = {
    puzzleId: puzzle.id,
    found: ['cat'],
    bonus: ['act'],
    revealed: ['1,2', '2,2'],
  };
  assert.deepEqual(validateState(puzzle, raw), {
    puzzleId: puzzle.id,
    found: ['CAT', 'TAR'],
    bonus: ['ACT'],
    revealed: ['1,2', '2,2'],
  });
  assert.deepEqual(raw.found, ['cat']);
  const allVisible = { ...createState(puzzle), revealed: getCells(puzzle, createState(puzzle)).map(({ key }) => key) };
  assert.deepEqual(validateState(puzzle, allVisible).found, ['CAT', 'TAR']);
  assert.equal(isComplete(puzzle, allVisible), true);
});

test('save validation rejects tampering and malformed structures safely', () => {
  const base = createState(puzzle);
  const bad = [
    null, [], 'saved',
    { ...base, puzzleId: 'other' },
    { ...base, extra: true },
    { ...base, found: 'CAT' },
    { ...base, found: ['DOG'] },
    { ...base, found: ['CAT', 'cat'] },
    { ...base, bonus: ['TAR'] },
    { ...base, bonus: ['ACT', 'act'] },
    { ...base, revealed: ['9,9'] },
    { ...base, revealed: ['01,2'] },
    { ...base, revealed: ['0,0', '0,0'] },
    { ...base, revealed: [null] },
    { ...base, found: [null] },
    { ...base, bonus: [{}] },
    Object.create(base),
    Object.defineProperty({ ...base }, 'found', { get() { throw new Error('hostile'); } }),
  ];
  for (const value of bad) assert.equal(validateState(puzzle, value), null);
  assert.equal(isComplete(puzzle, bad[3]), false);
});
