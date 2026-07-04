import { buildViewerManifest } from '../../src/domain/viewer';
import type { WorkOrderReview } from '../../src/domain/review';
import type { Photo, WorkTypeTemplate } from '../../src/domain/types';

function ph(slotKey: string, thumbPath: string, displayPath: string): Photo {
  return { id: slotKey, containerId: 'k1', slotKey, originalPath: null, displayPath, thumbPath, fileHash: 'h', byteSize: 1, capturedAt: '2026-07-02T00:00:00Z', gpsLat: null, gpsLng: null, status: 'uploaded' };
}
const template = {
  id: 't', name: 'T', carrier: '중국세관', route: 'TCR', anchorType: 'container_no', minCount: 8, warningText: null, rules: {},
  requiredPhotos: [{ key: 'seal', label: '씰 근접', instruction: '', required: true }],
} as WorkTypeTemplate;

const review: WorkOrderReview = {
  order: { id: 'wo1', customerId: 'c1', templateId: 't', workDate: null, status: 'submitted', assigneeName: null, assigneeContact: null, assigneeEmail: null, shipperLabel: null },
  template,
  customer: { id: 'c1', name: '칭다오 파트너', contactName: null, phone: null, email: null, contact: null, notes: null },
  containers: [{ container: { id: 'k1', workOrderId: 'wo1', containerNo: 'ABCD1234567', sealNo: null, workerMemo: null }, photos: [ph('seal', 'seal-t.webp', 'seal-d.webp')] }],
};

test('builds a viewer manifest with route, customer, labels, and signed urls', () => {
  const urls = { 'seal-t.webp': 'https://s/seal-t', 'seal-d.webp': 'https://s/seal-d' };
  const m = buildViewerManifest(review, urls);
  expect(m.route).toBe('TCR');
  expect(m.customer).toBe('칭다오 파트너');
  expect(m.containers).toHaveLength(1);
  expect(m.containers[0].containerNo).toBe('ABCD1234567');
  expect(m.containers[0].photos[0]).toEqual({ slotKey: 'seal', label: '씰 근접', thumbUrl: 'https://s/seal-t', displayUrl: 'https://s/seal-d', hash: 'h', capturedAt: '2026-07-02T00:00:00Z' });
});

test('falls back to slotKey as label and empty string for missing urls', () => {
  const review2: WorkOrderReview = { ...review, template: { ...template, requiredPhotos: [] }, containers: [{ container: review.containers[0].container, photos: [ph('csc', 'csc-t.webp', 'csc-d.webp')] }] };
  const m = buildViewerManifest(review2, {});
  expect(m.containers[0].photos[0].label).toBe('csc');
  expect(m.containers[0].photos[0].thumbUrl).toBe('');
});
