import { CONTROL_META, PALETTE_STYLES, VISUAL_MODES } from '../presets.js';

export default function ControlPanel({ controls, updateControl }) {
  return (
    <div className="control-stack">
      <label className="select-row mode-select">
        Visual mode
        <select value={controls.visualMode} onChange={(event) => updateControl('visualMode', event.target.value)}>
          {VISUAL_MODES.map((mode) => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
      </label>
      {CONTROL_META.map(([key, label, min, max, step]) => (
        <label className="slider-row" key={key}>
          <span>
            <b>{label}</b>
            <em>{key === 'paletteStyle' ? PALETTE_STYLES[controls[key]] : Number(controls[key]).toFixed(step === 1 ? 0 : 2)}</em>
          </span>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={controls[key]}
            onChange={(event) => updateControl(key, Number(event.target.value))}
          />
        </label>
      ))}
      <div className="toggle-grid">
        <label className="check-row">
          <input
            type="checkbox"
            checked={controls.transparent}
            onChange={(event) => updateControl('transparent', event.target.checked)}
          />
          Transparent overlay
        </label>
        <label className="select-row">
          Export size
          <select value={controls.renderSize} onChange={(event) => updateControl('renderSize', event.target.value)}>
            <option value="screen">Screen</option>
            <option value="1080p">1920 x 1080</option>
            <option value="4k">3840 x 2160</option>
          </select>
        </label>
      </div>
    </div>
  );
}
