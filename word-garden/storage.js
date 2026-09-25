import { isComplete, validateState } from './engine.js';

export const STORAGE_KEY = 'word-garden-progress-v1';
export const BACKUP_KEY = 'word-garden-progress-backup-v1';
export const UNREADABLE_KEY = 'word-garden-progress-unreadable-v1';
export const UNREADABLE_BACKUP_KEY = 'word-garden-progress-unreadable-backup-v1';
const VERSION = 1;
const PACK_VERSION = 1;
const DIFFICULTIES = new Set(['gentle', 'steady', 'challenge']);
const INPUT_MODES = new Set(['tap', 'swipe']);
let activePuzzles = [];

function defaults(puzzles) {
  return {
    version: VERSION,
    packVersion: PACK_VERSION,
    currentId: (puzzles.find(puzzle => puzzle.difficulty === 'gentle') ?? puzzles[0])?.id ?? null,
    states: {},
    completed: [],
    settings: { difficulty: 'gentle', inputMode: 'tap', sound: false },
  };
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFutureVersion(value) {
  return isRecord(value) && (
    Number.isInteger(value.version) && value.version > VERSION ||
    Number.isInteger(value.packVersion) && value.packVersion > PACK_VERSION
  );
}

function parseStored(text) {
  if (text === null) return null;
  try { return JSON.parse(text); } catch { return undefined; }
}

function validateProgress(value, puzzles) {
  if (!isRecord(value) || value.version !== VERSION || value.packVersion !== PACK_VERSION ||
      !isRecord(value.states) || !Array.isArray(value.completed) || !isRecord(value.settings)) {
    throw new Error('This is not a valid Word Garden progress file.');
  }
  const known = new Map(puzzles.map(puzzle => [puzzle.id, puzzle]));
  const result = defaults(puzzles);
  const states = Object.create(null);
  for (const [id, state] of Object.entries(value.states)) {
    if (!id || !isRecord(state) || state.puzzleId !== id ||
        !['found', 'bonus', 'revealed'].every(key =>
          Array.isArray(state[key]) && state[key].every(item => typeof item === 'string'))) {
      throw new Error(`The saved state for ${id || 'a puzzle'} is invalid.`);
    }
    if (known.has(id)) {
      const validated = validateState(known.get(id), state);
      if (!validated) throw new Error(`The saved state for ${id} is invalid.`);
      states[id] = validated;
    } else {
      // Retain an unavailable puzzle's data verbatim for a future pack or export.
      states[id] = state;
    }
  }
  result.states = states;
  if (!value.completed.every(id => typeof id === 'string' && id.length > 0)) {
    throw new Error('The completed puzzle list is invalid.');
  }
  result.completed = [...new Set(value.completed)];
  for (const id of result.completed) {
    if (known.has(id) && (!states[id] || !isComplete(known.get(id), states[id]))) {
      throw new Error(`The completion record for ${id} does not match its saved puzzle.`);
    }
  }
  for (const [id, state] of Object.entries(states)) {
    if (known.has(id) && isComplete(known.get(id), state) && !result.completed.includes(id)) {
      result.completed.push(id);
    }
  }
  const { difficulty, inputMode, sound } = value.settings;
  if (!DIFFICULTIES.has(difficulty) || !INPUT_MODES.has(inputMode) || typeof sound !== 'boolean') {
    throw new Error('The saved settings are invalid.');
  }
  result.settings = { difficulty, inputMode, sound };
  if (typeof value.currentId !== 'string' && value.currentId !== null) {
    throw new Error('The current puzzle ID is invalid.');
  }
  if (known.has(value.currentId)) {
    result.currentId = value.currentId;
    if (typeof value.unavailableCurrentId === 'string') {
      result.unavailableCurrentId = value.unavailableCurrentId;
    }
  } else if (value.currentId !== null) {
    result.currentId = (puzzles.find(puzzle => puzzle.difficulty === difficulty) ??
      puzzles.find(puzzle => puzzle.difficulty === 'gentle') ?? puzzles[0])?.id ?? null;
    result.unavailableCurrentId = value.currentId;
  }
  return result;
}

function readStorage() {
  try {
    return { primary: localStorage.getItem(STORAGE_KEY), backup: localStorage.getItem(BACKUP_KEY) };
  } catch {
    return null;
  }
}

export function loadProgress(puzzles) {
  activePuzzles = puzzles;
  const fallback = defaults(puzzles);
  const saved = readStorage();
  if (!saved) return { progress: fallback, warning: 'Progress storage is unavailable. Export your progress to keep a copy.' };
  const primary = parseStored(saved.primary);
  if (isFutureVersion(primary)) {
    return { progress: fallback, warning: 'This save comes from a newer Word Garden version. It was left untouched; update the game to use it.' };
  }
  if (primary !== null) {
    try {
      const progress = validateProgress(primary, puzzles);
      return { progress, warning: progress.unavailableCurrentId ? 'A saved puzzle is unavailable in this pack. Its progress was kept for export.' : null };
    } catch { /* Try the last valid backup. */ }
  }
  const backup = parseStored(saved.backup);
  if (isFutureVersion(backup)) {
    return { progress: fallback, warning: 'A backup comes from a newer Word Garden version. It was left untouched; update the game to use it.' };
  }
  if (backup !== null) {
    try {
      return { progress: validateProgress(backup, puzzles), warning: 'The saved game was damaged. Progress was restored from the last backup.' };
    } catch { /* Show a fresh game with a visible warning. */ }
  }
  return {
    progress: fallback,
    warning: saved.primary !== null || saved.backup !== null
      ? 'Saved progress could not be read. A fresh game is ready. If you have a progress file, load it in settings.'
      : null,
  };
}

export function saveProgress(progress) {
  let normalized;
  try { normalized = validateProgress(progress, activePuzzles); } catch {
    return { ok: false, warning: 'Progress was not saved because its format is invalid.' };
  }
  const saved = readStorage();
  if (!saved) return { ok: false, warning: 'Progress storage is unavailable. Export your progress to keep a copy.' };
  const primary = parseStored(saved.primary);
  const backup = parseStored(saved.backup);
  if (isFutureVersion(primary) || isFutureVersion(backup)) {
    return { ok: false, warning: 'A newer Word Garden save is stored here. This version will not overwrite it.' };
  }
  let serialized;
  try { serialized = JSON.stringify(normalized); } catch {
    return { ok: false, warning: 'Progress could not be encoded for storage.' };
  }
  if (!serialized) return { ok: false, warning: 'Progress could not be encoded for storage.' };
  try {
    // Only a validated primary may replace the last good backup.
    let validPrimary = false;
    let validBackup = false;
    try { validateProgress(primary, activePuzzles); validPrimary = true; } catch { /* damaged */ }
    try { validateProgress(backup, activePuzzles); validBackup = true; } catch { /* damaged */ }
    for (const [raw, valid, key] of [
      [saved.primary, validPrimary, UNREADABLE_KEY],
      [saved.backup, validBackup, UNREADABLE_BACKUP_KEY],
    ]) {
      if (raw === null || valid) continue;
      const kept = localStorage.getItem(key);
      if (kept !== null && kept !== raw) {
        return { ok: false, warning: 'An unreadable save is already being kept. New progress was not saved to protect it.' };
      }
      if (kept === null) localStorage.setItem(key, raw);
    }
    if (validPrimary) localStorage.setItem(BACKUP_KEY, saved.primary);
    else if (!validBackup) localStorage.setItem(BACKUP_KEY, serialized);
    localStorage.setItem(STORAGE_KEY, serialized);
    return { ok: true, warning: null };
  } catch {
    return { ok: false, warning: 'Progress could not be saved. Storage may be full or unavailable; export a copy.' };
  }
}

export function exportProgress(progress) {
  let normalized;
  try { normalized = validateProgress(progress, activePuzzles); } catch {
    throw new Error('There is no valid Word Garden progress to export.');
  }
  return JSON.stringify(normalized, null, 2);
}

export function importProgress(text, puzzles) {
  activePuzzles = puzzles;
  let parsed;
  try { parsed = JSON.parse(text); } catch {
    throw new Error('The selected file is not valid JSON. Choose a Word Garden progress export.');
  }
  if (isFutureVersion(parsed)) {
    throw new Error('This progress file comes from a newer Word Garden version. Update the game before importing it.');
  }
  return validateProgress(parsed, puzzles);
}
