import { useEffect, useState } from 'react';
import { CameraCapture } from './components/CameraCapture';
import { QueueStatus } from './components/QueueStatus';
import { sha256Hex } from './lib/hash';
import { makeVariants } from './lib/image';
import { enqueue, pendingItems, allItems, markUploaded } from './lib/captureQueue';
import { uploadCapture } from './lib/uploader';
import { drainQueue } from './lib/sync';
import { supabase } from './lib/supabase';
import type { CaptureItem } from './lib/types';

const storage = supabase.storage.from('captures');

async function getGps(): Promise<CaptureItem['gps']> {
  try {
    const pos = await new Promise<GeolocationPosition>((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 }));
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch { return null; }
}

export default function App() {
  const [mode, setMode] = useState<'input' | 'stream'>('input');
  const [pending, setPending] = useState(0);
  const [uploaded, setUploaded] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [captureErrors, setCaptureErrors] = useState(0);

  async function refresh() {
    const all = await allItems();
    setPending(all.filter((i) => i.status === 'pending').length);
    setUploaded(all.filter((i) => i.status === 'uploaded').length);
  }
  async function sync() {
    await drainQueue({ pendingItems, markUploaded, uploadCapture, storage });
    await refresh();
  }
  async function onCapture(photo: Blob) {
    try {
      const { display } = await makeVariants(photo);
      const hash = await sha256Hex(display);
      await enqueue({ id: hash, hash, slotKey: null, blob: display, capturedAt: Date.now(), gps: await getGps(), status: 'pending' });
      await refresh();
      if (navigator.onLine) await sync();
    } catch (e) {
      console.error('capture failed', e);
      setCaptureErrors((n) => n + 1);
    }
  }

  useEffect(() => {
    refresh();
    const on = () => { setOnline(true); sync(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  return (
    <main style={{ padding: 16, maxWidth: 420, margin: '0 auto' }}>
      <h1>CargoLink 캡처 스파이크</h1>
      <div style={{ margin: '12px 0', display: 'flex', gap: 8 }}>
        <button aria-pressed={mode === 'input'} onClick={() => setMode('input')}>input capture</button>
        <button aria-pressed={mode === 'stream'} onClick={() => setMode('stream')}>getUserMedia</button>
      </div>
      <CameraCapture mode={mode} onCapture={onCapture} />
      <button onClick={sync} style={{ marginLeft: 8 }}>지금 업로드</button>
      <QueueStatus pending={pending} uploaded={uploaded} online={online} errors={captureErrors} />
    </main>
  );
}
