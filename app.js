// MakeCode Arcade 16-color palette (indices 0–f)
const PALETTE = [
  null,           // 0: transparent
  [255,255,255],  // 1: white
  [255, 33, 33],  // 2: red
  [255,147,196],  // 3: pink
  [255,129, 53],  // 4: orange
  [255,246,  9],  // 5: yellow
  [ 36,156,163],  // 6: teal
  [120,220, 82],  // 7: green
  [  0, 63,173],  // 8: blue
  [135,242,255],  // 9: light blue
  [142, 46,196],  // a: purple
  [164,131,159],  // b: mauve
  [ 92, 64,108],  // c: dark purple
  [229,205,196],  // d: beige
  [145, 70, 61],  // e: brown
  [  0,  0,  0],  // f: black
];

const HEX = '0123456789abcdef';

// ── DOM refs ──────────────────────────────────────────────────────────────

const uploadCard     = document.getElementById('upload-card');
const fileInput      = document.getElementById('file-input');
const uploadText     = document.getElementById('upload-text');
const previewEmpty   = document.getElementById('preview-empty');
const previewContent = document.getElementById('preview-content');
const previewCanvas  = document.getElementById('preview-canvas');
const previewLabel   = document.getElementById('preview-label');
const typeToggle     = document.getElementById('type-toggle');
const resolutionSel  = document.getElementById('resolution');
const customSizeDiv  = document.getElementById('custom-size');
const customWInput   = document.getElementById('custom-w');
const customHInput   = document.getElementById('custom-h');
const greyscaleCheck = document.getElementById('greyscale');
const generateBtn    = document.getElementById('generate-btn');
const outputCard     = document.getElementById('output-card');
const outputEl       = document.getElementById('output');
const copyBtn        = document.getElementById('copy-btn');
const paletteSection = document.getElementById('palette-section');
const paletteSwatches = document.getElementById('palette-swatches');
const toastEl        = document.getElementById('toast');
const themeToggleBtn = document.getElementById('theme-toggle');

// ── State ─────────────────────────────────────────────────────────────────

let originalImage = null;
let currentType   = 'sprite'; // 'sprite' | 'background'
let toastTimer    = null;

// ── Theme ─────────────────────────────────────────────────────────────────

const html = document.documentElement;
html.setAttribute('data-theme', localStorage.getItem('mc-theme') || 'light');

themeToggleBtn.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('mc-theme', next);
});

// ── Toast ─────────────────────────────────────────────────────────────────

function showToast(msg, type = 'error') {
  toastEl.textContent = msg;
  toastEl.className = `toast toast-${type} visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.className = 'toast'; }, 2500);
}

// ── Type toggle (Sprite / Background) ─────────────────────────────────────

typeToggle.addEventListener('click', (e) => {
  const btn = e.target.closest('.type-btn');
  if (!btn) return;
  setType(btn.dataset.type);
});

function setType(type) {
  currentType = type;
  typeToggle.querySelectorAll('.type-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.type === type)
  );
  updateResolutionOptions();
  refreshPreview();
}

function updateResolutionOptions() {
  if (currentType === 'background') {
    resolutionSel.innerHTML = `
      <option value="480x360" selected>480 × 360 (default)</option>
      <option value="custom">Custom…</option>
    `;
  } else {
    resolutionSel.innerHTML = `
      <option value="8">8 × 8</option>
      <option value="16" selected>16 × 16</option>
      <option value="32">32 × 32</option>
      <option value="64">64 × 64</option>
      <option value="custom">Custom…</option>
    `;
  }
  customSizeDiv.hidden = true;
}

// ── Resolution ────────────────────────────────────────────────────────────

resolutionSel.addEventListener('change', () => {
  customSizeDiv.hidden = resolutionSel.value !== 'custom';
  refreshPreview();
});

customWInput.addEventListener('input', refreshPreview);
customHInput.addEventListener('input', refreshPreview);

function getTargetSize() {
  const val = resolutionSel.value;
  if (val === 'custom') {
    return {
      w: Math.min(1000, Math.max(1, parseInt(customWInput.value, 10) || 1)),
      h: Math.min(1000, Math.max(1, parseInt(customHInput.value, 10) || 1)),
    };
  }
  if (val.includes('x')) {
    const [w, h] = val.split('x').map(Number);
    return { w, h };
  }
  const n = parseInt(val, 10);
  return { w: n, h: n };
}

// ── Greyscale ─────────────────────────────────────────────────────────────

greyscaleCheck.addEventListener('change', refreshPreview);

function applyGreyscale(ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = d[i + 1] = d[i + 2] = lum;
  }
  ctx.putImageData(imgData, 0, 0);
}

// ── Canvas helpers ────────────────────────────────────────────────────────

function buildOffscreenCanvas() {
  const { w, h } = getTargetSize();
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(originalImage, 0, 0, w, h);
  if (greyscaleCheck.checked) applyGreyscale(ctx, w, h);
  return canvas;
}

function refreshPreview() {
  if (!originalImage) return;

  const { w, h } = getTargetSize();
  const offscreen = buildOffscreenCanvas();

  // Scale up so the preview's longest side is ~300px; minimum zoom 1
  const zoom = Math.max(1, Math.floor(300 / Math.max(w, h)));
  previewCanvas.width  = w * zoom;
  previewCanvas.height = h * zoom;

  const ctx = previewCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreen, 0, 0, previewCanvas.width, previewCanvas.height);

  previewLabel.textContent = `Output: ${w} × ${h} px${zoom > 1 ? ` (${zoom}× zoom)` : ''}`;
  previewEmpty.hidden   = true;
  previewContent.hidden = false;
}

// ── File loading ──────────────────────────────────────────────────────────

function loadFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('Please provide an image file (PNG, JPG, GIF, WebP).');
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      originalImage = img;
      outputCard.hidden = true;
      paletteSection.hidden = true;
      // Auto-select type based on image dimensions
      setType(img.naturalWidth > 64 || img.naturalHeight > 64 ? 'background' : 'sprite');
      refreshPreview();
      gtag('event', 'image_upload', {
        width:  img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => showToast('Could not load image. Try a different file.');
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) loadFile(e.target.files[0]);
});

// ── Drag-and-drop ─────────────────────────────────────────────────────────

uploadCard.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadCard.classList.add('drag-over');
});

uploadCard.addEventListener('dragleave', (e) => {
  if (!uploadCard.contains(e.relatedTarget)) {
    uploadCard.classList.remove('drag-over');
  }
});

uploadCard.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadCard.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

// Allow drops anywhere on the page
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadCard.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

// ── Palette (used colors) ─────────────────────────────────────────────────

function nearestPaletteIndex(r, g, b, a) {
  if (a < 128) return 0;
  let best = 1;
  let bestDist = Infinity;
  for (let i = 1; i < PALETTE.length; i++) {
    const [pr, pg, pb] = PALETTE[i];
    const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dist < bestDist) { bestDist = dist; best = i; }
  }
  return best;
}

function renderUsedColors(usedIndices) {
  paletteSwatches.innerHTML = '';
  [...usedIndices].sort((a, b) => a - b).forEach((i) => {
    const color = PALETTE[i];
    const swatch = document.createElement('div');
    swatch.className = 'swatch';

    if (color === null) {
      swatch.classList.add('swatch-transparent');
      swatch.title = '0 — transparent';
    } else {
      const hex = '#' + color.map(c => c.toString(16).padStart(2, '0')).join('');
      swatch.style.background = `rgb(${color.join(',')})`;
      swatch.title = `${HEX[i]} — ${hex}`;
    }

    const label = document.createElement('span');
    label.textContent = HEX[i];
    swatch.appendChild(label);
    paletteSwatches.appendChild(swatch);
  });
  paletteSection.hidden = false;
}

// ── Code generation ───────────────────────────────────────────────────────

generateBtn.addEventListener('click', () => {
  if (!originalImage) {
    showToast('Upload an image first.');
    return;
  }

  if (resolutionSel.value === 'custom') {
    const { w, h } = getTargetSize();
    if (!w || !h) {
      showToast('Enter a valid width and height.');
      return;
    }
  }

  const { w, h } = getTargetSize();
  const offscreen = buildOffscreenCanvas();
  const ctx = offscreen.getContext('2d');
  const { data } = ctx.getImageData(0, 0, w, h);

  const usedIndices = new Set();
  const rows = [];

  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const idx = nearestPaletteIndex(data[i], data[i + 1], data[i + 2], data[i + 3]);
      usedIndices.add(idx);
      row.push(idx === 0 ? '.' : HEX[idx]);
    }
    rows.push('    ' + row.join(' '));
  }

  const imgLiteral = 'img`\n' + rows.join('\n') + '\n`';
  const code = currentType === 'background'
    ? `scene.setBackgroundImage(${imgLiteral})`
    : `let mySprite = sprites.create(${imgLiteral}, SpriteKind.Player)`;

  outputEl.textContent = code;
  outputCard.hidden = false;
  copyBtn.textContent = 'Copy Code';

  renderUsedColors(usedIndices);
  gtag('event', 'generate_code', {
    sprite_type: currentType,
    resolution:  `${w}x${h}`,
    greyscale:   greyscaleCheck.checked,
  });

  outputCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// ── Copy to clipboard ─────────────────────────────────────────────────────

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(outputEl.textContent)
    .then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy Code'; }, 1500);
      gtag('event', 'copy_code', { sprite_type: currentType });
    })
    .catch(() => showToast('Copy failed — select and copy manually.'));
});
