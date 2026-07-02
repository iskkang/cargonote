import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { WorkerClient } from './workerClient';
import { getWorkerClient } from '../admin/repoFactory';
import type { Container, WorkOrder, WorkTypeTemplate } from '../domain/types';
import { checklistStatus } from '../domain/checklist';
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

export function WorkerCapture({ client = getWorkerClient() }: { client?: WorkerClient } = {}) {
  const { token } = useParams();
  const [state, setState] = useState<{ order: WorkOrder; template: WorkTypeTemplate; container: Container } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [captured, setCaptured] = useState<string[]>([]);
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

  const status = checklistStatus(captured, state.template);
  const slots = state.template.requiredPhotos.filter((s) => s.required);
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
      const msg = e instanceof Error ? e.message : String(e);
      setError(`업로드 실패 — ${msg}`);
    }
  }

  return (
    <PageShell tone="dark" style={sx.page}>
      {/* Header */}
      <div style={sx.header}>
        <Brand dark />
      </div>

      <div style={sx.breadcrumb}>작업 지시서 · {state.template.route} 적입 검수</div>

      {/* Container plate */}
      <div style={sx.plate}>
        <div style={sx.plateLabel}>ISO 6346 · CONTAINER No.</div>
        <div style={sx.plateNo}>
          {plate.body}
          {plate.check && <span style={sx.check}>{plate.check}</span>}
        </div>
      </div>

      {/* Info card */}
      <Card dark style={sx.infoCard}>
        <InfoRow label="담당 작업자" value={state.order.assigneeName || '—'} />
        <InfoRow label="작업일" value={state.order.workDate || '—'} />
        {state.order.assigneeContact && <InfoRow label="연락처" value={state.order.assigneeContact} />}
      </Card>

      {/* Warning */}
      {state.template.warningText && (
        <Card dark style={sx.warnCard}>
          <span style={{ color: C.caution, fontWeight: 600, fontSize: 13, fontFamily: FONT.sans }}>{state.template.warningText}</span>
        </Card>
      )}
      {error && (
        <Card dark style={sx.errorCard}>
          <span style={{ color: C.negative, fontWeight: 600, fontSize: 13, fontFamily: FONT.sans }}>{error}</span>
        </Card>
      )}

      {/* Checklist */}
      <div style={sx.listHead}>
        <span style={{ fontWeight: 700, color: C.onDark, fontFamily: FONT.sans }}>필요 사진</span>
        <span style={{ fontSize: 13, fontFamily: FONT.sans, color: status.complete ? C.positive : C.tealBright }}>
          {status.satisfied.length}/{slots.length} 촬영
        </span>
      </div>
      <div>
        {slots.map((slot, i) => {
          const done = captured.includes(slot.key);
          return (
            <div key={slot.key} style={sx.row}>
              <span style={sx.num}>{String(i + 1).padStart(2, '0')}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: C.onDark, fontSize: 14, fontFamily: FONT.sans }}>{slot.label}</div>
                <div style={{ fontSize: 12, color: C.onDarkDim, marginTop: 2, fontFamily: FONT.sans }}>{slot.instruction}</div>
              </div>
              {done ? (
                <Badge tone="positive">완료</Badge>
              ) : (
                <label style={sx.shoot}>촬영
                  <input type="file" accept="image/*" capture="environment" hidden
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) shoot(slot.key, f); e.target.value = ''; }} />
                </label>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <Button onClick={() => setSubmitted(true)} disabled={submitted}
        style={{ width: '100%', marginTop: 18, padding: 12, fontSize: 15 }}>
        {submitted ? '전송됨' : status.complete ? '전송' : '누락 있음 — 그래도 전송'}
      </Button>
      <div style={sx.footNote}>필요할 때 한 장씩 · 순서는 자유입니다</div>

      {/* Completion dialog */}
      {submitted && (
        <div style={sx.overlay} role="dialog" aria-modal="true">
          <div style={sx.modal}>
            <div style={sx.modalCheck}>✓</div>
            <div style={sx.modalTitle}>전송되었습니다!</div>
            <div style={sx.modalText}>
              {closeHint
                ? '이 탭을 직접 닫아 주세요.'
                : '촬영이 사무실로 전송됐습니다. 확인을 누르면 창이 닫힙니다.'}
            </div>
            <Button onClick={() => { window.close(); setCloseHint(true); }}
              style={{ width: '100%', marginTop: 16, padding: 11 }}>확인</Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={sx.infoRow}>
      <span style={sx.infoDot} />
      <span style={sx.infoLabel}>{label}</span>
      <span style={sx.infoValue}>{value}</span>
    </div>
  );
}

const sx = {
  page: { padding: 16, maxWidth: 440, margin: '0 auto' } as const,
  header: { paddingBottom: 14, borderBottom: '0.5px solid rgba(159,178,194,0.15)', marginBottom: 14 } as const,
  breadcrumb: { fontFamily: FONT.sans, fontSize: 12, color: C.onDarkDim, marginBottom: 8 } as const,
  plate: {
    background: '#16242F', border: `1px solid ${C.blue55}`, borderLeft: `4px solid ${C.teal}`,
    borderRadius: 12, padding: '12px 16px', marginBottom: 12,
  } as const,
  plateLabel: { fontFamily: FONT.sans, fontSize: 10, letterSpacing: '.12em', color: C.onDarkDim, marginBottom: 5 } as const,
  plateNo: { fontFamily: FONT.sans, fontWeight: 800, fontSize: 26, letterSpacing: '.06em', color: C.onDark, display: 'flex', alignItems: 'center', gap: 10 } as const,
  check: { background: C.teal, color: C.white, borderRadius: 7, padding: '0 10px', fontSize: 20, lineHeight: '30px' } as const,
  infoCard: { padding: 14, marginBottom: 12 } as const,
  infoRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', fontFamily: FONT.sans } as const,
  infoDot: { width: 7, height: 7, borderRadius: 999, background: C.teal, flexShrink: 0 } as const,
  infoLabel: { fontSize: 12, color: C.onDarkDim, width: 78, flexShrink: 0 } as const,
  infoValue: { fontSize: 14, color: C.onDark, fontWeight: 600 } as const,
  warnCard: { marginBottom: 12, padding: '10px 14px', borderLeft: `4px solid ${C.caution}` } as const,
  errorCard: { marginBottom: 12, padding: '10px 14px', borderLeft: `4px solid ${C.negative}` } as const,
  listHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '6px 0 6px' } as const,
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '0.5px solid rgba(159,178,194,0.2)' } as const,
  num: { fontFamily: FONT.sans, fontSize: 13, fontWeight: 700, color: C.onDarkDim, width: 22, flexShrink: 0 } as const,
  shoot: {
    background: C.teal, color: C.white, borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: FONT.sans, boxShadow: '0 4px 12px -4px rgba(1,136,143,.45)', flexShrink: 0,
  } as const,
  footNote: { textAlign: 'center' as const, fontFamily: FONT.sans, fontSize: 12, color: C.onDarkDim, marginTop: 12 } as const,
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(15,27,38,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50 } as const,
  modal: { background: C.white, borderRadius: 16, padding: '28px 24px', maxWidth: 340, width: '100%', textAlign: 'center' as const, fontFamily: FONT.sans } as const,
  modalCheck: { width: 52, height: 52, margin: '0 auto 14px', borderRadius: 999, background: C.tealTint, color: C.teal, fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' } as const,
  modalTitle: { fontSize: 19, fontWeight: 800, color: C.navy } as const,
  modalText: { fontSize: 13, color: C.text, marginTop: 8, lineHeight: 1.6 } as const,
};
