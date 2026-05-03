import { Download, FolderOpen, RotateCcw, Save, Shuffle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PRESETS } from '../presets.js';

export default function PresetManager({
  selectedPreset,
  applyPreset,
  savePreset,
  loadPreset,
  reset,
  randomize,
  audioControls,
  controls,
  updateControl,
  toggleFullscreen
}) {
  const [savedTick, setSavedTick] = useState(0);
  const savedPresets = useMemo(
    () => JSON.parse(localStorage.getItem('trance-presets') || '[]'),
    [savedTick]
  );

  const handleSave = () => {
    savePreset();
    setSavedTick((tick) => tick + 1);
  };

  const handleAudio = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    audioControls.audioRef.current.src = url;
    audioControls.audioRef.current.loop = true;
    audioControls.audioRef.current.play();
    audioControls.setAudioName(file.name);
  };

  const exportPreset = () => {
    const blob = new Blob([JSON.stringify(controls, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trance-preset-${controls.seed}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel-section">
      <div className="panel-title">
        <span>Preset engine</span>
        <button onClick={toggleFullscreen}>Fullscreen</button>
      </div>

      <select
        className="preset-select"
        value={PRESETS.some((preset) => preset.name === selectedPreset) ? selectedPreset : ''}
        onChange={(event) => applyPreset(event.target.value)}
      >
        <option value="" disabled>Custom preset</option>
        {PRESETS.map((preset) => (
          <option key={preset.name} value={preset.name}>{preset.name}</option>
        ))}
      </select>

      <div className="button-grid">
        <button onClick={randomize}><Shuffle size={16} />Randomize</button>
        <button onClick={handleSave}><Save size={16} />Save</button>
        <button onClick={reset}><RotateCcw size={16} />Reset</button>
        <button onClick={exportPreset}><Download size={16} />Export JSON</button>
      </div>

      <label className="select-row">
        Load saved preset
        <select
          value=""
          onChange={(event) => {
            const preset = savedPresets[Number(event.target.value)];
            if (preset) loadPreset(preset);
          }}
        >
          <option value="">Choose saved</option>
          {savedPresets.map((preset, index) => (
            <option key={`${preset.name}-${index}`} value={index}>{preset.name}</option>
          ))}
        </select>
      </label>

      <label className="file-row">
        <FolderOpen size={16} />
        <span>{audioControls.audioName || 'Upload audio for reactivity'}</span>
        <input type="file" accept="audio/*" onChange={(event) => handleAudio(event.target.files?.[0])} />
      </label>
      <audio ref={audioControls.audioRef} crossOrigin="anonymous" />
    </div>
  );
}
