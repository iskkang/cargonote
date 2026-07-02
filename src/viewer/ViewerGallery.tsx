import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ViewerClient } from './viewerClient';
import { getViewerClient } from '../admin/repoFactory';
import type { ViewerManifest } from '../domain/viewer';

export function ViewerGallery({ client = getViewerClient() }: { client?: ViewerClient } = {}) {
  const { token } = useParams();
  const [manifest, setManifest] = useState<ViewerManifest | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'invalid'>('loading');

  useEffect(() => {
    client.bootstrap(token ?? '')
      .then((m) => { if (m) { setManifest(m); setState('ok'); } else setState('invalid'); })
      .catch(() => setState('invalid'));
  }, [client, token]);

  if (state === 'loading') return <main style={sx.page} />;
  if (state === 'invalid' || !manifest) return <main style={sx.page}><p style={{ color: '#E0A100' }}>잘못된 링크입니다.</p></main>;

  return (
    <main style={sx.page}>
      <header style={{ marginBottom: 16 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 18 }}>CARGO<span style={{ color: '#FF6A00' }}>LINK</span></span>
        <div style={{ fontSize: 14, color: '#5A6B7D', marginTop: 4 }}>{manifest.customer} · {manifest.route} 증빙</div>
      </header>
      {manifest.containers.map((c) => (
        <section key={c.containerNo} style={sx.container}>
          <div style={sx.plate}>{c.containerNo}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {c.photos.map((p, i) => (
              <a key={`${p.slotKey}-${i}`} href={p.displayUrl} target="_blank" rel="noreferrer" style={sx.slot}>
                <img src={p.thumbUrl} alt={p.label} style={sx.thumb} />
                <div style={{ fontSize: 11, color: '#5A6B7D', marginTop: 2 }}>{p.label}</div>
              </a>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

const sx = {
  page: { minHeight: '100vh', background: '#D7DEE5', fontFamily: 'Pretendard, sans-serif', color: '#0F1B26', padding: 20, maxWidth: 720, margin: '0 auto' } as const,
  container: { background: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 } as const,
  plate: { fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 16 } as const,
  slot: { width: 96, textDecoration: 'none', color: 'inherit' } as const,
  thumb: { width: 96, height: 96, objectFit: 'cover', borderRadius: 8, background: '#EEF2F5', display: 'block' } as const,
};
