import type { Container, Customer, WorkOrder, WorkTypeTemplate } from '../domain/types';
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
  getByWorkerToken(token: string): Promise<{ order: WorkOrder; template: WorkTypeTemplate; containers: Container[] } | null>;
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
  const containers: Container[] = [
    { id: 'ctn-1', workOrderId: 'wo-2', containerNo: 'FBLU4204812', sealNo: null, workerMemo: null },
  ];
  const tokens = new Map<string, string>([['demotoken123', 'wo-2']]);
  let seq = orders.length;
  return {
    async listCustomers() { return [...customers]; },
    async listTemplates() { return [...templates]; },
    async listWorkOrders() { return [...orders]; },
    async getByWorkerToken(token) {
      const orderId = tokens.get(token);
      const order = orders.find((o) => o.id === orderId);
      if (!order) return null;
      const template = templates.find((t) => t.id === order.templateId)!;
      return { order, template, containers: containers.filter((c) => c.workOrderId === order.id) };
    },
    async createWorkOrder(input) {
      const order: WorkOrder = {
        id: `wo-${++seq}`, customerId: input.customerId, templateId: input.templateId,
        workDate: input.workDate, status: 'sent', assigneeName: input.assigneeName,
        assigneeContact: input.assigneeContact, shipperLabel: null,
      };
      orders.push(order);
      input.containerNos.forEach((no, i) =>
        containers.push({ id: `ctn-${order.id}-${i}`, workOrderId: order.id, containerNo: no, sealNo: null, workerMemo: null }));
      const workerToken = randomToken();
      tokens.set(workerToken, order.id);
      return { order, workerToken };
    },
  };
}
