import { useCallback, useMemo, useRef, useState } from 'react';
import { Maximize2, PanelRightClose, PanelRightOpen, Shuffle } from 'lucide-react';
import ControlPanel from './components/ControlPanel.jsx';
import PresetManager from './components/PresetManager.jsx';
import RecorderControls from './components/RecorderControls.jsx';
import VisualCanvas from './components/VisualCanvas.jsx';
import { DEFAULT_CONTROLS, PRESETS, VISUAL_MODES } from './presets.js';

function randomPreset() {
  return {
    visualMode: VISUAL_MODES[Math.floor(Math.random() * VISUAL_MODES.length)],
    speed: 0.25 + Math.random() * 1.55,
    colorIntensity: 0.85 + Math.random() * 0.95,
    hueShiftSpeed: 0.08 + Math.random() * 0.95,
    zoom: 0.35 + Math.random() * 1.85,
    rotationSpeed: -0.85 + Math.random() * 1.7,
    complexity: Math.floor(4 + Math.random() * 11),
    symmetry: Math.floor(3 + Math.random() * 19),
    distortion: 0.18 + Math.random() * 1.18,
    glow: 0.12 + Math.random() * 0.78,
    contrast: 0.86 + Math.random() * 0.72,
    brightness: 0.82 + Math.random() * 0.46,
    morphRate: 0.16 + Math.random() * 1.04,
    detailScale: 0.35 + Math.random() * 1.45,
    warpAmount: Math.random() * 1.5,
    trailStrength: 0.15 + Math.random() * 0.85,
    centerPull: Math.random() * 1.5,
    paletteStyle: Math.floor(Math.random() * 6),
    seed: Math.floor(Math.random() * 99999),
    transparent: false,
    renderSize: 'screen'
  };
}

function normalizeControls(values) {
  return {
    ...DEFAULT_CONTROLS,
    ...values
  };
}

export default function App() {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const [controls, setControls] = useState(PRESETS[0].values);
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0].name);
  const [panelOpen, setPanelOpen] = useState(true);
  const [audioName, setAudioName] = useState('');

  const updateControl = useCallback((key, value) => {
    setControls((current) => ({
      ...current,
      [key]: value
    }));
    setSelectedPreset('Custom');
  }, []);

  const applyPreset = useCallback((name) => {
    const preset = PRESETS.find((item) => item.name === name);
    if (!preset) return;
    setControls(normalizeControls(preset.values));
    setSelectedPreset(name);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const target = document.querySelector('.stage');
    if (!document.fullscreenElement) {
      target?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  const savePreset = useCallback(() => {
    const saved = JSON.parse(localStorage.getItem('trance-presets') || '[]');
    const name = `Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    localStorage.setItem('trance-presets', JSON.stringify([...saved, { name, values: controls }]));
    setSelectedPreset(name);
  }, [controls]);

  const loadPreset = useCallback((preset) => {
    setControls(normalizeControls(preset.values));
    setSelectedPreset(preset.name);
  }, []);

  const audioControls = useMemo(() => ({
    audioRef,
    audioName,
    setAudioName
  }), [audioName]);

  return (
    <main className="app">
      <section className="stage">
        <VisualCanvas ref={canvasRef} controls={controls} audioRef={audioRef} />
        <div className="topbar">
          <div>
            <span className="eyebrow">Psychedelic generator</span>
            <h1>Trance Visual Forge</h1>
          </div>
          <div className="top-actions">
            <button
              className="icon-button"
              onClick={() => {
                setControls(randomPreset());
                setSelectedPreset('Custom');
              }}
              title="Randomize preset"
            >
              <Shuffle size={18} />
            </button>
            <button className="icon-button" onClick={toggleFullscreen} title="Toggle fullscreen">
              <Maximize2 size={18} />
            </button>
            <button className="icon-button" onClick={() => setPanelOpen((open) => !open)} title="Toggle controls">
              {panelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </button>
          </div>
        </div>
        <RecorderControls canvasRef={canvasRef} audioRef={audioRef} />
      </section>

      <aside className={`panel ${panelOpen ? 'is-open' : 'is-closed'}`}>
        <PresetManager
          selectedPreset={selectedPreset}
          applyPreset={applyPreset}
          savePreset={savePreset}
          loadPreset={loadPreset}
          reset={() => {
            setControls(DEFAULT_CONTROLS);
            setSelectedPreset('Default');
          }}
          randomize={() => {
            setControls(randomPreset());
            setSelectedPreset('Custom');
          }}
          audioControls={audioControls}
          controls={controls}
          updateControl={updateControl}
          toggleFullscreen={toggleFullscreen}
        />
        <ControlPanel controls={controls} updateControl={updateControl} />
      </aside>
    </main>
  );
}
