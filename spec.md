# MakeCode Image Generator — Implementation Spec

## Overview

A static single-page web app that converts uploaded images into MakeCode Arcade JavaScript sprite code. No backend required — all processing runs in the browser. Hosted free on GitHub Pages.

---

## Phase 1 — Project Scaffold

**Goal:** Get a working skeleton on GitHub with GitHub Pages enabled.

### Steps

1. Create a new GitHub repository named `makecode-imagegen` (or `<username>.github.io` for a root site).
2. Enable GitHub Pages in repo Settings → Pages → Source: `main` branch, `/` (root) folder.
3. Create the initial file structure:
   ```
   /
   ├── index.html
   ├── style.css
   └── app.js
   ```
4. Add a minimal `index.html` with a `<h1>MakeCode Image Generator</h1>` placeholder.
5. Push to `main` — confirm the GitHub Pages URL is live (e.g. `https://<username>.github.io/makecode-imagegen/`).

**Exit criteria:** Site loads at the GitHub Pages URL with the placeholder heading.

---

## Phase 2 — Image Upload UI

**Goal:** User can upload an image and see a preview.

### Steps

1. In `index.html`, add:
   - A file `<input accept="image/*">` button.
   - A `<canvas id="preview">` element for the image preview.
2. In `app.js`:
   - Listen for `change` on the file input.
   - Use `FileReader` to read the image as a data URL.
   - Draw the image onto the preview canvas, scaled to fit the display area.
3. In `style.css`:
   - Center the layout.
   - Style the upload button and canvas preview area.

**Exit criteria:** User uploads an image and sees it previewed on the page.

---

## Phase 3 — Resolution Selector

**Goal:** User can choose a target resolution before generating code.

### Steps

1. Add a `<select id="resolution">` dropdown to `index.html` with preset options:
   - 16×16 (default)
   - 32×32
   - 64×64
   - 8×8
2. Add a custom width/height input pair (`<input type="number">`) for arbitrary sizes.
3. When resolution changes, redraw the preview canvas at the selected size so the user sees the pixelated result before generating.
4. Implement the downscale logic in `app.js`:
   - Draw the original image onto an offscreen `<canvas>` at the target resolution.
   - Use `ctx.imageSmoothingEnabled = false` for pixel-accurate nearest-neighbor scaling.
   - Re-draw the scaled version onto the preview canvas at a zoomed-up size (e.g. ×8) so pixels are visible.

**Exit criteria:** Changing resolution updates the preview to show the pixelated version of the image.

---

## Phase 4 — Code Generation

**Goal:** Clicking Generate produces valid MakeCode Arcade sprite code.

### Steps

1. Add a `<button id="generate">Generate Code</button>` to `index.html`.
2. In `app.js`, on button click:
   - Read pixel data from the offscreen canvas using `ctx.getImageData()`.
   - For each pixel, map the RGBA value to the nearest color in the MakeCode Arcade 16-color palette (use Euclidean distance in RGB space).
   - Build the sprite hex string: each pixel becomes a single hex character (`0`–`f`), rows separated by spaces, wrapped in the MakeCode format:
     ```
     img`
     . . . . . .
     . f . . f .
     . . . . . .
     `
     ```
   - Wrap the sprite in a full JS snippet:
     ```js
     let mySprite = sprites.create(img`
         ...
     `, SpriteKind.Player)
     ```
3. Display the generated code in a `<pre><code id="output">` block.

**MakeCode Arcade palette** (16 colors, indices 0–f):
| Index | Color |
|-------|-------|
| 0 | transparent |
| 1 | #FFFFFF |
| 2 | #FF2121 |
| 3 | #FF93C4 |
| 4 | #FF8135 |
| 5 | #FFF609 |
| 6 | #249CA3 |
| 7 | #78DC52 |
| 8 | #003FAD |
| 9 | #87F2FF |
| a | #8E2EC4 |
| b | #A4839F |
| c | #5C406C |
| d | #E5CDC4 |
| e | #91463D |
| f | #000000 |

Pixels with alpha < 128 map to index `0` (transparent).

**Exit criteria:** Clicking Generate produces correct MakeCode sprite code for a test image.

---

## Phase 5 — Copy to Clipboard

**Goal:** User can copy the generated code with one click.

### Steps

1. Add a `<button id="copy">Copy Code</button>` next to the output block (hidden until code is generated).
2. In `app.js`, on click call `navigator.clipboard.writeText(outputText)`.
3. Show brief visual feedback: button text changes to "Copied!" for 1.5 seconds, then reverts.

**Exit criteria:** Clicking Copy puts the code on the clipboard; pasting into MakeCode Arcade works correctly.

---

## Phase 6 — Polish & UX

**Goal:** App looks clean and is easy to use.

### Steps

1. **Responsive layout** — works on mobile and desktop.
2. **Error states** — show a message if no image is uploaded and Generate is clicked.
3. **Drag-and-drop** — accept images dragged onto the page as an alternative to the file picker.
4. **Preview zoom** — label showing the actual output resolution (e.g. "Output: 16×16 pixels").
5. **Palette preview** — show a small swatch grid of the 16 MakeCode colors for reference.
6. **README.md** — brief description, screenshot, and link to the live site.

**Exit criteria:** App is visually polished, handles edge cases gracefully.

---

## Phase 7 — Deploy to GitHub Pages

**Goal:** Live public URL is stable and always up to date.

### Steps

1. Ensure all files are committed and pushed to the `main` branch.
2. Verify GitHub Pages is serving from `main /` (set in Phase 1).
3. Open the Pages URL and run a full end-to-end test:
   - Upload a test image.
   - Select each resolution preset.
   - Click Generate — verify output.
   - Click Copy — paste into MakeCode Arcade and confirm sprite renders correctly.
4. Add the live URL to the GitHub repo's About section and `README.md`.
5. (Optional) Set up a custom domain via repo Settings → Pages → Custom domain.

**Exit criteria:** Site is publicly accessible, end-to-end flow works in production.

---

## Tech Stack

| Concern | Choice |
|---------|--------|
| Hosting | GitHub Pages (free, static) |
| Language | Vanilla HTML + CSS + JS (no build step needed) |
| Image processing | Browser Canvas API (`2d` context) |
| Clipboard | `navigator.clipboard` API |
| Dependencies | None — zero npm, zero frameworks |

---

## File Layout (final)

```
/
├── index.html       # markup + layout
├── style.css        # all styles
├── app.js           # image processing + code gen logic
└── README.md        # project description + live link
```
