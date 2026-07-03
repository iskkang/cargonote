import type { AdminRepo, NewPhoto, NewWorkOrder } from './repo';
import type { DbPort } from './db';
import { parseTemplate, type RawTemplateRow } from '../domain/template';
import { rowToContainer, rowToCustomer, rowToPhoto, rowToWorkOrder } from './supabaseMappers';
import { randomToken } from './token';
import type { WorkOrderReview } from '../domain/review';
import { latestPerSlot } from '../domain/review';
import type { ViewerManifest } from '../domain/viewer';

export function createSupabaseAdminRepo(db: DbPort): AdminRepo {
  return {
    async listCustomers() {
      return (await db.select('customers')).map(rowToCustomer);
    },
    async createCustomer(input) {
      const [row] = await db.insert('customers', {
        name: input.name, contact_name: input.contactName, phone: input.phone, email: input.email,
      });
      if (!row) throw new Error('customer insert returned no row (check RLS)');
      return rowToCustomer(row);
    },
    async updateCustomer(id, input) {
      const [row] = await db.update('customers', { col: 'id', val: id }, {
        name: input.name, contact_name: input.contactName, phone: input.phone, email: input.email,
      });
      if (!row) throw new Error('customer update returned no row');
      return rowToCustomer(row);
    },
    async deleteCustomer(id) {
      await db.delete('customers', { col: 'id', val: id });
    },
    async listTemplates() {
      return (await db.select('work_type_templates')).map((r) => parseTemplate(r as unknown as RawTemplateRow));
    },
    async listWorkOrders() {
      return (await db.select('work_orders')).map(rowToWorkOrder);
    },
    async listWorkOrderSummaries() {
      const orders = (await db.select('work_orders')).map(rowToWorkOrder);
      const customers = (await db.select('customers')).map(rowToCustomer);
      const templates = (await db.select('work_type_templates')).map((r) => parseTemplate(r as unknown as RawTemplateRow));
      const out = [];
      for (const o of orders) {
        const tpl = templates.find((t) => t.id === o.templateId);
        const required = tpl ? (tpl.requiredPhotos.filter((s) => s.required).length || tpl.minCount) : 0;
        const containerRows = await db.select('containers', { col: 'work_order_id', val: o.id });
        const conts = containerRows.map(rowToContainer);
        const slots = new Set<string>();
        for (const c of conts) {
          const ps = (await db.select('photos', { col: 'container_id', val: c.id })).map(rowToPhoto);
          ps.forEach((p) => { if (p.slotKey && p.status === 'uploaded') slots.add(p.slotKey); });
        }
        const containerNo = conts.length ? conts[0].containerNo + (conts.length > 1 ? ` 외 ${conts.length - 1}` : '') : '—';
        out.push({ order: o, customerName: customers.find((c) => c.id === o.customerId)?.name ?? o.customerId, route: tpl?.route ?? null, containerNo, requiredCount: required, capturedCount: slots.size });
      }
      return out;
    },
    async createWorkOrder(input: NewWorkOrder) {
      const [orderRow] = await db.insert('work_orders', {
        customer_id: input.customerId, template_id: input.templateId, work_date: input.workDate,
        status: 'sent', assignee_name: input.assigneeName, assignee_contact: input.assigneeContact,
      });
      if (!orderRow) throw new Error('work_order insert returned no row (check RLS select policy)');
      const order = rowToWorkOrder(orderRow);
      if (input.containerNos.length) {
        await db.insert('containers', input.containerNos.map((no) => ({ work_order_id: order.id, container_no: no })));
      }
      const workerToken = randomToken();
      await db.insert('share_links', { work_order_id: order.id, token: workerToken, kind: 'worker' });
      return { order, workerToken };
    },
    async updateWorkOrder(id: string, input) {
      const [row] = await db.update('work_orders', { col: 'id', val: id }, {
        assignee_name: input.assigneeName, assignee_contact: input.assigneeContact, work_date: input.workDate,
      });
      if (!row) throw new Error('work_order update returned no row');
      return rowToWorkOrder(row);
    },
    async deleteWorkOrder(id: string) {
      await db.delete('work_orders', { col: 'id', val: id });
    },
    async getByWorkerToken(token: string) {
      const links = await db.select('share_links', { col: 'token', val: token });
      const link = links.find((l) => l.kind === 'worker' && l.revoked !== true);
      if (!link) return null;
      const [orderRow] = await db.select('work_orders', { col: 'id', val: String(link.work_order_id) });
      if (!orderRow) return null;
      const order = rowToWorkOrder(orderRow);
      const [tplRow] = await db.select('work_type_templates', { col: 'id', val: order.templateId });
      if (!tplRow) return null;
      const template = parseTemplate(tplRow as unknown as RawTemplateRow);
      const containers = (await db.select('containers', { col: 'work_order_id', val: order.id })).map(rowToContainer);
      return { order, template, containers };
    },
    async insertPhoto(p: NewPhoto) {
      await db.insert('photos', {
        container_id: p.containerId, slot_key: p.slotKey, display_path: p.displayPath, thumb_path: p.thumbPath,
        file_hash: p.fileHash, byte_size: p.byteSize, captured_at: p.capturedAt, status: 'uploaded',
      });
    },
    async listPhotos(containerId: string) {
      return (await db.select('photos', { col: 'container_id', val: containerId })).map(rowToPhoto);
    },
    async getWorkOrderReview(id: string) {
      const [orderRow] = await db.select('work_orders', { col: 'id', val: id });
      if (!orderRow) return null;
      const order = rowToWorkOrder(orderRow);
      const [tplRow] = await db.select('work_type_templates', { col: 'id', val: order.templateId });
      const template = parseTemplate(tplRow as unknown as RawTemplateRow);
      const [custRow] = await db.select('customers', { col: 'id', val: order.customerId });
      const customer = custRow ? rowToCustomer(custRow) : null;
      const containerRows = await db.select('containers', { col: 'work_order_id', val: order.id });
      const containers = [];
      for (const cRow of containerRows) {
        const container = rowToContainer(cRow);
        const photos = latestPerSlot((await db.select('photos', { col: 'container_id', val: container.id })).map(rowToPhoto));
        containers.push({ container, photos });
      }
      return { order, template, customer, containers } as WorkOrderReview;
    },
    async publish(id: string, manifest: ViewerManifest) {
      const links = await db.select('share_links', { col: 'work_order_id', val: id });
      const existing = links.find((l) => l.kind === 'viewer');
      let viewerToken: string;
      if (existing) {
        viewerToken = String(existing.token);
      } else {
        viewerToken = randomToken();
        await db.insert('share_links', { work_order_id: id, token: viewerToken, kind: 'viewer' });
      }
      await db.insert('publications', { work_order_id: id, viewer_token: viewerToken, photo_manifest: manifest });
      await db.update('work_orders', { col: 'id', val: id }, { status: 'published' });
      return { viewerToken };
    },
    async getViewerManifest(token: string) {
      const links = await db.select('share_links', { col: 'token', val: token });
      const link = links.find((l) => l.kind === 'viewer' && l.revoked !== true);
      if (!link) return null;
      const pubs = await db.select('publications', { col: 'work_order_id', val: String(link.work_order_id) });
      if (!pubs.length) return null;
      const latest = pubs.slice().sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))[0];
      return (latest.photo_manifest ?? null) as ViewerManifest | null;
    },
  };
}
