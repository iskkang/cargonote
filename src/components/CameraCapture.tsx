import { useRef, useState } from 'react';

export function CameraCapture({ mode, onCapture }: { mode: 'input' | 'stream'; onCapture: (b: Blob) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);

  async function startStream() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); setStreaming(true); }
  }
  async function shootFromStream() {
    const v = videoRef.current!;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext('2d')!.drawImage(v, 0, 0);
    canvas.toBlob((b) => b && onCapture(b), 'image/jpeg', 0.95);
  }

  if (mode === 'input') {
    return (
      <label style={{ display: 'inline-block', background: '#01888F', color: '#fff', padding: '12px 18px', borderRadius: 10, fontWeight: 600 }}>
        写真を撮影
        <input ref={inputRef} type="file" accept="image/*" capture="environment" hidden multiple
          onChange={(e) => { Array.from(e.target.files ?? []).forEach(onCapture); e.target.value = ''; }} />
      </label>
    );
  }
  return (
    <div>
      <video ref={videoRef} playsInline style={{ width: '100%', maxWidth: 360, borderRadius: 12, background: '#000' }} />
      {!streaming
        ? <button aria-label="カメラを起動" onClick={startStream}>カメラを起動</button>
        : <button aria-label="写真を撮影" onClick={shootFromStream}>撮影</button>}
    </div>
  );
}
