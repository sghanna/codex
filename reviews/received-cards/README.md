# Received-card review options

**Selected: C + E.** The main game combines the arrival animation with 30% shading on the original cards. Received-card outlines and NEW badges are removed.

Six isolated, playable previews of a validated pass from Barbara: 2♣, 4♣, Q♣. The cards land in overlapped rows, exposing the weakness of the existing small NEW labels.

A groups them in a labeled tray; B puts them in their own first row; C shades the ten original cards; D pauses on three larger cards; E animates their arrival; F requires acknowledging each card. These practice hands preserve the alternatives; the main game uses the selected C + E combination.

The demo uses separate `codex-hearts-received-option-*` saves and no service worker. `build-preview.py` rebuilds the isolated app and HTML from `../../hearts/` plus the validated `fixture.json`. Runtime styles and the engine come from the main game. The shared comparison controls and styles come from the turn-cue review.

Verified in WebKit at 375 × 667 and 844 × 390, including real play, save isolation, acknowledgment gating, arrival replay, Reduced Motion, and Spanish/Vietnamese layouts.
