import type { WorkOrderStatus } from '../domain/types';

const LABELS: Record<WorkOrderStatus, string> = {
  draft: '作成中', sent: '送信済み', in_progress: '進行中', submitted: '提出済み', published: '発行済み',
};
const COLORS: Record<WorkOrderStatus, string> = {
  draft: '#5A6B7D', sent: '#16334B', in_progress: '#E0A100', submitted: '#E0A100', published: '#15A34A',
};
export function statusLabel(s: WorkOrderStatus): string { return LABELS[s]; }
export function statusColor(s: WorkOrderStatus): string { return COLORS[s]; }
