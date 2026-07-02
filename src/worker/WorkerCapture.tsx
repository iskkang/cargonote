import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { AdminRepo } from '../admin/repo';
import { getAdminRepo } from '../admin/repoFactory';
import type { Container, WorkTypeTemplate } from '../domain/types';
import { checklistStatus } from '../domain/checklist';
import { makeVariants } from '../lib/image';
import { sha256Hex } from '../lib/hash';
import { supabase } from '../lib/supabase';
import { uploadSlotPhoto } from './uploadPhoto';

export function WorkerCapture({ repo = getAdminRepo() }: { repo?: AdminRepo } = {}) {
  const { token } = useParams();
  const [state, setState] = useState<{ template: WorkTypeTemplate; container: Container; workOrderId: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [captured, setCaptured] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    repo.getByWorkerToken(token ?? '').then((r) => {
      if (!r || r.containers.length === 0) { setNotFound(true); return; }
      setState({ template: r.template, container: r.containers[0], workOrderId: r.order.id });
    });
  }, [repo, token]);

  async function refresh(containerId: string) {
    const photos = await repo.listPhotos(containerId);
    setCaptured(photos.filter((p) => p.slotKey).map((p) => p.slotKey as string));
  }
  useEffect(() => { if (state) void refresh(state.container.id); }, [state]);

  if (notFound) return <main style={sx.page}><p style={{ color: '#E0A100' }}>잘못된 링크입니다.</p></main>;
  if (!state) return <main style={sx.page} />;

  const status = checklistStatus(captured, state.template);

  async function shoot(slotKey: string, photo: Blob) {
    setError(null);
    try {
      await uploadSlotPhoto(photo, { slotKey, containerId: state!.container.id }, {
        makeVariants, sha256Hex,
        storage: { upload: (path, body, opts) => supabase.storage.from('captures').upload(path, body, opts) },
        insertPhoto: (p) => repo.insertPhoto(p),
        now: () => new Date().toISOString(),
      });
      await refresh(state!.container.id);
    } catch (e) {
      setError('업로드 실패 — 신호를 확인하고 다시 시도하세요.');
    }
  }

  return (
    <main style={sx.page}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#9FB2C2' }}>거래처 링크 · {state.template.route}</div>
      <div style={sx.plate}>{state.container.containerNo}</div>
      {state.template.warningText && <div style={sx.warn}>{state.template.warningText}</div>}
      {error && <div style={{ ...sx.warn, color: '#DC2626', borderColor: 'rgba(220,38,38,0.4)', background: 'rgba(220,38,38,0.1)' }}>{error}</div>}
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
