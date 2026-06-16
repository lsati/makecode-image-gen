# MakeCode Image Generator

Convert any image into a MakeCode Arcade **sprite** or **background** with one click — runs entirely in the browser, no install needed.

**Live site:** https://lazertag.github.io/makecode-imagegen/

---

## What it does

Paste or drag any image onto the page and the tool:

1. Downscales it to the resolution you choose
2. Maps every pixel to the nearest colour in the MakeCode Arcade 16-colour palette
3. Outputs ready-to-paste JavaScript you can drop straight into [MakeCode Arcade](https://arcade.makecode.com)

---

## How to use

### 1. Upload an image

Drag and drop an image onto the upload zone, or click it to open the file picker. PNG, JPG, GIF, and WebP are all supported.

The tool automatically selects **Background** for large images and **Sprite** for small ones.

### 2. Choose type and resolution

| Type | Default resolution | Generated code |
|------|--------------------|----------------|
| Sprite | 16 × 16 | `sprites.create(img\`...\`, SpriteKind.Player)` |
| Background | 480 × 360 | `scene.setBackgroundImage(img\`...\`)` |

Pick a preset from the **Resolution** dropdown, or choose **Custom…** to enter your own width and height.

Enable **Greyscale** to strip colour before conversion — useful for tiles and textures.

### 3. Generate and copy

Click **Generate Code**. The pixelated preview updates live as you change settings.

Once you're happy, click **Copy Code** and paste it into the MakeCode Arcade editor.

---

## Colour palette

The tool maps pixels to the official MakeCode Arcade 16-colour palette. After generating, the **Colors used** section shows only the colours that appear in your specific image.

---

## Made with ♥ for the MakeCode gaming community by LazerTag team
