# Making card games easier to see and follow

Shawn Hanna · Product owner and design lead · Updated September 24, 2026

[Play Hearts](https://sghanna.github.io/codex/hearts/) · [Source and validation](https://github.com/sghanna/codex/tree/main/hearts) · [Earlier Solitaire project](https://sghanna.github.io/agy-solitaire/)

My mother has low vision and enjoys card games. I wanted her to have an ad-free game with readable cards, clear choices, and enough time to understand what happened before making the next move.

I started with Solitaire and extended the work to Hearts. I defined the user constraints, reviewed working alternatives, selected the designs, and corrected details that made the game harder to follow. AI coding assistants implemented the software and ran technical checks. The work gave me a concrete way to practice turning a user's needs into requirements that could be inspected and tested.

## What carried forward from Solitaire

The earlier Solitaire work established several practical constraints: ranks and suits must remain readable under overlapping cards; frequently used controls need space around them; and starting a new game should be separated from routine actions such as Undo. Menu labels, language settings, and installation also belong in the accessibility work.

I used visual comparisons to choose card faces and other details. Reviewing the exposed part of a stacked card revealed why typography could not be judged only on an unobstructed card: if another card covers the Queen's tail, its rank becomes harder to distinguish. The same attention to overlap mattered when fitting a Hearts hand on a short phone screen.

Hearts introduced a different information problem. A player needs to know whose turn it is, which cards can be played, what changed after a pass, and whether an opponent is collecting all the penalty points. Those questions shaped the next round of design decisions.

## The decisions behind Hearts

### Keep cards readable when space gets tight

My mother had received seven cards of the same suit in another game. I asked to see that situation in the prototype, then challenged a layout that shrank played cards when Safari had less vertical space.

I chose vertical overlap in the hand so the cards played by other players could remain full size. The requirement became specific: ranks and corner suits must stay visible, played cards must match the hand cards' dimensions, and the main action must remain reachable. Portrait and landscape renders made those constraints reviewable.

### Preserve information on cards that cannot be played yet

Highlighting every playable card added visual emphasis I did not want. I asked for an even black overlay on the unavailable cards, with the original artwork at full brightness underneath. A card that cannot be played this turn still matters to planning the next one.

I compared overlays from 20% through 70%, first chose 20%, and then settled on 30%. I also compared three darker reds and selected Crimson, `#961c18`. Later, I spotted a separate dark strip at the bottom of the cards. It was a leftover inset shadow; removing it left one consistent shading treatment.

The comparison included calculated contrast ratios for the actual card colors. WCAG defines contrast requirements rather than an opacity setting, and includes exceptions for inactive controls. I treated continued readability as a product requirement because these cards still communicate strategy. That is a design judgment, not a claim that the game has been certified as WCAG conformant. [W3C: Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

[Inspect the shading comparison](https://sghanna.github.io/codex/reviews/card-opacity/) · [Compare the red inks](https://sghanna.github.io/codex/reviews/red-ink/)

### Make a turn visible even when every card is legal

Shading solved one question but exposed another: when all the cards were playable, nothing in the hand made the start of my turn obvious.

I requested six alternatives and chose the one that turns the felt behind the entire hand blue. It enters once, then stays still until the card is played. “Your turn” and “Choose any card” provide the same information in words. Selecting a different card does not restart the animation, and Reduced Motion retains the static blue background.

[Replay the six turn cues](https://sghanna.github.io/codex/reviews/turn-cues/)

### Show exactly which cards arrived

The three cards received after passing needed a clearer introduction. I reviewed six approaches and combined two: the arrival animation from E and the darkened original cards from C.

The three incoming cards now move into their sorted positions in the hand. The ten original cards remain shaded, so the new cards stay identifiable after the movement ends. I removed the received-card outline and badge treatments. The player presses **Start playing** when ready; the review does not advance on a timer.

This choice also set boundaries for implementation. Starting early must reveal every card and cancel the remaining motion. Opening a menu pauses movement. Rotation completes it safely. Reduced Motion provides a static review. The animation must never change the cards, scores, or saved game.

[Compare the received-card approaches](https://sghanna.github.io/codex/reviews/received-cards/)

### Keep the stakes of the hand visible

I asked for the current game's scoring to stay visible, especially when one player might take all the hearts. In Hearts, taking every penalty point changes the outcome of the hand.

Each player now has a visible current-hand score and match total. A moon watch shows the one player collecting penalty points, the number of hearts collected, and whether that player has the queen of spades. It becomes more prominent as the attempt develops. If penalty points split between players, the warning clears.

I also asked for a completed trick to animate into its winner's pile. That motion explains where the cards went. The player still decides when to begin the next trick.

### Make the game recognizable on the home screen

I compared six icons at both enlarged and approximate home-screen sizes, against light and dark backgrounds. I selected D: a crimson heart inside a gold seal on green felt. The same artwork supplies the browser favicon and installation icons.

[Compare the six icons](https://sghanna.github.io/codex/reviews/home-icons/)

## Examples from the working game

These are scripted, validated game states rendered in desktop WebKit at a 375 × 667 viewport. They illustrate the selected behaviors; they are not photographs of a usability test.

| Legal choices stay readable | A turn is clear when every card is legal |
| --- | --- |
| ![Unplayable cards have an even dark overlay while legal cards retain their full color.](https://raw.githubusercontent.com/sghanna/codex/main/portfolio/assets/legal-cards.png) | ![The whole hand has blue felt behind it, with Your turn and Choose any card above.](https://raw.githubusercontent.com/sghanna/codex/main/portfolio/assets/your-turn.png) |

| Received cards remain identifiable | Scores expose a developing moon attempt |
| --- | --- |
| ![Three newly received cards are bright while the ten original cards are shaded, with a Start playing button.](https://raw.githubusercontent.com/sghanna/codex/main/portfolio/assets/received-cards.png) | ![The visible hand scores and moon watch show an opponent collecting penalty points.](https://raw.githubusercontent.com/sghanna/codex/main/portfolio/assets/moon-watch.png) |

## How I directed the AI work

The earlier Solitaire project involved Claude, Codex, and Antigravity. During Hearts development, I asked Codex to work independently after the initial comparisons. Existing vector card artwork remained in the repository; the subsequent game behavior and screen changes were developed from my feedback.

My responsibility was to define the problem, evaluate the tradeoffs, and accept or reject the result. I asked for concrete alternatives when a visual decision was unclear. I also challenged apparently finished work when a short screen reduced readability, a turn lacked a visible signal, or an extra decoration created confusion.

Codex handled implementation, local previews, automated checks, and releases I authorized. I kept publication separate from experimentation: an accepted visual choice could be applied locally, while a GitHub push required my instruction. Confirmed decisions were then recorded in reusable project guidance so a later session could preserve them.

## What is delivered and what remains to learn

The published Hearts game supports a complete match against three computer opponents, passing, legal-move guidance, scores, save recovery, offline play, and English, Spanish, and Vietnamese. The comparison pages preserve the alternatives behind the decisions.

Technical validation during development included 120 seeded complete matches; 162 screen checks across 18 states, three viewport sizes, and three languages; and browser checks for a full hand, saved-game recovery, and offline loading. Animation checks covered interruption, rotation, Reduced Motion, early continuation, and unchanged game state. The selected icon files were checked in WebKit and through the offline cache. [Validation details and scripts](https://github.com/sghanna/codex/tree/main/hearts#development-and-validation).

Those checks establish specific software behaviors. A physical iPhone playtest of the latest Hearts version with my mother is still needed, including installation, Safari's toolbars, her display settings, and whether the cues help during ordinary play. I do not yet have measured evidence of fewer mistakes, faster decisions, or sustained use.

The next playtest should answer three practical questions: Can she identify a new turn without prompting? Can she find the three cards she received? Can she follow a developing moon attempt while choosing her next card?
