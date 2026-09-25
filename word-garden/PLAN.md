# Word Garden implementation plan

Status: implemented locally September 24, 2026. The plan preceded the parallel build. Final validation and remaining physical-device checks are recorded in README.md.

Use four workstreams: root integrates UI and interaction; a puzzle specialist owns original content and content validation; an engine specialist owns pure state transitions and save validation; a PWA/test specialist owns caching, persistence, and browser checks. Use GPT-6 Sol with high reasoning for specialist coding work. The root reviews the whole product.

Shared data contract:

```js
// puzzles.js
export const PACK_VERSION = 1;
export const PUZZLES = [{
  id: 'garden-001', title: 'First leaves', difficulty: 'gentle',
  letters: 'CATS', rows: 5, cols: 5,
  words: [{ word: 'CATS', row: 0, col: 0, direction: 'across' }],
  bonus: ['ACT']
}];
// Difficulty values: gentle, steady, challenge. Coordinates start at zero.
// This is a schema example, not a production puzzle.
```

Runtime modules use native ES modules. `engine.js` accepts puzzle objects rather than importing the pack. Its exports are `createState(puzzle)`, `submitWord(puzzle,state,word)`, `revealHint(puzzle,state)`, `getCells(puzzle,state)`, `isComplete(puzzle,state)`, and `validateState(puzzle,value)`. State is `{puzzleId, found: string[], bonus: string[], revealed: string[]}`; revealed keys are `row,col`. Transitions return `{state, kind, word?, cell?}`, where kinds include `found`, `bonus`, `duplicate`, `invalid`, `short`, `hint`, and `complete`. A filled answer is complete whether revealed by guesses, crossings, or hints; completion normalizes found answers accordingly. `getCells` returns row/col/letter/key/revealed per occupied cell. `validateState` returns normalized state or null.

`storage.js` exports `loadProgress(puzzles)`, `saveProgress(progress)`, `exportProgress(progress)`, and `importProgress(text,puzzles)`. Progress schema is `{version:1, packVersion:1, currentId, states:{[id]:state}, completed: string[], settings:{difficulty:'gentle', inputMode:'tap', sound:false}}`. `loadProgress` returns `{progress, warning}` with a usable default progress if no valid save exists. `saveProgress` returns `{ok, warning}`. `exportProgress` returns JSON text; `importProgress` returns validated progress or throws an informative error. Unknown puzzle IDs must not silently destroy recoverable data. Coordinate cross-module changes before implementing them.

The root owns `index.html`, `style.css`, `app.js`, `touch.js`, `icons/`, documentation, and repository README. Content agent owns `puzzles.js`, `scripts/`, `data/`, `tests/content.test.mjs`, and dictionary notices. Engine agent owns `engine.js` and `tests/engine.test.mjs`. PWA/test agent owns `storage.js`, `service-worker.js`, `manifest.json`, `tests/storage.test.mjs`, `tests/browser.mjs`, `package.json`, lockfile, and `.gitignore`. Artifacts go in `.artifacts/` under this project.

Sequence: agree contracts; implement content/engine/UI/PWA concurrently; integrate and run unit checks; start local server; inspect browser flows and WebKit screenshots; fix issues; verify offline reload and state restoration; record actual evidence and update discoverability. No publication is included.

Acceptance: at least 36 validated puzzles; tap/swipe and keyboard play; free hints and bonuses; three difficulties; automatic save/recovery/export/import; install assets; offline readiness and reload; stable completed/next/replay flow; readable short portrait and landscape; long-press/drift/cancellation checks; a verified local URL. Physical iPhone and Mom playtests remain explicitly pending.
