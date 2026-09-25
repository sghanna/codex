# Word Garden — build and release notes

Shawn authorized the first GitHub Pages release on September 25, 2026, as **word-garden**. The canonical source and documentation are now in `/Users/shawnmac/codex/word-garden/`. Public address: [Play Word Garden](https://sghanna.github.io/codex/word-garden/). The initial build and its validation were completed September 24; the build history and remaining device checks follow.

Start with the [project README](README.md). The [one-shot prompt](BUILD-PROMPT.md), [implementation plan](PLAN.md), and [original research](RESEARCH.md) are preserved. Prompting lessons and a project reference have also been added to the local `card-game-builder` skill.

**Resume the preview**

The local preview is now [http://127.0.0.1:8768/word-garden/](http://127.0.0.1:8768/word-garden/). Its process may not survive exiting or restarting the Mac. If needed, run:

```sh
python3 -m http.server 8768 --bind 127.0.0.1 --directory /Users/shawnmac/codex
```

If the port is already occupied, check the existing page and server root before starting another process. This loopback URL is for the Mac. Use the public HTTPS address for installation on an iPhone.

Obsidian's existing vault contains linked entries named `Word Garden - Build Prompt.md`, `Word Garden - Implementation Plan.md`, and `Word Garden - Session Notes.md`. These are symlinks to the canonical project files, not independent copies.

**Decisions and assumptions**

Shawn requested an accessible, ad-free PWA inspired by Wordscapes, then authorized an autonomous build using agents after planning. Slow presses, finger drift, readable game information, and retaining the opportunity to change a selection are established requirements for his games.

The current implementation provides 36 original puzzles, three difficulty levels, tap or swipe selection with Submit confirmation, free hints, bonus words, automatic saving, export/import, and offline play. It uses plain HTML/CSS/JavaScript/SVG with original branding and artwork. Name, botanical theme, English vocabulary, tier labels, and first-pack size were implementation choices; they have not been confirmed through Mom's playtest.

The plan was written before delegation. A formal Plan Mode switch was not exposed in this session, so the work used an explicit planning pass instead. “One-shot” describes the starting brief; implementation included testing, review, and repairs. The prompt relies on local research and skill files and would need those constraints included or supplied for use elsewhere.

**Agents and review findings**

All three specialists were assigned `gpt-6-sol` with `high` reasoning. The coordinator built the interface and integrated their work; no separate model override was selected for that role. [PLAN.md](PLAN.md) records the module interfaces and file assignments. File ownership was a coordination rule, not an enforced filesystem permission.

| Workstream | Retrospective minimum of observed issues | Corrections |
| --- | --- | --- |
| Puzzle content | At least 2 | Missing common inflections; incomplete attribution of the frequency data's license. |
| Game engine | 0 identified | No engine defect identified in this run; this agent also reviewed and found problems in coordinator-written touch code. |
| Saving, offline support, and testing | At least 2 | Completion history consistency; damaged-save handling and misleading recovery wording. |
| Coordinator interface/integration | At least 6 cases | Two swipe-cancellation failures, two Enter-key behaviors, and short portrait/landscape layout failures. |

These are reconstructed minimums, not a formal defect ledger, exhaustive counts, or error rates. Related fixes were sometimes grouped. The Playwright/WebKit offline-emulation failure was an environment issue and is excluded. All identified issues were corrected. This run cannot compare model performance because all specialists used the same model on different tasks. If future model/error accounting matters, record defects, ownership, fixes, and verification as work proceeds.

**Evidence and limits**

Final checks passed: 53 content/engine/storage tests, 9 touch/keyboard tests, 108 WebKit layouts across all 36 puzzles, and browser checks for gameplay, saves, offline restart, and worker updates. The update test preserved progress and an unrelated Hearts cache. An actual download and import into a fresh browser restored words, bonuses, and hints. The fixed puzzle pack matched deterministic regeneration.

The 53 unit checks, 9 touch/keyboard checks, 108 layout cases, and browser suite passed again at the renamed `/word-garden/` path for the September 25 release. Short portrait and landscape screenshots were inspected again. Runtime assets remain at version 2; the rename required no game-code changes.

The [README](README.md) records commands, sizes, and evidence. Screenshots and machine reports are under the ignored `.artifacts/` directory. Offline proof used a full persistent-browser restart after shutting down an isolated test server, because Playwright's WebKit offline toggle produced an internal error.

Physical iPhone behavior and Mom's comfort remain untested. Bonus words come from a reviewed offline subset; some uncommon valid words may be rejected. Safari and the home-screen installation can retain separate progress, so export/import is provided. Dataset provenance and licenses are in [dictionary notes](data/DICTIONARY.md).

At wrap-up, cache version is `word-garden-v2`, runtime asset URL version is `2`, and saves use the `word-garden-progress-` prefix. Check the current files before changing versions later. Documentation-only edits made during wrap-up do not alter cached game assets.

**Next session**

1. Resume the local preview and review the first build with Shawn.
2. Use the public address for the iPhone playtest. Observe reading comfort, tap versus swipe preference, difficulty, slow presses/drift, correction, Safari toolbars/callouts, real pinch zoom, installation, and offline relaunch.
3. Make changes based on that feedback. Treat desktop checks as supporting evidence and retain the existing accessibility requirements.
4. Future changes require a new release instruction before publishing. Inspect and scope each commit; other projects can have unrelated work in the same repository.
