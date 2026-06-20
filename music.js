// ── Theme & toast ──────────────────────────────────────────────────────────
const html           = document.documentElement;
const themeToggleBtn = document.getElementById('theme-toggle');
const toastEl        = document.getElementById('toast');

let toastTimer = null;

themeToggleBtn.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('mc-theme', next);
});

function showToast(msg, type = 'success') {
  toastEl.textContent = msg;
  toastEl.className = `toast toast-${type} visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.className = 'toast'; }, 2500);
}

// ── Analytics ──────────────────────────────────────────────────────────────
function trackEvent(name, params = {}) {
  if (typeof gtag === 'function') gtag('event', name, params);
}

// ── Note range: B5 down to C4 (24 notes) ──────────────────────────────────
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function buildNoteRange() {
  const notes = [];
  for (let oct = 5; oct >= 4; oct--) {
    for (let n = 11; n >= 0; n--) {
      notes.push(NOTE_NAMES[n] + oct);
    }
  }
  return notes;
}

function isBlackKey(note) { return note.includes('#'); }

// Equal-temperament: A4 = 440 Hz
function noteToFreq(noteName) {
  const hasSharp  = noteName[1] === '#';
  const letter    = hasSharp ? noteName.slice(0, 2) : noteName[0];
  const octave    = parseInt(noteName.slice(-1), 10);
  const semitones = (octave - 4) * 12 + (NOTE_NAMES.indexOf(letter) - 9);
  return 440 * Math.pow(2, semitones / 12);
}

// ── Instruments ────────────────────────────────────────────────────────────
// mcWaveform: MakeCode waveform ID used as ~id prefix in melody strings
// mcAdsr:     MakeCode ADSR envelope command @attack,decay,sustain,release
//             (sustain is 0–255 volume level; others are ms)
const INSTRUMENTS = {
  piano: {
    label: 'Piano',
    mcWaveform: 1,           // Triangle — warm, rounded
    mcAdsr: '@4,200,80,80',
    synth(ctx, freq, t0, dur, dest) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.22, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.07, t0 + dur * 0.45);
      gain.gain.linearRampToValueAtTime(0, t0 + dur);
      osc.connect(gain); gain.connect(dest);
      osc.start(t0); osc.stop(t0 + dur);
      return osc;
    }
  },
  flute: {
    label: 'Flute',
    mcWaveform: 3,           // Sine — pure, smooth
    mcAdsr: '@80,0,200,60',
    synth(ctx, freq, t0, dur, dest) {
      const osc    = ctx.createOscillator();
      const lfo    = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain   = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      lfo.frequency.value = 5.5;   // vibrato rate
      lfoGain.gain.value  = 4;     // vibrato depth in Hz
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.20, t0 + 0.06);  // slow attack
      gain.gain.setValueAtTime(0.20, t0 + dur - 0.05);
      gain.gain.linearRampToValueAtTime(0, t0 + dur);
      osc.connect(gain); gain.connect(dest);
      osc.start(t0); osc.stop(t0 + dur);
      lfo.start(t0); lfo.stop(t0 + dur);
      return osc;
    }
  },
  guitar: {
    label: 'Guitar',
    mcWaveform: 2,           // Sawtooth — bright, harmonic-rich, pluck decay
    mcAdsr: '@4,200,0,0',
    synth(ctx, freq, t0, dur, dest) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      // Pluck: instant attack, very fast decay — no sustain
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.28, t0 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + Math.min(dur, 0.35));
      gain.gain.setValueAtTime(0, t0 + dur);
      osc.connect(gain); gain.connect(dest);
      osc.start(t0); osc.stop(t0 + dur);
      return osc;
    }
  },
  bass: {
    label: 'Bass',
    mcWaveform: 15,          // Square 50% — full, punchy for bass
    mcAdsr: '@4,0,200,40',
    synth(ctx, freq, t0, dur, dest) {
      const osc    = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain   = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq / 2;  // drop an octave for bass weight
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      filter.Q.value = 1.5;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.30, t0 + 0.02);
      gain.gain.setValueAtTime(0.30, t0 + dur - 0.04);
      gain.gain.linearRampToValueAtTime(0, t0 + dur);
      osc.connect(filter); filter.connect(gain); gain.connect(dest);
      osc.start(t0); osc.stop(t0 + dur);
      return osc;
    }
  },
  drum: {
    label: 'Drum',
    mcWaveform: 5,           // Noise — percussive, pitch-independent
    mcAdsr: '@4,120,0,0',
    synth(ctx, freq, t0, dur, dest) {
      // White noise burst. Frequency determines timbre:
      //   low notes  → lowpass  (kick-like)
      //   high notes → highpass (hi-hat-like)
      const hitDur   = Math.min(dur, 0.14);
      const bufSize  = Math.ceil(ctx.sampleRate * hitDur);
      const buffer   = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data     = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain   = ctx.createGain();

      filter.type = freq < 370 ? 'lowpass' : 'highpass';
      filter.frequency.value = Math.min(Math.max(freq * 2.5, 120), 10000);

      source.buffer = buffer;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.45, t0 + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + hitDur);
      gain.gain.setValueAtTime(0, t0 + dur);

      source.connect(filter); filter.connect(gain); gain.connect(dest);
      source.start(t0); source.stop(t0 + hitDur);
      return source;
    }
  }
};

// ── Track colors ───────────────────────────────────────────────────────────
const TRACK_COLORS = ['#4ecdc4', '#ff6b6b', '#ffd93d', '#6bcb77', '#a78bfa', '#f97316', '#ec4899'];

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  bpm: 240,
  loopLength: 16,
  noteRange: buildNoteRange(),
  tracks: [
    { id: 'track-1', name: 'Track 1', color: TRACK_COLORS[0], muted: false, instrument: 'piano', collapsed: false, every: 1, cells: {} }
  ]
};

let nextTrackNum = 2;

// ── DOM refs ───────────────────────────────────────────────────────────────
const tracksContainer  = document.getElementById('tracks-container');
const loopLengthToggle = document.getElementById('loop-length-toggle');
const addTrackBtn      = document.getElementById('add-track-btn');
const clearAllBtn      = document.getElementById('clear-all-btn');
const playBtn          = document.getElementById('play-btn');
const generateBtn      = document.getElementById('generate-btn');
const copyBtn          = document.getElementById('copy-btn');
const bpmRange         = document.getElementById('bpm-range');
const bpmInput         = document.getElementById('bpm-input');
const outputCard       = document.getElementById('output-card');
const musicOutputEl    = document.getElementById('music-output');
const musicHint        = document.getElementById('music-hint');

// ── Helpers ────────────────────────────────────────────────────────────────
function el(tag, className) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function hasAnyNotes() {
  return state.tracks.some(t => Object.keys(t.cells).length > 0);
}

function updateHint() {
  musicHint.hidden = hasAnyNotes();
}

// ── Grid rendering ─────────────────────────────────────────────────────────
function renderGridCells(gridEl, track) {
  gridEl.innerHTML = '';
  gridEl.style.setProperty('--beats', state.loopLength);

  const frag = document.createDocumentFragment();

  frag.appendChild(el('div', 'seq-corner'));
  for (let b = 0; b < state.loopLength; b++) {
    const num = el('div', b % 4 === 0 ? 'beat-num bar-start' : 'beat-num');
    num.textContent = b + 1;
    num.dataset.beat = b;
    frag.appendChild(num);
  }

  state.noteRange.forEach((note, noteIdx) => {
    const label = el('div', isBlackKey(note) ? 'note-label black-key' : 'note-label');
    label.textContent = note;
    frag.appendChild(label);

    for (let b = 0; b < state.loopLength; b++) {
      const isActive = !!track.cells[`${noteIdx}-${b}`];
      const classes  = ['seq-cell'];
      if (isActive) classes.push('active');
      if (b % 4 === 0) classes.push('bar-start');

      const cell = el('button', classes.join(' '));
      cell.style.setProperty('--track-color', track.color);
      cell.dataset.trackId = track.id;
      cell.dataset.noteIdx = noteIdx;
      cell.dataset.beat    = b;
      cell.setAttribute('aria-label', `${note} beat ${b + 1}`);
      cell.setAttribute('aria-pressed', String(isActive));
      frag.appendChild(cell);
    }
  });

  gridEl.appendChild(frag);
}

// ── Mini preview ───────────────────────────────────────────────────────────
function buildMiniPreview(track) {
  const mini = el('div', 'track-mini');
  mini.id = `mini-${track.id}`;
  refreshMiniPreview(mini, track);
  return mini;
}

function refreshMiniPreview(miniEl, track) {
  miniEl.innerHTML = '';
  for (let b = 0; b < state.loopLength; b++) {
    const hasNote = state.noteRange.some((_, ni) => track.cells[`${ni}-${b}`]);
    const block   = el('div', hasNote ? 'track-mini-beat active' : 'track-mini-beat');
    if (hasNote) block.style.setProperty('--track-color', track.color);
    if (b % 4 === 0) block.classList.add('bar-start');
    miniEl.appendChild(block);
  }
}

function updateMiniPreview(track) {
  const miniEl = document.getElementById(`mini-${track.id}`);
  if (miniEl) refreshMiniPreview(miniEl, track);
}

// ── Track rendering ────────────────────────────────────────────────────────
function buildInstrumentSelect(track) {
  const select = el('select', 'track-instrument');
  select.setAttribute('aria-label', 'Instrument');
  Object.entries(INSTRUMENTS).forEach(([key, inst]) => {
    const opt = document.createElement('option');
    opt.value       = key;
    opt.textContent = inst.label;
    if (key === (track.instrument || 'piano')) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener('change', () => {
    track.instrument = select.value;
    scheduleSave();
  });
  return select;
}

const CHEVRON_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

function buildEveryControl(track) {
  const wrapper = el('label', 'track-every');
  const before = el('span', 'track-every-label');
  before.textContent = 'Every';
  const input = el('input', 'track-every-input');
  input.type  = 'number';
  input.min   = '1';
  input.max   = '16';
  input.value = track.every || 1;
  input.setAttribute('aria-label', 'Play every N loops');
  input.addEventListener('change', () => {
    track.every = Math.max(1, Math.min(16, parseInt(input.value, 10) || 1));
    input.value = track.every;
    scheduleSave();
  });
  input.addEventListener('keydown', e => e.stopPropagation());
  const after = el('span', 'track-every-label');
  after.textContent = 'loops';
  wrapper.append(before, input, after);
  return wrapper;
}

function renderTrack(track) {
  const card = document.createElement('section');
  card.className = 'card track-card' + (track.muted ? ' muted' : '');
  card.id = `track-card-${track.id}`;
  if (track.collapsed) card.dataset.collapsed = 'true';

  const header = el('div', 'track-header');

  // Left: collapse chevron + color dot + editable name + instrument select
  const identity = el('div', 'track-identity');

  const collapseBtn = el('button', 'btn-track-collapse');
  collapseBtn.innerHTML = CHEVRON_SVG;
  collapseBtn.setAttribute('aria-label', track.collapsed ? 'Expand track' : 'Collapse track');
  collapseBtn.setAttribute('aria-expanded', String(!track.collapsed));
  collapseBtn.addEventListener('click', () => {
    track.collapsed = !track.collapsed;
    card.dataset.collapsed = track.collapsed ? 'true' : '';
    collapseBtn.setAttribute('aria-label', track.collapsed ? 'Expand track' : 'Collapse track');
    collapseBtn.setAttribute('aria-expanded', String(!track.collapsed));
    scheduleSave();
  });

  const dot = el('div', 'track-color-dot');
  dot.style.background = track.color;

  const nameEl = el('span', 'track-name');
  nameEl.textContent = track.name;
  nameEl.setAttribute('contenteditable', 'true');
  nameEl.setAttribute('spellcheck', 'false');
  nameEl.addEventListener('blur', () => {
    track.name = nameEl.textContent.trim() || track.name;
    nameEl.textContent = track.name;
    scheduleSave();
  });
  nameEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
  });

  identity.append(collapseBtn, dot, nameEl, buildInstrumentSelect(track), buildEveryControl(track));

  // Right: clear + mute + remove
  const controls = el('div', 'track-controls');

  const clearBtn = el('button', 'btn-track-mute');
  clearBtn.textContent = 'Clear';
  clearBtn.setAttribute('aria-label', 'Clear track');
  clearBtn.addEventListener('click', () => {
    track.cells = {};
    const grid = document.getElementById(`grid-${track.id}`);
    if (grid) renderGridCells(grid, track);
    updateMiniPreview(track);
    outputCard.setAttribute('hidden', '');
    updateHint();
    scheduleSave();
  });

  const muteBtn = el('button', 'btn-track-mute' + (track.muted ? ' active' : ''));
  muteBtn.textContent = 'Mute';
  muteBtn.setAttribute('aria-label', 'Mute track');
  muteBtn.setAttribute('aria-pressed', String(track.muted));
  muteBtn.addEventListener('click', () => {
    track.muted = !track.muted;
    muteBtn.classList.toggle('active', track.muted);
    muteBtn.setAttribute('aria-pressed', String(track.muted));
    card.classList.toggle('muted', track.muted);
    scheduleSave();
  });

  const removeBtn = el('button', 'btn-track-remove');
  removeBtn.innerHTML = '&times;';
  removeBtn.setAttribute('aria-label', 'Remove track');
  removeBtn.addEventListener('click', () => {
    if (state.tracks.length === 1) return;
    state.tracks = state.tracks.filter(t => t.id !== track.id);
    card.remove();
    outputCard.setAttribute('hidden', '');
    updateHint();
    scheduleSave();
  });

  controls.append(clearBtn, muteBtn, removeBtn);
  header.append(identity, controls);

  // Mini preview (visible when collapsed)
  const mini = buildMiniPreview(track);

  // Full grid (visible when expanded)
  const scroll = el('div', 'sequencer-scroll');
  const grid   = el('div', 'sequencer-grid');
  grid.id = `grid-${track.id}`;
  renderGridCells(grid, track);
  scroll.appendChild(grid);

  card.append(header, mini, scroll);
  return card;
}

function renderAllTracks() {
  tracksContainer.innerHTML = '';
  state.tracks.forEach(track => tracksContainer.appendChild(renderTrack(track)));
}

// ── Add track ──────────────────────────────────────────────────────────────
function addTrack() {
  const color = TRACK_COLORS[state.tracks.length % TRACK_COLORS.length];
  const id    = `track-${Date.now()}`;
  const track = { id, name: `Track ${nextTrackNum++}`, color, muted: false, instrument: 'piano', collapsed: false, every: 1, cells: {} };
  state.tracks.push(track);
  tracksContainer.appendChild(renderTrack(track));
  trackEvent('add_track', { instrument: track.instrument, track_count: state.tracks.length });
  scheduleSave();
}

addTrackBtn.addEventListener('click', addTrack);

// ── Clear All ──────────────────────────────────────────────────────────────
clearAllBtn.addEventListener('click', () => {
  if (isPlaying) stopPlayback();
  state.tracks.forEach(track => {
    track.cells = {};
    const grid = document.getElementById(`grid-${track.id}`);
    if (grid) renderGridCells(grid, track);
    updateMiniPreview(track);
  });
  outputCard.setAttribute('hidden', '');
  updateHint();
  scheduleSave();
});

// ── Cell toggle ────────────────────────────────────────────────────────────
tracksContainer.addEventListener('click', e => {
  const cell = e.target.closest('.seq-cell');
  if (!cell) return;

  const { trackId, noteIdx, beat } = cell.dataset;
  const track = state.tracks.find(t => t.id === trackId);
  if (!track) return;

  const key = `${noteIdx}-${beat}`;
  if (track.cells[key]) {
    delete track.cells[key];
    cell.classList.remove('active');
    cell.setAttribute('aria-pressed', 'false');
  } else {
    track.cells[key] = true;
    cell.classList.add('active');
    cell.setAttribute('aria-pressed', 'true');
  }
  updateMiniPreview(track);
  updateHint();
  scheduleSave();
});

// ── Loop length toggle ─────────────────────────────────────────────────────
loopLengthToggle.addEventListener('click', e => {
  const btn = e.target.closest('.type-btn');
  if (!btn) return;
  loopLengthToggle.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.loopLength = parseInt(btn.dataset.beats, 10);
  state.tracks.forEach(track => {
    const grid = document.getElementById(`grid-${track.id}`);
    if (grid) renderGridCells(grid, track);
    updateMiniPreview(track);
  });
  scheduleSave();
});

// ── BPM controls ───────────────────────────────────────────────────────────
bpmRange.addEventListener('input', () => {
  state.bpm = parseInt(bpmRange.value, 10);
  bpmInput.value = bpmRange.value;
  scheduleSave();
});

bpmInput.addEventListener('change', () => {
  const val = Math.max(60, Math.min(240, parseInt(bpmInput.value, 10) || 240));
  state.bpm = val;
  bpmInput.value = val;
  bpmRange.value = val;
  scheduleSave();
});

// ── Audio engine ───────────────────────────────────────────────────────────
let audioCtx       = null;
let masterGain     = null;
let isPlaying      = false;
let scheduledNodes = [];
let loopTimeoutId  = null;
let cursorTimeouts = [];

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

function scheduleLoop(startTime, iteration = 0) {
  const ctx      = getAudioCtx();
  const beatDur  = 60 / state.bpm;
  const loopDur  = state.loopLength * beatDur;
  const newNodes = [];

  state.tracks.forEach(track => {
    if (track.muted) return;
    if (iteration % (track.every || 1) !== 0) return; // skip this iteration
    const inst = INSTRUMENTS[track.instrument] || INSTRUMENTS.piano;

    Object.keys(track.cells).forEach(key => {
      const [niStr, bStr] = key.split('-');
      const beat = parseInt(bStr, 10);
      if (beat >= state.loopLength) return;

      const freq = noteToFreq(state.noteRange[parseInt(niStr, 10)]);
      const node = inst.synth(ctx, freq, startTime + beat * beatDur, beatDur * 0.88, masterGain);
      newNodes.push(node);
    });
  });

  scheduledNodes = newNodes;

  // Visual cursor
  cursorTimeouts.forEach(clearTimeout);
  cursorTimeouts = [];
  for (let b = 0; b < state.loopLength; b++) {
    const delay = Math.max(0, (startTime + b * beatDur - ctx.currentTime) * 1000);
    cursorTimeouts.push(setTimeout(() => moveCursor(b), delay));
  }

  // Reschedule just before end for gapless looping
  const msUntilEnd = (startTime + loopDur - ctx.currentTime) * 1000;
  loopTimeoutId = setTimeout(() => {
    if (!isPlaying) return;
    scheduledNodes = [];
    scheduleLoop(startTime + loopDur, iteration + 1);
  }, msUntilEnd - 200);
}

function moveCursor(beat) {
  if (!isPlaying) return;
  document.querySelectorAll('.beat-num.cursor, .seq-cell.cursor')
    .forEach(c => c.classList.remove('cursor'));
  document.querySelectorAll(`[data-beat="${beat}"]`)
    .forEach(c => c.classList.add('cursor'));
}

function startPlayback() {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  isPlaying = true;
  scheduleLoop(ctx.currentTime + 0.05, 0);
  playBtn.textContent = '■ Stop';
  playBtn.classList.replace('btn-primary', 'btn-stop');
  trackEvent('play_loop', { bpm: state.bpm, loop_length: state.loopLength, track_count: state.tracks.filter(t => !t.muted).length });
}

function stopPlayback() {
  isPlaying = false;
  clearTimeout(loopTimeoutId);
  cursorTimeouts.forEach(clearTimeout);
  cursorTimeouts = [];
  scheduledNodes.forEach(node => { try { node.stop(audioCtx.currentTime); } catch (e) {} });
  scheduledNodes = [];
  document.querySelectorAll('.beat-num.cursor, .seq-cell.cursor')
    .forEach(c => c.classList.remove('cursor'));
  playBtn.textContent = '▶ Play';
  playBtn.classList.replace('btn-stop', 'btn-primary');
}

playBtn.addEventListener('click', () => {
  isPlaying ? stopPlayback() : startPlayback();
});

document.addEventListener('keydown', e => {
  if (e.code !== 'Space') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.isContentEditable) return;
  e.preventDefault();
  isPlaying ? stopPlayback() : startPlayback();
});

// ── Code generation ────────────────────────────────────────────────────────
// MakeCode melody strings don't support sharp (#) notes; use !freq,ms instead.
function noteToMcToken(noteName, beatMs) {
  if (noteName === 'R') return 'R';
  if (noteName.includes('#')) {
    return `!${Math.round(noteToFreq(noteName))},${beatMs}`;
  }
  return noteName;
}

function generateMelodyString(track) {
  const inst   = INSTRUMENTS[track.instrument] || INSTRUMENTS.piano;
  const beatMs = Math.round(60000 / state.bpm);
  const prefix = `~${inst.mcWaveform} ${inst.mcAdsr} `;
  const beats  = [];
  for (let b = 0; b < state.loopLength; b++) {
    let noteName = null;
    for (let ni = 0; ni < state.noteRange.length; ni++) {
      if (track.cells[`${ni}-${b}`]) { noteName = state.noteRange[ni]; break; }
    }
    beats.push(noteToMcToken(noteName || 'R', beatMs));
  }
  return prefix + beats.join(' ');
}

function generateCode() {
  const active = state.tracks.filter(t => !t.muted);
  if (active.length === 0 || active.every(t => Object.keys(t.cells).length === 0)) {
    showToast('Add some notes first!', 'error');
    return;
  }

  const loopMs = Math.round((60000 / state.bpm) * state.loopLength);
  const lines  = [`music.setTempo(${state.bpm})`, ''];

  // Declare counter variables for tracks with every > 1
  let counterIdx = 0;
  const counters = new Map(); // track.id → variable name
  active.forEach(t => {
    if ((t.every || 1) > 1) {
      const v = `c${counterIdx++}`;
      counters.set(t.id, v);
      lines.push(`let ${v} = 0`);
    }
  });
  if (counters.size > 0) lines.push('');

  // Build the inner body lines for a single track
  function trackBody(t, pad) {
    const melody = generateMelodyString(t);
    const label  = (INSTRUMENTS[t.instrument] || INSTRUMENTS.piano).label;
    const every  = t.every || 1;
    const out    = [];
    if (every === 1) {
      out.push(`${pad}// ${label}`);
      out.push(`${pad}music.playMelody("${melody}", ${state.bpm})`);
    } else {
      const v = counters.get(t.id);
      out.push(`${pad}// ${label} — every ${every} loops`);
      out.push(`${pad}if (${v} == 0) {`);
      out.push(`${pad}    music.playMelody("${melody}", ${state.bpm})`);
      out.push(`${pad}} else {`);
      out.push(`${pad}    pause(${loopMs})`);
      out.push(`${pad}}`);
      out.push(`${pad}${v} = (${v} + 1) % ${every}`);
    }
    return out;
  }

  if (active.length === 1) {
    lines.push('forever(function () {');
    trackBody(active[0], '    ').forEach(l => lines.push(l));
    lines.push('})');
  } else {
    active.forEach(t => {
      lines.push('control.runInParallel(function () {');
      lines.push('    forever(function () {');
      trackBody(t, '        ').forEach(l => lines.push(l));
      lines.push('    })');
      lines.push('})');
    });
  }

  musicOutputEl.textContent = lines.join('\n');
  outputCard.removeAttribute('hidden');
  outputCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  trackEvent('generate_code', { bpm: state.bpm, loop_length: state.loopLength, track_count: active.length });
}

generateBtn.addEventListener('click', generateCode);

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(musicOutputEl.textContent)
    .then(() => { showToast('Code copied!'); trackEvent('copy_code', { bpm: state.bpm, loop_length: state.loopLength, track_count: state.tracks.filter(t => !t.muted).length }); })
    .catch(() => showToast('Copy failed', 'error'));
});

// ── URL hash: save & restore ───────────────────────────────────────────────
let saveTimer = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveToHash, 800);
}

function saveToHash() {
  const data = {
    bpm: state.bpm,
    loopLength: state.loopLength,
    tracks: state.tracks.map(({ id, name, color, muted, instrument, collapsed, every, cells }) =>
      ({ id, name, color, muted, instrument, collapsed, every, cells }))
  };
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const b64   = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
  history.replaceState(null, '', '#' + b64);
}

function loadFromHash() {
  const hash = location.hash.slice(1);
  if (!hash) return false;
  try {
    const bytes = Uint8Array.from(atob(hash), c => c.charCodeAt(0));
    const data  = JSON.parse(new TextDecoder().decode(bytes));
    state.bpm        = data.bpm        || 240;
    state.loopLength = data.loopLength || 16;
    state.tracks     = (data.tracks || []).map(t => ({
      ...t,
      instrument: t.instrument || 'piano',
      collapsed:  t.collapsed  || false,
      every:      t.every      || 1
    }));
    bpmRange.value = state.bpm;
    bpmInput.value = state.bpm;
    loopLengthToggle.querySelectorAll('.type-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.beats, 10) === state.loopLength);
    });
    nextTrackNum = state.tracks.length + 1;
    return true;
  } catch (e) {
    return false;
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
loadFromHash();
renderAllTracks();
updateHint();
