# Study 01 — Silky Frame Reveal

**Source:** `index.html` (single self-contained file, ~100 lines)
**Original artifact:** https://claude.ai/artifact/JS5enV1GnFYxaqctjPVTiq

## What it does

The study opens on a black square screen. The user pinches outward (or scrolls, or presses `+`) and a camera viewfinder grows from the centre, revealing a grayscale landscape behind it. The opening follows the gesture with a smooth eased lag. When the frame reaches full size, it locks open: the camera is "ready".

## Visual components

| Component | What it looks like | Where |
|---|---|---|
| Stage | Square black container, max 560px, rounded corners, focusable | `#stage` (HTML line 19, CSS line 11) |
| Scene | Grayscale SVG landscape: sky gradient, sun, two hill bands, two peaks | `<g id="scene">` (lines 26–32), gradient `#sky` in `<defs>` |
| Mask | Black surround with a rounded-square hole (even-odd path). Fully opaque while opening, dims to ~38% once nearly open | built in `draw()` (line 46), first `h+=` |
| Frame outline | Thin white rounded rect at the hole's edge | `draw()` |
| Rule-of-thirds grid | 2×2 white lines, fades in between 25% and 90% open | `draw()`, `ga` opacity |
| Corner brackets | Four thick white L-shaped corners with a drop shadow (`#sh` filter), fade in during the first 12% | `draw()`, `forEach` over corners |
| Focus reticle | Centre circle plus four tick marks, fades in from 35% open | `draw()`, `fa` opacity |
| Pinch cue | Two finger dots spreading diagonally with arrowheads, looping every 2.6s | `drawCue()` (line 65), `arrow()` (line 64), drawn into `<g id="cue">` |
| Restart button | Round white 36px button, top-left, circular-arrow icon | `#rs` (line 35, CSS line 15) |

All frame geometry scales with the current size `s`: corner radius `R = s*.083`, bracket length `L = s*.183`, reticle radius `s*.067`.

## Interaction model

### Inputs → `push(delta)` (line 45)
| Input | Effect | Code |
|---|---|---|
| Two-finger pinch (touch/pointer) | Change in finger distance × SVG scale (`kk()`) × 1.8 | `pointerdown`/`pointermove`/`pointerup` (lines 79–83), multi-pointer map `P` |
| Mouse wheel / trackpad scroll | `-deltaY × 0.35` | `wheel` listener (line 84) |
| Trackpad pinch (`ctrlKey` wheel) | `-deltaY × 1.6` | same |
| `+` `=` `ArrowUp` | +18 | `keydown` (line 85) |
| `-` `_` `ArrowDown` | −18 (closes) | same |
| Restart click | Resets target to 0 | `rs` click (line 89) |

### State
- `t`: target openness, 0–400 (`MAX`), set by input.
- `c`: displayed openness. It eases toward `t` each frame with `c += (t-c)*(1-0.0009^dt)` (the "silky" lag), in `tick()` (line 91).
- `done`: true once `t ≥ 399`. Input is ignored from then on and `#stage` gets class `.done`.
- `ca`: alpha of the pinch cue.

### States and transitions
1. **Closed / prompting**: `t < 4`, no fingers down. The screen is black and the pinch cue loops.
2. **Opening**: the cue fades out (`ca → 0`). The frame grows and its layers fade in on staggered progress thresholds (brackets, then grid, then reticle). The user can pinch back in to close it again.
3. **Opening, final 15%**: the frame insets by up to 8 units so it sits just inside the edge, and the mask softens from black to a dim overlay.
4. **Done (locked open)**: `t = 400`. Gestures no longer change anything. *This is the natural hand-off point to the next study.*
5. **Restart**: `t = 0` and `done = false`. The frame eases closed (animated, not instant) and the cue returns.

### Feedback
Visual only. There is no sound and no text. The aria-label on `#stage` describes the gesture.

## Dependencies and assets
- None. No external scripts, fonts or images. The landscape is inline SVG.
- Works opened directly as a file (`file://`) or from any static server.
- The first `<style>` block on line 1 and `<meta name="claude:viewport-fit-sides">` come from the claude.ai artifact host wrapper. They are harmless and kept so the page renders exactly as published.

## Integration notes
- The script is wrapped in an IIFE, so it has no globals.
- `requestAnimationFrame(tick)` runs continuously, even after `done`.
- Generic IDs that may collide when merged with other studies: `#stage`, `#svg`, `#scene`, `#rs`. CSS custom properties `--bg`, `--fg`, `--line` are defined on `:root`.
- To expose completion, add a hook where `done=true` is set in `push()`, e.g. dispatch a `CustomEvent('frame:ready')`.
- Unused leftovers (safe to remove): `scene`, `idleAt`, `cT`, and `e` inside `drawCue()`.
