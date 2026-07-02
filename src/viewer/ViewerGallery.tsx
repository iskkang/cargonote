import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ViewerClient } from './viewerClient';
import { getViewerClient } from '../admin/repoFactory';
import type { ViewerManifest } from '../domain/viewer';
import { PageShell, Brand, Card } from '../ui/kit';
import { C, R, SH, FONT } from '../ui/tokens';

export function ViewerGallery({ client = getViewerClient() }: { client?: ViewerClient } = {}) {
  const { token } = useParams();
  const [manifest, setManifest] = useState<ViewerManifest | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'invalid'>('loading');

  useEffect(() => {
    client.bootstrap(token ?? '')
      .then((m) => { if (m) { setManifest(m); setState('ok'); } else setState('invalid'); })
      .catch(() => setState('invalid'));
  }, [client, token]);

  if (state === 'loading') return <PageShell>{null}</PageShell>;

  if (state === 'invalid' || !manifest) {
    return (
      <PageShell style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: FONT.sans, fontSize: 16, fontWeight: 600, color: C.caution }}>잘못된 링크입니다.</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div style={sx.inner}>
        {/* Hero header */}
        <header style={sx.hero}>
          <Brand />
          <p style={sx.subtitle}>{manifest.customer} · {manifest.route} 증빙</p>
        </header>

        {/* Per-container cards */}
        {manifest.containers.map((c) => (
          <Card key={c.containerNo} style={{ marginBottom: 12 }}>
            {/* Container number plate — Pretendard bold + letter-spacing, no mono */}
            <div style={sx.plate}>{c.containerNo}</div>
            <div style={sx.grid}>
              {c.photos.map((p, i) => (
                <a key={`${p.slotKey}-${i}`} href={p.displayUrl} target="_blank" rel="noreferrer" style={sx.slot}>
                  <img src={p.thumbUrl} alt={p.label} style={sx.thumb} />
                  <div style={sx.caption}>{p.label}</div>
                </a>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

const sx = {
  inner: { maxWidth: 720, margin: '0 auto', padding: '24px 20px' } as const,
  hero: { marginBottom: 20 } as const,
  subtitle: { fontFamily: FONT.sans, fontSize: 14, color: C.text, marginTop: 8, marginBottom: 0 } as const,
  plate: { fontFamily: FONT.sans, fontWeight: 700, fontSize: 16, letterSpacing: '.06em', color: C.textStrong, marginBottom: 10 } as const,
  grid: { display: 'flex', flexWrap: 'wrap', gap: 8 } as const,
  slot: { width: 96, textDecoration: 'none', color: 'inherit' } as const,
  thumb: { width: 96, height: 96, objectFit: 'cover', borderRadius: R.md, background: C.surfaceAlt, display: 'block', boxShadow: SH.card } as const,
  caption: { fontSize: 11, color: C.text, marginTop: 4, fontFamily: FONT.sans } as const,
} as const;
