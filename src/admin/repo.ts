import type { Container, Customer, Photo, WorkOrder, WorkTypeTemplate } from '../domain/types';
import { randomToken } from './token';
import type { WorkOrderReview } from '../domain/review';
import { latestPerSlot, DAMAGE_SLOT } from '../domain/review';
import type { ViewerManifest } from '../domain/viewer';

export interface NewWorkOrder {
  customerId: string; templateId: string; containerNos: string[];
  workDate: string | null; assigneeName: string; assigneeContact: string;
}
export interface NewPhoto {
  containerId: string; slotKey: string; displayPath: string; thumbPath: string;
  fileHash: string; byteSize: number; capturedAt: string;
}
export interface NewCustomer {
  name: string; contactName: string | null; phone: string | null; email: string | null;
}
export interface WorkOrderEdit {
  assigneeName: string; assigneeContact: string; workDate: string | null;
}
export interface WorkOrderSummary {
  order: WorkOrder; customerName: string; route: string | null;
  containerNo: string; requiredCount: number; capturedCount: number; damageCount: number;
}
export interface AdminRepo {
  listCustomers(): Promise<Customer[]>;
  createCustomer(input: NewCustomer): Promise<Customer>;
  updateCustomer(id: string, input: NewCustomer): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
  listTemplates(): Promise<WorkTypeTemplate[]>;
  listWorkOrders(): Promise<WorkOrder[]>;
  listWorkOrderSummaries(): Promise<WorkOrderSummary[]>;
  createWorkOrder(input: NewWorkOrder): Promise<{ order: WorkOrder; workerToken: string }>;
  updateWorkOrder(id: string, input: WorkOrderEdit): Promise<WorkOrder>;
  deleteWorkOrder(id: string): Promise<void>;
  getByWorkerToken(token: string): Promise<{ order: WorkOrder; template: WorkTypeTemplate; containers: Container[] } | null>;
  insertPhoto(p: NewPhoto): Promise<void>;
  listPhotos(containerId: string): Promise<Photo[]>;
  getWorkOrderReview(id: string): Promise<WorkOrderReview | null>;
  publish(id: string, manifest: ViewerManifest): Promise<{ viewerToken: string }>;
  getViewerManifest(token: string): Promise<ViewerManifest | null>;
}

function tpl(id: string, route: string, carrier: string, minCount: number): WorkTypeTemplate {
  return { id, name: `컨테이너 적입 — ${route}`, carrier, route, anchorType: 'container_no', minCount, warningText: null, rules: {}, requiredPhotos: [] };
}

export function createInMemoryAdminRepo(): AdminRepo {
  const customers: Customer[] = [
    { id: 'cust-mtl', name: 'MTL 지사(블라디보스토크)', contactName: null, phone: null, email: 'vlad@example.com', contact: 'vlad@example.com', notes: null },
    { id: 'cust-cn', name: '칭다오 파트너', contactName: null, phone: null, email: 'qd@example.com', contact: 'qd@example.com', notes: null },
  ];
  let cseq = 0;
  const templates: WorkTypeTemplate[] = [
    tpl('tpl-tsr', 'TSR', 'FESCO', 8),
    {
      ...tpl('tpl-tcr', 'TCR', '중국세관', 8),
      warningText: '반송 주의: TCR 반송 규정에 따라 문서 확인 필수',
      requiredPhotos: [
        { key: 'empty', label: '빈 컨테이너', instruction: '컨테이너 번호가 보이도록 촬영', required: true },
        { key: 'seal', label: '씰 번호', instruction: '씰 번호 판독 가능하게', required: true },
        { key: 'csc', label: 'CSC 판넬', instruction: 'CSC 예외 확인', required: true },
      ],
    },
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
  const photos: Photo[] = [];
  let pseq = 0;
  const viewerTokens = new Map<string, string>();
  const publications: { workOrderId: string; viewerToken: string; manifest: ViewerManifest }[] = [];
  return {
    async listCustomers() { return [...customers]; },
    async createCustomer(input) {
      const c: Customer = { id: `cust-new-${++cseq}`, name: input.name, contactName: input.contactName, phone: input.phone, email: input.email, contact: null, notes: null };
      customers.push(c);
      return c;
    },
    async updateCustomer(id, input) {
      const c = customers.find((x) => x.id === id);
      if (!c) throw new Error('customer not found');
      c.name = input.name; c.contactName = input.contactName; c.phone = input.phone; c.email = input.email;
      return c;
    },
    async deleteCustomer(id) {
      if (orders.some((o) => o.customerId === id)) throw new Error('customer has work orders');
      const i = customers.findIndex((x) => x.id === id);
      if (i >= 0) customers.splice(i, 1);
    },
    async listTemplates() { return [...templates]; },
    async listWorkOrders() { return [...orders]; },
    async listWorkOrderSummaries() {
      return orders.map((o) => {
        const tpl = templates.find((t) => t.id === o.templateId);
        const reqKeys = new Set(tpl ? tpl.requiredPhotos.filter((s) => s.required).map((s) => s.key) : []);
        const required = reqKeys.size || (tpl?.minCount ?? 0);
        const cs = containers.filter((c) => c.workOrderId === o.id);
        const cids = new Set(cs.map((c) => c.id));
        const mine = photos.filter((p) => cids.has(p.containerId) && p.status === 'uploaded' && p.slotKey);
        const captured = new Set(mine.filter((p) => reqKeys.has(p.slotKey as string)).map((p) => p.slotKey));
        const damageCount = mine.filter((p) => p.slotKey === DAMAGE_SLOT).length;
        const containerNo = cs.length ? cs[0].containerNo + (cs.length > 1 ? ` 외 ${cs.length - 1}` : '') : '—';
        return { order: o, customerName: customers.find((c) => c.id === o.customerId)?.name ?? o.customerId, route: tpl?.route ?? null, containerNo, requiredCount: required, capturedCount: captured.size, damageCount };
      });
    },
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
    async updateWorkOrder(id, input) {
      const order = orders.find((o) => o.id === id);
      if (!order) throw new Error('work order not found');
      order.assigneeName = input.assigneeName;
      order.assigneeContact = input.assigneeContact;
      order.workDate = input.workDate;
      return order;
    },
    async deleteWorkOrder(id) {
      const oi = orders.findIndex((o) => o.id === id);
      if (oi >= 0) orders.splice(oi, 1);
      const containerIds = containers.filter((c) => c.workOrderId === id).map((c) => c.id);
      for (let i = containers.length - 1; i >= 0; i--) if (containers[i].workOrderId === id) containers.splice(i, 1);
      for (let i = photos.length - 1; i >= 0; i--) if (containerIds.includes(photos[i].containerId)) photos.splice(i, 1);
      for (const [tok, woId] of [...tokens]) if (woId === id) tokens.delete(tok);
    },
    async insertPhoto(p) {
      photos.push({
        id: `photo-${++pseq}`, containerId: p.containerId, slotKey: p.slotKey,
        originalPath: null, displayPath: p.displayPath, thumbPath: p.thumbPath,
        fileHash: p.fileHash, byteSize: p.byteSize, capturedAt: p.capturedAt,
        gpsLat: null, gpsLng: null, status: 'uploaded',
      });
    },
    async listPhotos(containerId) {
      return photos.filter((p) => p.containerId === containerId);
    },
    async getWorkOrderReview(id) {
      const order = orders.find((o) => o.id === id);
      if (!order) return null;
      const template = templates.find((t) => t.id === order.templateId)!;
      const customer = customers.find((c) => c.id === order.customerId) ?? null;
      const cs = containers.filter((c) => c.workOrderId === id).map((container) => ({
        container,
        photos: latestPerSlot(photos.filter((p) => p.containerId === container.id)),
      }));
      return { order, template, customer, containers: cs };
    },
    async publish(id, manifest) {
      const order = orders.find((o) => o.id === id);
      if (!order) throw new Error('work order not found');
      order.status = 'published';
      const viewerToken = viewerTokens.get(id) ?? randomToken();
      viewerTokens.set(id, viewerToken);
      publications.push({ workOrderId: id, viewerToken, manifest });
      return { viewerToken };
    },
    async getViewerManifest(token) {
      const pub = [...publications].reverse().find((p) => p.viewerToken === token);
      return pub ? pub.manifest : null;
    },
  };
}
