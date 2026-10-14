# Photo Interaction Studies

Three standalone interaction studies around one photographic moment: **open the camera → take the shot → put the photo on the wall**. Each is a single, dependency-free HTML file, exported unchanged from its claude.ai artifact.

| # | Study | Core gesture | Ends when | Docs |
|---|---|---|---|---|
| 01 | [Silky Frame Reveal](01-silky-frame-reveal/) | Pinch out / scroll / `+` to open a viewfinder | Frame fully open and locked | [STUDY.md](01-silky-frame-reveal/STUDY.md) |
| 02 | [Sharp Shutter](02-sharp-shutter/) | Tap the shutter (click, Enter, Space) | Scene frozen, "Captured" readout | [STUDY.md](02-sharp-shutter/STUDY.md) |
| 03 | [Magnet Wall](03-magnet-wall/) | Drag a print from a magnetic hand to the wall | All 4 prints pinned | [STUDY.md](03-magnet-wall/STUDY.md) |

## Running

No build step and no install.

- **Quickest:** open any `*/index.html` in a modern browser (Chrome, Safari, Firefox, Edge).
- **Static server** (recommended for touch testing on a phone over LAN):
  ```bash
  cd photo-studies
  python3 -m http.server 8000      # or: npx serve .
  # then open http://localhost:8000/01-silky-frame-reveal/
  ```

### Requirements
| Need | Used by | Notes |
|---|---|---|
| Modern browser with Pointer Events + SVG | all | Two-finger pinch in 01 needs a touchscreen. A trackpad pinch, scroll wheel or `+`/`-` keys also work |
| Web Audio API | 02 | Synthesized shutter click, no audio files |
| Network access to Google Fonts | 03 | IBM Plex Sans/Mono. Falls back to system fonts offline |

There are no npm packages, CDN scripts, images or media files. All artwork is inline SVG.

## Building a connected sequence

Each STUDY.md ends with **Integration notes** covering the completion point to hook into, global or ID collisions, and loops that keep running. In short:

- **Completion hooks:** 01 sets `done = true` in `push()`. 02 sets `state = "captured"` in the 480ms timeout inside `capture()`. 03 reaches `idx === 4` in `spawn()`.
- **Collisions:** `#reset` appears in 02 and 03. `#scene` appears in 01 and 03. CSS variable names (`--bg`, `--fg`, …) differ in value between studies. Study 03's script is **not** wrapped in an IIFE, so all of its names are global.
- **Loops:** every study runs its own `requestAnimationFrame` loop forever. Pause or tear it down when a study is off-screen.
- **Shared look:** all three are grayscale with light and dark themes via `prefers-color-scheme` or `[data-theme]`, and each has a 36px top-left restart button.

## Provenance
The first `<style>` block on line 1 of each file, and the `<meta name="claude:viewport-fit-sides">` tag, come from the claude.ai artifact host wrapper. They were kept so each page behaves exactly as published.
