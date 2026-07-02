import type { WorkOrderStatus } from '../domain/types';

const LABELS: Record<WorkOrderStatus, string> = {
  draft: '작성 중', sent: '전송됨', in_progress: '진행 중', submitted: '제출됨', published: '발행됨',
};
const COLORS: Record<WorkOrderStatus, string> = {
  draft: '#5A6B7D', sent: '#16334B', in_progress: '#E0A100', submitted: '#E0A100', published: '#15A34A',
};
export function statusLabel(s: WorkOrderStatus): string { return LABELS[s]; }
export function statusColor(s: WorkOrderStatus): string { return COLORS[s]; }
