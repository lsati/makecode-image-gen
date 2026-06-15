# MakeCode Image Generator

Convert any image into a MakeCode Arcade sprite or background — runs entirely in the browser, no install needed.

**Live site:** `https://<your-username>.github.io/<your-repo-name>/`

---

## Deploying to GitHub Pages

### Step 1 — Create a GitHub repository

1. Go to [github.com](https://github.com) and sign in.
2. Click **New repository**.
3. Name it (e.g. `makecode-imagegen`).
4. Set visibility to **Public** (required for free GitHub Pages).
5. Click **Create repository**.

---

### Step 2 — Push the project files

In your terminal, inside the project folder:

```bash
git init
git add index.html style.css app.js README.md
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

Replace `<your-username>` and `<your-repo-name>` with your actual GitHub username and repository name.

---

### Step 3 — Enable GitHub Pages

1. In your repository, go to **Settings** → **Pages** (left sidebar).
2. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
3. Click **Save**.

GitHub will show a banner:
> *Your site is live at `https://<your-username>.github.io/<your-repo-name>/`*

It may take **1–2 minutes** for the site to go live the first time.

---

### Step 4 — Verify

Open the URL in your browser and run a quick end-to-end check:

- [ ] Upload a test image
- [ ] Switch between Sprite and Background type
- [ ] Change resolution and confirm the pixelated preview updates
- [ ] Click **Generate Code** and verify the output
- [ ] Click **Copy Code**, paste into [MakeCode Arcade](https://arcade.makecode.com) and confirm the sprite renders correctly

---

## Updating the site

Every push to `main` automatically redeploys. After making changes:

```bash
git add index.html style.css app.js
git commit -m "Describe your change"
git push
```

The live site updates within ~30 seconds.

---

## Project files

| File | Purpose |
|------|---------|
| `index.html` | Page structure and layout |
| `style.css` | All styles, dark/light theme |
| `app.js` | Image processing and code generation |
| `README.md` | This file |

No build step, no dependencies, no Node.js required.
