# sequential-interaction-prototype
Codebase for sequential interaction project in IXD 107-03, working with Claude Code


## Live site

https://tkim0916.github.io/sequential-interaction-prototype/

## Capture & Pin — sequence prototype

`docs/` holds the published sequence prototype, which combines the three studies in `photo-studies/` into one linear experience. **Concept:** capture a moment and pin that photo on the wall.

1. **Open the camera** (Study 01, Silky Frame Reveal). The sequence starts on a black screen with a pinch hint. Pinch out, scroll, or press `+` until the viewfinder locks open.
2. **Take three photos** (Study 02, Sharp Shutter). Tap the shutter, or press Enter or Space. The landscape is randomly generated and changes every few seconds, and each shot gets a new scene.
3. **Pin them to the wall** (Study 03, Magnet Wall). Drag each captured photo from the magnetic hand onto the wall. With a keyboard, use the arrow keys and Enter, or press Enter alone to pin to the next spot.

**Background controls.** A floating, collapsible panel on the left adjusts the step 2 landscape live: mountains (layers, peak height, drift speed), clouds (count, size, speed, opacity), birds (count, wingspan, flight speed, wingbeat), color (optional colors for the sky, mountains and sea, clouds, sun and moon, and birds, plus color strength; grayscale by default), texture (Grain, Paper, Halftone or Lines, applied to the whole scene, the sky or the mountains, with strength and scale), and speed and motion (overall speed, speed variation, motion curve: Linear, Ease In, Ease Out or Ease In-Out, and the scene-change interval). **Reset state** restarts the background animation and keeps the settings. **Restore defaults** resets every control. **Copy as prompt** copies the current values as a prompt you can paste.

Each step unlocks only when the previous one is complete, and the next step starts automatically after a short pause. The restart button (top left) is always available. At the end, the finished wall asks whether you want to take more photos.

The site is plain HTML, CSS, and JavaScript with no build step and relative paths. To publish it, set **Settings → Pages → Branch: `main`, folder: `/docs`**. To preview it locally, run `python3 -m http.server` from the repository root and open `/docs/`.
