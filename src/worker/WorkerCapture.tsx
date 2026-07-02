import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { WorkerClient } from './workerClient';
import { getWorkerClient } from '../admin/repoFactory';
import type { Container, WorkTypeTemplate } from '../domain/types';
import { checklistStatus } from '../domain/checklist';
import { makeVariants } from '../lib/image';
import { sha256Hex } from '../lib/hash';
import { supabase } from '../lib/supabase';
import { uploadSlotPhoto } from './uploadPhoto';
import { PageShell, Brand, Card, Badge, Button } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

export function WorkerCapture({ client = getWorkerClient() }: { client?: WorkerClient } = {}) {
  const { token } = useParams();
  const [state, setState] = useState<{ template: WorkTypeTemplate; container: Container } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [captured, setCaptured] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client.bootstrap(token ?? '').then((r) => {
      if (!r || r.containers.length === 0) { setNotFound(true); return; }
      setState({ template: r.template, container: r.containers[0] });
    }).catch(() => setNotFound(true));
  }, [client, token]);

  async function refresh(containerId: string) {
    const photos = await client.listPhotos(token ?? '', containerId);
    setCaptured(photos.filter((p) => p.slotKey).map((p) => p.slotKey as string));
  }
  useEffect(() => { if (state) void refresh(state.container.id); }, [state]);

  if (notFound) return (
    <PageShell tone="dark" style={sx.page}>
      <p style={{ color: C.caution }}>잘못된 링크입니다.</p>
    </PageShell>
  );
  if (!state) return <PageShell tone="dark" style={sx.page}>{null}</PageShell>;

  const status = checklistStatus(captured, state.template);

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
    } catch {
      setError('업로드 실패 — 신호를 확인하고 다시 시도하세요.');
    }
  }

  return (
    <PageShell tone="dark" style={sx.page}>
      {/* Header */}
      <div style={sx.header}>
        <Brand dark />
      </div>

      {/* Route breadcrumb */}
      <div style={sx.breadcrumb}>거래처 링크 · {state.template.route}</div>

      {/* Container plate */}
      <div style={sx.plate}>{state.container.containerNo}</div>

      {/* Warning card */}
      {state.template.warningText && (
        <Card dark style={sx.warnCard}>
          <span style={{ color: C.caution, fontWeight: 600, fontSize: 13 }}>{state.template.warningText}</span>
        </Card>
      )}

      {/* Error card */}
      {error && (
        <Card dark style={sx.errorCard}>
          <span style={{ color: C.negative, fontWeight: 600, fontSize: 13 }}>{error}</span>
        </Card>
      )}

      {/* Slot rows */}
      <div style={{ marginTop: 16 }}>
        {state.template.requiredPhotos.filter((s) => s.required).map((slot) => {
          const done = captured.includes(slot.key);
          return (
            <div key={slot.key} style={sx.row}>
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

      {/* Progress line */}
      <div style={{ marginTop: 16, fontSize: 13, fontFamily: FONT.sans, color: status.complete ? C.positive : C.caution }}>
        {status.satisfied.length} / {status.satisfied.length + status.missing.length} 촬영{status.missing.length ? ` · 누락 ${status.missing.length}` : ''}
      </div>

      {/* Submit button */}
      <Button
        onClick={() => setSubmitted(true)}
        disabled={submitted}
        style={{ width: '100%', marginTop: 16, padding: 11, fontSize: 15 }}
      >
        {submitted ? '제출됨' : status.complete ? '제출' : '누락 있음 — 그래도 제출'}
      </Button>
    </PageShell>
  );
}

const sx = {
  page: { padding: 16, maxWidth: 420, margin: '0 auto' } as const,
  header: { paddingBottom: 16, borderBottom: '0.5px solid rgba(159,178,194,0.15)', marginBottom: 14 } as const,
  breadcrumb: { fontFamily: FONT.sans, fontSize: 12, color: C.onDarkDim, marginBottom: 6 } as const,
  plate: {
    fontFamily: FONT.sans,
    fontWeight: 700,
    fontSize: 22,
    letterSpacing: 2,
    background: '#16242F',
    border: `1px solid ${C.blue55}`,
    borderLeft: `4px solid ${C.orange}`,
    borderRadius: 10,
    padding: '10px 14px',
    color: C.onDark,
  } as const,
  warnCard: { marginTop: 10, padding: '10px 14px', borderLeft: `4px solid ${C.caution}`, borderRadius: 8 } as const,
  errorCard: { marginTop: 10, padding: '10px 14px', borderLeft: `4px solid ${C.negative}`, borderRadius: 8 } as const,
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: `0.5px solid rgba(159,178,194,0.2)` } as const,
  shoot: {
    background: C.orange,
    color: C.white,
    borderRadius: 8,
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: FONT.sans,
    boxShadow: '0 4px 12px -4px rgba(255,106,0,.45)',
    flexShrink: 0,
  } as const,
};
