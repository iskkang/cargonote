import type { AdminRepo, NewPhoto, NewWorkOrder } from './repo';
import type { DbPort } from './db';
import { parseTemplate, type RawTemplateRow } from '../domain/template';
import { rowToContainer, rowToCustomer, rowToPhoto, rowToWorkOrder } from './supabaseMappers';
import { randomToken } from './token';

export function createSupabaseAdminRepo(db: DbPort): AdminRepo {
  return {
    async listCustomers() {
      return (await db.select('customers')).map(rowToCustomer);
    },
    async listTemplates() {
      return (await db.select('work_type_templates')).map((r) => parseTemplate(r as unknown as RawTemplateRow));
    },
    async listWorkOrders() {
      return (await db.select('work_orders')).map(rowToWorkOrder);
    },
    async createWorkOrder(input: NewWorkOrder) {
      const [orderRow] = await db.insert('work_orders', {
        customer_id: input.customerId, template_id: input.templateId, work_date: input.workDate,
        status: 'sent', assignee_name: input.assigneeName, assignee_contact: input.assigneeContact,
      });
      const order = rowToWorkOrder(orderRow);
      if (input.containerNos.length) {
        await db.insert('containers', input.containerNos.map((no) => ({ work_order_id: order.id, container_no: no })));
      }
      const workerToken = randomToken();
      await db.insert('share_links', { work_order_id: order.id, token: workerToken, kind: 'worker' });
      return { order, workerToken };
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
  };
}
