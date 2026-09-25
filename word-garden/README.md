# Word Garden

A complete, ad-free word puzzle PWA for Mom: 36 original crosswords, three difficulty levels, large letter buttons, free hints, and offline play. Runtime code uses plain HTML, CSS, JavaScript, and SVG, with no external services or build step.

[Play Word Garden](https://sghanna.github.io/codex/word-garden/) · [Local preview](http://127.0.0.1:8768/word-garden/)

The [reusable build prompt](BUILD-PROMPT.md), [implementation plan](PLAN.md), and [Wordscapes research](RESEARCH.md) explain the intended experience and the work behind it. The [session handoff](SESSION-NOTES.md) records how to resume, the agent assignments, observed defects, assumptions, and remaining checks.

**Playing**

Tap letters to make a word, revise with Undo or Clear, then press Submit. Each tile can appear once in a word; duplicate-letter tiles are separate choices. Settings also offers swipe input with backtracking. Swiping retains the word for review before Submit.

Correct answers fill the crossword. Other accepted words count as bonuses, once per puzzle. Shuffle rearranges the letters. Hint reveals a useful letter and can be used freely. Answers completed by crossings or hints count automatically. There are no timers, lives, or purchases. A finished puzzle waits for Next puzzle.

Settings contains Gentle, Steady, and Challenge, with 12 puzzles each. Changing difficulty retains previous progress. Completing a garden leads to the difficulty selector; a confirmation protects restarting the current puzzle. Sounds are optional and off by default. Reduced Motion is respected.

Type letters to use a keyboard, Backspace to undo, and Enter to submit a typed word. Tab and Enter/Space also activate controls normally. Slow touch presses activate on release, tolerate modest drift on action buttons, and cancel extra fingers or interrupted gestures. Pinch zoom remains enabled.

**Installation and progress**

On a deployed HTTPS address, open Word Garden in Safari, choose Share → Add to Home Screen, enable Open as Web App where shown, then open the new icon while online. Settings → Install & play offline reports readiness only after all expected assets are cached. The local preview on this Mac also supports service workers through localhost; an ordinary HTTP address on another device does not provide the same installation/offline environment.

Progress saves after accepted guesses and hints. The previous valid save is retained as a backup. Invalid saves are checked before use; unreadable originals are preserved separately before replacement. Save failures appear in the game. Newer save versions are protected against overwrite.

Safari and a home-screen installation can keep separate data. Use Settings → Save or move your progress to export a JSON file and import it in the other installation. Browser storage is not a permanent backup. No automatic account or cross-device synchronization is included.

New workers wait while the existing version is active. At puzzle completion, settings offers an update button when an update is ready. Activating it saves progress and reloads the new version.

**Development and checks**

From the repository root:

```sh
python3 -m http.server 8768 --bind 127.0.0.1
```

Then:

```sh
cd word-garden
npm ci
npx playwright install webkit chromium
npm test
npm run test:touch
npm run test:layout
npm run test:browser
python3 scripts/generate_puzzles.py --check
```

Set `WORD_GARDEN_URL` for another preview address. Browser screenshots and reports are in the ignored `.artifacts/` directory. The browser test uses an isolated temporary server for the offline relaunch check and leaves the preview server running.

Validation completed during this build includes 53 content/engine/storage checks, nine touch/keyboard checks, and all 36 grids at 375×667, 390×740, and 844×390 in WebKit. The 108 layout cases keep the main actions on screen, letter targets at least 56 CSS pixels, and crossword cells at least 30 CSS pixels. Dialogs remain scrollable. Below the supported short viewport height, the page can scroll rather than making the letters smaller.

The browser flow covers word entry, bonuses, hints, settings, save/reload, cache readiness, and a full WebKit restart after the isolated server shuts down. A worker update stays pending during an unfinished puzzle, activates through the completion-time update control, preserves progress, and leaves an unrelated Hearts cache intact. A real export/download and import into a fresh browser restored words, bonuses, and hints. Native Chromium touch is also checked.

Playwright’s WebKit offline toggle produced an internal browser error, so the offline proof uses an actual server outage. These checks are desktop browser evidence. A physical iPhone playtest with Mom, her display settings, Safari toolbars, home-screen installation, and real pinch gestures is still pending.

**Files and provenance**

`engine.js` owns puzzle rules. `puzzles.js` contains the fixed pack. `app.js` renders the game and handles its flow; `touch.js` handles gestures. `storage.js` validates and saves progress. `service-worker.js` caches only this game’s assets. `icons/` contains the original SVG and inspected PNG exports.

The content generator checks tile counts, crossings, connectivity, word boundaries, and duplicate puzzles. Required answers were selected for this game. Bonus vocabulary is a reviewed offline subset, so some uncommon valid words may be rejected. [Dictionary notes](data/DICTIONARY.md) record the pinned ESDB source, inflection expansion, frequency filtering, authored additions, and licenses. The derived bonus vocabulary is CC BY-SA 4.0; its notices are included. The game’s original code, layouts, titles, and artwork are separate from that vocabulary license.

Cache version: `word-garden-v2`. Runtime asset URL version: `2`. Save keys use the `word-garden-progress-` prefix; neither cache cleanup nor saved games touch Hearts. GitHub Pages publishes this directory from the repository’s `main` branch. Future releases require Shawn’s publication instruction, a scoped commit, deployment, and verification of the live assets.
