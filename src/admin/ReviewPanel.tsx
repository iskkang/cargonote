import { useEffect, useState } from 'react';
import type { AdminRepo } from './repo';
import type { WorkOrderReview } from '../domain/review';
import { requiredSlots } from '../domain/template';
import { checklistStatus } from '../domain/checklist';
import { createThumbUrls, createSignedViewerUrls } from './thumbs';
import { buildViewerManifest } from '../domain/viewer';
import { Card, Button, Badge } from '../ui/kit';
import { ShareLinkBar } from '../ui/ShareLinkBar';
import { C, FONT } from '../ui/tokens';

export function ReviewPanel({
  workOrderId, repo, onBack, thumbUrls = (paths) => createThumbUrls(paths), signViewer = (paths) => createSignedViewerUrls(paths),
}: {
  workOrderId: string; repo: AdminRepo; onBack: () => void;
  thumbUrls?: (paths: string[]) => Promise<Record<string, string>>;
  signViewer?: (paths: string[]) => Promise<Record<string, string>>;
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

  if (!review) return (
    <section style={{ fontFamily: FONT.sans, padding: 20, marginTop: 12 }}>
      <span style={{ color: C.text, fontSize: 13 }}>로딩 중…</span>
    </section>
  );

  const slots = requiredSlots(review.template);

  async function publish() {
    setPublishing(true);
    try {
      const paths = review!.containers.flatMap((c) => c.photos.flatMap((p) => [p.thumbPath, p.displayPath].filter((x): x is string => !!x)));
      const urls = await signViewer(paths);
      const manifest = buildViewerManifest(review!, urls);
      const { viewerToken } = await repo.publish(workOrderId, manifest);
      setViewerLink(`${location.origin}/v/${viewerToken}`);
    } finally { setPublishing(false); }
  }

  return (
    <section style={{ fontFamily: FONT.sans, marginTop: 12 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button variant="ghost" onClick={onBack}>← 뒤로</Button>
        <span style={{ fontSize: 13, color: C.text }}>
          {review.customer?.name} · {review.template.route} · {review.order.status}
        </span>
      </div>

      {/* Per-container cards */}
      {review.containers.map(({ container, photos }) => {
        const captured = photos.map((p) => p.slotKey).filter((x): x is string => !!x);
        const status = checklistStatus(captured, review.template);
        const tone = status.complete ? 'positive' : 'caution';
        return (
          <Card key={container.id} style={{ marginBottom: 14 }}>
            {/* Container plate — Pretendard bold + letter-spacing (no mono) */}
            <div style={{
              fontFamily: FONT.sans,
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: '0.08em',
              color: C.textStrong,
              marginBottom: 8,
            }}>
              {container.containerNo}
            </div>

            {/* Checklist count badge */}
            <Badge tone={tone} style={{ marginBottom: 12 }}>
              {status.satisfied.length} / {slots.length} 촬영
              {status.missing.length ? ` · 누락 ${status.missing.length}` : ''}
            </Badge>

            {/* Thumbnails grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {slots.map((slot) => {
                const photo = photos.find((p) => p.slotKey === slot.key);
                const url = photo?.thumbPath ? urls[photo.thumbPath] : undefined;
                return (
                  <div key={slot.key} style={{ width: 84 }}>
                    {url
                      ? <img src={url} alt={slot.label} style={sx.thumb} />
                      : <div style={{ ...sx.thumb, ...sx.missing }}>미촬영</div>}
                    <div style={{ fontSize: 11, color: C.text, marginTop: 2 }}>{slot.label}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* Publish + viewer-link block */}
      <div style={{ marginTop: 16 }}>
        <Button onClick={publish} disabled={publishing}>
          {publishing ? '발행 중…' : '발행'}
        </Button>

        {viewerLink && (
          <Card style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: C.text, marginBottom: 6 }}>수신자에게 링크 보내기</div>
            <ShareLinkBar url={viewerLink} title="적입 검수 완료 · 증빙 리포트" testId="viewer-link" />
          </Card>
        )}
      </div>
    </section>
  );
}

const sx = {
  thumb: { width: 84, height: 84, objectFit: 'cover' as const, borderRadius: 8, background: C.surfaceAlt } as const,
  missing: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: C.onDarkDim } as const,
};
