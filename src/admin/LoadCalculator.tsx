import { useMemo, useRef, useState } from 'react';
import { computeStuffing, CONTAINERS, type CargoLine, type ContainerId } from '../domain/stuffing';
import { expandBoxes, packMulti, PALETTE } from '../domain/pack';
import { PackView3DGL } from './PackView3DGL';
import { parseCargoFile } from './parseCargo';
import type { LoadPlan } from './loadPlan';
import { Button, Badge, inputStyle } from '../ui/kit';
import { useT } from './i18n';
import { C, FONT, R } from '../ui/tokens';

type Row = CargoLine & { key: number };
let seq = 1;
const blank = (): Row => {
  const n = seq++;
  return { key: n, name: `Box-${n}`, qty: 1, l: 0, w: 0, h: 0, weight: 0, stackable: true, layDown: true, color: PALETTE[(n - 1) % PALETTE.length] };
};

export function LoadCalculator({ onCreateJob }: { onCreateJob?: (p: LoadPlan) => void } = {}) {
  const t = useT();
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [utilPct, setUtilPct] = useState(85);
  const [pickId, setPickId] = useState<ContainerId | null>(null);
  const [hl, setHl] = useState<number | null>(null);
  const [contIdx, setContIdx] = useState(0);
  const [maxLayers, setMaxLayers] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const num = (v: string) => (v === '' ? 0 : Math.max(0, Number(v) || 0));

  async function onUpload(file: File) {
    try {
      const parsed = await parseCargoFile(file);
      if (parsed.length) setRows(parsed.map((c, i) => {
        const n = seq++;
        return { ...c, key: n, name: c.name || `Box-${n}`, color: c.color ?? PALETTE[i % PALETTE.length], layDown: c.layDown ?? true };
      }));
    } catch { /* ignore malformed file */ }
    if (fileRef.current) fileRef.current.value = '';
  }

  const result = useMemo(
    () => computeStuffing(rows, { utilization: utilPct / 100 }),
    [rows, utilPct],
  );
  const hasCargo = result.totalQty > 0;

  const selId = pickId ?? result.recommendedId ?? '40ft';
  const selSpec = CONTAINERS.find((c) => c.id === selId)!;
  const pack = useMemo(() => {
    const { boxes, truncated } = expandBoxes(rows);
    const cont = { L: selSpec.intL * 100, W: selSpec.intW * 100, H: selSpec.intH * 100, cbm: selSpec.cbm };
    const m = packMulti(boxes, cont, 24, { maxLayers });
    return { ...m, truncated: truncated || m.truncated, cont };
  }, [rows, selId, selSpec, maxLayers]);
  const vi = pack.containers.length ? Math.min(contIdx, pack.containers.length - 1) : 0;
  const cur = pack.containers[vi];
  // weight-weighted centre of gravity of the viewed container (offset from the geometric centre)
  const cog = (() => {
    if (!cur || !cur.placements.length) return null;
    let sw = 0, cx = 0, cy = 0, cz = 0;
    for (const p of cur.placements) {
      const w = p.weight > 0 ? p.weight : (p.dx * p.dy * p.dz) / 1e6;
      sw += w; cx += (p.x + p.dx / 2) * w; cy += (p.y + p.dy / 2) * w; cz += (p.z + p.dz / 2) * w;
    }
    if (sw <= 0) return null;
    const x = cx / sw, y = cy / sw, z = cz / sw;
    const offL = ((x - pack.cont.L / 2) / (pack.cont.L / 2)) * 100;
    const offW = ((y - pack.cont.W / 2) / (pack.cont.W / 2)) * 100;
    return { x, y, z, offL, offW, ok: Math.abs(offL) <= 20 && Math.abs(offW) <= 20 };
  })();

  const buildPlan = (): LoadPlan => ({
    containerLabel: selSpec.label,
    containerCount: pack.containers.length,
    fills: pack.containers.map((c) => Math.round(c.fillPct)),
    cargoKinds: rows.filter((r) => r.qty > 0 && r.l > 0 && r.w > 0 && r.h > 0).length,
    cargoQty: result.totalQty,
    totalCbm: result.totalCbm,
    totalWeight: result.totalWeight,
  });

  return (
    <div>
      <div style={sx.tableWrap}>
        <div style={sx.head}>
          <span style={sx.cColor} />
          <span style={sx.cName}>{t.load.name}</span>
          <span style={sx.cQty}>{t.load.qty}</span>
          <span style={sx.cDims}>{t.load.dimsCm}</span>
          <span style={sx.cWt}>{t.load.weight}</span>
          <span style={sx.cChk}>{t.load.stack}</span>
          <span style={sx.cChk}>{t.load.lay}</span>
          <span style={sx.cDel} />
        </div>
        {rows.map((r, i) => (
          <div key={r.key} style={{ ...sx.row, ...(hl === i ? sx.rowHl : {}) }}
            onMouseEnter={() => setHl(i)} onMouseLeave={() => setHl(null)}>
            <input type="color" value={r.color ?? PALETTE[i % PALETTE.length]} title={t.load.color}
              onChange={(e) => set(r.key, { color: e.target.value })} style={sx.colorInput} />
            <input style={{ ...inputStyle, ...sx.cName }} value={r.name} placeholder="—" onChange={(e) => set(r.key, { name: e.target.value })} />
            <input style={{ ...inputStyle, ...sx.cQty }} type="number" min={0} value={r.qty || ''} onChange={(e) => set(r.key, { qty: num(e.target.value) })} />
            <span style={{ ...sx.cDims, display: 'flex', gap: 4 }}>
              <input style={{ ...inputStyle, ...sx.dim }} type="number" min={0} placeholder="L" value={r.l || ''} onChange={(e) => set(r.key, { l: num(e.target.value) })} />
              <input style={{ ...inputStyle, ...sx.dim }} type="number" min={0} placeholder="W" value={r.w || ''} onChange={(e) => set(r.key, { w: num(e.target.value) })} />
              <input style={{ ...inputStyle, ...sx.dim }} type="number" min={0} placeholder="H" value={r.h || ''} onChange={(e) => set(r.key, { h: num(e.target.value) })} />
            </span>
            <input style={{ ...inputStyle, ...sx.cWt }} type="number" min={0} value={r.weight || ''} onChange={(e) => set(r.key, { weight: num(e.target.value) })} />
            <label style={{ ...sx.cChk, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t.load.stack}>
              <input type="checkbox" checked={r.stackable} onChange={(e) => set(r.key, { stackable: e.target.checked })} />
            </label>
            <label style={{ ...sx.cChk, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t.load.lay}>
              <input type="checkbox" checked={r.layDown ?? true} onChange={(e) => set(r.key, { layDown: e.target.checked })} />
            </label>
            <button type="button" aria-label={t.load.remove} onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : rs))} style={sx.del}>✕</button>
          </div>
        ))}
      </div>

      <div style={sx.controls}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="ghost" onClick={() => setRows((rs) => [...rs, blank()])}>{t.load.addRow}</Button>
          <label style={sx.upload} title={t.load.uploadHint}>⬆ {t.load.upload}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <label style={sx.util}>{t.load.util}
            <input type="number" min={50} max={100} value={utilPct} onChange={(e) => setUtilPct(Math.min(100, Math.max(50, Number(e.target.value) || 85)))} style={{ ...inputStyle, width: 64 }} />%
          </label>
          <label style={sx.util} title={t.load.maxLayersHint}>{t.load.maxLayers}
            <input type="number" min={0} max={20} value={maxLayers || ''} placeholder="0" onChange={(e) => setMaxLayers(Math.max(0, Math.min(20, Number(e.target.value) || 0)))} style={{ ...inputStyle, width: 64 }} />
          </label>
        </div>
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
          <div style={sx.typeRow}>
            {CONTAINERS.map((cc) => {
              const best = result.recommendedId === cc.id;
              return (
                <button key={cc.id} type="button" onClick={() => setPickId(cc.id)}
                  style={{ ...sx.typeBtn, ...(selId === cc.id ? sx.typeBtnActive : {}) }}>
                  {cc.label}{best ? ` · ${t.load.recommended}` : ''}
                </button>
              );
            })}
          </div>
          {(() => {
            const p = result.perContainer.find((c) => c.spec.id === selId)!;
            const best = result.recommendedId === p.spec.id;
            return (
              <div style={{ ...sx.cCard, ...(best ? sx.cCardBest : {}), maxWidth: 340 }}>
                <div style={sx.cCardHead}>
                  <span style={sx.cCardTitle}>{p.spec.label}</span>
                  {best && <Badge tone="positive">{t.load.recommended}</Badge>}
                  {!p.fits && <Badge tone="negative">{t.load.notFit}</Badge>}
                </div>
                <div style={sx.needed}>{pack.containers.length}<span style={sx.neededUnit}>{t.load.unit || '×'}</span> <span style={sx.neededLabel}>{t.load.needed}</span></div>
                <div style={sx.metaRow}><span style={{ color: C.muted }}>{p.binding === 'volume' ? t.load.bindVol : t.load.bindWt}</span>
                  {p.maxUnitsSingle != null && <span style={sx.metaVal}>{t.load.maxUnits} {p.maxUnitsSingle}</span>}
                </div>
                {pack.leftover > 0 && <div style={sx.metaRow}><span style={{ color: C.negative, fontWeight: 700 }}>{t.load.unplaced} {pack.leftover}{t.load.unit}</span></div>}
              </div>
            );
          })()}
          <div style={sx.disclaimer}>ⓘ {t.load.disclaimer} ({t.load.util} {utilPct}%)</div>
          {onCreateJob && pack.containers.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <Button onClick={() => onCreateJob(buildPlan())}>{t.load.createJob}</Button>
            </div>
          )}

          <div style={sx.view3d}>
            <div style={sx.view3dHead}>
              <span style={sx.view3dTitle}>{t.load.view3d} · {selSpec.label}</span>
            </div>
            {pack.containers.length > 1 && (
              <div style={sx.contTabs}>
                {pack.containers.map((cc, i) => (
                  <button key={i} type="button" onClick={() => setContIdx(i)}
                    style={{ ...sx.contTab, ...(vi === i ? sx.contTabActive : {}) }}>
                    #{i + 1} · {Math.round(cc.fillPct)}%
                  </button>
                ))}
              </div>
            )}
            <div style={sx.legend}>
              {rows.map((r, i) => (r.l > 0 && r.w > 0 && r.h > 0 ? (
                <span key={r.key} onMouseEnter={() => setHl(i)} onMouseLeave={() => setHl(null)}
                  style={{ ...sx.legendChip, ...(hl === i ? sx.legendActive : {}) }}>
                  <span style={{ ...sx.swatch, background: r.color ?? PALETTE[i % PALETTE.length] }} />{r.name || '-'} ×{r.qty}
                </span>
              ) : null))}
            </div>
            <div style={sx.stage}>
              {cur
                ? <PackView3DGL placements={cur.placements} L={pack.cont.L} W={pack.cont.W} H={pack.cont.H} highlight={hl} cog={cog ? { x: cog.x, y: cog.y, z: cog.z } : null} />
                : <div style={{ padding: 30, textAlign: 'center', color: C.muted, fontSize: 13, fontFamily: FONT.sans }}>{t.load.notFit}</div>}
            </div>
            {cog && (
              <div style={sx.cogRow}>
                <span style={{ ...sx.cogDot, background: cog.ok ? C.positive : C.negative }} />
                <b style={{ color: cog.ok ? C.positive : C.negative }}>{cog.ok ? t.load.cogOk : t.load.cogWarn}</b>
                <span style={{ color: C.muted }}>· {t.load.cog} — {t.load.cogL} {pct(cog.offL)}% · {t.load.cogW} {pct(cog.offW)}%</span>
              </div>
            )}
            <div style={sx.view3dFoot}>
              {cur ? (
                <><b style={{ color: C.navy }}>#{vi + 1} / {pack.containers.length}</b> · {t.load.packed} {cur.count} · {Math.round(cur.fillPct)}%
                  {pack.leftover > 0 ? ` · ${t.load.unplaced} ${pack.leftover}` : ''}{pack.truncated ? ` · ${t.load.cap}` : ''}</>
              ) : t.load.notFit}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const pct = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v)}`;

function Tot({ label, value }: { label: string; value: string }) {
  return <div style={sx.tot}><div style={sx.totLabel}>{label}</div><div style={sx.totValue}>{value}</div></div>;
}

const sx = {
  tableWrap: { background: C.white, border: `1px solid ${C.line}`, borderRadius: R.lg, padding: 10, overflowX: 'auto' as const } as const,
  head: { display: 'flex', gap: 8, alignItems: 'center', padding: '4px 6px 8px', fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, color: C.muted, minWidth: 660 } as const,
  row: { display: 'flex', gap: 8, alignItems: 'center', padding: '4px 6px', minWidth: 660, borderRadius: 8 } as const,
  rowHl: { background: C.tealTint } as const,
  cColor: { width: 30, flexShrink: 0 } as const,
  colorInput: { width: 30, height: 30, padding: 0, border: `1px solid ${C.line}`, borderRadius: 6, background: C.white, cursor: 'pointer', flexShrink: 0 } as const,
  cName: { flex: '1.4 1 120px', minWidth: 90 } as const,
  cQty: { width: 64, flexShrink: 0 } as const,
  cDims: { width: 190, flexShrink: 0 } as const,
  dim: { width: 58, padding: '9px 6px', textAlign: 'center' as const } as const,
  cWt: { width: 90, flexShrink: 0 } as const,
  cChk: { width: 44, flexShrink: 0, textAlign: 'center' as const } as const,
  cDel: { width: 26, flexShrink: 0 } as const,
  del: { width: 26, height: 26, border: 0, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 13, flexShrink: 0 } as const,
  controls: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '12px 0 20px', flexWrap: 'wrap' as const } as const,
  util: { display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.sans, fontSize: 13, color: C.text } as const,
  upload: { fontFamily: FONT.sans, fontWeight: 600, fontSize: 14, color: C.text, background: 'transparent', border: `1px solid ${C.line}`, borderRadius: R.md, padding: '9px 16px', cursor: 'pointer' } as const,
  legend: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, padding: '10px 14px 0' } as const,
  legendChip: { display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: C.text, background: C.surfaceAlt, borderRadius: 999, padding: '4px 11px', cursor: 'default' } as const,
  legendActive: { background: C.navy, color: C.white } as const,
  swatch: { width: 11, height: 11, borderRadius: 3, flexShrink: 0 } as const,
  resultsHead: { fontFamily: FONT.sans, fontSize: 16, fontWeight: 800, color: C.navy, marginBottom: 12 } as const,
  empty: { fontFamily: FONT.sans, fontSize: 13, color: C.muted, padding: '20px 0' } as const,
  totals: { display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginBottom: 14 } as const,
  tot: { flex: '1 1 130px', minWidth: 120, background: C.surfaceAlt, borderRadius: 10, padding: '12px 14px' } as const,
  totLabel: { fontSize: 11, color: C.muted } as const,
  totValue: { fontSize: 17, fontWeight: 800, color: C.navy, marginTop: 3 } as const,
  cards: { display: 'flex', gap: 12, flexWrap: 'wrap' as const } as const,
  typeRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 12 } as const,
  typeBtn: { fontFamily: FONT.sans, fontSize: 13.5, fontWeight: 700, padding: '9px 16px', borderRadius: R.md, border: `1px solid ${C.line}`, background: C.white, color: C.text, cursor: 'pointer' } as const,
  typeBtnActive: { background: C.navy, color: C.white, border: `1px solid ${C.navy}` } as const,
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

  view3d: { marginTop: 18, background: C.white, border: `1px solid ${C.line}`, borderRadius: R.xl, overflow: 'hidden' } as const,
  view3dHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1px solid ${C.line}`, flexWrap: 'wrap' as const } as const,
  view3dTitle: { fontFamily: FONT.sans, fontWeight: 800, fontSize: 15, color: C.navy } as const,
  view3dCtrl: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const } as const,
  seg: { fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, padding: '6px 11px', borderRadius: 999, border: `1px solid ${C.line}`, background: C.white, color: C.text, cursor: 'pointer' } as const,
  segActive: { background: C.navy, color: C.white, border: `1px solid ${C.navy}` } as const,
  rotBtn: { fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999, border: `1px solid ${C.teal}`, background: C.tealTint, color: C.tealStrong, cursor: 'pointer' } as const,
  contTabs: { display: 'flex', gap: 6, flexWrap: 'wrap' as const, padding: '10px 14px 0' } as const,
  contTab: { fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.white, color: C.text, cursor: 'pointer' } as const,
  contTabActive: { background: C.teal, color: C.white, border: `1px solid ${C.teal}` } as const,
  cogRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, fontFamily: FONT.sans, fontSize: 12.5, padding: '10px 14px 0' } as const,
  cogDot: { width: 10, height: 10, borderRadius: 999, flexShrink: 0 } as const,
  stage: { background: `linear-gradient(180deg,#F4F7F9,${C.white})`, padding: 12 } as const,
  view3dFoot: { fontFamily: FONT.sans, fontSize: 13, color: C.text, padding: '10px 14px', borderTop: `1px solid ${C.line}` } as const,
};
