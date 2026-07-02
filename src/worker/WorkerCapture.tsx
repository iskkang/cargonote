import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { AdminRepo } from '../admin/repo';
import { createInMemoryAdminRepo } from '../admin/repo';
import type { Container, WorkTypeTemplate } from '../domain/types';
import { checklistStatus } from '../domain/checklist';
import { makeVariants } from '../lib/image';
import { sha256Hex } from '../lib/hash';
import { enqueue, allItems } from '../lib/captureQueue';
import { captureToSlot, capturedSlotKeys } from './capture';

const defaultRepo = createInMemoryAdminRepo();

export function WorkerCapture({ repo = defaultRepo }: { repo?: AdminRepo }) {
  const { token } = useParams();
  const [state, setState] = useState<{ template: WorkTypeTemplate; container: Container; workOrderId: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [captured, setCaptured] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    repo.getByWorkerToken(token ?? '').then((r) => {
      if (!r || r.containers.length === 0) { setNotFound(true); return; }
      setState({ template: r.template, container: r.containers[0], workOrderId: r.order.id });
    });
  }, [repo, token]);

  async function refresh(containerId: string) {
    setCaptured(capturedSlotKeys(await allItems(), containerId));
  }
  useEffect(() => { if (state) refresh(state.container.id); }, [state]);

  if (notFound) return <main style={sx.page}><p style={{ color: '#E0A100' }}>잘못된 링크입니다.</p></main>;
  if (!state) return <main style={sx.page} />;

  const status = checklistStatus(captured, state.template);

  async function shoot(slotKey: string, photo: Blob) {
    await captureToSlot(photo, { slotKey, containerId: state!.container.id, workOrderId: state!.workOrderId }, { makeVariants, sha256Hex, enqueue });
    await refresh(state!.container.id);
  }

  return (
    <main style={sx.page}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#9FB2C2' }}>거래처 링크 · {state.template.route}</div>
      <div style={sx.plate}>{state.container.containerNo}</div>
      {state.template.warningText && <div style={sx.warn}>{state.template.warningText}</div>}
      <div style={{ marginTop: 12 }}>
        {state.template.requiredPhotos.filter((s) => s.required).map((slot) => {
          const done = captured.includes(slot.key);
          return (
            <div key={slot.key} style={sx.row}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: '#fff' }}>{slot.label}</div>
                <div style={{ fontSize: 12, color: '#9FB2C2' }}>{slot.instruction}</div>
              </div>
              {done ? <span style={{ color: '#15A34A', fontSize: 13 }}>완료</span> : (
                <label style={sx.shoot}>촬영
                  <input type="file" accept="image/*" capture="environment" hidden
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) shoot(slot.key, f); e.target.value = ''; }} />
                </label>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, fontSize: 13, color: status.complete ? '#15A34A' : '#E0A100' }}>
        {status.satisfied.length} / {status.satisfied.length + status.missing.length} 촬영{status.missing.length ? ` · 누락 ${status.missing.length}` : ''}
      </div>
      <button onClick={() => setSubmitted(true)} disabled={submitted}
        style={{ ...sx.submit, opacity: submitted ? 0.6 : 1 }}>
        {submitted ? '제출됨' : status.complete ? '제출' : '누락 있음 — 그래도 제출'}
      </button>
    </main>
  );
}

const sx = {
  page: { minHeight: '100vh', background: '#0F1B26', color: '#E7ECF1', fontFamily: 'Pretendard, sans-serif', padding: 16, maxWidth: 420, margin: '0 auto' } as const,
  plate: { fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 20, letterSpacing: 0.5, background: '#16242F', border: '1px solid #22507A', borderRadius: 10, padding: '10px 14px', marginTop: 6 } as const,
  warn: { marginTop: 10, fontSize: 12, color: '#E0A100', background: 'rgba(224,161,0,0.1)', border: '1px solid rgba(224,161,0,0.3)', borderRadius: 8, padding: '8px 10px' } as const,
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '0.5px solid rgba(159,178,194,0.2)' } as const,
  shoot: { background: '#FF6A00', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' } as const,
  submit: { width: '100%', marginTop: 16, padding: 11, borderRadius: 10, border: 0, background: '#FF6A00', color: '#fff', fontSize: 15, fontWeight: 600 } as const,
};
