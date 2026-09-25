# Word puzzle PWA for Mom

Research completed September 24, 2026. This is the original investigation, preserved from before implementation. See [the project README](README.md) for the finished local build.

A Wordscapes-style word puzzle is a good fit for a small, offline PWA. The recommended first version combines anagrams and a crossword grid, large readable letters, forgiving touch controls, free hints, and automatic saving. Build original puzzles and artwork under a new name.

This investigation used PeopleFun’s help center, the iOS App Store listing and promotional screenshots, Apple/WebKit documentation, and the existing Codex Hearts implementation. It did not include hands-on testing of the installed Wordscapes app. Recommendations below remain proposals until tested with Mom.

**How Wordscapes works**

The player swipes between letters in a wheel to form words that fill a crossword above it. Completing the grid advances the game. Crossing letters and word lengths provide clues; shuffling rearranges the wheel without changing its letters. Hints reveal letters. [PeopleFun’s game overview](https://peoplefun.helpshift.com/hc/en/6-wordscapes/faq/267-game-overview/)

The ordinary levels allow unlimited attempts at the player’s own pace. The App Store screenshots show a crossword above a circular letter wheel, a prominent word preview, scenic backgrounds, and several hint controls. These are promotional images rather than a complete record of the current interface. [iOS listing and screenshots](https://apps.apple.com/us/app/wordscapes-word-game/id1207472156)

| Feature | Verified behavior | Proposed treatment |
| --- | --- | --- |
| Progression | PeopleFun describes 6,000 regular levels, followed by continuing Master Levels. [Level guide](https://peoplefun.helpshift.com/hc/en/6-wordscapes/faq/275-how-many-levels-does-the-game-have/) | Start with a reviewed puzzle pack and adjustable difficulty. |
| Bonus words | Accepted words outside the grid earn coins. PeopleFun explicitly says some valid words are not accepted. [Bonus-word rules](https://peoplefun.helpshift.com/hc/en/6-wordscapes/faq/273-what-are-bonus-words-why-don-t-some-bonus-words-work-why-are-some-words-not-included-in-your-dictionary/) | Recognize every eligible word in our published dictionary rules; count each once per puzzle. |
| Hints | Random letters, targeted letters, multiple-letter reveals, and bee boosters are available. [Hint guide](https://peoplefun.helpshift.com/hc/en/6-wordscapes/faq/279-what-are-the-various-hints-and-boosters-and-what-do-they-do/) | One clearly labeled Hint control, free to use. |
| Daily puzzle | A separate daily puzzle uses butterflies to reward solving particular words in sequence. [Daily-puzzle guide](https://peoplefun.helpshift.com/hc/en/6-wordscapes/faq/270-what-is-the-daily-puzzle-and-how-does-it-work/) | Consider a daily puzzle after the main game works well. |
| Events and collections | The help center includes wildlife, portraits, butterflies, tournaments, and teams. [Help center](https://peoplefun.helpshift.com/hc/en/6-wordscapes/) | Defer these features unless Mom wants them. |
| Advertising | Both permanent and temporary removal offers are documented. Rewarded video opportunities remain after removal. [Ad-removal guide](https://peoplefun.helpshift.com/hc/en/6-wordscapes/faq/320-how-can-i-remove-ads/) | Ad-free, with no purchases or hint currency. |

The design opportunity is the small cycle of finding a word, exposing more clues, and completing a puzzle. That is an interpretation of the mechanics, not a measured claim about why Mom enjoys the game. Her familiarity with Wordscapes and interest in its side activities are still unknown.

**Interaction and readability**

Use the touch requirements already established for Shawn’s games. Main buttons must accept slow presses on release and modest upward drift; nearby letter buttons need tighter boundaries. Prevent text selection and Safari long-press callouts on controls, cancel interrupted gestures and extra fingers, and suppress duplicate activation. Preserve keyboard, assistive activation, mouse input, pinch zoom, and scrolling in menus. The existing [Hearts touch implementation](../hearts/touch.js) is a useful starting point for action buttons; letter swiping needs its own gesture handling.

Offer two explicit input modes. The proposed initial default is **Tap letters**, pending Mom’s preference:

- **Tap letters:** select letters one at a time, review the large word preview, use Undo or Clear to revise it, then press Submit. A small drift must not silently change the selected letter.
- **Swipe letters:** trace a continuous path through the wheel. For the first prototype, retain the word for review on release and use Submit. Test whether Mom prefers an optional submit-on-release setting. Backtracking should undo the last letter; one tile cannot appear twice in a word, while duplicate-letter tiles remain separate choices.

The same rules and puzzles must work in both modes. PeopleFun documents missed connections and out-of-order letters as causes of failed swipes, which makes testing this interaction particularly relevant. [Swipe troubleshooting](https://peoplefun.helpshift.com/hc/en/6-wordscapes/faq/326-why-did-a-word-not-swipe-on-my-first-attempt/)

Use solid, high-contrast surfaces behind the letters and grid. Keep scenery outside those surfaces. Aim initially for 56–64 CSS-pixel letter targets, generous action buttons, and 28–36 CSS-pixel wheel lettering, then check actual fit and comfort on Mom’s phone. These dimensions are starting design choices. Keep adult vocabulary and make difficulty independent of text size. Start with compact grids instead of shrinking a large board to fit.

Keep the puzzle, word preview, wheel, and main controls on one portrait screen where practical. Show progress as “4 of 7 words.” Use brief feedback such as “Already found” or “Bonus word,” without blocking play. Completion waits for **Next puzzle**. Include Reduced Motion support and optional sound.

**Puzzle content is the main production task**

Use two word sets: a carefully reviewed set for required answers, and a broader accepted set for bonus words. Proposed English rules are words of at least three letters, ordinary plurals and inflections allowed, and no proper names, abbreviations, or punctuation. Keep explicit corrections so a missing everyday word can be added consistently.

The [English Speller Database, formerly SCOWL](https://github.com/en-wl/wordlist), is a candidate source. It includes spelling variants and word-commonness categories and describes its combined distribution as MIT-like. Before packaging an extracted list, pin a revision and retain its copyright notices. Its spellchecking categories help filter vocabulary but do not establish puzzle difficulty or eliminate the need for review.

Generate puzzles during development and ship validated data with the app:

1. Choose a four-to-six-letter rack for the initial pack, with seven-letter puzzles added after layout testing. Track letter counts, including duplicates.
2. Find eligible words from those letters; choose familiar required answers and keep other accepted words as bonuses.
3. Place required words in a compact connected crossword. Validate matching crossings, spacing, and the absence of unintended adjacent words.
4. Reject duplicate puzzles, repetitive answer sets, and boards that exceed the readable layout limits. Review required vocabulary and difficulty by hand.
5. Export stable puzzle IDs, tile letters, answer placements, bonus words, and content-version metadata. Keep unfinished puzzles stable across updates.

The first pack should establish puzzle quality before investing in thousands of levels. Proposed scope: 20 reviewed puzzles for the first playtest, then a 100-puzzle release pack after feedback. No runtime AI or online dictionary is needed for that approach.

**PWA implementation**

Use plain HTML, CSS, JavaScript, and SVG in this directory, following the existing repository’s static hosting approach. Separate puzzle validation, game state, input handling, rendering, and saving. A backend is unnecessary for one-device play; automatic cross-device sync would be additional work.

Cache the app, icons, and complete puzzle pack with a service worker. Offline play is available only after those resources have successfully downloaded. A manifest and Apple touch icon provide home-screen identity. Show “Ready for offline play” after verifying the cache, and apply updates between puzzles. [MDN’s offline PWA guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)

On iPhone, the installation flow is Safari’s Share menu → Add to Home Screen, with Open as Web App enabled where shown. Open the installed app online once before testing it in airplane mode. [Apple’s installation instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios)

Save after each accepted word and hint. Store the current puzzle, found words, revealed cells, preferences, and pack version; retain a previous valid save and provide export/import in settings. Handle storage failure without falsely claiming that progress was saved. WebKit storage is best-effort by default; request persistent storage where supported, but retain recovery options. [WebKit’s storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/)

Safari and the installed home-screen app must be treated as separate save contexts. WebKit documents that installation copies cookies but not other local storage, and subsequent website data is not shared. Install before sustained play or provide an explicit progress-transfer path. Verify this on Mom’s iOS version. [WebKit’s home-screen storage behavior](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/)

Use a game-specific save namespace, cache prefix, and worker scope under `/word-garden/`. Cache cleanup must touch only this game’s caches. The existing Hearts worker already restricts cleanup to its own prefix.

**First build and evidence required**

Build the 20-puzzle prototype with both input modes, shuffle, free letter hints, bonus-word recognition, resume, and offline installation. Use it to settle comfortable letter size, compact grid limits, input preference, and difficulty. Then expand the puzzle pack and finish the name, icon, and visual theme.

Validate puzzle solvability, letter multiplicity, crossings, accepted/duplicate/bonus word handling, hints, completion, save restoration, and updates. Inspect real renders in desktop WebKit at short and standard portrait sizes and landscape. Exercise slow holds, upward drift, cancellation, multi-touch, correction, and duplicate-click prevention.

A physical iPhone playtest must cover Mom’s touch behavior, preferred display settings, Safari toolbars, home-screen installation, relaunch while offline, and resuming progress. Desktop WebKit checks are supporting evidence; none of these checks has been performed for a new word game yet.

Outstanding inputs are Mom’s experience with Wordscapes, favorite features, usual difficulty, preferred input method, and phone/iOS version. The current proposed defaults are English, solo play, adjustable difficulty, tap-and-confirm input, and free hints. Publication remains a separate step following Shawn’s release instructions.
