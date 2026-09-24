# Codex Hearts for Mom

A complete, ad-free Hearts game for one person and three computer opponents. Open `index.html` through an HTTP server; there is no build step or runtime dependency.

## Playing

Choose three cards and confirm the pass. Watch the three received cards move into your hand, then press **Start playing** when ready. On your turn, select an unshaded legal card and press **Play card**. After the fourth card, the winner is highlighted. The cards briefly stay face up, then gather and slide into that player’s pile. As soon as the cards reach the winner’s pile, the next trick starts automatically. The final trick opens the scores as soon as collection finishes. The next hand still waits for **Continue**.

Slow finger presses work on release without selecting game text or opening Safari’s long-press callout. **Play card** and the other bottom action states tolerate a small slide, including release just above the button. Larger drags cancel the press. Cards use a tighter movement limit to avoid selecting a neighbor. Selecting another card before confirming remains the default; pinch zoom, keyboard, and mouse controls remain available.

On your turn, unplayable cards receive a 30% black overlay over their full-color faces. Legal cards retain their ordinary appearance; selection still uses magenta. Red ranks and suits use B, Crimson (#961c18). The heading says **Your turn**, counts legal choices, and explains which suit to follow. When every card is legal, it says **Choose any card**. The felt behind the whole hand turns blue (#12476a) with a light blue border (#91d3ff), using option F from the turn-cue review. The 800 ms entrance runs once per turn; the blue stays until you play. Reduced Motion shows the blue immediately without animation. Tapping a shaded card explains the rule. A sole legal card is selected immediately and plays automatically after three seconds. The button shows the countdown; tap **Play card** to play sooner. Menu and a hidden page pause the remaining time. With two or more legal cards, you choose and confirm the move. Passing and waiting keep all cards readable.

The selected A + C design keeps four aligned player columns with current-hand points and match totals above the played cards. Large heart counts stay directly beneath those cards, with Q♠ beside its owner. A cream panel above your hand names anyone who could shoot the moon, shows hearts out of 13 and queen ownership, and explains how another player can stop it. When points split, the panel turns green and says no one can shoot the moon. Pending completed tricks count immediately; cards in an unfinished trick have no owner yet. On short screens with a full three-row hand, the panel keeps the name and numeric progress while the decorative heart strip and advice are omitted. In landscape the panel sits beside your hand. The original A, B, and C proposals remain at `../reviews/heart-tracking/`.

A brief deal animation, collected-card movement, and a small emblem for a clean hand add motion and reward without flashing or confetti. Reduced Motion disables the new animations.

**Menu** contains total scores, your current hand points, the last completed trick, settings, and a guarded New game action. Progress saves after every action. Settings include English, Spanish, Vietnamese, opponent speed, optional soft sounds, and **Play cards with one tap**. One-tap play is off by default, so you can select another card before confirming. When enabled, tapping a legal card plays it immediately. The setting is saved; passing still requires choosing three cards and confirming, and the three-second timer for a sole legal card still applies. The device language supplies the initial choice; `?lang=es` and `?lang=vi` also work.

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

`engine.js` owns immutable rule transitions and save validation. `app.js` handles interaction, timers, rendering, sound, and storage. `touch.js` handles slow presses, finger drift, cancellation, and duplicate touch clicks. `insights.js` derives rule guidance and moon progress from public play. `i18n.js` contains translations. `deck.js` supplies the traced SVG card faces. The three CSS files cover the table, score/review screens, and responsive gameplay additions.

The new save format uses `codex-hearts-game-v2`, with the preceding valid save in `codex-hearts-game-v2-backup`. Restoration checks all 52 cards and replays the hand to reject impossible states. Invalid saves fall back to the backup; otherwise a new game starts. The earlier Hearts implementation's save is left untouched and is not imported. Preferences use `codex-hearts-settings-v2`. Storage failure is reported in Menu.

Opponent timers, trick animations, and automatic play pause while a dialog is open or the page is hidden. A sole-card countdown resumes with its remaining time. A collected trick advances once the game is visible and dialogs are closed. Reloading starts a fresh review and countdown. Reduced Motion skips the traveling cards; the winner highlight and pile remain. Reloading during an animation restores the completed trick without scoring it twice. At short heights, hand rows overlap while played cards retain the same dimensions as hand cards. Ranks and corner suits stay visible. During the received-card review, the ten original cards have a 30% black overlay. The three new cards remain bright with no colored outline or NEW badge. They travel into their sorted positions one at a time, and the shading remains until **Start playing**. Menu and hidden-page states pause their arrival; rotation finishes it safely, and starting early cancels the remaining movement. Reduced Motion uses a static three-card review. The animation never changes the saved cards or scores.

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

Validation includes 120 seeded complete matches (1,321 hands), every pass direction, forced-play exceptions, moon scoring, ties, save validation, and card conservation. Browser checks exercise a full hand with real clicks, reloads, guarded restart, language persistence, paused opponents, offline play, damaged saves, and storage failure. Trick-animation tests cover every winner in portrait and landscape, completion without a test clock, paused menus, reloads during flight, rotation, Reduced Motion, and the final trick. Automatic-advance tests cover immediate continuation after collection, paused dialogs and hidden pages, rotation, reloads, and final scores. One-tap tests cover the default confirmation step, changing selection, saved settings, illegal-card rejection, and passing. Sole-card tests cover instant selection, the full three-second countdown, manual play, remaining-time preservation, settings changes, reloads, and the rule that multiple legal choices always wait for the player. Received-card tests cover each arrival, unchanged saves, early continuation, settings changes, pause, rotation, reload, and Reduced Motion. Heart-tracking checks cover all four ownership counts, queen ownership, blocked and completed moons, the player’s own moon, pending cards, unchanged saves, and counts across automatic advance in all three languages. Guidance and turn-cue checks cover legal-card contrast, sole-card selection and automatic play, live scoring, moon alerts, stable announcements, and the start of a turn when every card is legal. The visual suite renders 18 game states at 390×740, 375×667, and 844×390 in all three languages, including moon/tie combinations, a moon in progress, and received cards in overlapping rows.

Touch checks exercise long presses, small upward slides, cancellation, changing selections, duplicate clicks, and keyboard/mouse compatibility in WebKit, plus native touch input in Chrome. They check selection prevention and that the controls permit pinch zoom. The iOS-only long-press callout and physical pinch gestures still need device testing.

These checks use desktop WebKit and Chrome. The release still needs a physical iPhone playtest with Mom, including her slow presses and finger drift, Safari toolbars, Home Screen installation, and her preferred text/display settings.

## Release

The home-screen icon and browser favicon use option D, Gold seal: a crimson heart in a gold medallion on green felt. Apple touch and manifest icon URLs are versioned; all icon assets are cached for offline use. The six design options are preserved at `../reviews/home-icons/`.

Publish this version at `https://sghanna.github.io/codex/hearts/`. Keep its cache and storage names separate from other game versions.

Current cache version: `codex-hearts-v21`. After changing runtime assets, bump the version in `service-worker.js` and the asset query strings in `index.html`. Publish only when Shawn requests it; for an authorized release, commit, push, and verify that GitHub Pages serves the new worker and changed assets. Tests and development files are not precached.
