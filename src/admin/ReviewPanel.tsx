import { useEffect, useState } from 'react';
import type { AdminRepo } from './repo';
import type { WorkOrderReview } from '../domain/review';
import { requiredSlots } from '../domain/template';
import { checklistStatus } from '../domain/checklist';
import { DAMAGE_SLOT } from '../domain/review';
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
      if (r.order.status === 'published') {
        const tok = await repo.getViewerToken(workOrderId);
        if (tok) setViewerLink(`${location.origin}/v/${tok}`);
      }
    });
  }, [workOrderId, repo, thumbUrls]);

  if (!review) return (
    <section style={{ fontFamily: FONT.sans, padding: 20 }}>
      <span style={{ color: C.text, fontSize: 13 }}>로딩 중…</span>
    </section>
  );

  const slots = requiredSlots(review.template);
  const firstContainer = review.containers[0]?.container;

  let cap = 0; const req = slots.length * Math.max(review.containers.length, 1);
  for (const c of review.containers) {
    cap += checklistStatus(c.photos.map((p) => p.slotKey).filter((x): x is string => !!x), review.template).satisfied.length;
  }
  const pct = req ? Math.round((cap / req) * 100) : 0;
  const missing = req - cap;
  const damagePhotos = review.containers.flatMap((c) => c.photos.filter((p) => p.slotKey === DAMAGE_SLOT));
  const damageCount = damagePhotos.length;
  const thumbList = review.containers.flatMap((c) => c.photos.map((p) => p.thumbPath && urls[p.thumbPath]).filter(Boolean) as string[]);

  async function publish() {
    setPublishing(true);
    try {
      const paths = review!.containers.flatMap((c) => c.photos.flatMap((p) => [p.thumbPath, p.displayPath].filter((x): x is string => !!x)));
      const signed = await signViewer(paths);
      const manifest = buildViewerManifest(review!, signed);
      const { viewerToken } = await repo.publish(workOrderId, manifest);
      setViewerLink(`${location.origin}/v/${viewerToken}`);
    } finally { setPublishing(false); }
  }

  // ---- Published report screen ----
  if (viewerLink) {
    return (
      <section style={{ fontFamily: FONT.sans }}>
        <div style={sx.header}>
          <Button variant="ghost" onClick={onBack}>← 작업 현황</Button>
          <span style={{ fontSize: 13, color: C.text }}>리포트 발행 완료</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <Button onClick={() => window.print()}>PDF 다운로드</Button>
        </div>
        <Card style={{ padding: 0, overflow: 'hidden', maxWidth: 720 }}>
          <div style={sx.reportHead}>
            <div>
              <div style={sx.reportKicker}>CONCHECK 증빙 리포트</div>
              <div style={sx.reportTitle}>{review.template.route} 검수 · {firstContainer?.containerNo}</div>
            </div>
            <span style={sx.verified}>VERIFIED<br /><span style={{ fontSize: 9, fontWeight: 600 }}>촬영→검증</span></span>
          </div>
          <div style={{ padding: 18 }}>
            <div style={sx.tiles}>
              <Tile label="완료율" value={`${pct}%`} accent={C.positive} />
              <Tile label="사진" value={`${cap}/${req}`} />
              <Tile label="데미지" value={`${damageCount}`} accent={damageCount ? C.negative : undefined} />
              <Tile label="Seal No." value={firstContainer?.sealNo || '—'} />
            </div>
            {thumbList.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0' }}>
                {thumbList.slice(0, 6).map((u, i) => <img key={i} src={u} alt="" style={sx.reportThumb} />)}
              </div>
            )}
            <div style={sx.chainRow}>
              <span style={{ fontSize: 12, color: C.text }}>발행 · {review.customer?.name ?? ''}</span>
              <span style={{ fontSize: 12, color: C.teal, fontWeight: 600 }}>🔒 체인오브커스터디 잠금</span>
            </div>
          </div>
        </Card>
        <Card style={{ marginTop: 12, maxWidth: 720 }}>
          <div style={{ fontSize: 12, color: C.text, marginBottom: 6 }}>수신자에게 링크 보내기</div>
          <ShareLinkBar url={viewerLink} title="적입 검수 완료 · 증빙 리포트" testId="viewer-link" />
        </Card>
      </section>
    );
  }

  // ---- Review screen ----
  return (
    <section style={{ fontFamily: FONT.sans }}>
      <div style={sx.header}>
        <Button variant="ghost" onClick={onBack}>← 작업 현황</Button>
        <span style={{ fontSize: 13, color: C.text }}>{review.customer?.name} · {review.template.route}</span>
      </div>

      <div className="cn-review" style={sx.split}>
        <div>
          {review.containers.map(({ container, photos }) => (
            <div key={container.id} style={{ marginBottom: 18 }}>
              <div style={sx.plate}>{container.containerNo}</div>
              <div style={sx.grid}>
                {slots.map((slot, i) => {
                  const photo = photos.find((p) => p.slotKey === slot.key);
                  const url = photo?.thumbPath ? urls[photo.thumbPath] : undefined;
                  const done = !!photo;
                  return (
                    <div key={slot.key} style={sx.pcard}>
                      <div style={{ position: 'relative' }}>
                        {url ? <img src={url} alt={slot.label} style={sx.pthumb} /> : <div style={{ ...sx.pthumb, ...sx.pmiss }}>미촬영</div>}
                        <span style={sx.pnum}>{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <div style={sx.plabel}>{slot.label}</div>
                      <Badge tone={done ? 'positive' : 'negative'}>{done ? '촬영됨' : '누락'}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {damagePhotos.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ ...sx.plate, color: C.negative }}>데미지 사진 · {damageCount}장</div>
              <div style={sx.grid}>
                {damagePhotos.map((p, i) => {
                  const url = p.thumbPath ? urls[p.thumbPath] : undefined;
                  return (
                    <div key={i} style={sx.pcard}>
                      {url ? <img src={url} alt="데미지" style={sx.pthumb} /> : <div style={{ ...sx.pthumb, ...sx.pmiss }}>이미지</div>}
                      <div style={{ marginTop: 6 }}><Badge tone="negative">데미지</Badge></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <Card style={{ alignSelf: 'flex-start' }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 12 }}>검수 요약</div>
          <div style={sx.bigPct}>{pct}<span style={{ fontSize: 18 }}>%</span> <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>완료율</span></div>
          <div style={sx.pctTrack}><div style={{ ...sx.pctFill, width: `${pct}%` }} /></div>
          <SumRow label="촬영 완료" value={`${cap}장`} dot={C.positive} />
          <SumRow label="누락" value={`${missing}장`} dot={missing ? C.negative : C.muted} />
          <SumRow label="데미지" value={`${damageCount}장`} dot={damageCount ? C.negative : C.muted} />
          <Button onClick={publish} disabled={publishing} style={{ width: '100%', marginTop: 14 }}>
            {publishing ? '발행 중…' : '리포트 발행'}
          </Button>
        </Card>
      </div>
    </section>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={sx.tile}>
      <div style={{ fontSize: 11, color: C.muted }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent ?? C.navy, marginTop: 3 }}>{value}</div>
    </div>
  );
}
function SumRow({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div style={sx.sumRow}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text }}><span style={{ width: 8, height: 8, borderRadius: 999, background: dot }} />{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{value}</span>
    </div>
  );
}

const sx = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } as const,
  split: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 20, alignItems: 'start' } as const,
  plate: { fontFamily: FONT.sans, fontWeight: 800, fontSize: 17, letterSpacing: '.06em', color: C.navy, marginBottom: 10 } as const,
  grid: { display: 'flex', flexWrap: 'wrap' as const, gap: 10 } as const,
  pcard: { width: 120 } as const,
  pthumb: { width: 120, height: 90, objectFit: 'cover' as const, borderRadius: 8, background: C.surfaceAlt, display: 'block' } as const,
  pmiss: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: C.muted } as const,
  pnum: { position: 'absolute' as const, top: 6, left: 6, background: 'rgba(15,27,38,.72)', color: C.white, fontSize: 11, fontWeight: 700, borderRadius: 5, padding: '1px 6px' } as const,
  plabel: { fontSize: 12, fontWeight: 600, color: C.textStrong, margin: '6px 0 4px' } as const,
  bigPct: { fontFamily: FONT.sans, fontSize: 34, fontWeight: 800, color: C.navy, lineHeight: 1 } as const,
  pctTrack: { height: 8, background: C.surfaceAlt, borderRadius: 999, overflow: 'hidden', margin: '10px 0 14px' } as const,
  pctFill: { height: '100%', background: C.positive, borderRadius: 999 } as const,
  sumRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: `1px solid ${C.line}` } as const,
  reportHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: C.brandNavy, padding: '18px 20px' } as const,
  reportKicker: { fontFamily: FONT.sans, fontSize: 11, letterSpacing: '.08em', color: C.onDarkDim } as const,
  reportTitle: { fontFamily: FONT.sans, fontSize: 19, fontWeight: 800, color: C.onDark, marginTop: 4 } as const,
  verified: { border: `2px solid ${C.teal}`, color: C.teal, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 800, textAlign: 'center' as const, lineHeight: 1.2 } as const,
  tiles: { display: 'flex', gap: 10, flexWrap: 'wrap' as const } as const,
  tile: { flex: 1, minWidth: 80, background: C.surfaceAlt, borderRadius: 10, padding: '12px 14px' } as const,
  reportThumb: { width: 96, height: 72, objectFit: 'cover' as const, borderRadius: 8, background: C.surfaceAlt } as const,
  chainRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` } as const,
};
