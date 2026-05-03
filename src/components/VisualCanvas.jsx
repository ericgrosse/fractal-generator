import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const FIELD_SIZE = 360;
const TAU = Math.PI * 2;

function seeded(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function fract(value) {
  return value - Math.floor(value);
}

function rotatePoint(x, y, angle) {
  const cs = Math.cos(angle);
  const sn = Math.sin(angle);
  return [x * cs - y * sn, x * sn + y * cs];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function applyPalette(baseHue, c, audio, energy, tone = 0) {
  const palette = Number(c.paletteStyle || 0);
  const hueOffsets = [0, 285, 36, 178, 258, 112];
  const accent = [
    Math.sin(tone * 2.1) * 28,
    Math.sin(tone * 3.4) * 54,
    Math.cos(tone * 1.7) * 42,
    Math.sin(tone * 2.6) * 36,
    Math.cos(tone * 3.1) * 62,
    Math.sin(tone * 4.2) * 48
  ][palette] || 0;
  return baseHue + hueOffsets[palette] + accent + audio.mids * 70;
}

function commonColor(sample, c, audio, time) {
  const energy = clamp(sample.energy);
  const hue = applyPalette(
    sample.hue + time * c.hueShiftSpeed * 120,
    c,
    audio,
    energy,
    sample.tone || energy
  );
  const light = clamp((energy * c.contrast + 0.05) * c.brightness + audio.bass * 0.18);
  const sat = clamp(0.55 + c.colorIntensity * 0.24 + audio.treble * 0.25);
  const [r, g, b] = hslToRgb(hue, sat, clamp(sample.light ?? light, 0.02, 0.86));
  return [r, g, b, c.transparent ? Math.min(245, 32 + energy * 230) : 255];
}

function gridLine(v, width) {
  const d = Math.abs(fract(v) - 0.5);
  return Math.exp(-d * d / Math.max(0.0001, width));
}

function renderKaleidoscopeTunnel(x, y, time, c, audio, seedA, seedB) {
  const symmetry = Math.max(1, Math.round(c.symmetry));
  const complex = Math.max(2, Math.round(c.complexity));
  let angle = Math.atan2(y, x) + time * c.rotationSpeed + audio.mids * 0.35;
  const radius = Math.hypot(x, y) + 0.0008;
  const wedge = TAU / symmetry;
  angle = Math.abs(((angle + wedge * 20) % wedge) - wedge / 2);

  // Kaleidoscope Tunnel: folds polar space into mirrored wedges and samples
  // tunnel-like sine fields for the original trance mandala look.
  const tunnel = c.zoom * (1 + audio.bass * 0.42);
  const swirl = angle * symmetry + tunnel / radius + time * c.speed;
  const wave = Math.sin(radius * (complex * 3.8 + audio.treble * 9) - time * 2.6);
  const lace = Math.sin(swirl * 1.7 + wave * c.distortion * 2.4 + seedA);
  const plasma = Math.sin((x * Math.cos(time * 0.7) + y * Math.sin(time * 0.5)) * complex * 7 + time + seedB);
  const mandala = Math.cos(angle * complex * 2.5 + Math.sin(radius * 18 - time * c.morphRate * 4));
  const veins = Math.sin((1 / radius) * (c.zoom * 1.8) + lace * 3 + time * 1.4);
  const value = (lace + plasma + mandala + veins) / 4;
  const energy = Math.pow(Math.abs(value), 0.72);
  return { energy, hue: value * 96 + radius * 170 + seedB * 14, tone: radius + angle };
}

function renderMandelbrotBloom(x, y, time, c, audio, seedA) {
  // Mandelbrot Bloom: animated complex-plane iteration with breathing zoom and
  // orbit traps, producing floral fractal islands instead of radial symmetry.
  const zoom = 1.85 / (c.zoom + 0.2 + audio.bass * 0.7);
  const [rx, ry] = rotatePoint(x * zoom - 0.45, y * zoom, time * c.rotationSpeed * 0.25);
  const cx = rx + Math.sin(time * c.morphRate + seedA) * 0.16;
  const cy = ry + Math.cos(time * c.morphRate * 0.8 + seedA) * 0.13;
  let zx = 0;
  let zy = 0;
  let minOrbit = 9;
  const maxIter = Math.max(18, Math.round(18 + c.complexity * 5));
  let iter = 0;
  for (; iter < maxIter; iter += 1) {
    const xx = zx * zx - zy * zy + cx;
    zy = 2 * zx * zy + cy;
    zx = xx;
    const orbit = zx * zx + zy * zy;
    minOrbit = Math.min(minOrbit, Math.abs(orbit - 0.35));
    if (orbit > 6) break;
  }
  const edge = iter / maxIter;
  const bloom = Math.exp(-minOrbit * (15 + c.detailScale * 18));
  const energy = clamp((1 - edge) * 0.2 + bloom * 0.95 + (iter < maxIter ? 0.45 : 0));
  return { energy, hue: iter * 13 + bloom * 120 + x * 40, tone: minOrbit * 8 };
}

function renderJuliaFractal(x, y, time, c, audio, seedA, seedB) {
  // Julia Fractal: iterates z = z^2 + c with animated constants, making sharp
  // branching filaments that drift independently from the Mandelbrot mode.
  const zoom = 1.45 / (c.zoom + 0.08);
  let [zx, zy] = rotatePoint(x * zoom, y * zoom, time * c.rotationSpeed * 0.45);
  const kx = -0.74 + Math.sin(time * c.morphRate + seedA) * (0.18 + c.warpAmount * 0.08);
  const ky = 0.18 + Math.cos(time * c.morphRate * 1.2 + seedB) * (0.22 + audio.mids * 0.1);
  const maxIter = Math.max(20, Math.round(20 + c.complexity * 5));
  let iter = 0;
  let trap = 8;
  for (; iter < maxIter; iter += 1) {
    const xx = zx * zx - zy * zy + kx;
    zy = 2 * zx * zy + ky;
    zx = xx;
    trap = Math.min(trap, Math.abs(zx) + Math.abs(zy));
    if (zx * zx + zy * zy > 8) break;
  }
  const filaments = Math.exp(-trap * (2.5 + c.detailScale * 2));
  const energy = clamp((iter / maxIter) * 0.9 + filaments * 0.6);
  return { energy, hue: iter * 17 + trap * 140, tone: zx + zy };
}

function renderPlasmaStorm(x, y, time, c, audio, seedA) {
  // Plasma Storm: layered moving sine fields in Cartesian space, like liquid
  // voltage clouds with no kaleidoscope folding.
  const scale = (4 + c.complexity * 0.85) * c.detailScale;
  const warp = c.warpAmount + c.distortion;
  const v1 = Math.sin((x * scale + time * 2.4) + Math.sin(y * scale * 0.7 + time) * warp);
  const v2 = Math.sin((y * scale * 1.2 - time * 1.7) + Math.cos(x * scale * 0.5 - time * 0.8) * warp * 2);
  const v3 = Math.sin((x + y) * scale * 0.8 + Math.sin(time + seedA) * 4);
  const v4 = Math.cos(Math.hypot(x, y) * scale * 2.6 - time * 3.1 + audio.treble * 5);
  const value = (v1 + v2 + v3 + v4) / 4;
  return { energy: Math.pow(Math.abs(value), 0.62), hue: value * 160 + x * 80 + y * 35, tone: value };
}

function renderStarfieldWarp(x, y, time, c, audio, seedA) {
  // Starfield Warp: radial modular cells create bright star streaks rushing
  // toward the viewer, driven by zoom and center pull.
  const [rx, ry] = rotatePoint(x, y, time * c.rotationSpeed * 0.18);
  const radius = Math.hypot(rx, ry) + 0.0005;
  const angle = Math.atan2(ry, rx);
  const lanes = Math.max(10, c.complexity * 5);
  const lane = Math.sin(angle * lanes + seedA) * 0.5 + 0.5;
  const depth = fract(1 / (radius * (0.8 + c.centerPull)) - time * (1.8 + c.speed * 2.2));
  const star = Math.exp(-Math.pow(depth - 0.035, 2) * 900);
  const streak = Math.exp(-Math.pow(Math.sin(angle * lanes + time), 2) * (10 + c.detailScale * 20));
  const tunnelFade = clamp(1.2 - radius);
  const energy = clamp((star * (0.5 + lane) + streak * 0.25) * tunnelFade * (1 + audio.bass));
  return { energy, hue: angle * 90 + depth * 220 + time * 80, tone: depth };
}

function renderLiquidMarble(x, y, time, c, audio, seedA) {
  // Liquid Marble: coordinates are repeatedly warped before sampling broad
  // bands, giving a viscous ink-in-water feel.
  let u = x * (2.4 + c.detailScale);
  let v = y * (2.4 + c.detailScale);
  for (let i = 0; i < 4; i += 1) {
    const f = 1.4 + i * 0.8;
    const du = Math.sin(v * f + time * (0.7 + i * 0.13) + seedA) * c.warpAmount;
    const dv = Math.cos(u * f - time * (0.55 + i * 0.11)) * c.distortion;
    u += du * 0.32;
    v += dv * 0.32;
  }
  const bands = Math.sin(u * (2.8 + c.complexity * 0.32) + Math.sin(v + time) * 2.4);
  const veins = Math.sin((u + v) * 7.5 + time * 1.1);
  const energy = clamp(Math.pow(Math.abs(bands), 0.72) * 0.8 + Math.pow(Math.abs(veins), 8) * 0.35);
  return { energy, hue: bands * 115 + u * 28 + v * 18, tone: bands + veins };
}

function renderElectricRibbons(x, y, time, c, audio, seedA) {
  // Electric Ribbons: measures distance to several animated sine curves, then
  // turns those distances into neon strand cores and glow halos.
  const [rx, ry] = rotatePoint(x, y, time * c.rotationSpeed * 0.4);
  let glow = 0;
  let hue = 0;
  const count = Math.max(3, Math.round(c.symmetry / 2));
  for (let i = 0; i < count; i += 1) {
    const offset = (i / count - 0.5) * 2.2;
    const wave = Math.sin(rx * (2.5 + c.detailScale * 3) + time * (1.2 + i * 0.09) + seedA + i) * (0.25 + c.warpAmount * 0.18);
    const curve = offset * 0.45 + wave + Math.sin(rx * 8 + i) * 0.035;
    const d = Math.abs(ry - curve);
    const core = Math.exp(-d * d * (260 + c.complexity * 40));
    const halo = Math.exp(-d * d * (24 + c.glow * 18));
    glow += core + halo * 0.28;
    hue += (i * 58 + rx * 80) * (core + 0.05);
  }
  const energy = clamp(glow * (0.55 + audio.treble * 0.4));
  return { energy, hue: hue / count + time * 40, tone: glow };
}

function renderSacredGeometry(x, y, time, c, audio, seedA) {
  // Sacred Geometry: combines mandala sectors with crisp distance fields for
  // circles, triangles, and flower-of-life rings.
  const radius = Math.hypot(x, y);
  let angle = Math.atan2(y, x) + time * c.rotationSpeed;
  const symmetry = Math.max(3, Math.round(c.symmetry));
  const sector = Math.cos(angle * symmetry);
  const ring = gridLine(radius * (3 + c.zoom * 4) - time * c.morphRate, 0.002 + c.detailScale * 0.005);
  const triangle = Math.abs(Math.cos(angle * 3) * radius - (0.34 + Math.sin(time) * 0.08));
  const triLine = Math.exp(-triangle * triangle * (80 + c.complexity * 25));
  const flower = Math.exp(-Math.pow(Math.sin(radius * 18 + sector * c.warpAmount), 2) * (8 + c.detailScale * 12));
  const center = Math.exp(-radius * radius * (3 + c.centerPull * 5));
  const energy = clamp(ring * 0.65 + triLine * 0.55 + flower * 0.3 + center * 0.35 + audio.mids * 0.12);
  return { energy, hue: angle * 80 + radius * 220 + seedA * 20, tone: sector };
}

function renderAudioPulseRings(x, y, time, c, audio, seedA) {
  // Audio Pulse Rings: concentric radial pulses emphasize bass, with angular
  // ripples for mids and treble even when no audio file is playing.
  const radius = Math.hypot(x, y) + 0.0005;
  const angle = Math.atan2(y, x);
  const pulse = audio.bass || (Math.sin(time * 1.8) * 0.5 + 0.5) * 0.18;
  const ringFreq = 8 + c.complexity * 1.2;
  const rings = Math.sin(radius * ringFreq * c.detailScale - time * (3 + c.speed * 2) - pulse * 5);
  const ringCore = Math.exp(-Math.pow(rings, 2) * (5 + c.warpAmount * 18));
  const spokes = Math.pow(Math.abs(Math.cos(angle * Math.max(3, c.symmetry) + time)), 10);
  const bassHalo = Math.exp(-Math.pow(radius - (0.18 + pulse * 0.55), 2) * 24);
  const energy = clamp(ringCore * 0.72 + spokes * audio.mids * 0.55 + bassHalo * (0.45 + pulse));
  return { energy, hue: radius * 260 + angle * 45 + audio.treble * 180 + seedA, tone: rings };
}

function renderVortexGrid(x, y, time, c, audio, seedA) {
  // Vortex Grid: polar tunnel coordinates are converted into a warped glowing
  // grid, creating moving intersections instead of organic plasma.
  const radius = Math.hypot(x, y) + 0.001;
  const angle = Math.atan2(y, x) + time * c.rotationSpeed + c.warpAmount * Math.sin(radius * 8 - time);
  const depth = c.zoom / radius + time * (0.9 + c.speed);
  const gx = Math.cos(angle) * depth * c.detailScale;
  const gy = Math.sin(angle) * depth * c.detailScale;
  const lineX = gridLine(gx * (1.2 + c.complexity * 0.12), 0.0015 + c.glow * 0.008);
  const lineY = gridLine(gy * (1.2 + c.complexity * 0.12), 0.0015 + c.glow * 0.008);
  const intersections = lineX * lineY;
  const tunnel = clamp(1.2 - radius * (0.75 + c.centerPull * 0.2));
  const energy = clamp((lineX + lineY) * 0.28 + intersections * 1.6) * tunnel;
  return { energy, hue: depth * 32 + angle * 120 + seedA * 30, tone: intersections };
}

function renderSample(x, y, time, c, audio, seedA, seedB) {
  switch (c.visualMode) {
    case 'Mandelbrot Bloom':
      return renderMandelbrotBloom(x, y, time, c, audio, seedA);
    case 'Julia Fractal':
      return renderJuliaFractal(x, y, time, c, audio, seedA, seedB);
    case 'Plasma Storm':
      return renderPlasmaStorm(x, y, time, c, audio, seedA);
    case 'Starfield Warp':
      return renderStarfieldWarp(x, y, time, c, audio, seedA);
    case 'Liquid Marble':
      return renderLiquidMarble(x, y, time, c, audio, seedA);
    case 'Electric Ribbons':
      return renderElectricRibbons(x, y, time, c, audio, seedA);
    case 'Sacred Geometry':
      return renderSacredGeometry(x, y, time, c, audio, seedA);
    case 'Audio Pulse Rings':
      return renderAudioPulseRings(x, y, time, c, audio, seedA);
    case 'Vortex Grid':
      return renderVortexGrid(x, y, time, c, audio, seedA);
    case 'Kaleidoscope Tunnel':
    default:
      return renderKaleidoscopeTunnel(x, y, time, c, audio, seedA, seedB);
  }
}

const VisualCanvas = forwardRef(function VisualCanvas({ controls, audioRef }, forwardedRef) {
  const canvasRef = useRef(null);
  const controlsRef = useRef(controls);
  const audioDataRef = useRef({ bass: 0, mids: 0, treble: 0 });
  const analyserRef = useRef(null);
  const frameRef = useRef(null);
  const imageRef = useRef(null);

  useImperativeHandle(forwardedRef, () => canvasRef.current);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const setup = () => {
      if (analyserRef.current) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      const source = context.createMediaElementSource(audio);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyser.connect(context.destination);
      analyserRef.current = { analyser, data: new Uint8Array(analyser.frequencyBinCount), context };
    };
    audio.addEventListener('play', setup);
    return () => audio.removeEventListener('play', setup);
  }, [audioRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    const field = document.createElement('canvas');
    field.width = FIELD_SIZE;
    field.height = FIELD_SIZE;
    const fieldCtx = field.getContext('2d', { willReadFrequently: true });
    const feedback = document.createElement('canvas');
    const feedbackCtx = feedback.getContext('2d', { alpha: true });
    let last = performance.now();
    let phase = 0;

    const resize = () => {
      const c = controlsRef.current;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, c.renderSize === '4k' ? 2 : 1.5);
      const size = c.renderSize === '1080p'
        ? [1920, 1080]
        : c.renderSize === '4k'
          ? [3840, 2160]
          : [canvas.clientWidth * pixelRatio, canvas.clientHeight * pixelRatio];
      canvas.width = Math.max(1, Math.floor(size[0]));
      canvas.height = Math.max(1, Math.floor(size[1]));
      feedback.width = canvas.width;
      feedback.height = canvas.height;
      imageRef.current = fieldCtx.createImageData(FIELD_SIZE, FIELD_SIZE);
    };

    const readAudio = () => {
      const setup = analyserRef.current;
      if (!setup) return audioDataRef.current;
      if (setup.context.state === 'suspended') setup.context.resume();
      setup.analyser.getByteFrequencyData(setup.data);
      const avg = (from, to) => {
        let sum = 0;
        for (let i = from; i < to; i += 1) sum += setup.data[i];
        return sum / Math.max(1, to - from) / 255;
      };
      audioDataRef.current = {
        bass: avg(1, 12),
        mids: avg(12, 62),
        treble: avg(62, 180)
      };
      return audioDataRef.current;
    };

    const renderField = (time) => {
      const c = controlsRef.current;
      const audio = readAudio();
      const image = imageRef.current;
      const data = image.data;
      const seedA = seeded(c.seed) * TAU;
      const seedB = seeded(c.seed + 81) * 12;
      const center = FIELD_SIZE / 2;

      for (let y = 0; y < FIELD_SIZE; y += 1) {
        for (let x = 0; x < FIELD_SIZE; x += 1) {
          const nx = (x - center) / center;
          const ny = (y - center) / center;
          const pull = 1 + Math.hypot(nx, ny) * c.centerPull * 0.12;
          const [rx, ry] = rotatePoint(nx / pull, ny / pull, time * c.rotationSpeed * 0.18);
          const sample = renderSample(rx, ry, time, c, audio, seedA, seedB);
          const [r, g, b, a] = commonColor(sample, c, audio, time);
          const i = (y * FIELD_SIZE + x) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = a;
        }
      }
      fieldCtx.putImageData(image, 0, 0);
    };

    const draw = (now) => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      const c = controlsRef.current;
      phase += delta * (0.6 + c.speed * 1.4);
      renderField(phase);

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const audio = audioDataRef.current;

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.filter = 'none';
      if (c.transparent) ctx.clearRect(0, 0, w, h);
      else {
        const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.72);
        bg.addColorStop(0, 'rgba(10, 6, 24, 0.92)');
        bg.addColorStop(1, 'rgba(0, 0, 0, 0.96)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.globalAlpha = 0.98;
      ctx.filter = `saturate(${130 + c.colorIntensity * 80}%) contrast(${96 + c.contrast * 26}%) brightness(${96 + c.brightness * 18}%)`;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(field, 0, 0, w, h);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(phase * c.rotationSpeed * 0.45);
      const scale = 1.004 + c.zoom * 0.008 + audio.bass * 0.025 + c.centerPull * 0.004;
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      ctx.globalAlpha = (0.18 + c.trailStrength * 0.62) * (0.8 + c.glow * 0.25);
      ctx.filter = `blur(${c.glow * 16}px) saturate(${120 + c.colorIntensity * 90}%) contrast(${90 + c.contrast * 32}%)`;
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(feedback, -w * 0.014, -h * 0.014, w * 1.028, h * 1.028);
      ctx.restore();

      ctx.globalAlpha = 0.24 + c.glow * 0.25;
      ctx.filter = `blur(${c.glow * 2.2}px) saturate(${115 + c.colorIntensity * 70}%)`;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(field, 0, 0, w, h);

      ctx.globalAlpha = 0.16 + audio.bass * 0.22 + c.glow * 0.16;
      ctx.filter = `blur(${2 + c.glow * 24}px)`;
      ctx.drawImage(field, w * 0.08, h * 0.08, w * 0.84, h * 0.84);
      ctx.globalAlpha = 1;
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';

      feedbackCtx.clearRect(0, 0, feedback.width, feedback.height);
      feedbackCtx.globalAlpha = 0.72 + c.trailStrength * 0.28;
      feedbackCtx.drawImage(canvas, 0, 0, feedback.width, feedback.height);

      frameRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [audioRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    window.dispatchEvent(new Event('resize'));
  }, [controls.renderSize]);

  return <canvas ref={canvasRef} className="visual-canvas" />;
});

export default VisualCanvas;
