import type { AdminRepo, NewPhoto, NewWorkOrder } from './repo';
import type { DbPort } from './db';
import { parseTemplate, type RawTemplateRow } from '../domain/template';
import { rowToContainer, rowToCustomer, rowToPhoto, rowToWorkOrder } from './supabaseMappers';
import { randomToken } from './token';
import type { WorkOrderReview } from '../domain/review';
import { latestPerSlot, DAMAGE_SLOT } from '../domain/review';
import type { ViewerManifest } from '../domain/viewer';
import { supabase } from '../lib/supabase';

export function createSupabaseAdminRepo(db: DbPort): AdminRepo {
  async function audit(entityId: string, action: string, detail?: Record<string, unknown>) {
    try {
      const { data } = await supabase.auth.getUser();
      await db.insert('audit_logs', { entity_type: 'work_order', entity_id: entityId, action, actor: data?.user?.email ?? null, detail: detail ?? null });
    } catch { /* best-effort — an audit failure must never block the action */ }
  }
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
      // Bulk-fetch everything in parallel (5 queries total) instead of N+1 per order/container.
      const [orderRows, custRows, tplRows, contRows, photoRows] = await Promise.all([
        db.select('work_orders'), db.select('customers'), db.select('work_type_templates'),
        db.select('containers'), db.select('photos'),
      ]);
      const orders = orderRows.map(rowToWorkOrder);
      const customers = custRows.map(rowToCustomer);
      const templates = tplRows.map((r) => parseTemplate(r as unknown as RawTemplateRow));
      const containers = contRows.map(rowToContainer);
      const photos = photoRows.map(rowToPhoto);
      return orders.map((o) => {
        const tpl = templates.find((t) => t.id === o.templateId);
        const reqKeys = new Set(tpl ? tpl.requiredPhotos.filter((s) => s.required).map((s) => s.key) : []);
        const required = reqKeys.size || (tpl?.minCount ?? 0);
        const conts = containers.filter((c) => c.workOrderId === o.id);
        const cids = new Set(conts.map((c) => c.id));
        const mine = photos.filter((p) => cids.has(p.containerId) && p.status === 'uploaded' && p.slotKey);
        const captured = new Set(mine.filter((p) => reqKeys.has(p.slotKey as string)).map((p) => p.slotKey));
        const damageCount = mine.filter((p) => p.slotKey === DAMAGE_SLOT).length;
        const containerNo = conts.length ? conts[0].containerNo + (conts.length > 1 ? ` 외 ${conts.length - 1}` : '') : '—';
        return { order: o, customerName: customers.find((c) => c.id === o.customerId)?.name ?? o.customerId, route: tpl?.route ?? null, containerNo, requiredCount: required, capturedCount: captured.size, damageCount };
      });
    },
    async createWorkOrder(input: NewWorkOrder) {
      const [orderRow] = await db.insert('work_orders', {
        customer_id: input.customerId, template_id: input.templateId, work_date: input.workDate,
        status: 'sent', assignee_name: input.assigneeName, assignee_contact: input.assigneeContact, assignee_email: input.assigneeEmail ?? null,
        planned_container_type: input.plannedContainerType ?? null, planned_container_count: input.plannedContainerCount ?? null,
      });
      if (!orderRow) throw new Error('work_order insert returned no row (check RLS select policy)');
      const order = rowToWorkOrder(orderRow);
      if (input.containerNos.length) {
        await db.insert('containers', input.containerNos.map((no) => ({ work_order_id: order.id, container_no: no })));
      }
      const workerToken = randomToken();
      await db.insert('share_links', { work_order_id: order.id, token: workerToken, kind: 'worker' });
      await audit(order.id, 'create', { containers: input.containerNos.length });
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
      await audit(id, 'delete');
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
      // template / customer / containers depend only on the order — fetch in parallel.
      const [tplRows, custRows, containerRows] = await Promise.all([
        db.select('work_type_templates', { col: 'id', val: order.templateId }),
        db.select('customers', { col: 'id', val: order.customerId }),
        db.select('containers', { col: 'work_order_id', val: order.id }),
      ]);
      const template = parseTemplate(tplRows[0] as unknown as RawTemplateRow);
      const customer = custRows[0] ? rowToCustomer(custRows[0]) : null;
      const containers = await Promise.all(containerRows.map(async (cRow) => {
        const container = rowToContainer(cRow);
        const photos = latestPerSlot((await db.select('photos', { col: 'container_id', val: container.id })).map(rowToPhoto));
        return { container, photos };
      }));
      return { order, template, customer, containers } as WorkOrderReview;
    },
    async publish(id: string, manifest: ViewerManifest) {
      const links = await db.select('share_links', { col: 'work_order_id', val: id });
      const existing = links.find((l) => l.kind === 'viewer');
      let viewerToken: string;
      if (existing) {
        viewerToken = String(existing.token);
        await db.update('share_links', { col: 'token', val: viewerToken }, { revoked: false });
      } else {
        viewerToken = randomToken();
        await db.insert('share_links', { work_order_id: id, token: viewerToken, kind: 'viewer' });
      }
      await db.insert('publications', { work_order_id: id, viewer_token: viewerToken, photo_manifest: manifest });
      await db.update('work_orders', { col: 'id', val: id }, { status: 'published' });
      await audit(id, 'publish');
      return { viewerToken };
    },
    async revokePublication(id: string) {
      const links = await db.select('share_links', { col: 'work_order_id', val: id });
      const viewer = links.find((l) => l.kind === 'viewer');
      if (viewer) await db.update('share_links', { col: 'token', val: String(viewer.token) }, { revoked: true });
      await db.update('work_orders', { col: 'id', val: id }, { status: 'sent' });
      await audit(id, 'revoke');
    },
    async getViewerToken(id: string) {
      const links = await db.select('share_links', { col: 'work_order_id', val: id });
      const link = links.find((l) => l.kind === 'viewer' && l.revoked !== true);
      return link ? String(link.token) : null;
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
