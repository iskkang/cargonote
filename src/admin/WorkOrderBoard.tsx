import { useEffect, useState } from 'react';
import type { AdminRepo } from './repo';
import type { Customer, WorkOrder, WorkTypeTemplate, WorkOrderStatus } from '../domain/types';
import { statusLabel } from './status';
import { Badge, EmptyState, Chip } from '../ui/kit';
import { C } from '../ui/tokens';

const TONE: Record<WorkOrderStatus, 'neutral' | 'caution' | 'positive'> = {
  draft: 'neutral', sent: 'caution', in_progress: 'caution', submitted: 'caution', published: 'positive',
};

export function WorkOrderBoard({ repo, onSelect }: { repo: AdminRepo; onSelect?: (id: string) => void }) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<WorkTypeTemplate[]>([]);
  useEffect(() => {
    repo.listWorkOrders().then(setOrders);
    repo.listCustomers().then(setCustomers);
    repo.listTemplates().then(setTemplates);
  }, [repo]);
  const custName = (id: string) => customers.find((c) => c.id === id)?.name ?? id;
  const tplRoute = (id: string) => templates.find((t) => t.id === id)?.route ?? id;

  if (orders.length === 0) {
    return <EmptyState title="아직 작업이 없습니다" hint="상단 '새 작업'으로 첫 작업 지시를 만드세요." />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {orders.map((o) => (
        <div key={o.id} data-testid="wo-row" onClick={() => onSelect?.(o.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, cursor: onSelect ? 'pointer' : 'default' }}>
          <Chip style={{ minWidth: 52, textAlign: 'center' }}>{tplRoute(o.templateId)}</Chip>
          <span style={{ flex: 1, fontWeight: 600, color: C.navy }}>{custName(o.customerId)}</span>
          <span style={{ fontSize: 13, color: C.text }}>{o.assigneeName}</span>
          <Badge tone={TONE[o.status]}>{statusLabel(o.status)}</Badge>
        </div>
      ))}
    </div>
  );
}
