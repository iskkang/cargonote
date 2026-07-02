import { rowToContainer, rowToCustomer, rowToPhoto, rowToWorkOrder } from '../../src/admin/supabaseMappers';

test('rowToWorkOrder maps snake_case columns to camelCase domain', () => {
  const wo = rowToWorkOrder({
    id: 'wo1', customer_id: 'c1', template_id: 't1', work_date: '2026-07-02',
    status: 'sent', assignee_name: '김', assignee_contact: '010', shipper_label: null,
  });
  expect(wo).toEqual({
    id: 'wo1', customerId: 'c1', templateId: 't1', workDate: '2026-07-02',
    status: 'sent', assigneeName: '김', assigneeContact: '010', shipperLabel: null,
  });
});

test('rowToContainer and rowToCustomer map nullable fields', () => {
  expect(rowToContainer({ id: 'k1', work_order_id: 'wo1', container_no: 'ABCD1234567', seal_no: null, worker_memo: null }))
    .toEqual({ id: 'k1', workOrderId: 'wo1', containerNo: 'ABCD1234567', sealNo: null, workerMemo: null });
  expect(rowToCustomer({ id: 'c1', name: 'MTL', contact: null, notes: null }))
    .toEqual({ id: 'c1', name: 'MTL', contact: null, notes: null });
});

test('rowToPhoto maps paths, hash, byte size, status', () => {
  const p = rowToPhoto({
    id: 'p1', container_id: 'k1', slot_key: 'seal', original_path: null,
    display_path: 'containers/k1/seal-h.webp', thumb_path: 'containers/k1/seal-h-thumb.webp',
    file_hash: 'h', byte_size: 1234, captured_at: '2026-07-02T00:00:00Z',
    gps_lat: null, gps_lng: null, status: 'uploaded',
  });
  expect(p.containerId).toBe('k1');
  expect(p.slotKey).toBe('seal');
  expect(p.displayPath).toBe('containers/k1/seal-h.webp');
  expect(p.thumbPath).toBe('containers/k1/seal-h-thumb.webp');
  expect(p.byteSize).toBe(1234);
  expect(p.status).toBe('uploaded');
});
