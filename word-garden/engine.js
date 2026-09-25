// Pure puzzle rules. A puzzle is supplied by the caller; this module has no pack or UI dependency.

function puzzleDetails(puzzle) {
  const words = puzzle.words.map(({ word, row, col, direction }) => ({
    word: word.toUpperCase(),
    cells: Array.from({ length: word.length }, (_, index) => {
      const cellRow = row + (direction === 'down' ? index : 0);
      const cellCol = col + (direction === 'across' ? index : 0);
      return `${cellRow},${cellCol}`;
    }),
  }));
  const cells = new Map();
  for (const entry of words) {
    entry.cells.forEach((key, index) => {
      if (!cells.has(key)) {
        const [row, col] = key.split(',').map(Number);
        cells.set(key, { row, col, key, letter: entry.word[index] });
      }
    });
  }
  return { words, cells };
}

function visibleKeys(details, state) {
  const visible = new Set(state.revealed);
  const found = new Set(state.found);
  for (const entry of details.words) {
    if (found.has(entry.word)) {
      for (const key of entry.cells) visible.add(key);
    }
  }
  return visible;
}

function normalizeFound(details, state) {
  const found = new Set(state.found);
  const visible = visibleKeys(details, state);
  for (const entry of details.words) {
    if (!found.has(entry.word) && entry.cells.every((key) => visible.has(key))) {
      found.add(entry.word);
      state.found.push(entry.word);
    }
  }
  return state;
}

function copyState(state) {
  return {
    puzzleId: state.puzzleId,
    found: [...state.found],
    bonus: [...state.bonus],
    revealed: [...state.revealed],
  };
}

function cleanWord(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^[A-Za-z]+$/.test(trimmed) ? trimmed.toUpperCase() : null;
}

function fitsRack(word, letters) {
  const available = new Map();
  for (const letter of letters.toUpperCase()) {
    available.set(letter, (available.get(letter) ?? 0) + 1);
  }
  for (const letter of word) {
    const remaining = available.get(letter) ?? 0;
    if (remaining === 0) return false;
    available.set(letter, remaining - 1);
  }
  return true;
}

export function createState(puzzle) {
  return { puzzleId: puzzle.id, found: [], bonus: [], revealed: [] };
}

// Treat saved data as untrusted, including values passed directly by callers.
export function validateState(puzzle, value) {
  try {
    if (!puzzle || !value || typeof value !== 'object' || Array.isArray(value)) return null;
    if (value.puzzleId !== puzzle.id) return null;
    if (!Array.isArray(value.found) || !Array.isArray(value.bonus) || !Array.isArray(value.revealed)) return null;
    const keys = ['puzzleId', 'found', 'bonus', 'revealed'];
    if (Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) return null;

    const details = puzzleDetails(puzzle);
    const required = new Set(details.words.map(({ word }) => word));
    const bonus = new Set(puzzle.bonus.map((word) => word.toUpperCase()));
    if (value.found.length > required.size || value.bonus.length > bonus.size || value.revealed.length > details.cells.size) return null;

    const state = createState(puzzle);
    for (const valueWord of value.found) {
      const word = cleanWord(valueWord);
      if (!word || !required.has(word) || state.found.includes(word)) return null;
      state.found.push(word);
    }
    for (const valueWord of value.bonus) {
      const word = cleanWord(valueWord);
      if (!word || !bonus.has(word) || required.has(word) || state.bonus.includes(word)) return null;
      state.bonus.push(word);
    }
    for (const key of value.revealed) {
      if (typeof key !== 'string' || !details.cells.has(key) || state.revealed.includes(key)) return null;
      state.revealed.push(key);
    }
    return normalizeFound(details, state);
  } catch {
    return null;
  }
}

function currentState(puzzle, state) {
  return validateState(puzzle, state) ?? createState(puzzle);
}

function complete(details, state) {
  const found = new Set(state.found);
  return details.words.every(({ word }) => found.has(word));
}

export function isComplete(puzzle, state) {
  try {
    const details = puzzleDetails(puzzle);
    const safe = validateState(puzzle, state);
    return safe !== null && complete(details, safe);
  } catch {
    return false;
  }
}

export function getCells(puzzle, state) {
  const details = puzzleDetails(puzzle);
  const visible = visibleKeys(details, currentState(puzzle, state));
  return [...details.cells.values()]
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .map((cell) => ({ ...cell, revealed: visible.has(cell.key) }));
}

export function submitWord(puzzle, state, value) {
  const safe = currentState(puzzle, state);
  const details = puzzleDetails(puzzle);
  if (complete(details, safe)) return { state: safe, kind: 'complete' };

  const word = cleanWord(value);
  if (word === null) return { state: safe, kind: 'invalid' };
  if (word.length < 3) return { state: safe, kind: 'short', word };
  if (!fitsRack(word, puzzle.letters)) return { state: safe, kind: 'invalid', word };
  if (safe.found.includes(word) || safe.bonus.includes(word)) return { state: safe, kind: 'duplicate', word };

  if (details.words.some((entry) => entry.word === word)) {
    const next = copyState(safe);
    next.found.push(word);
    normalizeFound(details, next);
    return { state: next, kind: complete(details, next) ? 'complete' : 'found', word };
  }
  if (puzzle.bonus.some((entry) => entry.toUpperCase() === word)) {
    const next = copyState(safe);
    next.bonus.push(word);
    return { state: next, kind: 'bonus', word };
  }
  return { state: safe, kind: 'invalid', word };
}

export function revealHint(puzzle, state) {
  const safe = currentState(puzzle, state);
  const details = puzzleDetails(puzzle);
  if (complete(details, safe)) return { state: safe, kind: 'complete' };

  const visible = visibleKeys(details, safe);
  const unsolved = details.words.filter(({ word }) => !safe.found.includes(word));
  const candidates = new Map();
  for (const entry of unsolved) {
    for (const key of entry.cells) {
      if (!visible.has(key)) candidates.set(key, (candidates.get(key) ?? 0) + 1);
    }
  }
  let chosen = null;
  for (const [key, score] of candidates) {
    if (!chosen || score > chosen.score) chosen = { key, score };
  }
  if (!chosen) return { state: normalizeFound(details, safe), kind: 'complete' };

  const next = copyState(safe);
  next.revealed.push(chosen.key);
  normalizeFound(details, next);
  const cell = { ...details.cells.get(chosen.key), revealed: true };
  return { state: next, kind: complete(details, next) ? 'complete' : 'hint', cell };
}
