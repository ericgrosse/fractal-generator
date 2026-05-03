import { Circle, Download, Square } from 'lucide-react';
import { useRef, useState } from 'react';

const DURATIONS = [
  ['10', '10 sec'],
  ['30', '30 sec'],
  ['60', '1 min'],
  ['custom', 'Custom']
];

export default function RecorderControls({ canvasRef, audioRef }) {
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [duration, setDuration] = useState('10');
  const [customDuration, setCustomDuration] = useState(15);
  const [progress, setProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [format, setFormat] = useState('webm');

  const seconds = duration === 'custom' ? Number(customDuration) : Number(duration);

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;
    const stream = canvas.captureStream(60);

    // Browser support for muxing audio into MediaRecorder output varies, so this
    // merges uploaded audio only when the active element exposes a capture stream.
    const audioStream = audioRef.current?.captureStream?.();
    audioStream?.getAudioTracks().forEach((track) => stream.addTrack(track));

    const mime = format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : 'video/webm;codecs=vp9';
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    chunksRef.current = [];
    recorderRef.current = recorder;
    const startedAt = performance.now();

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trance-visual-${Date.now()}.${mime.includes('mp4') ? 'mp4' : 'webm'}`;
      link.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
      setProgress(0);
    };

    recorder.start(500);
    setIsRecording(true);
    timerRef.current = window.setInterval(() => {
      const elapsed = (performance.now() - startedAt) / 1000;
      setProgress(Math.min(1, elapsed / seconds));
      if (elapsed >= seconds) {
        stopRecording();
      }
    }, 120);
  };

  const stopRecording = () => {
    window.clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  };

  return (
    <div className="recorder">
      <div className="recorder-main">
        <button className={isRecording ? 'danger' : 'record'} onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? <Square size={16} /> : <Circle size={16} />}
          {isRecording ? 'Stop' : 'Record'}
        </button>
        <select value={duration} onChange={(event) => setDuration(event.target.value)} disabled={isRecording}>
          {DURATIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        {duration === 'custom' && (
          <input
            className="duration-input"
            type="number"
            min="1"
            max="3600"
            value={customDuration}
            disabled={isRecording}
            onChange={(event) => setCustomDuration(event.target.value)}
          />
        )}
        <select value={format} onChange={(event) => setFormat(event.target.value)} disabled={isRecording}>
          <option value="webm">WebM</option>
          <option value="mp4">MP4 when supported</option>
        </select>
        <Download size={16} />
      </div>
      <div className="progress-shell">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <p>{isRecording ? `Recording ${Math.round(progress * 100)}%` : 'Ready to export canvas video'}</p>
    </div>
  );
}
