# Study 03 — Magnet Wall

**Source:** `index.html` (single self-contained file, ~245 lines)
**Original artifact:** https://claude.ai/artifact/Aa4CVy4M4mUKooAF9jFnwi

## What it does

A dark "magnetic" hand rises from the bottom of a plaster wall, holding a photo print suspended above it by dashed magnetic lines. The user drags the print onto the wall and lets go, and it's pinned in place with a pushpin. Four prints arrive one after another. When all four are up, the sequence completes.

## Visual components

| Component | What it looks like | Where |
|---|---|---|
| Header | Title "Magnet Wall" and counter (`Photo n of 4` / `4 of 4 pinned`) | `.head`, `#count` (line 95) |
| Wall | 680×470 SVG, light plaster fill with faint horizontal courses every 60px | `#scene` (line 101), `.wall-fill`, `.wall-line` |
| Pinned layer | Prints that have been placed, each with a drop shadow and a pushpin | `<g id="pinned">` (line 107), filled by `pin()` |
| Hand | Four finger strokes (`#f0`–`#f3`), thumb `#th` and a rounded palm. The fingers curl via `setHand(k)` | lines 108–117, `setHand()` (line 147) |
| Magnetic lines | Three dashed lines from the hand to the bottom of the held print, with a "marching ants" CSS animation | `#lines` (line 118), `.march` keyframes (line 88) |
| Held print | Print frame (112×136, white border, caption bar) plus artwork plus a shadow `#hs` that offsets to show lift | `#held` (line 121), `setHeld()` (line 157) |
| Print artwork | Four inline-SVG placeholder photos: mountains and sun, night with moon, overlapping circles, waves | `art[]` (line 137), `frame` (line 136) |
| Reset button | Square 36px icon button, top-left | `#reset` (line 98) |
| Caption | Instruction or completion message | `#msg` (line 127), `setMsg()` (line 183) |

Fonts are IBM Plex Sans and Mono (Google Fonts). Light and dark themes come from CSS custom properties on `:root`.

## Interaction model

### Inputs
| Input | Effect | Code |
|---|---|---|
| Pointer down on held print | Start drag. Records grab offset, lifts the print (scale 1.06, shadow offset 8) | line 211 |
| Pointer move | Print follows the pointer, clamped to x 56–624 and y 68–410. It tilts up to ±9° with horizontal distance from the hand | line 220 |
| Pointer up / cancel | `release()` decides between snap-back and pin | line 226 |
| Reset button | Clears the wall, `idx = 0`, respawns print 1 | line 240 |

Pointer capture is used, so mouse, touch and pen all work. `touch-action: none` on the SVG prevents scroll during a drag. There is no keyboard path for dragging.

### State
- `idx` (0–4): which print is current.
- `drag`: true while the pointer is held.
- `busy`: true while a print is spawning or animating, which blocks new drags.
- `curl`: smoothed finger curl, eased toward a target each frame in `loop()` (line 169).

### States and transitions
1. **Spawning** (`spawn()`, line 192): the print scales in from 0.6 → 1 and fades in over 350ms. Then `busy = false`.
2. **Idle / hinting**: on a 2.8s cycle the hand curls its fingers and the print bobs down 9px and shrinks slightly. This is a "grab me" invitation. It is disabled under reduced motion.
3. **Dragging**: fingers hold a 0.9 curl, the print lifts and tilts, and the magnetic lines stretch to follow it.
4. **Release, too low** (`y > 250`): the print eases back to the hand over 260ms and returns to Idle.
5. **Release on the wall** (`y ≤ 250`): the print settles over 180ms to a clamped wall position (x 70–610, y 80–200) and its preset tilt (`rots = [-4, 3, -2, 5]`). Then `pin()` (line 199):
   - clones the print into `#pinned` with a static shadow
   - a pushpin drops in at the top (scale 1.7 → 1, slides 16px, 260ms)
   - `idx++`, and the next print spawns after 420ms
6. **Complete** (`idx === 4`): the held print and lines are hidden, the counter reads `4 of 4 pinned`, the caption reads the completion message and `busy` stays true. *This is the end of the sequence.*
7. **Reset**: returns to Spawning with print 1.

### Feedback
Visual and text only, with no sound. Feedback comes from the lift shadow, tilt, finger curl, stretching dashed lines, settle-and-pin animation, counter and caption. The counter is `aria-live`.

### Animation helpers
- `tween(ms, fn, done)` (line 164): rAF tween with ease-out cubic.
- `setHeld(x, y, rot, scale, lift)`: one call positions the print and its shadow and re-aims all three magnetic lines.

## Dependencies and assets
- **Google Fonts** (network): IBM Plex Sans 400/500 and IBM Plex Mono 400/500, loaded on lines 4–6. If offline, it falls back to `system-ui` and `ui-monospace`. Behaviour is unaffected, only the typography changes.
- No other scripts, images or audio. The photos are inline SVG placeholders. To use real photos, swap the strings in `art[]` for `<image href="…" x="-46" y="-58" width="92" height="92" preserveAspectRatio="xMidYMid slice"/>`.
- Works opened directly as a file or from any static server.
- The line-1 `<style>` block and `claude:` meta tag come from the claude.ai artifact host wrapper and are kept as published.

## Integration notes
- **The script is not wrapped in an IIFE.** These top-level globals will collide when merged with other studies: `NS`, `svg`, `held`, `hc`, `hs`, `pinned`, `msg`, `count`, `RM`, `HX`, `HY`, `idx`, `drag`, `busy`, `cx`, `cy`, `off`, `curl`, `rots`, `frame`, `art`, `starts`, `tips`, `clamp`, `pt`, `setHand`, `setHeld`, `tween`, `loop`, `setMsg`, `spawn`, `pin`, `release`. Wrap it in an IIFE or module when combining.
- IDs that may collide: `#reset` (also used in Study 02), `#scene` (also used in Study 01 as a `<g>`), `#count`, `#msg`, `#lines`, `#l0`–`#l2` (Study 02 uses `#l1`–`#l3`). CSS class `.hint` is used differently in Study 02.
- `loop()` runs on rAF continuously.
- A natural entry hook from Study 02: feed the captured frame in as `art[0]`, or start `spawn()` only when the previous study completes.
