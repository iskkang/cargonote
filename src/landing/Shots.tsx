import { useState } from 'react';
import { C, R, SH, FONT } from '../ui/tokens';

/**
 * Three in-browser product screens. Drop real screenshots at
 * /public/screens/{dashboard,review,viewer}.png to auto-replace the mockups.
 */
export function Shots({ captions }: { captions: string[] }) {
  return (
    <div style={sx.row}>
      <Frame src="/screens/dashboard.png" caption={captions[0]}><DashboardShot /></Frame>
      <Frame src="/screens/review.png" caption={captions[1]}><ReviewShot /></Frame>
      <Frame src="/screens/viewer.png" caption={captions[2]}><ViewerShot /></Frame>
    </div>
  );
}

function Frame({ src, children, caption }: { src: string; children: React.ReactNode; caption: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={sx.col}>
      <div style={sx.frame}>
        <div style={sx.chrome}>
          <span style={{ ...sx.dot, background: '#FF5F57' }} /><span style={{ ...sx.dot, background: '#FEBC2E' }} /><span style={{ ...sx.dot, background: '#28C840' }} />
          <span style={sx.addr}>cargonote.app</span>
        </div>
        <div style={sx.screen}>
          {failed
            ? children
            : <img src={src} alt={caption} onError={() => setFailed(true)} style={sx.shotImg} />}
        </div>
      </div>
      <div style={sx.caption}>{caption}</div>
    </div>
  );
}

function DashboardShot() {
  const kpis: [string, string][] = [['3', C.caution], ['5', C.muted], ['3', C.positive], ['1', C.negative]];
  return (
    <div style={{ padding: 12 }}>
      <div style={sx.mHeadRow}><div style={sx.mBar} /><div style={{ ...sx.mPill, background: C.teal }} /></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {kpis.map(([n, c], i) => (
          <div key={i} style={sx.kpi}><span style={{ ...sx.kpiDot, background: c }} /><span style={sx.kpiN}>{n}</span></div>
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={sx.listRow}>
          <span style={{ ...sx.mono, width: '38%' }} />
          <span style={{ ...sx.line, width: '30%' }} />
          <span style={{ ...sx.badge, background: [C.negativeTint, C.cautionTint, C.positiveTint][i], color: [C.negative, C.caution, C.positive][i] }}>●</span>
        </div>
      ))}
    </div>
  );
}

function ReviewShot() {
  return (
    <div style={{ padding: 12 }}>
      <div style={sx.mHeadRow}><div style={sx.mBar} /><span style={{ ...sx.badge, background: C.tealTint, color: C.teal }}>100%</span></div>
      <div style={sx.tiles}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={sx.tile}>
            <span style={sx.check}>✓</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ViewerShot() {
  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={sx.mBar} />
        <div style={{ display: 'flex', gap: 3 }}>
          {['한', 'EN', '中', 'RU'].map((l, i) => <span key={l} style={{ ...sx.langChip, ...(i === 0 ? { background: C.navy, color: C.white } : {}) }}>{l}</span>)}
        </div>
      </div>
      <div style={sx.tiles2}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} style={sx.tile2} />)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <span style={{ ...sx.badge, border: `1px solid ${C.teal}`, color: C.teal, background: 'transparent' }}>VERIFIED</span>
      </div>
    </div>
  );
}

const sx = {
  row: { display: 'flex', gap: 18, flexWrap: 'wrap' as const, justifyContent: 'center' } as const,
  col: { flex: '1 1 280px', minWidth: 240, maxWidth: 360 } as const,
  frame: { background: C.white, border: `1px solid ${C.line}`, borderRadius: R.xl, boxShadow: SH.hover, overflow: 'hidden' } as const,
  chrome: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', background: C.surfaceAlt, borderBottom: `1px solid ${C.line}` } as const,
  dot: { width: 9, height: 9, borderRadius: 999, display: 'inline-block' } as const,
  addr: { marginLeft: 8, flex: 1, height: 16, borderRadius: 999, background: C.white, border: `1px solid ${C.line}`, fontSize: 9, color: C.muted, display: 'flex', alignItems: 'center', paddingLeft: 10, fontFamily: FONT.sans } as const,
  screen: { height: 190, background: `linear-gradient(180deg,#F4F7F9,${C.white})` } as const,
  shotImg: { width: '100%', height: '100%', objectFit: 'cover' as const, objectPosition: 'top', display: 'block' } as const,

  mHeadRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } as const,
  mBar: { width: 84, height: 12, borderRadius: 6, background: C.navy, opacity: 0.85 } as const,
  mPill: { width: 52, height: 18, borderRadius: 999 } as const,
  kpi: { flex: 1, background: C.white, border: `1px solid ${C.line}`, borderRadius: 9, padding: '10px 8px', display: 'flex', flexDirection: 'column' as const, gap: 5 } as const,
  kpiDot: { width: 7, height: 7, borderRadius: 999 } as const,
  kpiN: { fontFamily: FONT.sans, fontSize: 18, fontWeight: 800, color: C.navy, lineHeight: 1 } as const,
  listRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 4px', borderTop: `1px solid ${C.line}` } as const,
  mono: { height: 9, borderRadius: 4, background: C.navy, opacity: 0.7 } as const,
  line: { height: 8, borderRadius: 4, background: C.line } as const,
  badge: { marginLeft: 'auto', fontFamily: FONT.sans, fontSize: 10, fontWeight: 800, borderRadius: 999, padding: '3px 9px', display: 'inline-flex', alignItems: 'center' } as const,

  tiles: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 } as const,
  tile: { position: 'relative' as const, height: 46, borderRadius: 8, background: `linear-gradient(135deg,${C.tealBright},${C.tealStrong})` } as const,
  check: { position: 'absolute' as const, top: 4, right: 4, width: 15, height: 15, borderRadius: 999, background: C.white, color: C.positive, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' } as const,
  tiles2: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 6 } as const,
  tile2: { height: 52, borderRadius: 8, background: `linear-gradient(135deg,${C.blue45},${C.tealHeavy})` } as const,
  langChip: { fontFamily: FONT.sans, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: C.surfaceAlt, color: C.text } as const,

  caption: { textAlign: 'center' as const, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: C.navy, marginTop: 12 } as const,
};
