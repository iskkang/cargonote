export type WorkOrderStatus = 'draft' | 'sent' | 'in_progress' | 'submitted' | 'published';

export interface RequiredPhotoSlot {
  key: string;
  label: string;
  instruction: string;
  required: boolean;
}

export interface TemplateRules {
  container_no_visible?: boolean;
  csc_exempt?: boolean;
  seal_type?: string;
  seal_position?: string;
}

export interface WorkTypeTemplate {
  id: string;
  name: string;
  carrier: string | null;
  route: string | null;
  anchorType: string;
  minCount: number;
  warningText: string | null;
  rules: TemplateRules;
  requiredPhotos: RequiredPhotoSlot[];
}

export interface Customer { id: string; name: string; contact: string | null; notes: string | null; }
export interface WorkOrder {
  id: string; customerId: string; templateId: string; workDate: string | null;
  status: WorkOrderStatus; assigneeName: string | null; assigneeContact: string | null; shipperLabel: string | null;
}
export interface Container { id: string; workOrderId: string; containerNo: string; sealNo: string | null; workerMemo: string | null; }
export interface Photo {
  id: string; containerId: string; slotKey: string | null;
  originalPath: string | null; displayPath: string | null; thumbPath: string | null;
  fileHash: string; byteSize: number | null; capturedAt: string | null; gpsLat: number | null; gpsLng: number | null;
  status: 'uploaded' | 'soft_deleted';
}
export interface ShareLink { id: string; workOrderId: string; token: string; kind: 'worker' | 'viewer'; revoked: boolean; }
