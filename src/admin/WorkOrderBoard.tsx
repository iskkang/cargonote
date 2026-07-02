import { useEffect, useState } from 'react';
import type { AdminRepo } from './repo';
import type { Customer, WorkOrder, WorkTypeTemplate } from '../domain/types';
import { statusLabel, statusColor } from './status';

export function WorkOrderBoard({ repo }: { repo: AdminRepo }) {
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

  return (
    <div>
      {orders.map((o) => (
        <div key={o.id} data-testid="wo-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: '0.5px solid rgba(90,107,125,0.25)' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#5A6B7D', minWidth: 56 }}>{tplRoute(o.templateId)}</span>
          <span style={{ flex: 1, fontWeight: 500, color: '#0F1B26' }}>{custName(o.customerId)}</span>
          <span style={{ fontSize: 12, color: '#5A6B7D' }}>{o.assigneeName}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: statusColor(o.status), borderRadius: 999, padding: '3px 10px' }}>{statusLabel(o.status)}</span>
        </div>
      ))}
    </div>
  );
}
