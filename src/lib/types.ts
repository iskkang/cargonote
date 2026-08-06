export interface CaptureItem {
  id: string;            // hash を使う(= 冪等キー)
  hash: string;
  slotKey: string | null;
  containerId?: string | null;
  workOrderId?: string | null;
  blob: Blob;            // display 変換後を保存(原本は Plan B で)
  capturedAt: number;    // epoch ms
  gps: { lat: number; lng: number } | null;
  status: 'pending' | 'uploaded';
}
