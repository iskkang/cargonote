export interface CaptureItem {
  id: string;            // hash 사용(= 멱등 키)
  hash: string;
  slotKey: string | null;
  containerId?: string | null;
  workOrderId?: string | null;
  blob: Blob;            // display 변형본 저장(원본은 Plan B에서)
  capturedAt: number;    // epoch ms
  gps: { lat: number; lng: number } | null;
  status: 'pending' | 'uploaded';
}
