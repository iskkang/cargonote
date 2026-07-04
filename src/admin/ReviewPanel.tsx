import { useEffect, useState } from 'react';
import type { AdminRepo } from './repo';
import type { WorkOrderReview } from '../domain/review';
import { requiredSlots } from '../domain/template';
import { checklistStatus } from '../domain/checklist';
import { DAMAGE_SLOT } from '../domain/review';
import { createThumbUrls, createSignedViewerUrls } from './thumbs';
import { buildViewerManifest } from '../domain/viewer';
import { Card, Button, Badge, Skeleton } from '../ui/kit';
import { ShareLinkBar } from '../ui/ShareLinkBar';
import { useConfirm, useToast } from '../ui/overlays';
import { analyzeReview, type AiReview, type AiIssue } from './ai';
import { useT } from './i18n';
import { C, FONT } from '../ui/tokens';

export function ReviewPanel({
  workOrderId, repo, onBack, backLabel: backLabelProp, startAsReport = false,
  thumbUrls = (paths) => createThumbUrls(paths), signViewer = (paths) => createSignedViewerUrls(paths),
}: {
  workOrderId: string; repo: AdminRepo; onBack: () => void; backLabel?: string; startAsReport?: boolean;
  thumbUrls?: (paths: string[]) => Promise<Record<string, string>>;
  signViewer?: (paths: string[]) => Promise<Record<string, string>>;
}) {
  const t = useT();
  const confirm = useConfirm();
  const toast = useToast();
  const backLabel = backLabelProp ?? t.review.back;
  const [review, setReview] = useState<WorkOrderReview | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [publishedToken, setPublishedToken] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [ai, setAi] = useState<Record<string, AiReview | 'loading' | 'error'>>({});

  useEffect(() => {
    let cancelled = false;
    setReview(null); setLoadError(false); setPublishedToken(null); setShowReport(false);
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000));
    Promise.race([repo.getWorkOrderReview(workOrderId), timeout])
      .then(async (r) => {
        if (cancelled) return;
        if (!r) { setLoadError(true); return; }
        setReview(r);
        const paths = r.containers.flatMap((c) => c.photos.flatMap((p) => [p.thumbPath, p.displayPath].filter((x): x is string => !!x)));
        thumbUrls(paths).then((u) => !cancelled && setUrls(u)).catch(() => {});
        if (r.order.status === 'published') {
          const tok = await repo.getViewerToken(workOrderId).catch(() => null);
          if (!cancelled && tok) { setPublishedToken(tok); if (startAsReport) setShowReport(true); }
        }
      })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
    // thumbUrls/signViewer are injected and stable per mount; excluding them
    // keeps this effect from re-running on every render (which reset the loading state).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId, repo, reloadKey, startAsReport]);

  const viewerLink = publishedToken ? `${location.origin}/v/${publishedToken}` : null;

  if (loadError) return (
    <section style={{ fontFamily: FONT.sans, padding: 20 }}>
      <div style={sx.header}>
        <Button variant="ghost" onClick={onBack}>← {backLabel}</Button>
      </div>
      <div style={{ color: C.text, fontSize: 14, marginBottom: 12 }}>{t.review.loadErr}</div>
      <Button onClick={() => setReloadKey((k) => k + 1)}>{t.review.retry}</Button>
    </section>
  );
  if (!review) return (
    <section style={{ fontFamily: FONT.sans }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Skeleton height={40} width={220} />
        <Skeleton height={220} style={{ borderRadius: 12 }} />
      </div>
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
      setPublishedToken(viewerToken);
      setShowReport(true);
    } finally { setPublishing(false); }
  }

  async function revoke() {
    const ok = await confirm({ title: t.review.revokeTitle, message: t.review.revokeMsg, confirmLabel: t.review.revoke, danger: true });
    if (!ok) return;
    await repo.revokePublication(workOrderId);
    setPublishedToken(null); setShowReport(false);
    toast(t.review.revoked, 'positive');
  }

  async function runAi(containerId: string, containerNo: string, photos: { slotKey: string | null; displayPath: string | null }[]) {
    const images = photos
      .filter((p) => p.displayPath && urls[p.displayPath])
      .map((p) => ({
        label: p.slotKey === DAMAGE_SLOT ? t.review.damageT
          : review!.template.requiredPhotos.find((s) => s.key === p.slotKey)?.label ?? (p.slotKey ?? ''),
        imageUrl: urls[p.displayPath!] as string,
      }));
    if (images.length === 0) { setAi((a) => ({ ...a, [containerId]: 'error' })); return; }
    setAi((a) => ({ ...a, [containerId]: 'loading' }));
    try {
      const r = await analyzeReview({ images, expectedContainerNo: containerNo });
      setAi((a) => ({ ...a, [containerId]: r }));
    } catch {
      setAi((a) => ({ ...a, [containerId]: 'error' }));
    }
  }

  // ---- Published report screen ----
  if (viewerLink && showReport) {
    return (
      <section style={{ fontFamily: FONT.sans }}>
        <div style={sx.header}>
          <Button variant="ghost" onClick={startAsReport ? onBack : () => setShowReport(false)}>
            {startAsReport ? `← ${backLabel}` : `← ${t.review.reviewBack}`}
          </Button>
          <span style={{ fontSize: 13, color: C.text }}>{t.review.published}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
          <Button variant="ghost" onClick={revoke}>{t.review.revoke}</Button>
          <Button onClick={() => window.print()}>{t.review.pdf}</Button>
        </div>
        <Card style={{ padding: 0, overflow: 'hidden', maxWidth: 720 }}>
          <div style={sx.reportHead}>
            <div>
              <div style={sx.reportKicker}>{t.review.kicker}</div>
              <div style={sx.reportTitle}>{review.template.route} · {firstContainer?.containerNo}</div>
            </div>
            <span style={sx.verified}>{t.review.verified}<br /><span style={{ fontSize: 9, fontWeight: 600 }}>{t.review.verifiedSub}</span></span>
          </div>
          <div style={{ padding: 18 }}>
            <div style={sx.tiles}>
              <Tile label={t.review.rateT} value={`${pct}%`} accent={C.positive} />
              <Tile label={t.review.photos} value={`${cap}/${req}`} />
              <Tile label={t.review.damageT} value={`${damageCount}`} accent={damageCount ? C.negative : undefined} />
              <Tile label={t.review.seal} value={firstContainer?.sealNo || '—'} />
            </div>
            {thumbList.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0' }}>
                {thumbList.slice(0, 6).map((u, i) => <img key={i} src={u} alt="" style={sx.reportThumb} />)}
              </div>
            )}
            <div style={sx.chainRow}>
              <span style={{ fontSize: 12, color: C.text }}>{t.review.publishedBy} · {review.customer?.name ?? ''}</span>
              <span style={{ fontSize: 12, color: C.teal, fontWeight: 600 }}>{t.review.locked}</span>
            </div>
          </div>
        </Card>
        <Card style={{ marginTop: 12, maxWidth: 720 }}>
          <div style={{ fontSize: 12, color: C.text, marginBottom: 6 }}>{t.review.shareViewer}</div>
          <ShareLinkBar url={viewerLink} title={t.review.published} testId="viewer-link" />
        </Card>
      </section>
    );
  }

  // ---- Review screen ----
  return (
    <section style={{ fontFamily: FONT.sans }}>
      <div style={sx.header}>
        <Button variant="ghost" onClick={onBack}>← {backLabel}</Button>
        <span style={{ fontSize: 13, color: C.text }}>{review.customer?.name} · {review.template.route}</span>
      </div>

      <div className="cn-review" style={sx.split}>
        <div>
          {review.containers.map(({ container, photos }) => (
            <div key={container.id} style={{ marginBottom: 18 }}>
              <div style={sx.plateRow}>
                <div style={sx.plate}>{container.containerNo}</div>
                <Button onClick={() => runAi(container.id, container.containerNo, photos)}
                  disabled={ai[container.id] === 'loading'} style={{ padding: '9px 16px', fontSize: 13.5 }}>
                  {ai[container.id] === 'loading' ? t.review.aiRunning : t.review.aiRun}
                </Button>
              </div>
              <AiReviewCard result={ai[container.id]} t={t} />
              <div style={sx.grid}>
                {slots.map((slot, i) => {
                  const photo = photos.find((p) => p.slotKey === slot.key);
                  const url = photo?.thumbPath ? urls[photo.thumbPath] : undefined;
                  const large = (photo?.displayPath && urls[photo.displayPath]) || url;
                  const done = !!photo;
                  return (
                    <div key={slot.key} style={sx.pcard}>
                      <div style={{ position: 'relative' }}>
                        {url
                          ? <img src={url} alt={slot.label} style={{ ...sx.pthumb, cursor: 'zoom-in' }} onClick={() => large && setLightbox(large)} />
                          : <div style={{ ...sx.pthumb, ...sx.pmiss }}>{t.review.notCaptured}</div>}
                        <span style={sx.pnum}>{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <div style={sx.plabel}>{slot.label}</div>
                      <Badge tone={done ? 'positive' : 'negative'}>{done ? t.review.captured2 : t.review.missing2}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {damagePhotos.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ ...sx.plate, color: C.negative }}>{t.review.damageSec(damageCount)}</div>
              <div style={sx.grid}>
                {damagePhotos.map((p, i) => {
                  const url = p.thumbPath ? urls[p.thumbPath] : undefined;
                  const large = (p.displayPath && urls[p.displayPath]) || url;
                  return (
                    <div key={i} style={sx.pcard}>
                      {url
                        ? <img src={url} alt={t.review.damageT} style={{ ...sx.pthumb, cursor: 'zoom-in' }} onClick={() => large && setLightbox(large)} />
                        : <div style={{ ...sx.pthumb, ...sx.pmiss }}>{t.review.image}</div>}
                      <div style={{ marginTop: 6 }}><Badge tone="negative">{t.review.damageT}</Badge></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <Card style={{ alignSelf: 'flex-start' }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 12 }}>{t.review.summary}</div>
          <div style={sx.bigPct}>{pct}<span style={{ fontSize: 18 }}>%</span> <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{t.review.rate}</span></div>
          <div style={sx.pctTrack}><div style={{ ...sx.pctFill, width: `${pct}%` }} /></div>
          <SumRow label={t.review.captured} value={`${cap}${t.review.unit}`} dot={C.positive} />
          <SumRow label={t.review.missing} value={`${missing}${t.review.unit}`} dot={missing ? C.negative : C.muted} />
          <SumRow label={t.review.damage} value={`${damageCount}${t.review.unit}`} dot={damageCount ? C.negative : C.muted} />
          {publishedToken ? (
            <>
              <Button onClick={() => setShowReport(true)} style={{ width: '100%', marginTop: 14 }}>
                {t.review.viewReport}
              </Button>
              <Button variant="ghost" onClick={revoke} style={{ width: '100%', marginTop: 8 }}>
                {t.review.revoke}
              </Button>
            </>
          ) : (
            <Button onClick={publish} disabled={publishing} style={{ width: '100%', marginTop: 14 }}>
              {publishing ? t.review.publishing : t.review.publish}
            </Button>
          )}
        </Card>
      </div>

      {lightbox && (
        <div style={sx.lbOverlay} role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt={t.review.zoomAlt} style={sx.lbImg} onClick={(e) => e.stopPropagation()} />
          <button type="button" onClick={() => setLightbox(null)} style={sx.lbClose} aria-label={t.common.close}>✕</button>
        </div>
      )}
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
const ISSUE_KEY: Record<Exclude<AiIssue, null>, 'aiBlur' | 'aiIllegible' | 'aiSubject'> = { blur: 'aiBlur', illegible: 'aiIllegible', mismatch: 'aiSubject' };

function AiReviewCard({ result, t }: { result: AiReview | 'loading' | 'error' | undefined; t: ReturnType<typeof useT> }) {
  if (!result || result === 'loading') return null;
  if (result === 'error') return <div style={sx.aiErr}>{t.review.aiFail}</div>;
  const r = result;
  const numTone = r.containerMatch === false ? C.negative : r.containerNo ? (r.iso6346Valid ? C.positive : C.caution) : C.caution;
  const reshoots = r.photos.filter((p) => p.reshoot);
  return (
    <div style={sx.aiCard}>
      <div style={sx.aiHead}><span>✨</span>{t.review.aiTitle}</div>
      <div style={sx.aiTiles}>
        <div style={sx.aiTile}>
          <div style={sx.aiTileLabel}>{t.review.aiNumber}</div>
          <div style={{ ...sx.aiTileValue, color: numTone }}>
            {r.containerNo ?? t.review.aiUnread}
            {r.containerMatch === true ? ` · ${t.review.aiMatch}` : r.containerMatch === false ? ` · ${t.review.aiMismatch}` : ''}
          </div>
          <div style={sx.aiTileSub}>{t.review.aiSeal} {r.sealNo ?? '—'}</div>
        </div>
        <div style={sx.aiTile}>
          <div style={sx.aiTileLabel}>{t.review.aiDamage}</div>
          <div style={{ ...sx.aiTileValue, color: r.damage.detected ? C.negative : C.positive }}>
            {r.damage.detected ? (r.damage.summary || `${r.damage.items.length}`) : t.review.aiNoDamage}
          </div>
        </div>
        <div style={sx.aiTile}>
          <div style={sx.aiTileLabel}>{t.review.aiQualityOk}</div>
          <div style={{ ...sx.aiTileValue, color: reshoots.length ? C.caution : C.positive }}>{r.okCount}/{r.total}</div>
        </div>
      </div>
      {reshoots.length > 0 && (
        <div style={sx.aiReshoot}>
          <span style={{ color: C.caution, fontWeight: 700, fontSize: 13 }}>{t.review.aiReshoot} {reshoots.length}{t.review.aiUnit}</span>
          <div style={sx.aiChips}>
            {reshoots.map((p, i) => <span key={i} style={sx.aiChip}>{p.label}{p.issue ? ` · ${t.review[ISSUE_KEY[p.issue]]}` : ''}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

const sx = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } as const,
  split: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 20, alignItems: 'start' } as const,
  plate: { fontFamily: FONT.sans, fontWeight: 800, fontSize: 17, letterSpacing: '.06em', color: C.navy } as const,
  plateRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 } as const,
  aiErr: { fontFamily: FONT.sans, fontSize: 13, color: C.negative, margin: '-2px 0 12px' } as const,
  aiCard: { background: C.tealTint, border: `1px solid ${C.tealBright}`, borderRadius: 12, padding: 14, margin: '-2px 0 14px' } as const,
  aiHead: { display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONT.sans, fontWeight: 800, fontSize: 14, color: C.tealHeavy, marginBottom: 10 } as const,
  aiTiles: { display: 'flex', gap: 8, flexWrap: 'wrap' as const } as const,
  aiTile: { flex: '1 1 140px', minWidth: 130, background: C.white, borderRadius: 10, padding: '10px 12px' } as const,
  aiTileLabel: { fontSize: 11, color: C.muted, fontWeight: 600 } as const,
  aiTileValue: { fontSize: 15, fontWeight: 800, marginTop: 3, lineHeight: 1.3 } as const,
  aiTileSub: { fontSize: 12, color: C.text, marginTop: 4 } as const,
  aiReshoot: { marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.tealBright}` } as const,
  aiChips: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginTop: 7 } as const,
  aiChip: { fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: C.caution, background: C.cautionTint, borderRadius: 999, padding: '4px 11px' } as const,
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
  lbOverlay: { position: 'fixed' as const, inset: 0, background: 'rgba(15,27,38,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 60, cursor: 'zoom-out' } as const,
  lbImg: { maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain' as const, borderRadius: 8, cursor: 'default' } as const,
  lbClose: { position: 'fixed' as const, top: 16, right: 20, width: 40, height: 40, borderRadius: 999, border: 0, background: 'rgba(255,255,255,.15)', color: C.white, fontSize: 18, cursor: 'pointer' } as const,
};
