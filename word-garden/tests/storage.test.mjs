import test from 'node:test';
import assert from 'node:assert/strict';
import { createState } from '../engine.js';
import {
  STORAGE_KEY, BACKUP_KEY, UNREADABLE_KEY, loadProgress, saveProgress, exportProgress, importProgress,
} from '../storage.js';

const puzzle = {
  id: 'garden-001', title: 'Test', difficulty: 'gentle', letters: 'CATS',
  rows: 1, cols: 4,
  words: [{ word: 'CATS', row: 0, col: 0, direction: 'across' }],
  bonus: ['ACT'],
};
const puzzles = [puzzle];

function memoryStorage() {
  const data = new Map();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };
}

test.beforeEach(() => { globalThis.localStorage = memoryStorage(); });

test('saves and restores a valid game, with the prior valid game as backup', () => {
  const { progress } = loadProgress(puzzles);
  assert.equal(progress.currentId, puzzle.id);
  progress.states[puzzle.id] = createState(puzzle);
  assert.equal(saveProgress(progress).ok, true);
  progress.states[puzzle.id].found.push('CATS');
  progress.completed.push(puzzle.id);
  assert.equal(saveProgress(progress).ok, true);
  assert.deepEqual(loadProgress(puzzles).progress.completed, [puzzle.id]);
  localStorage.setItem(STORAGE_KEY, '{broken');
  const recovered = loadProgress(puzzles);
  assert.match(recovered.warning, /restored from the last backup/);
  assert.deepEqual(recovered.progress.completed, []);
});

test('unknown puzzle records survive load, save, and export', () => {
  const base = loadProgress(puzzles).progress;
  base.currentId = 'garden-999';
  base.states['garden-999'] = {
    puzzleId: 'garden-999', found: ['ROSES'], bonus: [], revealed: ['0,0'], futureMetadata: { note: 'keep' },
  };
  base.completed = ['garden-999'];
  const imported = importProgress(exportProgress(base), puzzles);
  assert.equal(imported.currentId, puzzle.id);
  assert.equal(imported.unavailableCurrentId, 'garden-999');
  assert.deepEqual(imported.states['garden-999'], base.states['garden-999']);
  assert.equal(saveProgress(imported).ok, true);
  assert.deepEqual(loadProgress(puzzles).progress.completed, ['garden-999']);
  assert.deepEqual(JSON.parse(exportProgress(loadProgress(puzzles).progress)).states['garden-999'], base.states['garden-999']);
});

test('newer saves stay intact and cannot be overwritten', () => {
  const newer = JSON.stringify({ version: 2, packVersion: 2, currentId: 'future' });
  localStorage.setItem(STORAGE_KEY, newer);
  const { progress, warning } = loadProgress(puzzles);
  assert.match(warning, /newer/);
  assert.equal(saveProgress(progress).ok, false);
  assert.equal(localStorage.getItem(STORAGE_KEY), newer);
  assert.throws(() => importProgress(newer, puzzles), /newer/);
});

test('completion history agrees with known saved states', () => {
  const base = loadProgress(puzzles).progress;
  base.states[puzzle.id] = createState(puzzle);
  base.completed.push(puzzle.id);
  assert.throws(() => importProgress(JSON.stringify(base), puzzles), /completion record/);
  assert.equal(saveProgress(base).ok, false);
  base.completed = [];
  base.states[puzzle.id].found.push('CATS');
  const restored = importProgress(JSON.stringify(base), puzzles);
  assert.deepEqual(restored.completed, [puzzle.id]);
});

test('first save after unreadable data keeps the original bytes separately', () => {
  localStorage.setItem(STORAGE_KEY, '{broken');
  const { progress, warning } = loadProgress(puzzles);
  assert.match(warning, /could not be read/);
  assert.equal(saveProgress(progress).ok, true);
  assert.equal(localStorage.getItem(UNREADABLE_KEY), '{broken');
  assert.ok(localStorage.getItem(STORAGE_KEY).startsWith('{"version":1'));
});

test('malformed imports and unavailable storage give useful errors', () => {
  assert.throws(() => importProgress('{bad', puzzles), /valid JSON/);
  const { progress } = loadProgress(puzzles);
  const damaged = structuredClone(progress);
  damaged.states[puzzle.id] = { puzzleId: puzzle.id, found: ['NOT-IN-PUZZLE'], bonus: [], revealed: [] };
  assert.throws(() => importProgress(JSON.stringify(damaged), puzzles), /saved state/);
  globalThis.localStorage = { getItem() { throw new Error('blocked'); } };
  assert.match(loadProgress(puzzles).warning, /unavailable/);
  assert.equal(saveProgress(progress).ok, false);
});

test('a failed write reports the error and leaves the primary intact', () => {
  const { progress } = loadProgress(puzzles);
  assert.equal(saveProgress(progress).ok, true);
  const primary = localStorage.getItem(STORAGE_KEY);
  const saved = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: key => saved.getItem(key),
    setItem() { throw new Error('quota'); },
  };
  progress.settings.inputMode = 'swipe';
  const result = saveProgress(progress);
  assert.equal(result.ok, false);
  assert.match(result.warning, /full or unavailable/);
  assert.equal(saved.getItem(STORAGE_KEY), primary);
  assert.ok(saved.getItem(BACKUP_KEY));
});
