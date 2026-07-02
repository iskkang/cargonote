import type { Customer, WorkOrder, WorkTypeTemplate } from '../domain/types';
import { randomToken } from './token';

export interface NewWorkOrder {
  customerId: string; templateId: string; containerNos: string[];
  workDate: string | null; assigneeName: string; assigneeContact: string;
}
export interface AdminRepo {
  listCustomers(): Promise<Customer[]>;
  listTemplates(): Promise<WorkTypeTemplate[]>;
  listWorkOrders(): Promise<WorkOrder[]>;
  createWorkOrder(input: NewWorkOrder): Promise<{ order: WorkOrder; workerToken: string }>;
}

function tpl(id: string, route: string, carrier: string, minCount: number): WorkTypeTemplate {
  return { id, name: `컨테이너 적입 — ${route}`, carrier, route, anchorType: 'container_no', minCount, warningText: null, rules: {}, requiredPhotos: [] };
}

export function createInMemoryAdminRepo(): AdminRepo {
  const customers: Customer[] = [
    { id: 'cust-mtl', name: 'MTL 지사(블라디보스토크)', contact: 'vlad@example.com', notes: null },
    { id: 'cust-cn', name: '칭다오 파트너', contact: 'qd@example.com', notes: null },
  ];
  const templates: WorkTypeTemplate[] = [
    tpl('tpl-tsr', 'TSR', 'FESCO', 8),
    tpl('tpl-tcr', 'TCR', '중국세관', 8),
  ];
  const orders: WorkOrder[] = [
    { id: 'wo-1', customerId: 'cust-mtl', templateId: 'tpl-tsr', workDate: '2026-07-01', status: 'submitted', assigneeName: '김작업', assigneeContact: '010-1111', shipperLabel: null },
    { id: 'wo-2', customerId: 'cust-cn', templateId: 'tpl-tcr', workDate: '2026-07-02', status: 'sent', assigneeName: '이현장', assigneeContact: '010-2222', shipperLabel: null },
  ];
  let seq = orders.length;
  return {
    async listCustomers() { return [...customers]; },
    async listTemplates() { return [...templates]; },
    async listWorkOrders() { return [...orders]; },
    async createWorkOrder(input) {
      const order: WorkOrder = {
        id: `wo-${++seq}`, customerId: input.customerId, templateId: input.templateId,
        workDate: input.workDate, status: 'sent', assigneeName: input.assigneeName,
        assigneeContact: input.assigneeContact, shipperLabel: null,
      };
      orders.push(order);
      return { order, workerToken: randomToken() };
    },
  };
}
