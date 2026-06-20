# MakeCode Music Looper — Implementation Plan

## Context

A browser-based step sequencer that lets users compose music visually, hear it play in the browser, then copy generated `music.playMelody()` code directly into MakeCode Arcade. Companion tool to the existing image generator — same site, separate page, shared theme.

**Key constraints:**
- MakeCode Arcade's `music.playMelody()` is **monophonic** (one note per beat per track)
- Multiple simultaneous melodies require multiple tracks + `control.runInParallel()`
- Beat unit = quarter note at the selected BPM
- No build step — vanilla JS, zero dependencies, static files only

---

## Architecture

```
index.html      existing image generator (add nav bar only)
music.html      music looper page (new)
music.js        all looper logic (new)
style.css       shared — extend with nav + music styles
```

Shared across both pages via existing `localStorage` key: dark/light theme, no extra wiring needed.

---

## Data Model

```js
// Single source of truth for the looper state
{
  bpm: 120,
  loopLength: 16,          // 8 | 16 | 32
  noteRange: ["B5", ..., "C4"],  // top-to-bottom, 24 notes (2 octaves)
  tracks: [
    {
      id: "track-1",
      name: "Track 1",
      color: "#4ecdc4",
      muted: false,
      cells: {
        // "noteIndex-beatIndex": true  e.g. "3-0": true means row 3, beat 0 is ON
      }
    }
  ]
}
```

---

## Stage 1 — Foundation & Nav

**Goal:** Both pages exist and are linked; shared theme works across them.

Tasks:
- [ ] Create `music.html` shell (head, nav bar, empty main, footer)
- [ ] Add nav bar to `index.html` (2 links: Image Generator / Music Looper)
- [ ] Add nav + music page base styles to `style.css`
- [ ] Wire dark/light theme toggle to `music.html` using existing localStorage key

**Done when:** Navigating between the two pages works; theme toggle on either page persists to the other.

---

## Stage 2 — Step Sequencer Grid

**Goal:** A playable grid renders and responds to clicks.

Tasks:
- [ ] Render note labels on Y-axis (B5 → C4, 24 rows)
- [ ] Render beat columns on X-axis (count controlled by loop length selector)
- [ ] Click a cell → toggles active state (on/off visual)
- [ ] Loop length selector (8 / 16 / 32) re-renders grid width without losing existing cells
- [ ] Style: inactive cells are subtle, active cells pop with track color

**Done when:** User can click cells to build a pattern and change loop length.

---

## Stage 3 — Track Management

**Goal:** Users can layer multiple tracks with independent grids.

Tasks:
- [ ] Single track rendered by default
- [ ] "Add Track" button appends a new track with a distinct color
- [ ] Each track header has: color swatch, editable name, mute toggle, remove button
- [ ] Muted tracks render grayed out
- [ ] Tracks stack vertically; each has its own full-width grid

**Done when:** User can add 3+ tracks, mute/unmute them, and remove them independently.

---

## Stage 4 — Browser Playback (Web Audio API)

**Goal:** Click Play → hear the loop. No external libraries.

Tasks:
- [ ] Build note-to-frequency map (A4 = 440 Hz, equal temperament formula for all 24 notes)
- [ ] BPM control (number input + slider, 60–240 BPM, default 120)
- [ ] Play button: schedule all active cells using `AudioContext` clock; use `OscillatorNode` (type: `triangle` — closest to MakeCode's tone)
- [ ] Loop: when the last beat finishes, reschedule from beat 0
- [ ] Stop button: cancel scheduled nodes, reset playhead
- [ ] Beat cursor: highlight the current column as the loop plays
- [ ] Multi-track: all tracks play simultaneously (each gets its own oscillator per note)
- [ ] Muted tracks are skipped during scheduling

**Done when:** A 16-beat pattern with 2 tracks plays in the browser, loops cleanly, and the cursor tracks the beat.

---

## Stage 5 — MakeCode Code Generation

**Goal:** Click Generate → get pasteable MakeCode Arcade code.

Tasks:
- [ ] Map active cells per track to a melody string: active cell = note name, empty cell = `"R"` (rest)
- [ ] Single track output:
  ```js
  music.setTempo(120)
  forever(function () {
      music.playMelody("C5 R D5 R E5 R R R", 120)
  })
  ```
- [ ] Multi-track output (one `control.runInParallel` block per track):
  ```js
  music.setTempo(120)
  control.runInParallel(function () {
      forever(function () {
          music.playMelody("C5 R D5 R", 120)
      })
  })
  control.runInParallel(function () {
      forever(function () {
          music.playMelody("C3 R C3 R", 120)
      })
  })
  ```
- [ ] Muted tracks are excluded from generated code
- [ ] Code output block with copy-to-clipboard button (same pattern as existing app)
- [ ] Toast notification on copy (same pattern as existing app)

**Done when:** Pasting the output into MakeCode Arcade plays the same melody heard in the browser.

---

## Stage 6 — Polish

**Goal:** The tool feels complete and delightful.

Tasks:
- [ ] Keyboard shortcut: `Space` = play/stop
- [ ] "Clear" button per track (wipes all cells in that track)
- [ ] "Clear All" resets everything
- [ ] URL hash encoding: serialize state to `#` so the pattern is shareable via link
- [ ] Mobile layout: grid scrolls horizontally, controls stack vertically
- [ ] Google Analytics events: `play_loop`, `generate_code`, `add_track`, `copy_code`
- [ ] Empty state message when no cells are active (guide the user to click cells)

---

## Files to Create / Modify

| File | Action | Notes |
|------|--------|-------|
| `music.html` | Create | New page — full looper UI |
| `music.js` | Create | All looper logic, Web Audio, code gen |
| `style.css` | Modify | Add nav bar + music looper styles |
| `index.html` | Modify | Add nav bar only (2 lines of HTML) |

---

## Verification Checklist

- [ ] Open `music.html` locally, build a pattern, press Play — audio plays correctly
- [ ] Add a second track, verify both play simultaneously without glitching
- [ ] Change BPM — playback tempo changes immediately on next loop
- [ ] Change loop length from 16 → 8 — pattern truncates, playback adjusts
- [ ] Click Generate Code, paste into MakeCode Arcade — melody matches browser playback
- [ ] Mute a track — it disappears from both playback and generated code
- [ ] Toggle dark mode on music page — persists when navigating to image generator
- [ ] On mobile: grid scrolls horizontally, all controls accessible
