# Six home-screen icon options

**Selected: D, Gold seal.** The game's Apple touch icon, manifest icons, and browser favicon use this design.

- A: Bold heart — the selected Crimson ink on ivory.
- B: Ace of hearts — the existing card artwork on green felt.
- C: Card fan — the existing queen, king, and ace on blue.
- D: Gold seal — a crimson heart in a brass medallion.
- E: Moonlight — a heart and crescent, referring to shooting the moon.
- F: Heart & spade — the two suits that carry points.

`node build-icons.mjs` creates standalone 512-square SVG sources using this game's local card renderer. Rasterize each with macOS QuickLook at 180, 192, and 512 pixels; save as `icons/<letter>-<size>.png`. `icons/current.png` preserves the previous artwork for comparison. All sources have opaque square backgrounds; the page simulates rounded icon masks in CSS. No external assets, fonts, or runtime dependencies.

The review shows small and large approximations of home-screen scale on light and dark sample wallpaper, plus enlarged PNGs. It does not install a service worker, change game saves, or alter the game's manifest or Apple touch icon.

Design reference: [Apple's app icon guidance](https://developer.apple.com/design/human-interface-guidelines/app-icons).
