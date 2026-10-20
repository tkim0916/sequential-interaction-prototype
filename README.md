# sequential-interaction-prototype
Codebase for sequential interaction project in IXD 107-03, working with Claude Code


## Live site

https://tkim0916.github.io/sequential-interaction-prototype/

## Capture & Pin — sequence prototype

`docs/` holds the published prototype, built from the three studies in `photo-studies/`. **Concept:** capture a moment and pin that photo on the wall.

1. **Choose your film.** The experience starts on a film choice: click **Color** or **Black & white**. Nothing else unlocks until a roll is selected. Color film shows the scene in color, and black & white film renders everything in gray, including the captured photos.
2. **Open the camera** (Study 01, Silky Frame Reveal). Pinch out, scroll, or press `+` on the black screen until the viewfinder locks open.
3. **Frame and shoot** (Study 02, Sharp Shutter).
   - **Zoom:** tap the on-screen chips (1x, 1.5x, 2x, 5x, 10x), pinch with two fingers, scroll, or press `+`/`−`.
   - **Aperture:** the **ƒ** button slides up a strip of aperture stops.
   - **Camera settings** (right panel): focal length, ISO, shutter speed, aperture, and an exposure meter. 1/250 s · ƒ/2.8 · ISO 100 is the correct exposure. Higher ISO adds grain, slower shutter speeds add motion blur to the photo, and wider apertures blur the background.
   - **Shutter:** a single circle at the bottom center. Click it (or press Enter/Space) to capture. Every photo is saved to the gallery, and there is no limit.
4. **Gallery.** After the first shot, a thumbnail button opens the gallery.
   - Tap a photo to see it full size, then swipe or drag it down (or press Escape) to close it.
   - Each photo can be **pinned** or **deleted** (tap twice to confirm).
   - A **Film** switch changes Color or B&W for the next photos.
   - **View wall** shows everything pinned so far. Tap any pinned photo (in the gallery or on the wall) to see it full size.
5. **Pin to the wall** (Study 03, Magnet Wall). Pinning a photo carries it to the wall in the white magnetic hand. Drag it up to pin it, or use the arrow keys and Enter. You then return to the gallery, where the photo you just pinned is highlighted.

A hint bar at the top of the stage shows the action needed to move on. Each hint disappears once that action has been done, and after the whole tutorial (open, zoom, shoot, open the gallery, view a photo, pin one) no hints appear. This is remembered in the browser, and **Show tips again** in the camera panel brings the hints back.

There's no fixed ending. The restart button (top left) goes back to the film choice and clears the gallery and wall.

**Background controls** (left panel) adjust the landscape live:

- mountains, clouds and birds
- color for the sky, mountains, sea, clouds, sun, moon and birds
- texture: Grain, Paper, Halftone or Lines
- speed and motion: the Linear, Ease In, Ease Out and Ease In-Out curves, and the scene-change interval

Its buttons are **Reset state**, **Restore defaults** and **Copy as prompt**.

The site is plain HTML, CSS and JavaScript with no build step and relative paths. GitHub Pages publishes it from **`main` / `/docs`**. To preview it locally, run `python3 -m http.server` from the repository root and open `/docs/`.
