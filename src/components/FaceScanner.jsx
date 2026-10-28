import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react';
import { Button, Alert } from './UI';

const POSES = [
  { key: 'front', label: 'Look straight', detail: 'Face the camera directly', icon: '●' },
  { key: 'left', label: 'Turn left', detail: 'Slowly turn your head to the left', icon: '←' },
  { key: 'right', label: 'Turn right', detail: 'Slowly turn your head to the right', icon: '→' },
  { key: 'up', label: 'Look up', detail: 'Tilt your head slightly upward', icon: '↑' },
  { key: 'down', label: 'Look down', detail: 'Tilt your head slightly downward', icon: '↓' },
  { key: 'left45', label: 'Left 45°', detail: 'Turn slightly left', icon: '↖' },
  { key: 'right45', label: 'Right 45°', detail: 'Turn slightly right', icon: '↗' },
];

export default function FaceScanner({ onComplete, disabled = false }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [samples, setSamples] = useState([]);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => () => {
    stopCamera();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setSamples([]);
      setIndex(0);
      setCountdown(3);
      setFinished(false);
      setRunning(true);
    } catch (e) {
      setError('Camera access was blocked. Allow camera permission in Chrome and try again.');
    }
  };

  const capture = () => new Promise((resolve, reject) => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return reject(new Error('Camera is not ready'));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not capture camera frame')), 'image/jpeg', 0.92);
  });

  useEffect(() => {
    if (!running) return undefined;
    setCountdown(3);
    timerRef.current = setInterval(async () => {
      setCountdown((c) => {
        if (c > 1) return c - 1;
        return 0;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [index, running]);

  useEffect(() => {
    if (!running || countdown !== 0) return;
    let cancelled = false;
    (async () => {
      try {
        const blob = await capture();
        if (cancelled) return;
        const pose = POSES[index];
        const nextSamples = [...samples, { pose: pose.key, blob }];
        setSamples(nextSamples);
        if (index + 1 >= POSES.length) {
          setRunning(false);
          setFinished(true);
          stopCamera();
          onComplete(nextSamples.map((x, i) => new File([x.blob], `face-${i + 1}-${x.pose}.jpg`, { type: 'image/jpeg' })));
        } else {
          setIndex((i) => i + 1);
        }
      } catch (e) {
        setError(e.message || 'Could not capture this angle.');
        setCountdown(2);
      }
    })();
    return () => { cancelled = true; };
  }, [countdown, running, index, samples, onComplete]);

  const restart = () => {
    stopCamera();
    setRunning(false);
    setFinished(false);
    setSamples([]);
    setIndex(0);
    setCountdown(3);
    startCamera();
  };

  const current = POSES[index];

  return (
    <div className="face-scanner">
      <div className="scanner-header">
        <div>
          <div className="scanner-title"><Camera size={19} /> Face registration</div>
          <p>Camera-guided multi-angle scan. No photo upload is required.</p>
        </div>
        <div className="scanner-secure"><ShieldCheck size={16} /> 7 samples</div>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="scanner-stage">
        <video ref={videoRef} muted autoPlay playsInline className="scanner-video" />
        {!running && !finished && (
          <div className="scanner-placeholder">
            <div className="scanner-camera-icon"><Camera size={34} /></div>
            <b>Camera scan is ready</b>
            <span>We will automatically capture your face from several guided angles.</span>
            <Button type="button" onClick={startCamera} disabled={disabled}><Camera size={17} /> Start face scan</Button>
          </div>
        )}
        {running && (
          <>
            <div className="face-oval" />
            <div className="scanner-instruction">
              <strong>{current.label}</strong>
              <span>{current.detail}</span>
              <b>{countdown > 0 ? countdown : 'CAPTURED'}</b>
            </div>
          </>
        )}
        {finished && (
          <div className="scanner-placeholder success-scanner">
            <CheckCircle2 size={48} />
            <b>Face scan complete</b>
            <span>{samples.length} camera samples captured successfully.</span>
            <Button type="button" variant="ghost" onClick={restart}><RotateCcw size={16} /> Scan again</Button>
          </div>
        )}
      </div>

      <div className="pose-progress">
        {POSES.map((pose, i) => (
          <div key={pose.key} className={`pose ${i < samples.length ? 'done' : i === index && running ? 'current' : ''}`}>
            <span>{i < samples.length ? '✓' : pose.icon}</span>
            <small>{pose.label}</small>
          </div>
        ))}
      </div>
      <p className="scanner-tip">Tip: keep your face inside the oval, remove sunglasses/masks, and use even lighting.</p>
    </div>
  );
}
