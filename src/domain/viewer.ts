import type { WorkOrderReview } from './review';

export interface ViewerPhoto { slotKey: string | null; label: string; thumbUrl: string; displayUrl: string; hash?: string | null; capturedAt?: string | null }
export interface ViewerContainer { containerNo: string; photos: ViewerPhoto[] }
export interface ViewerManifest { route: string | null; customer: string | null; date: string | null; containers: ViewerContainer[] }

export function buildViewerManifest(review: WorkOrderReview, urls: Record<string, string>): ViewerManifest {
  return {
    route: review.template.route,
    customer: review.customer?.name ?? null,
    date: review.order.workDate ?? null,
    containers: review.containers.map((c) => ({
      containerNo: c.container.containerNo,
      photos: c.photos.map((p) => ({
        slotKey: p.slotKey,
        label: review.template.requiredPhotos.find((s) => s.key === p.slotKey)?.label ?? (p.slotKey ?? ''),
        thumbUrl: (p.thumbPath && urls[p.thumbPath]) || '',
        displayUrl: (p.displayPath && urls[p.displayPath]) || '',
        hash: p.fileHash ?? null,
        capturedAt: p.capturedAt ?? null,
      })),
    })),
  };
}
