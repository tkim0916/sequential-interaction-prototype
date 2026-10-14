# Study 02 — Sharp Shutter

**Source:** `index.html` (single self-contained file, ~165 lines)
**Original artifact:** https://claude.ai/artifact/N7oqvTt6g11jpnVQX3F5iq

## What it does

A landscape drifts continuously behind a camera shutter button framed by focus brackets. Pressing the shutter plays a synthesized click, flashes the frame white, freezes the scene and locks the brackets. A camera-style readout confirms the capture. A restart button brings the motion back.

## Visual components

| Component | What it looks like | Where |
|---|---|---|
| Header | Title "Sharp Shutter" and a one-line instruction | `.wrap > div` (HTML lines 54–58) |
| Stage | 680×360 SVG in a rounded bordered box | `.stage` / `<svg viewBox="0 0 680 360">` |
| Drifting scene | Sun disc plus three parallax ridge silhouettes (`#l1`–`#l3`) generated procedurally | `ridge()` (line 95) builds paths from a seeded LCG. Motion runs in `tick()` (line 123) |
| Flash | Full-stage white rect, normally opacity 0 | `#flash` (line 68) |
| Focus brackets | Four corner L's (`#b1`) plus four midpoint ticks (`#b2`), in group `#br` | lines 69–76 |
| Hint ring | Ring around the shutter that pulses outward (CSS `ping`, 1.8s) | `#hint` (line 77), keyframes line 43 |
| Shutter button | Outer ring, filled disc `#disc`, hidden checkmark `#chk`, larger invisible hit circle `#hit`. `role="button"`, focusable | `#shutter` (line 78) |
| Restart button | Square 36px icon button, top-left, hidden until captured | `#reset` (line 85) |
| Status readout | Monospace uppercase HUD line, `aria-live` | `#status` (line 89) |

Light and dark themes come from CSS custom properties (`--bg`, `--surface`, `--fg`, `--fg-2`, `--accent`, …) that switch on `prefers-color-scheme` or `[data-theme]`.

## Interaction model

### Inputs
| Input | Effect | Code |
|---|---|---|
| Click/tap shutter | `capture()` | line 161 |
| `Enter` / `Space` on focused shutter | `capture()` | line 162 |
| Click restart | `reset()` | line 163 |

### State machine (`state` variable)
```
idle ──press──▶ capturing ──480ms──▶ captured ──restart──▶ idle
```
- **idle**: scene drifts (`running = true`), hint ring pulses, status reads `Ready · tap the shutter`.
- **capturing** (`capture()`, line 132):
  - `running = false`, so the scene freezes on the current frame
  - `click()` plays the shutter sound
  - disc shrinks (r 40 → 34), a "pressed" look
  - hint ring hidden; status reads `Capturing…`
  - flash jumps to 0.95 opacity, then fades out over 0.4s starting at 60ms
- **captured** (after `setTimeout(…, 480)`):
  - disc returns to r 40 and the white checkmark appears
  - brackets scale to 0.92 around the centre (`#br` CSS transition .25s), turn to the foreground colour and thicken (2.5 → 3.5)
  - status reads `Captured · 1/250 s · f/2.8 · ISO 100`
  - restart button shown

  *This is the natural hand-off point to the next study.*
- **reset** (`reset()`, line 150): only allowed from `captured`. Reverses all of the above, resumes motion and returns focus to the shutter.

Repeated presses while capturing or captured are ignored (guard `state !== "idle"`).

### Feedback
- **Sound:** `click()` (line 107) synthesizes the shutter using the Web Audio API, with no audio files. It is two band-passed noise bursts (2800 Hz at t=0, 1800 Hz at t=70ms) plus a 180→60 Hz sine "thump". The AudioContext is created lazily on the first press (a user gesture, so autoplay rules allow it) and any failure is silently caught.
- **Visual:** flash, disc press, checkmark, bracket lock-in.
- **Text:** status line (screen-reader announced).

### Motion details
- Ridge layer speeds are 14, 30 and 54 px/s. Offsets wrap at 680 because each path is 1360 wide and its pattern repeats. The sun drifts left at 6 px/s and wraps.
- `prefers-reduced-motion`: drift speed ×0.3, hint ring static, no bracket transition.

## Dependencies and assets
- None. No external scripts, fonts, images or audio files. Audio is generated at runtime.
- Works opened directly as a file or from any static server. Sound requires a browser with Web Audio (all modern browsers).
- The line-1 `<style>` block and `claude:` meta tag are from the claude.ai artifact host wrapper and are kept as published.

## Integration notes
- The script is an IIFE with no globals. It uses a local helper `$ = getElementById`.
- `requestAnimationFrame(tick)` runs continuously. Motion is gated by `running`.
- IDs that may collide when merged: `#reset` (also used in Study 03), `#status`, `#flash`, `#hint`, `#l1`–`#l3`, `#t`, `#d`. The class `.stage` and CSS vars like `--bg` and `--fg` are also shared names.
- To expose completion, dispatch an event inside the 480ms timeout where `state = "captured"`.
