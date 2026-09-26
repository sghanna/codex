# Hearts iPad test build

[Play the iPad test build](https://sghanna.github.io/codex/hearts-ipad/) · [Play the original Hearts game](https://sghanna.github.io/codex/hearts/)

This is a separate test release of the responsive Hearts update, copied from the local `../hearts/` development source on September 25, 2026. The original published `/hearts/` game is unchanged. Use this test link on both iPad and iPhone to compare the layouts before replacing the original release.

Portrait uses larger cards and two balanced rows; landscape places the table beside the hand. The browser checks covered iPad Air 2 and iPad mini 5 layout dimensions, shorter browser heights, narrow windows, and the existing iPhone sizes. Physical-device checks remain outstanding, especially Safari toolbars, the on-screen keyboard, slow presses, pinch zoom, and Home Screen installation.

This build has its own saved game, preferences, and offline cache. Testing it starts separate progress and does not import or overwrite the original game's save. The Home Screen name is **Hearts iPad**. Its service-worker scope and manifest start URL stay within `/hearts-ipad/`.

The header, browser favicon, and Safari Home Screen icon use **D, Gold seal**: a crimson heart in a gold medallion on green felt. On September 25, 2026, Shawn confirmed that this is the icon Mom likes. All five icon files are exact copies of the regular Hearts artwork in `../hearts/icons/`. The moon-and-heart design remains a historical alternative; Gold seal is the settled choice for both games.

For a new Home Screen shortcut, open this test build in Safari and choose **Share → Add to Home Screen**. Its Apple touch icon and manifest icon URLs are versioned with this release.

- Game and backup keys: `codex-ipad-hearts-game-v2` and `codex-ipad-hearts-game-v2-backup`.
- Preferences: `codex-ipad-hearts-settings-v2`.
- Cache: `codex-ipad-hearts-v3`. Cleanup only removes older caches with this preview's prefix. Its prefix also avoids the original Hearts worker's cache cleanup.
- The [implementation brief](IPAD-BUILD-PROMPT.md) records the design requirements and three Sol/xhigh agent assignments.

Before this snapshot, the responsive source passed 239 tablet cases, 162 phone renders, rules, touch/confirmation, rotation, animation, and offline checks. The separate-release checks verify saving and offline-cache isolation plus portrait, landscape, and phone layout smoke tests. They use desktop WebKit and Chrome; they are not physical iPad tests.

To run the release checks, serve the repository root and run `node hearts-ipad/tests/release.mjs`. Set `HEARTS_BASE_URL` to the repository URL (default `http://127.0.0.1:8790/`), `PLAYWRIGHT_MODULE` to an installed Playwright module if needed, and `CHROME_PATH` to a local Chrome executable. Evidence is written to ignored `hearts-ipad/.artifacts/`.

Keep this snapshot independent while it is under review. Continue development in `../hearts/`; refreshing or promoting this test release requires an explicit publication request.

## September 25 wrap-up

The responsive iPad test build remains separate from the original game. Gold seal is restored across the 32-pixel PNG favicon, SVG favicon/header, 180-pixel Apple touch icon, and 192/512-pixel manifest icons. The cache and asset URLs advance to `codex-ipad-hearts-v3`. Game saves and preferences retain their existing keys.

Validation for this icon release passed: WebKit renders at iPad portrait/landscape and two iPhone sizes, save/settings isolation, both games’ offline caches, versioned favicon and Apple touch links, manifest icon references, and all PNG dimensions. All five icon files match the regular Hearts artwork and load through the new worker while offline.

Next session: test the published build on Mom’s iPad Air 2, Shawn’s iPad mini 5, and an iPhone. Review portrait and landscape play, rotation with cards selected, Safari toolbars, Home Screen installation, and Mom’s slow presses and slight finger drift. Physical-device testing is still outstanding; the original `/hearts/` release has not been replaced.
