# Hearts: iPad responsive design implementation brief

Update the existing Hearts game in `/Users/shawnmac/codex/hearts/` until it is comfortable, attractive, and fully playable on an iPad Air 2 and an iPad mini 5. Make portrait the polished primary experience. Landscape must remain fully playable, with a simpler arrangement acceptable. Implement, inspect real browser renders, fix failures, and deliver a working local preview with evidence. Do not stop at a proposal or mockup.

## Context and boundaries

- Work in the existing `sghanna/codex` repository. Read its `AGENTS.md`, the card-game-builder skill and its Hearts reference, and the Hearts README. The working tree already contains local opponent-name, menu, icon, and touch changes; preserve them. Do not reset the working tree or replace the game with a rewrite.
- Read `/Users/shawnmac/.codex/shawn_writing_style.md` for documentation. Keep the deliverable discoverable from the repository README.
- This task authorizes several agents and local implementation. Use `gpt-6-sol` or a higher model, `xhigh` reasoning, and the available priority service. Do not use Luna or a model below Sol. The orchestration tool exposes priority service for these models but no separate Fast toggle; do not claim to change a setting the tool cannot set.
- Keep one integrator. Agree on file ownership and the shared layout contract before concurrent edits. Avoid work on other projects. Do not commit, push, or deploy without a publication request.

## Device and browser targets

Both target devices have a 1536 × 2048 physical display. Use 768 × 1024 CSS pixels at 2× as the full portrait reference and 1024 × 768 as landscape; treat these as layout test dimensions, not a claim about Safari's usable height. The mini has the smaller physical display, so comfortable card and text sizes matter even though its CSS viewport is similar.

The Air 2 remains in the iPadOS 15 update family. Target an updated iPadOS 15.8 device and current Safari on the mini 5. Audit runtime CSS and JavaScript for the older browser. Prefer supported primitives and small fallbacks over dependencies. Desktop Playwright WebKit and an iPad user agent do not emulate the old Safari engine or prove physical-device compatibility.

Check normal browser and standalone-sized layouts. Include portrait heights 1024, 960, 900, and 860 at width 768; landscape heights 768, 700, 640, and 600 at width 1024. These reduced heights are conservative toolbar simulations. Also exercise narrower tablet windows at 600 × 900 and 507 × 900, a nearby larger tablet at 820 × 1180, and existing phone references 390 × 740, 375 × 667, and 844 × 390. React to available space rather than device-name detection.

Sources checked September 25, 2026:

- [Apple: iPad Air 2 specifications](https://support.apple.com/en-us/112017)
- [Apple: iPad mini 5 specifications](https://support.apple.com/en-us/111904)
- [Apple: display points and scale](https://developer.apple.com/library/archive/documentation/DeviceInformation/Reference/iOSDeviceCompatibility/Displays/Displays.html)
- [Apple: security releases and supported devices](https://support.apple.com/en-us/100100)

## Design outcome

Preserve the green felt, cream and brass controls, Gold seal, crimson card ink, existing SVG card art, and clear visual hierarchy. Make the tablet view feel deliberately composed. Use the width to enlarge cards, scores, names, and controls, rather than stretching a narrow phone column or simply enlarging empty felt.

At 768-pixel portrait width, aim for hand cards around 90–96 CSS pixels wide, materially larger than the current 68.4-pixel maximum. Use two balanced rows for a full hand where space permits. Keep ranks, all suit symbols, selection, and received-card states legible. Played and received cards must remain the same size as hand cards. Never shrink just the 10 or distort the card artwork. Use generous spacing with a clear relationship between each player's score, played card, and captured penalty cards.

Keep current-hand points and match totals visible throughout play. Preserve heart ownership, Q♠ ownership, moon progress, explicit blocked-moon text, turn guidance, legal-card shading, and the blue hand background on the player's turn. The hand and main action should be comfortably reachable. At supported full-window dimensions, gameplay must fit without page scrolling, hidden controls, or a clipped action button. Menus, help, name editing, and results may scroll internally when necessary.

In landscape, use a purposeful arrangement that gives the table and hand enough space. Prioritize visible ranks, tappable cards, scores, moon information, and the complete main action over ornament. Portrait-to-landscape-to-portrait transitions must not alter cards, scores, pass selections, or preferences. Narrow windows should fall back gracefully; if height is exceptionally constrained, reachable content takes precedence over hiding overflow.

## Behaviors that must survive

- Preserve Hearts rules, computer strategy, saved games, backup recovery, save keys, language selection, optional sounds, and offline operation.
- Preserve select-then-confirm by default and the ability to change one's mind. Optional one-tap play remains optional. Passing always requires three selected cards and confirmation.
- Preserve received-card review and deliberate Start playing; selected C + E behavior shades the ten original cards and moves three full-size incoming cards to their positions.
- Preserve automatic continuation after trick collection and the three-second sole-legal-card countdown. Menus and backgrounding pause the relevant timers and motion. Rotation during receipt or collection completes safely and never scores or plays twice.
- Preserve the chosen 30% black overlay, crimson ink, magenta selected-card cue, keyboard focus, and static Reduced Motion equivalents.
- Preserve slow-press release activation, modest upward drift for large actions, tighter movement limits for cards, cancellation of large drags/interrupted or multiple-finger gestures, and duplicate-click protection. Prevent text selection, image dragging, and long-press callouts on the game surface; retain editable/selectable name inputs, pinch zoom, keyboard, assistive activation, and mouse input.
- Preserve custom opponent names and the school promise, the 10-character limit, paper-white input fields, Menu's single How to play entry, full-width primary action, and the Gold seal header icon.

## Agent assignments and interface

Use three `gpt-6-sol` agents at `xhigh`, all on the tool's available priority service. The parent remains the integrator.

1. **Layout agent:** owns `style.css`, `game.css`, and `screens.css`. Build the tablet composition, landscape fallback, readable dialogs/results, and narrow/short-window handling. Inspect rendered screenshots. Do not edit application JavaScript, HTML, worker, or documentation.
2. **Runtime agent:** owns `app.js`, any necessary `touch.js` changes, and a focused responsive lifecycle test file. Implement responsive hand regrouping and safe resize behavior; audit and address concrete iPadOS 15.8 compatibility problems. Avoid speculative rewrites. Coordinate CSS needs with the layout agent.
3. **Verification agent:** owns `tests/ipad.mjs` and an ignored evidence report under `.artifacts/`. Independently test layout, hit targets, complete play, dialogs, rotation, and regressions. Report failures to their owners and retest fixes. Do not modify production code.

Shared contract: preserve the existing DOM hooks, card order, button semantics, and `.hand-row` wrappers. CSS exposes `--hand-columns` as `7` when the wider two-row hand is suitable and `5` for the established compact 5/4/4 arrangement. Application code reads this value and groups cards accordingly, preserving selection and focus. CSS owns sizing and breakpoints; JavaScript does not identify a device by user agent. The initial tablet design threshold is width ≥700 and height ≥540; landscape may use its own 5/4/4 arrangement. Changes to this contract must be communicated before implementation.

The integrator owns this brief, README updates, package scripts, HTML/manifest/worker asset versions, final review, and integration fixes after coordination. Agents must report changed files, checks performed, observed limitations, and unresolved issues. Do not label simulated touches as physical-device tests.

## Completion evidence

1. Inspect real WebKit screenshots of passing, full hand, received cards, a turn with seven cards of one suit, a completed trick, moon danger, scores, and menus. Include portrait and landscape, all three languages, and maximum-length names. Check actual hit testing at exposed rank/suit positions and action centers; element visibility alone is insufficient.
2. Verify no clipped primary action, no unwanted horizontal overflow, no obscured essential score/ownership information, equal hand/played-card sizing, and usable dialogs. Include the previously failing 1024 × 640 landscape case. Check a shortened viewport while editing names and restore the layout afterward.
3. Exercise rotation with selected pass cards, a normal selected play, received-card animation, trick collection, a sole-card countdown, and open dialogs. Confirm saved state, selected cards, focus where applicable, pause behavior, and exactly-once continuation. Test Reduced Motion as well as ordinary motion.
4. Complete a legal hand through real browser input at tablet size; confirm scores, next-hand continuation, reload/recovery, and offline reload. Reuse existing valid fixtures and engine validation rather than bypassing the rules.
5. Run the existing engine checks and applicable phone render, touch, selection, and motion/lifecycle suites. Broaden testing only when a changed behavior or a failure justifies it. Do not change existing test expectations merely to conceal a regression.
6. Audit unsupported APIs and CSS against primary WebKit/Apple documentation as needed. Record any compatibility assumptions and distinguish fallback checks from execution in Safari 15.
7. Bump the service-worker cache and matching runtime asset query strings after runtime changes. Verify that all cached assets load and offline resume works. Keep new prompt/test/documentation files out of the precache.
8. Save screenshots and machine-readable results in ignored `hearts/.artifacts/`. Update the Hearts README with the design, test commands, device targets, and honest limits. Provide a working local preview, a link to this prompt, and representative portrait/landscape images. State that hands-on checks on the actual Air 2 and mini 5 remain outstanding unless performed.

Iterate until the implementation and meaningful browser checks satisfy this brief. Deliver the finished local change; publication is a separate request.
