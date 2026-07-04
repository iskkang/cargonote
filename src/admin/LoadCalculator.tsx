import { useMemo, useState } from 'react';
import { computeStuffing, type CargoLine, type ContainerId } from '../domain/stuffing';
import { Button, Badge, inputStyle } from '../ui/kit';
import { useT } from './i18n';
import { C, FONT, R } from '../ui/tokens';

type Row = CargoLine & { key: number };
let seq = 1;
const blank = (): Row => ({ key: seq++, name: '', qty: 1, l: 0, w: 0, h: 0, weight: 0, stackable: true });

export function LoadCalculator() {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [utilPct, setUtilPct] = useState(85);
  const [freight, setFreight] = useState<Partial<Record<ContainerId, number>>>({});

  const set = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const num = (v: string) => (v === '' ? 0 : Math.max(0, Number(v) || 0));

  const result = useMemo(
    () => computeStuffing(rows, { utilization: utilPct / 100, freight }),
    [rows, utilPct, freight],
  );
  const hasCargo = result.totalQty > 0;

  return (
    <div>
      <div style={sx.tableWrap}>
        <div style={sx.head}>
          <span style={sx.cName}>{t.load.name}</span>
          <span style={sx.cQty}>{t.load.qty}</span>
          <span style={sx.cDims}>{t.load.dimsCm}</span>
          <span style={sx.cWt}>{t.load.weight}</span>
          <span style={sx.cStack}>{t.load.stack}</span>
          <span style={sx.cDel} />
        </div>
        {rows.map((r) => (
          <div key={r.key} style={sx.row}>
            <input style={{ ...inputStyle, ...sx.cName }} value={r.name} placeholder="—" onChange={(e) => set(r.key, { name: e.target.value })} />
            <input style={{ ...inputStyle, ...sx.cQty }} type="number" min={0} value={r.qty || ''} onChange={(e) => set(r.key, { qty: num(e.target.value) })} />
            <span style={{ ...sx.cDims, display: 'flex', gap: 4 }}>
              <input style={{ ...inputStyle, ...sx.dim }} type="number" min={0} placeholder="L" value={r.l || ''} onChange={(e) => set(r.key, { l: num(e.target.value) })} />
              <input style={{ ...inputStyle, ...sx.dim }} type="number" min={0} placeholder="W" value={r.w || ''} onChange={(e) => set(r.key, { w: num(e.target.value) })} />
              <input style={{ ...inputStyle, ...sx.dim }} type="number" min={0} placeholder="H" value={r.h || ''} onChange={(e) => set(r.key, { h: num(e.target.value) })} />
            </span>
            <input style={{ ...inputStyle, ...sx.cWt }} type="number" min={0} value={r.weight || ''} onChange={(e) => set(r.key, { weight: num(e.target.value) })} />
            <label style={{ ...sx.cStack, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input type="checkbox" checked={r.stackable} onChange={(e) => set(r.key, { stackable: e.target.checked })} />
            </label>
            <button type="button" aria-label={t.load.remove} onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : rs))} style={sx.del}>✕</button>
          </div>
        ))}
      </div>

      <div style={sx.controls}>
        <Button variant="ghost" onClick={() => setRows((rs) => [...rs, blank()])}>{t.load.addRow}</Button>
        <label style={sx.util}>{t.load.util}
          <input type="number" min={50} max={100} value={utilPct} onChange={(e) => setUtilPct(Math.min(100, Math.max(50, Number(e.target.value) || 85)))} style={{ ...inputStyle, width: 64 }} />%
        </label>
      </div>

      <div style={sx.resultsHead}>{t.load.results}</div>
      {!hasCargo ? (
        <div style={sx.empty}>{t.load.empty}</div>
      ) : (
        <>
          <div style={sx.totals}>
            <Tot label={t.load.totalQty} value={`${result.totalQty}`} />
            <Tot label={t.load.totalCbm} value={`${result.totalCbm.toFixed(2)} CBM`} />
            <Tot label={t.load.totalWeight} value={`${Math.round(result.totalWeight).toLocaleString()} kg`} />
          </div>
          <div style={sx.cards}>
            {result.perContainer.map((p) => {
              const best = result.recommendedId === p.spec.id;
              return (
                <div key={p.spec.id} style={{ ...sx.cCard, ...(best ? sx.cCardBest : {}) }}>
                  <div style={sx.cCardHead}>
                    <span style={sx.cCardTitle}>{p.spec.label}</span>
                    {best && <Badge tone="positive">{t.load.recommended}</Badge>}
                    {!p.fits && <Badge tone="negative">{t.load.notFit}</Badge>}
                  </div>
                  <div style={sx.needed}>{p.containersNeeded}<span style={sx.neededUnit}>{t.load.unit || '×'}</span> <span style={sx.neededLabel}>{t.load.needed}</span></div>
                  <div style={sx.track}><div style={{ ...sx.trackFill, width: `${p.fillPct}%`, background: best ? C.positive : C.teal }} /></div>
                  <div style={sx.metaRow}><span>{t.load.fill}</span><span style={sx.metaVal}>{Math.round(p.fillPct)}%</span></div>
                  <div style={sx.metaRow}><span style={{ color: C.muted }}>{p.binding === 'volume' ? t.load.bindVol : t.load.bindWt}</span>
                    {p.maxUnitsSingle != null && <span style={sx.metaVal}>{t.load.maxUnits} {p.maxUnitsSingle}</span>}
                  </div>
                  <label style={sx.freight}>{t.load.freight}
                    <input type="number" min={0} value={freight[p.spec.id] ?? ''} placeholder="—"
                      onChange={(e) => setFreight((f) => ({ ...f, [p.spec.id]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                      style={{ ...inputStyle, marginTop: 4 }} />
                  </label>
                  {p.cost != null && <div style={sx.cost}>= {p.cost.toLocaleString()}</div>}
                </div>
              );
            })}
          </div>
          <div style={sx.disclaimer}>ⓘ {t.load.disclaimer} ({t.load.util} {utilPct}%)</div>
        </>
      )}
    </div>
  );
}

function Tot({ label, value }: { label: string; value: string }) {
  return <div style={sx.tot}><div style={sx.totLabel}>{label}</div><div style={sx.totValue}>{value}</div></div>;
}

const sx = {
  tableWrap: { background: C.white, border: `1px solid ${C.line}`, borderRadius: R.lg, padding: 10, overflowX: 'auto' as const } as const,
  head: { display: 'flex', gap: 8, alignItems: 'center', padding: '4px 6px 8px', fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, color: C.muted, minWidth: 560 } as const,
  row: { display: 'flex', gap: 8, alignItems: 'center', padding: '4px 6px', minWidth: 560 } as const,
  cName: { flex: '1.4 1 120px', minWidth: 90 } as const,
  cQty: { width: 64, flexShrink: 0 } as const,
  cDims: { width: 190, flexShrink: 0 } as const,
  dim: { width: 58, padding: '9px 6px', textAlign: 'center' as const } as const,
  cWt: { width: 90, flexShrink: 0 } as const,
  cStack: { width: 44, flexShrink: 0 } as const,
  cDel: { width: 26, flexShrink: 0 } as const,
  del: { width: 26, height: 26, border: 0, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 13, flexShrink: 0 } as const,
  controls: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '12px 0 20px', flexWrap: 'wrap' as const } as const,
  util: { display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.sans, fontSize: 13, color: C.text } as const,
  resultsHead: { fontFamily: FONT.sans, fontSize: 16, fontWeight: 800, color: C.navy, marginBottom: 12 } as const,
  empty: { fontFamily: FONT.sans, fontSize: 13, color: C.muted, padding: '20px 0' } as const,
  totals: { display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginBottom: 14 } as const,
  tot: { flex: '1 1 130px', minWidth: 120, background: C.surfaceAlt, borderRadius: 10, padding: '12px 14px' } as const,
  totLabel: { fontSize: 11, color: C.muted } as const,
  totValue: { fontSize: 17, fontWeight: 800, color: C.navy, marginTop: 3 } as const,
  cards: { display: 'flex', gap: 12, flexWrap: 'wrap' as const } as const,
  cCard: { flex: '1 1 200px', minWidth: 180, background: C.white, border: `1px solid ${C.line}`, borderRadius: R.xl, padding: 16 } as const,
  cCardBest: { border: `2px solid ${C.teal}`, boxShadow: '0 12px 26px -14px rgba(1,136,143,.4)' } as const,
  cCardHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } as const,
  cCardTitle: { fontFamily: FONT.sans, fontWeight: 800, fontSize: 15, color: C.navy } as const,
  needed: { fontFamily: FONT.sans, fontSize: 30, fontWeight: 800, color: C.navy, lineHeight: 1 } as const,
  neededUnit: { fontSize: 15, fontWeight: 700, color: C.text } as const,
  neededLabel: { fontSize: 12, color: C.muted, fontWeight: 600 } as const,
  track: { height: 7, background: C.surfaceAlt, borderRadius: 999, overflow: 'hidden', margin: '10px 0 8px' } as const,
  trackFill: { height: '100%', borderRadius: 999 } as const,
  metaRow: { display: 'flex', justifyContent: 'space-between', fontFamily: FONT.sans, fontSize: 12, color: C.text, padding: '3px 0' } as const,
  metaVal: { fontWeight: 700, color: C.navy } as const,
  freight: { display: 'block', fontFamily: FONT.sans, fontSize: 11, color: C.muted, marginTop: 10 } as const,
  cost: { fontFamily: FONT.sans, fontSize: 13, fontWeight: 800, color: C.tealStrong, marginTop: 6, textAlign: 'right' as const } as const,
  disclaimer: { fontFamily: FONT.sans, fontSize: 12, color: C.muted, marginTop: 16, lineHeight: 1.5 } as const,
};
