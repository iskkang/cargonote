import { useEffect, useState } from 'react';
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
import { PageShell, Brand, Card, Badge, Button } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

/** ISO 6346 = 4 letters + 6 digits + 1 check digit. Split the check digit for emphasis. */
function splitPlate(no: string): { body: string; check: string | null } {
  const m = /^([A-Z]{4}\d{6})(\d)$/.exec(no.replace(/\s+/g, ''));
  return m ? { body: `${m[1].slice(0, 4)} ${m[1].slice(4)}`, check: m[2] } : { body: no, check: null };
}

type Step = 'intro' | 'capture' | 'submit';

export function WorkerCapture({ client = getWorkerClient() }: { client?: WorkerClient } = {}) {
  const { token } = useParams();
  const [state, setState] = useState<{ order: WorkOrder; template: WorkTypeTemplate; container: Container } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [captured, setCaptured] = useState<string[]>([]);
  const [step, setStep] = useState<Step>('intro');
  const [submitted, setSubmitted] = useState(false);
  const [closeHint, setCloseHint] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client.bootstrap(token ?? '').then((r) => {
      if (!r || r.containers.length === 0) { setNotFound(true); return; }
      setState({ order: r.order, template: r.template, container: r.containers[0] });
    }).catch(() => setNotFound(true));
  }, [client, token]);

  async function refresh(containerId: string) {
    const photos = await client.listPhotos(token ?? '', containerId);
    setCaptured(photos.filter((p) => p.slotKey).map((p) => p.slotKey as string));
  }
  useEffect(() => { if (state) void refresh(state.container.id); }, [state]);

  if (notFound) return (
    <PageShell tone="dark" style={sx.page}>
      <p style={{ color: C.caution, fontFamily: FONT.sans }}>잘못된 링크입니다.</p>
    </PageShell>
  );
  if (!state) return <PageShell tone="dark" style={sx.page}>{null}</PageShell>;

  const slots = state.template.requiredPhotos.filter((s) => s.required);
  const groups = groupByPhase(slots);
  const status = checklistStatus(captured, state.template);
  const total = slots.length;
  const done = status.satisfied.length;
  const missingSlots = slots.filter((s) => !captured.includes(s.key));
  const damageShots = captured.filter((k) => k === DAMAGE_SLOT).length;
  const plate = splitPlate(state.container.containerNo);

  async function shoot(slotKey: string, photo: Blob) {
    setError(null);
    try {
      await uploadSlotPhoto(photo, { slotKey, containerId: state!.container.id }, {
        makeVariants, sha256Hex,
        storage: { upload: (path, body, opts) => supabase.storage.from('captures').upload(path, body, opts) },
        insertPhoto: (p) => client.insertPhoto(token ?? '', p),
        now: () => new Date().toISOString(),
      });
      await refresh(state!.container.id);
    } catch (e) {
      console.error('upload failed', e);
      setError(`업로드 실패 — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <PageShell tone="dark" style={sx.page}>
      {step === 'intro' && (
        <>
          <div style={sx.header}><Brand dark /></div>
          <div style={sx.breadcrumb}>작업 지시서 · {state.template.route} 적입 검수</div>

          <div style={sx.plate}>
            <div style={sx.plateLabel}>ISO 6346 · CONTAINER No.</div>
            <div style={sx.plateNo}>{plate.body}{plate.check && <span style={sx.check}>{plate.check}</span>}</div>
          </div>

          <Card dark style={sx.infoCard}>
            <InfoRow label="담당 작업자" value={state.order.assigneeName || '—'} />
            <InfoRow label="작업일" value={state.order.workDate || '—'} />
            {state.order.assigneeContact && <InfoRow label="연락처" value={state.order.assigneeContact} />}
          </Card>

          {state.template.warningText && (
            <Card dark style={sx.warnCard}>
              <span style={{ color: C.caution, fontWeight: 600, fontSize: 13, fontFamily: FONT.sans }}>{state.template.warningText}</span>
            </Card>
          )}

          <div style={sx.sectionHead}><span style={sx.sectionTitle}>필요 사진</span><span style={sx.countDim}>{total}장</span></div>
          {groups.map((g) => (
            <div key={g.phase} style={{ marginBottom: 10 }}>
              <div style={sx.groupLabel}>{g.phase}</div>
              {g.slots.map((s) => <div key={s.key} style={sx.previewRow}>· {s.label}</div>)}
            </div>
          ))}

          <Button onClick={() => setStep('capture')} style={sx.cta}>촬영 시작</Button>
          <div style={sx.footNote}>필요할 때 한 장씩 · 순서는 자유입니다</div>
        </>
      )}

      {step === 'capture' && (
        <>
          <div style={sx.captureHead}>
            <span style={sx.captureTitle}>촬영 체크리스트</span>
            <span style={{ fontSize: 13, fontFamily: FONT.sans, color: status.complete ? C.positive : C.tealBright }}>{done}/{total}</span>
          </div>
          <div style={sx.progressTrack}><div style={{ ...sx.progressFill, width: total ? `${(done / total) * 100}%` : '0%' }} /></div>

          {error && <Card dark style={sx.errorCard}><span style={{ color: C.negative, fontWeight: 600, fontSize: 13, fontFamily: FONT.sans }}>{error}</span></Card>}

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
              <span style={{ fontWeight: 700, color: C.onDark }}>데미지·추가 사진</span>
              <span style={{ fontSize: 13, color: damageShots ? C.negative : C.onDarkDim }}>{damageShots}장</span>
            </div>
            <div style={sx.damageHint}>화물 손상이 있으면 사진을 추가로 찍어 보내세요. (여러 장 가능)</div>
            <label style={sx.damageBtn}>＋ 데미지 사진 추가
              <input type="file" accept="image/*" capture="environment" hidden multiple
                onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => shoot(DAMAGE_SLOT, f)); e.target.value = ''; }} />
            </label>
          </div>

          <Button onClick={() => setStep('submit')} style={sx.cta}>제출 확인</Button>
        </>
      )}

      {step === 'submit' && (
        <>
          <div style={sx.captureHead}><span style={sx.captureTitle}>제출 전 확인</span><span style={{ fontSize: 13, color: C.onDarkDim, fontFamily: FONT.sans }}>{done}/{total} 촬영</span></div>
          {missingSlots.length > 0 ? (
            <>
              <Card dark style={{ ...sx.warnCard, textAlign: 'center' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>⚠️</div>
                <div style={{ fontWeight: 800, color: C.onDark, fontFamily: FONT.sans }}>필수 항목 {missingSlots.length}개가 빠졌습니다</div>
                <div style={{ fontSize: 12, color: C.onDarkDim, marginTop: 6, fontFamily: FONT.sans }}>빠진 항목을 촬영하면 완료됩니다.</div>
              </Card>
              {missingSlots.map((s) => (
                <div key={s.key} style={sx.row}>
                  <div style={{ flex: 1 }}><div style={sx.rowLabel}>{s.label}</div><div style={sx.rowInstr}>{s.instruction}</div></div>
                  <Badge tone="negative">누락</Badge>
                </div>
              ))}
              <Button onClick={() => setStep('capture')} style={sx.cta}>빠진 항목 촬영하기</Button>
              <button type="button" onClick={() => setSubmitted(true)} style={sx.textBtn}>이대로 제출</button>
            </>
          ) : (
            <>
              <Card dark style={{ ...sx.infoCard, textAlign: 'center' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>✓</div>
                <div style={{ fontWeight: 800, color: C.onDark, fontFamily: FONT.sans }}>필수 {total}장 모두 촬영됐습니다</div>
              </Card>
              <Button onClick={() => setSubmitted(true)} style={sx.cta}>제출</Button>
            </>
          )}
        </>
      )}

      {submitted && (
        <div style={sx.overlay} role="dialog" aria-modal="true">
          <div style={sx.modal}>
            <div style={sx.modalCheck}>✓</div>
            <div style={sx.modalTitle}>전송되었습니다!</div>
            <div style={sx.modalText}>{closeHint ? '이 탭을 직접 닫아 주세요.' : '촬영이 사무실로 전송됐습니다. 확인을 누르면 창이 닫힙니다.'}</div>
            <Button onClick={() => { window.close(); setCloseHint(true); }} style={{ width: '100%', marginTop: 16, padding: 11 }}>확인</Button>
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
      {done && <Badge tone="positive" style={{ marginRight: 8 }}>완료</Badge>}
      <label style={done ? sx.reshoot : sx.shoot}>{done ? '다시' : '촬영'}
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
