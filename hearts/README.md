# Codex Hearts for Mom

A complete, ad-free Hearts game for one person and three computer opponents. Open `index.html` through an HTTP server; there is no build step or runtime dependency.

## Playing

Choose three cards and confirm the pass. Watch the three received cards move into your hand, then press **Start playing** when ready. On your turn, select an unshaded legal card and press **Play card**. After the fourth card, the winner is highlighted. The cards briefly stay face up, then gather and slide into that player’s pile. Press **Next trick** when ready to continue; the final trick offers **See scores**.

On your turn, unplayable cards receive a 30% black overlay over their full-color faces. Legal cards retain their ordinary appearance; selection still uses magenta. Red ranks and suits use B, Crimson (#961c18). The heading says **Your turn**, counts legal choices, and explains which suit to follow. When every card is legal, it says **Choose any card**. The felt behind the whole hand turns blue (#12476a) with a light blue border (#91d3ff), using option F from the turn-cue review. The 800 ms entrance runs once per turn; the blue stays until you play. Reduced Motion shows the blue immediately without animation. Tapping a shaded card explains the rule. A sole legal card is selected automatically; you still press **Play card** to confirm it. Passing and waiting keep all cards readable.

Four aligned player columns keep points taken this hand and match totals visible above the corresponding played cards. A moon watch names the only player who has taken points once they collect four hearts; it becomes an alert at eight hearts or 20 points. It shows hearts out of 13, queen ownership, and points out of 26. If points split between players, the watch clears. Pending complete tricks count immediately without changing the match total until the hand ends.

A brief deal animation, collected-card movement, and a small emblem for a clean hand add motion and reward without flashing or confetti. Reduced Motion disables the new animations.

**Menu** contains total scores, your current hand points, the last completed trick, settings, and a guarded New game action. Progress saves after every action. Settings include English, Spanish, Vietnamese, opponent speed, and optional soft sounds. The device language supplies the initial choice; `?lang=es` and `?lang=vi` also work.

On iPhone, open the deployed page in Safari, choose **Share → Add to Home Screen**, and open it once online. The service worker caches all game assets for offline play.

## Rules

- Pass three cards left, right, across, then keep your cards; repeat each match.
- The 2 of clubs starts each hand. Follow the led suit when possible.
- Avoid hearts and the queen of spades on the first trick when a non-point card is available.
- Lead hearts only after a heart has been played, unless you have only hearts. The queen does not break hearts.
- The highest card in the led suit takes the trick. Hearts count 1 each; the queen of spades counts 13.
- Taking all 26 points adds 26 to each opponent and zero to the shooter.
- When someone reaches 100, the unique lowest total wins. A tie for lowest continues for another hand.

The opponents use only their own hands and public play history. Their strategy is deliberately simple: shed dangerous cards, follow suit, and try to avoid taking penalties. Deals use browser cryptographic randomness.

## Files and saved games

`engine.js` owns immutable rule transitions and save validation. `app.js` handles interaction, timers, rendering, sound, and storage. `insights.js` derives rule guidance and moon progress from public play. `i18n.js` contains translations. `deck.js` supplies the traced SVG card faces. The three CSS files cover the table, score/review screens, and responsive gameplay additions.

The new save format uses `codex-hearts-game-v2`, with the preceding valid save in `codex-hearts-game-v2-backup`. Restoration checks all 52 cards and replays the hand to reject impossible states. Invalid saves fall back to the backup; otherwise a new game starts. The earlier Hearts implementation's save is left untouched and is not imported. Preferences use `codex-hearts-settings-v2`. Storage failure is reported in Menu.

Opponent timers and trick animations pause while a dialog is open or the page is hidden. The next trick never starts automatically. Reduced Motion skips the traveling cards; the winner highlight and pile remain. Reloading during an animation restores the completed trick without scoring it twice. At short heights, hand rows overlap while played cards retain the same dimensions as hand cards. Ranks and corner suits stay visible. During the received-card review, the ten original cards have a 30% black overlay. The three new cards remain bright with no colored outline or NEW badge. They travel into their sorted positions one at a time, and the shading remains until **Start playing**. Menu and hidden-page states pause their arrival; rotation finishes it safely, and starting early cancels the remaining movement. Reduced Motion uses a static three-card review. The animation never changes the saved cards or scores.

## Development and validation

From the repository root:

```sh
python3 -m http.server 8767
```

In another terminal:

```sh
cd hearts
npm ci
npx playwright install webkit chromium
npm test
npm run test:browser
```

Set `HEARTS_URL` to test another deployment. `PLAYWRIGHT_MODULE` can point to an existing Playwright module, and `CHROME_PATH` can select a local Chrome binary. Browser screenshots and metrics go to the ignored `.artifacts/` directory.

Validation includes 120 seeded complete matches (1,321 hands), every pass direction, forced-play exceptions, moon scoring, ties, save validation, and card conservation. Browser checks exercise a full hand with real clicks, reloads, guarded restart, language persistence, paused opponents, offline play, damaged saves, and storage failure. Trick-animation tests cover every winner in portrait and landscape, completion without a test clock, paused menus, reloads during flight, rotation, Reduced Motion, and the final trick. Received-card tests cover each arrival, unchanged saves, early continuation, settings changes, pause, rotation, reload, and Reduced Motion. Guidance and turn-cue checks cover legal-card contrast, sole-card confirmation, live scoring, moon alerts, stable announcements, and the start of a turn when every card is legal. The visual suite renders 18 game states at 390×740, 375×667, and 844×390 in all three languages, including moon/tie combinations, a moon in progress, and received cards in overlapping rows.

These checks use desktop WebKit and Chrome. The release still needs a physical iPhone playtest with Mom, including Safari toolbars, Home Screen installation, and her preferred text/display settings.

## Release

The home-screen icon and browser favicon use option D, Gold seal: a crimson heart in a gold medallion on green felt. Apple touch and manifest icon URLs are versioned; all icon assets are cached for offline use. The six design options are preserved at `../reviews/home-icons/`.

Publish this version at `https://sghanna.github.io/codex/hearts/`. Keep its cache and storage names separate from other game versions.

Current cache version: `codex-hearts-v15`. After changing runtime assets, bump the version in `service-worker.js` and the asset query strings in `index.html`. Publish only when Shawn requests it; for an authorized release, commit, push, and verify that GitHub Pages serves the new worker and changed assets. Tests and development files are not precached.
