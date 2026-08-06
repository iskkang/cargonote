import { useEffect, useRef, useState } from 'react';
import { slotLabel, slotInstruction } from '../domain/slotText';
import { useParams } from 'react-router-dom';
import type { WorkerClient } from './workerClient';
import { getWorkerClient } from '../admin/repoFactory';
import type { Container, WorkOrder, WorkTypeTemplate, RequiredPhotoSlot } from '../domain/types';
import { checklistStatus } from '../domain/checklist';
import { groupByPhase } from '../domain/photoPhase';
import { DAMAGE_SLOT } from '../domain/review';
import { makeVariants } from '../lib/image';
import { sha256Hex } from '../lib/hash';
import { supabase } from '../lib/supabase';
import { uploadSlotPhoto } from './uploadPhoto';
import { enqueueShot, pendingShots, markShotUploaded } from './offlineQueue';
import { PageShell, Brand, Card, Badge, Button } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

const rid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** ISO 6346 = 4 letters + 6 digits + 1 check digit. Split the check digit for emphasis. */
function splitPlate(no: string): { body: string; check: string | null } {
  const m = /^([A-Z]{4}\d{6})(\d)$/.exec(no.replace(/\s+/g, ''));
  return m ? { body: `${m[1].slice(0, 4)} ${m[1].slice(4)}`, check: m[2] } : { body: no, check: null };
}

type Step = 'intro' | 'capture' | 'submit';

export function WorkerCapture({ client = getWorkerClient() }: { client?: WorkerClient } = {}) {
  const { token } = useParams();
  const [state, setState] = useState<{ order: WorkOrder; template: WorkTypeTemplate; containers: Container[] } | null>(null);
  const [activeId, setActiveId] = useState<string>('');
  const [notFound, setNotFound] = useState(false);
  const [capturedBy, setCapturedBy] = useState<Record<string, string[]>>({});
  const [step, setStep] = useState<Step>('intro');
  const [submitted, setSubmitted] = useState(false);
  const [closeHint, setCloseHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    client.bootstrap(token ?? '').then((r) => {
      if (!r || r.containers.length === 0) { setNotFound(true); return; }
      setState({ order: r.order, template: r.template, containers: r.containers });
      setActiveId(r.containers[0].id);
    }).catch(() => setNotFound(true));
  }, [client, token]);

  async function refresh(containerId: string) {
    const photos = await client.listPhotos(token ?? '', containerId);
    setCapturedBy((prev) => ({ ...prev, [containerId]: photos.filter((p) => p.slotKey).map((p) => p.slotKey as string) }));
  }
  useEffect(() => { if (state) state.containers.forEach((c) => void refresh(c.id)); }, [state]);

  // Offline drain: retry queued shots when connectivity returns (and once on load).
  const drainRef = useRef<() => void>(() => {});
  useEffect(() => {
    const on = () => { setOnline(true); drainRef.current(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  useEffect(() => { if (state) drainRef.current(); }, [state]);

  if (notFound) return (
    <PageShell tone="dark" style={sx.page}>
      <p style={{ color: C.caution, fontFamily: FONT.sans }}>リンクが正しくありません。</p>
    </PageShell>
  );
  if (!state) return <PageShell tone="dark" style={sx.page}>{null}</PageShell>;

  const containers = state.containers;
  const container = containers.find((c) => c.id === activeId) ?? containers[0];
  const captured = capturedBy[container.id] ?? [];
  const slots = state.template.requiredPhotos.filter((s) => s.required);
  const groups = groupByPhase(slots);
  const status = checklistStatus(captured, state.template);
  const total = slots.length;
  const done = status.satisfied.length;
  const missingSlots = slots.filter((s) => !captured.includes(s.key));
  const damageShots = captured.filter((k) => k === DAMAGE_SLOT).length;
  const plate = splitPlate(container.containerNo);
  const containerMissing = (c: Container) => slots.filter((s) => !(capturedBy[c.id] ?? []).includes(s.key));
  const incomplete = containers.filter((c) => containerMissing(c).length > 0);
  const multi = containers.length > 1;

  async function updatePending() { try { setPending((await pendingShots()).length); } catch { setPending(0); } }

  async function drain() {
    const items = await pendingShots().catch(() => null);
    if (!items) return;
    for (const it of items) {
      try {
        await uploadSlotPhoto(it.blob, { slotKey: it.slotKey, containerId: it.containerId }, {
          makeVariants, sha256Hex,
          storage: { upload: (path, body, opts) => supabase.storage.from('captures').upload(path, body, opts) },
          insertPhoto: (p) => client.insertPhoto(it.token, p),
          now: () => new Date().toISOString(),
        });
        await markShotUploaded(it.id);
      } catch { /* still offline — keep it pending */ }
    }
    if (state) for (const c of state.containers) await refresh(c.id);
    await updatePending();
  }
  drainRef.current = drain;

  async function shoot(slotKey: string, photo: Blob) {
    setError(null);
    try {
      await uploadSlotPhoto(photo, { slotKey, containerId: container.id }, {
        makeVariants, sha256Hex,
        storage: { upload: (path, body, opts) => supabase.storage.from('captures').upload(path, body, opts) },
        insertPhoto: (p) => client.insertPhoto(token ?? '', p),
        now: () => new Date().toISOString(),
      });
      await refresh(container.id);
    } catch (e) {
      // Offline or upload failed → queue it; it uploads automatically when back online.
      try {
        await enqueueShot({ id: rid(), token: token ?? '', containerId: container.id, slotKey, blob: photo, capturedAt: new Date().toISOString(), status: 'pending' });
        setCapturedBy((prev) => ({ ...prev, [container.id]: Array.from(new Set([...(prev[container.id] ?? []), slotKey])) }));
        await updatePending();
      } catch {
        console.error('upload failed', e);
        setError(`アップロードに失敗しました — ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  const tabs = multi && (
    <div style={sx.tabs}>
      {containers.map((c) => {
        const cd = slots.filter((s) => (capturedBy[c.id] ?? []).includes(s.key)).length;
        const complete = total > 0 && cd >= total;
        const active = c.id === container.id;
        return (
          <button key={c.id} type="button" onClick={() => setActiveId(c.id)}
            style={{ ...sx.tab, ...(active ? sx.tabActive : {}) }}>
            {complete ? '✓ ' : ''}{splitPlate(c.containerNo).body}
            <span style={sx.tabCount}>{cd}/{total}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <PageShell tone="dark" style={sx.page}>
      {step === 'intro' && (
        <>
          <div style={sx.header}><Brand dark /></div>
          <div style={sx.breadcrumb}>作業指示書 · {state.template.route} バンニング検品{multi ? ` · コンテナ ${containers.length}本` : ''}</div>

          {tabs}

          <div style={sx.plate}>
            <div style={sx.plateLabel}>ISO 6346 · CONTAINER No.</div>
            <div style={sx.plateNo}>{plate.body}{plate.check && <span style={sx.check}>{plate.check}</span>}</div>
          </div>

          <Card dark style={sx.infoCard}>
            <InfoRow label="担当作業者" value={state.order.assigneeName || '—'} />
            <InfoRow label="作業日" value={state.order.workDate || '—'} />
            {state.order.assigneeContact && <InfoRow label="連絡先" value={state.order.assigneeContact} />}
          </Card>

          {state.template.warningText && (
            <Card dark style={sx.warnCard}>
              <span style={{ color: C.caution, fontWeight: 600, fontSize: 13, fontFamily: FONT.sans }}>{state.template.warningText}</span>
            </Card>
          )}

          <div style={sx.sectionHead}><span style={sx.sectionTitle}>必要な写真</span><span style={sx.countDim}>{total}枚</span></div>
          {groups.map((g) => (
            <div key={g.phase} style={{ marginBottom: 10 }}>
              <div style={sx.groupLabel}>{g.phase}</div>
              {g.slots.map((s) => <div key={s.key} style={sx.previewRow}>· {slotLabel(s.key, s.label)}</div>)}
            </div>
          ))}

          <Button onClick={() => setStep('capture')} style={sx.cta}>撮影を開始</Button>
          <div style={sx.footNote}>必要なときに1枚ずつ · 順番は自由です</div>
        </>
      )}

      {step === 'capture' && (
        <>
          <div style={sx.captureHead}>
            <span style={sx.captureTitle}>撮影チェックリスト</span>
            <span style={{ fontSize: 13, fontFamily: FONT.sans, color: status.complete ? C.positive : C.tealBright }}>{done}/{total}</span>
          </div>
          <div style={sx.progressTrack}><div style={{ ...sx.progressFill, width: total ? `${(done / total) * 100}%` : '0%' }} /></div>

          {multi && <div style={sx.tabsWrap}>{tabs}<div style={sx.activePlate}>{plate.body}{plate.check ? plate.check : ''}</div></div>}

          {error && <Card dark style={sx.errorCard}><span style={{ color: C.negative, fontWeight: 600, fontSize: 13, fontFamily: FONT.sans }}>{error}</span></Card>}

          {(pending > 0 || !online) && (
            <div style={sx.syncRow}>
              <span style={{ ...sx.syncDot, background: online ? C.caution : C.negative }} />
              {online ? `送信待ち ${pending}枚 · 自動送信中…` : `オフライン · 送信待ち ${pending}枚(オンライン復帰後に自動送信)`}
            </div>
          )}

          {groups.map((g) => {
            const gDone = g.slots.filter((s) => captured.includes(s.key)).length;
            return (
              <div key={g.phase} style={{ marginTop: 14 }}>
                <div style={sx.groupHead}><span style={sx.groupLabel}>{g.phase}</span><span style={sx.countDim}>{gDone}/{g.slots.length}</span></div>
                {g.slots.map((s) => <SlotRow key={s.key} slot={s} done={captured.includes(s.key)} onShoot={(f) => shoot(s.key, f)} />)}
              </div>
            );
          })}

          <div style={sx.damageBox}>
            <div style={sx.damageHead}>
              <span style={{ fontWeight: 700, color: C.onDark }}>損傷・追加の写真</span>
              <span style={{ fontSize: 13, color: damageShots ? C.negative : C.onDarkDim }}>{damageShots}枚</span>
            </div>
            <div style={sx.damageHint}>貨物に損傷があれば、写真を追加で撮って送ってください。(複数枚可)</div>
            <label style={sx.damageBtn}>＋ 損傷写真を追加
              <input type="file" accept="image/*" capture="environment" hidden multiple
                onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => shoot(DAMAGE_SLOT, f)); e.target.value = ''; }} />
            </label>
          </div>

          <Button onClick={() => setStep('submit')} style={sx.cta}>提出前の確認</Button>
        </>
      )}

      {step === 'submit' && (
        <>
          <div style={sx.captureHead}><span style={sx.captureTitle}>提出前の確認</span><span style={{ fontSize: 13, color: C.onDarkDim, fontFamily: FONT.sans }}>{multi ? `${containers.length - incomplete.length}/${containers.length} コンテナ` : `${done}/${total} 撮影`}</span></div>
          {incomplete.length > 0 ? (
            <>
              <Card dark style={{ ...sx.warnCard, textAlign: 'center' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>⚠️</div>
                <div style={{ fontWeight: 800, color: C.onDark, fontFamily: FONT.sans }}>{multi ? `コンテナ ${incomplete.length}本が未完了です` : `必須項目が ${missingSlots.length}件 不足しています`}</div>
                <div style={{ fontSize: 12, color: C.onDarkDim, marginTop: 6, fontFamily: FONT.sans }}>不足している項目を撮影すると完了します。</div>
              </Card>
              {multi
                ? incomplete.map((c) => (
                    <div key={c.id} style={sx.row}>
                      <div style={{ flex: 1 }}><div style={sx.rowLabel}>{splitPlate(c.containerNo).body}</div><div style={sx.rowInstr}>{containerMissing(c).length}件 不足</div></div>
                      <button type="button" onClick={() => { setActiveId(c.id); setStep('capture'); }} style={sx.shoot}>移動</button>
                    </div>
                  ))
                : missingSlots.map((s) => (
                    <div key={s.key} style={sx.row}>
                      <div style={{ flex: 1 }}><div style={sx.rowLabel}>{slotLabel(s.key, s.label)}</div><div style={sx.rowInstr}>{slotInstruction(s.key, s.instruction)}</div></div>
                      <Badge tone="negative">不足</Badge>
                    </div>
                  ))}
              <Button onClick={() => { if (multi && incomplete[0]) setActiveId(incomplete[0].id); setStep('capture'); }} style={sx.cta}>不足分を撮影する</Button>
              <button type="button" onClick={() => setSubmitted(true)} style={sx.textBtn}>このまま提出</button>
            </>
          ) : (
            <>
              <Card dark style={{ ...sx.infoCard, textAlign: 'center' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>✓</div>
                <div style={{ fontWeight: 800, color: C.onDark, fontFamily: FONT.sans }}>{multi ? `コンテナ ${containers.length}本すべて撮影しました` : `必須 ${total}枚すべて撮影しました`}</div>
              </Card>
              <Button onClick={() => setSubmitted(true)} style={sx.cta}>提出</Button>
            </>
          )}
        </>
      )}

      {submitted && (
        <div style={sx.overlay} role="dialog" aria-modal="true">
          <div style={sx.modal}>
            <div style={sx.modalCheck}>✓</div>
            <div style={sx.modalTitle}>送信しました。</div>
            <div style={sx.modalText}>{closeHint ? 'このタブを手動で閉じてください。' : '撮影は事務所へ送信されました。確認を押すとウィンドウが閉じます。'}</div>
            <Button onClick={() => { window.close(); setCloseHint(true); }} style={{ width: '100%', marginTop: 16, padding: 11 }}>確認</Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={sx.infoRow}><span style={sx.infoDot} /><span style={sx.infoLabel}>{label}</span><span style={sx.infoValue}>{value}</span></div>
  );
}

function SlotRow({ slot, done, onShoot }: { slot: RequiredPhotoSlot; done: boolean; onShoot: (f: Blob) => void }) {
  return (
    <div style={sx.row}>
      <div style={{ flex: 1 }}>
        <div style={sx.rowLabel}>{slot.label}</div>
        <div style={sx.rowInstr}>{slot.instruction}</div>
      </div>
      {done && <Badge tone="positive" style={{ marginRight: 8 }}>完了</Badge>}
      <label style={done ? sx.reshoot : sx.shoot}>{done ? '撮り直し' : '撮影'}
        <input type="file" accept="image/*" capture="environment" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onShoot(f); e.target.value = ''; }} />
      </label>
    </div>
  );
}

const sx = {
  page: { padding: 16, maxWidth: 440, margin: '0 auto' } as const,
  header: { paddingBottom: 14, borderBottom: '0.5px solid rgba(159,178,194,0.15)', marginBottom: 14 } as const,
  breadcrumb: { fontFamily: FONT.sans, fontSize: 12, color: C.onDarkDim, marginBottom: 8 } as const,
  tabs: { display: 'flex', gap: 6, overflowX: 'auto' as const, paddingBottom: 4, marginBottom: 10 } as const,
  tab: { flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#16242F', border: `1px solid ${C.blue55}`, color: C.onDarkDim, borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 700, fontFamily: FONT.sans, cursor: 'pointer', letterSpacing: '.03em' } as const,
  tabActive: { background: C.teal, borderColor: C.teal, color: C.white } as const,
  tabCount: { fontSize: 10, opacity: 0.8, fontWeight: 600 } as const,
  tabsWrap: { marginTop: 10 } as const,
  activePlate: { fontFamily: FONT.sans, fontSize: 13, fontWeight: 800, color: C.tealBright, letterSpacing: '.04em', marginTop: 2 } as const,
  plate: { background: '#16242F', border: `1px solid ${C.blue55}`, borderLeft: `4px solid ${C.teal}`, borderRadius: 12, padding: '12px 16px', marginBottom: 12 } as const,
  plateLabel: { fontFamily: FONT.sans, fontSize: 10, letterSpacing: '.12em', color: C.onDarkDim, marginBottom: 5 } as const,
  plateNo: { fontFamily: FONT.sans, fontWeight: 800, fontSize: 26, letterSpacing: '.06em', color: C.onDark, display: 'flex', alignItems: 'center', gap: 10 } as const,
  check: { background: C.teal, color: C.white, borderRadius: 7, padding: '0 10px', fontSize: 20, lineHeight: '30px' } as const,
  infoCard: { padding: 14, marginBottom: 12 } as const,
  infoRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontFamily: FONT.sans } as const,
  infoDot: { width: 7, height: 7, borderRadius: 999, background: C.teal, flexShrink: 0 } as const,
  infoLabel: { fontSize: 12, color: C.onDarkDim, width: 78, flexShrink: 0 } as const,
  infoValue: { fontSize: 14, color: C.onDark, fontWeight: 600 } as const,
  warnCard: { marginBottom: 12, padding: '12px 14px', borderLeft: `4px solid ${C.caution}` } as const,
  errorCard: { marginTop: 12, padding: '10px 14px', borderLeft: `4px solid ${C.negative}` } as const,
  syncRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '9px 12px', borderRadius: 10, background: 'rgba(159,178,194,0.1)', fontFamily: FONT.sans, fontSize: 12.5, color: C.onDarkDim } as const,
  syncDot: { width: 8, height: 8, borderRadius: 999, flexShrink: 0 } as const,
  sectionHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 8px' } as const,
  sectionTitle: { fontWeight: 700, color: C.onDark, fontFamily: FONT.sans } as const,
  countDim: { fontSize: 12, color: C.onDarkDim, fontFamily: FONT.sans } as const,
  groupLabel: { fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, color: C.tealBright, marginBottom: 4 } as const,
  groupHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } as const,
  previewRow: { fontFamily: FONT.sans, fontSize: 13, color: C.onDarkDim, padding: '2px 0' } as const,
  captureHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 } as const,
  captureTitle: { fontFamily: FONT.sans, fontWeight: 800, fontSize: 18, color: C.onDark } as const,
  progressTrack: { height: 6, background: 'rgba(159,178,194,0.2)', borderRadius: 999, overflow: 'hidden' } as const,
  progressFill: { height: '100%', background: C.teal, borderRadius: 999, transition: 'width .25s' } as const,
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '0.5px solid rgba(159,178,194,0.2)' } as const,
  rowLabel: { fontWeight: 600, color: C.onDark, fontSize: 14, fontFamily: FONT.sans } as const,
  rowInstr: { fontSize: 12, color: C.onDarkDim, marginTop: 2, fontFamily: FONT.sans } as const,
  shoot: { background: C.teal, color: C.white, borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT.sans, boxShadow: '0 4px 12px -4px rgba(1,136,143,.45)', flexShrink: 0 } as const,
  reshoot: { background: 'transparent', color: C.onDarkDim, border: `1px solid ${C.onDarkDim}`, borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT.sans, flexShrink: 0 } as const,
  damageBox: { marginTop: 18, padding: 14, border: `1px dashed ${C.negative}`, borderRadius: 12, background: 'rgba(220,38,38,0.06)' } as const,
  damageHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FONT.sans } as const,
  damageHint: { fontSize: 12, color: C.onDarkDim, margin: '6px 0 10px', fontFamily: FONT.sans } as const,
  damageBtn: { display: 'inline-block', background: 'transparent', color: C.negative, border: `1px solid ${C.negative}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT.sans } as const,
  cta: { width: '100%', marginTop: 18, padding: 12, fontSize: 15 } as const,
  textBtn: { display: 'block', width: '100%', marginTop: 10, background: 'transparent', border: 0, color: C.onDarkDim, fontFamily: FONT.sans, fontSize: 13, cursor: 'pointer' } as const,
  footNote: { textAlign: 'center' as const, fontFamily: FONT.sans, fontSize: 12, color: C.onDarkDim, marginTop: 12 } as const,
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(15,27,38,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50 } as const,
  modal: { background: C.white, borderRadius: 16, padding: '28px 24px', maxWidth: 340, width: '100%', textAlign: 'center' as const, fontFamily: FONT.sans } as const,
  modalCheck: { width: 52, height: 52, margin: '0 auto 14px', borderRadius: 999, background: C.tealTint, color: C.teal, fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' } as const,
  modalTitle: { fontSize: 19, fontWeight: 800, color: C.navy } as const,
  modalText: { fontSize: 13, color: C.text, marginTop: 8, lineHeight: 1.6 } as const,
};
