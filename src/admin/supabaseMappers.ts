import type { Container, Customer, Photo, WorkOrder, WorkOrderStatus } from '../domain/types';

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' ? v : null);

export function rowToCustomer(r: Row): Customer {
  return { id: str(r.id), name: str(r.name), contact: strOrNull(r.contact), notes: strOrNull(r.notes) };
}

export function rowToWorkOrder(r: Row): WorkOrder {
  return {
    id: str(r.id), customerId: str(r.customer_id), templateId: str(r.template_id),
    workDate: strOrNull(r.work_date), status: str(r.status) as WorkOrderStatus,
    assigneeName: strOrNull(r.assignee_name), assigneeContact: strOrNull(r.assignee_contact),
    shipperLabel: strOrNull(r.shipper_label),
  };
}

export function rowToContainer(r: Row): Container {
  return {
    id: str(r.id), workOrderId: str(r.work_order_id), containerNo: str(r.container_no),
    sealNo: strOrNull(r.seal_no), workerMemo: strOrNull(r.worker_memo),
  };
}

export function rowToPhoto(r: Row): Photo {
  return {
    id: str(r.id), containerId: str(r.container_id), slotKey: strOrNull(r.slot_key),
    originalPath: strOrNull(r.original_path), displayPath: strOrNull(r.display_path), thumbPath: strOrNull(r.thumb_path),
    fileHash: str(r.file_hash), byteSize: numOrNull(r.byte_size), capturedAt: strOrNull(r.captured_at),
    gpsLat: numOrNull(r.gps_lat), gpsLng: numOrNull(r.gps_lng),
    status: r.status === 'soft_deleted' ? 'soft_deleted' : 'uploaded',
  };
}
