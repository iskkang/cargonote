import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ViewerClient } from './viewerClient';
import { getViewerClient } from '../admin/repoFactory';
import type { ViewerManifest, ViewerContainer, ViewerPhoto } from '../domain/viewer';
import { PageShell, Brand, Card, Button, Badge } from '../ui/kit';
import { C, R, SH, FONT } from '../ui/tokens';
import { T, LANGS, photoLabel, type Lang } from './i18n';

async function downloadOne(url: string, name: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(href);
  } catch {
    window.open(url, '_blank');
  }
}

export function ViewerGallery({ client = getViewerClient() }: { client?: ViewerClient } = {}) {
  const { token } = useParams();
  const [manifest, setManifest] = useState<ViewerManifest | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'invalid'>('loading');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lang, setLang] = useState<Lang>('ko');
  const t = T[lang];

  useEffect(() => {
    client.bootstrap(token ?? '')
      .then((m) => { if (m) { setManifest(m); setState('ok'); } else setState('invalid'); })
      .catch(() => setState('invalid'));
  }, [client, token]);

  if (state === 'loading') return <PageShell>{null}</PageShell>;
  if (state === 'invalid' || !manifest) {
    return (
      <PageShell style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: FONT.sans, fontSize: 16, fontWeight: 600, color: C.caution }}>잘못된 링크입니다. · Invalid link.</p>
      </PageShell>
    );
  }

  const allPhotos = manifest.containers.flatMap((c) =>
    c.photos.map((p) => ({ ...p, containerNo: c.containerNo })));
  const total = allPhotos.length;
  const allSelected = total > 0 && selected.size === total;

  function toggle(key: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allPhotos.map((p) => p.displayUrl)));
  }
  async function downloadSelected() {
    for (const p of allPhotos) {
      if (selected.has(p.displayUrl)) await downloadOne(p.displayUrl, `${p.containerNo}-${p.label || p.slotKey || 'photo'}.jpg`);
    }
  }

  return (
    <PageShell>
      <div style={sx.inner}>
        {/* Header */}
        <header style={sx.hero}>
          <Brand />
          <div style={sx.heroRight}>
            <div style={sx.langBar}>
              {LANGS.map((l) => (
                <button key={l.code} type="button" onClick={() => setLang(l.code)}
                  style={{ ...sx.langBtn, ...(lang === l.code ? sx.langActive : {}) }}>{l.label}</button>
              ))}
            </div>
            <div style={sx.heroTitle}>{t.report}</div>
            <div style={sx.subtitle}>{manifest.customer} · {manifest.route}</div>
          </div>
        </header>

        {/* Export bar */}
        <div style={sx.exportBar}>
          <label style={sx.selAll}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            {t.selectAll}
          </label>
          <Button onClick={downloadSelected} disabled={selected.size === 0}>
            {t.download}{selected.size ? ` (${selected.size})` : ''}
          </Button>
        </div>

        {/* Per-container sections */}
        {manifest.containers.map((c) => (
          <div key={c.containerNo} className="cn-viewer" style={{ marginBottom: 22 }}>
            <PhotoGrid container={c} selected={selected} onToggle={toggle} lang={lang} />
            <DetailsPanel container={c} date={manifest.date} customer={manifest.customer} route={manifest.route} t={t} />
          </div>
        ))}
      </div>
    </PageShell>
  );
}

function PhotoGrid({ container, selected, onToggle, lang }: {
  container: ViewerContainer; selected: Set<string>; onToggle: (k: string) => void; lang: Lang;
}) {
  return (
    <div style={sx.grid}>
      {container.photos.map((p, i) => (
        <PhotoCard key={`${p.slotKey}-${i}`} photo={p} containerNo={container.containerNo}
          checked={selected.has(p.displayUrl)} onToggle={() => onToggle(p.displayUrl)} lang={lang} />
      ))}
    </div>
  );
}

function PhotoCard({ photo, containerNo, checked, onToggle, lang }: {
  photo: ViewerPhoto; containerNo: string; checked: boolean; onToggle: () => void; lang: Lang;
}) {
  const label = photoLabel(photo.slotKey, photo.label, lang);
  return (
    <div style={sx.card}>
      <div style={sx.imgWrap}>
        <input type="checkbox" checked={checked} onChange={onToggle} aria-label={label} style={sx.check} />
        <a href={photo.displayUrl} target="_blank" rel="noreferrer">
          <img src={photo.thumbUrl} alt={label} style={sx.thumb} />
        </a>
        <button type="button" title="↓" aria-label={label}
          onClick={() => downloadOne(photo.displayUrl, `${containerNo}-${label || 'photo'}.jpg`)}
          style={sx.dl}>↓</button>
      </div>
      <div style={sx.tagRow}>
        <span style={sx.tagDot} />
        <span style={sx.tag}>{label}</span>
      </div>
    </div>
  );
}

function DetailsPanel({ container, date, customer, route, t }: {
  container: ViewerContainer; date: string | null; customer: string | null; route: string | null; t: (typeof T)[Lang];
}) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={sx.dTitle}>{container.containerNo}</div>
      <DRow label={t.date} value={date || '—'} />
      <DRow label={t.customer} value={customer || '—'} />
      <DRow label={t.route} value={route || '—'} />
      <DRow label={t.photos} value={`${container.photos.length}${t.unit ? t.unit : ''}`} />
      <div style={sx.dSection}>{t.documents}</div>
      <Badge tone="neutral">{t.noDocs}</Badge>
    </Card>
  );
}

function DRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={sx.dRow}>
      <span style={sx.dLabel}>{label}</span>
      <span style={sx.dValue}>{value}</span>
    </div>
  );
}

const sx = {
  inner: { maxWidth: 980, margin: '0 auto', padding: '24px 20px' } as const,
  hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, flexWrap: 'wrap' as const, gap: 12 } as const,
  heroRight: { textAlign: 'right' as const } as const,
  langBar: { display: 'inline-flex', gap: 4, marginBottom: 8, background: C.white, border: `1px solid ${C.line}`, borderRadius: 999, padding: 3 } as const,
  langBtn: { fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, border: 0, background: 'transparent', color: C.text, cursor: 'pointer' } as const,
  langActive: { background: C.navy, color: C.white } as const,
  heroTitle: { fontFamily: FONT.sans, fontWeight: 800, fontSize: 18, color: C.navy } as const,
  subtitle: { fontFamily: FONT.sans, fontSize: 13, color: C.text, marginTop: 4 } as const,
  exportBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: C.white, border: `1px solid ${C.line}`, borderRadius: R.lg, padding: '10px 14px', marginBottom: 18, flexWrap: 'wrap' as const } as const,
  selAll: { display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: C.navy, cursor: 'pointer' } as const,
  grid: { display: 'flex', flexWrap: 'wrap' as const, gap: 12, alignContent: 'flex-start' } as const,
  card: { width: 150 } as const,
  imgWrap: { position: 'relative' as const, width: 150, height: 150 } as const,
  thumb: { width: 150, height: 150, objectFit: 'cover' as const, borderRadius: R.md, background: C.surfaceAlt, display: 'block', boxShadow: SH.card } as const,
  check: { position: 'absolute' as const, top: 8, left: 8, width: 18, height: 18, cursor: 'pointer' } as const,
  dl: { position: 'absolute' as const, bottom: 8, right: 8, width: 30, height: 30, borderRadius: 8, border: 0, background: 'rgba(15,27,38,.72)', color: C.white, fontSize: 16, cursor: 'pointer', lineHeight: '30px' } as const,
  tagRow: { display: 'flex', alignItems: 'center', gap: 7, marginTop: 7 } as const,
  tagDot: { width: 8, height: 8, borderRadius: 999, background: C.teal, flexShrink: 0 } as const,
  tag: { fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: C.textStrong } as const,
  dTitle: { fontFamily: FONT.sans, fontWeight: 800, fontSize: 17, letterSpacing: '.04em', color: C.navy, marginBottom: 12 } as const,
  dRow: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderTop: `1px solid ${C.line}`, fontFamily: FONT.sans } as const,
  dLabel: { fontSize: 12, color: C.text } as const,
  dValue: { fontSize: 13, fontWeight: 600, color: C.navy, textAlign: 'right' as const } as const,
  dSection: { fontFamily: FONT.sans, fontWeight: 700, fontSize: 13, color: C.navy, margin: '16px 0 8px' } as const,
} as const;
