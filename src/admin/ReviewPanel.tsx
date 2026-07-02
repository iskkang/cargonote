import { useEffect, useState } from 'react';
import type { AdminRepo } from './repo';
import type { WorkOrderReview } from '../domain/review';
import { requiredSlots } from '../domain/template';
import { checklistStatus } from '../domain/checklist';
import { createThumbUrls } from './thumbs';

export function ReviewPanel({
  workOrderId, repo, onBack, thumbUrls = (paths) => createThumbUrls(paths),
}: {
  workOrderId: string; repo: AdminRepo; onBack: () => void;
  thumbUrls?: (paths: string[]) => Promise<Record<string, string>>;
}) {
  const [review, setReview] = useState<WorkOrderReview | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [viewerLink, setViewerLink] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    repo.getWorkOrderReview(workOrderId).then(async (r) => {
      setReview(r);
      if (!r) return;
      const paths = r.containers.flatMap((c) => c.photos.map((p) => p.thumbPath).filter((x): x is string => !!x));
      setUrls(await thumbUrls(paths));
    });
  }, [workOrderId, repo, thumbUrls]);

  if (!review) return <section style={sx.panel}><span style={{ color: '#5A6B7D', fontSize: 13 }}>로딩 중…</span></section>;

  const slots = requiredSlots(review.template);

  async function publish() {
    setPublishing(true);
    try {
      const { viewerToken } = await repo.publish(workOrderId);
      setViewerLink(`${location.origin}/v/${viewerToken}`);
    } finally { setPublishing(false); }
  }

  return (
    <section style={sx.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={sx.back}>← 뒤로</button>
        <span style={{ fontSize: 13, color: '#5A6B7D' }}>{review.customer?.name} · {review.template.route} · {review.order.status}</span>
      </div>
      {review.containers.map(({ container, photos }) => {
        const captured = photos.map((p) => p.slotKey).filter((x): x is string => !!x);
        const status = checklistStatus(captured, review.template);
        return (
          <div key={container.id} style={sx.container}>
            <div style={sx.plate}>{container.containerNo}</div>
            <div style={{ fontSize: 13, color: status.complete ? '#15A34A' : '#E0A100', margin: '6px 0' }}>
              {status.satisfied.length} / {slots.length} 촬영{status.missing.length ? ` · 누락 ${status.missing.length}` : ''}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {slots.map((slot) => {
                const photo = photos.find((p) => p.slotKey === slot.key);
                const url = photo?.thumbPath ? urls[photo.thumbPath] : undefined;
                return (
                  <div key={slot.key} style={sx.slot}>
                    {url ? <img src={url} alt={slot.label} style={sx.thumb} /> : <div style={{ ...sx.thumb, ...sx.missing }}>미촬영</div>}
                    <div style={{ fontSize: 11, color: '#5A6B7D', marginTop: 2 }}>{slot.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: 16 }}>
        <button onClick={publish} disabled={publishing} style={sx.publish}>{publishing ? '발행 중…' : '발행'}</button>
        {viewerLink && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#5A6B7D' }}>수신자 링크</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code data-testid="viewer-link" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, wordBreak: 'break-all' }}>{viewerLink}</code>
              <button type="button" onClick={() => navigator.clipboard?.writeText(viewerLink)}>복사</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const sx = {
  panel: { background: '#fff', borderRadius: 14, padding: 20, marginTop: 12 } as const,
  back: { background: 'transparent', border: '1px solid rgba(90,107,125,0.3)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' } as const,
  container: { borderTop: '0.5px solid rgba(90,107,125,0.2)', paddingTop: 12, marginTop: 12 } as const,
  plate: { fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 16 } as const,
  slot: { width: 84 } as const,
  thumb: { width: 84, height: 84, objectFit: 'cover', borderRadius: 8, background: '#EEF2F5' } as const,
  missing: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#9FB2C2' } as const,
  publish: { background: '#FF6A00', color: '#fff', border: 0, borderRadius: 10, padding: '10px 18px', fontWeight: 600 } as const,
};
