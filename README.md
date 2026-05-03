# Trance Visual Forge

A browser-based psychedelic visual generator for creating animated trance, techno, synthwave, ambient, and house video backgrounds.

Built with React, plain JavaScript, Vite, and HTML Canvas.

## Features

- Fullscreen animated canvas
- Live controls for speed, color, zoom, rotation, complexity, symmetry, glow, contrast, brightness, morphing, trails, palettes, and more
- Distinct visual modes:
  - Kaleidoscope Tunnel
  - Mandelbrot Bloom
  - Julia Fractal
  - Plasma Storm
  - Starfield Warp
  - Liquid Marble
  - Electric Ribbons
  - Sacred Geometry
  - Audio Pulse Rings
  - Vortex Grid
- Presets designed to look meaningfully different from each other
- Random preset generation with seeded randomness
- Save/load presets with `localStorage`
- Optional audio upload with bass/mids/treble reactivity
- Canvas recording with the browser `MediaRecorder` API
- WebM export, with MP4 support used when the browser supports it
- Recording duration choices: 10 seconds, 30 seconds, 1 minute, or custom
- 1920x1080 and 4K export canvas modes
- Transparent overlay mode for compositing

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

Open:

```text
http://localhost:5173
```

Build for production:

```bash
npm run build
```

## Usage Notes

Use the preset dropdown to switch between visual styles, then tweak sliders live while the animation runs.

The `visualMode` dropdown changes the rendering algorithm, not just the colors. This is the main control for getting different visual families.

Recording exports the current canvas animation. WebM has the best browser support. MP4 export is attempted only when `MediaRecorder` reports support for it.

Audio reactivity works after uploading and playing an audio file. Browser support for including uploaded audio in the recorded video varies.

## Project Structure

```text
src/
  App.jsx
  main.jsx
  presets.js
  components/
    ControlPanel.jsx
    PresetManager.jsx
    RecorderControls.jsx
    VisualCanvas.jsx
```

`VisualCanvas.jsx` contains the mode-specific rendering algorithms and the animation loop.
