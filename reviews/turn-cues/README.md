# Turn cue comparison

**Selected: F, blue behind the hand.** This cue is now used by the main game.

Six playable previews of the same real Hearts position, with eleven legal cards including seven hearts. A–F compare gold, blue, ivory, a hand frame, a brighter player tile, and blue felt behind the hand.

The game assets here are a snapshot of the proposed local turn cue. Keeping them inside this review lets the comparison be published without changing the live game. `demo-app.js` seeds each option's separate `codex-hearts-turn-option-*` save; replay never reads or writes the real game's save. No service worker is registered.

The comparison supports individual replay, replaying all six, and a preview without motion. System Reduced Motion always suppresses the entrance animations. Every cue stays visible until the player confirms a card.

Verified in WebKit at 375 × 667 and 844 × 390, including real play, replay, separate saves, Reduced Motion, and a responsive comparison page.
