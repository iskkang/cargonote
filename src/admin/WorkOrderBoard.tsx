import { useEffect, useState } from 'react';
import type { AdminRepo } from './repo';
import type { Customer, WorkOrder, WorkTypeTemplate, WorkOrderStatus } from '../domain/types';
import { statusLabel } from './status';
import { Badge, EmptyState, Chip, Button, Field, inputStyle } from '../ui/kit';
import { C } from '../ui/tokens';

const TONE: Record<WorkOrderStatus, 'neutral' | 'caution' | 'positive'> = {
  draft: 'neutral', sent: 'caution', in_progress: 'caution', submitted: 'caution', published: 'positive',
};

type Edit = { id: string; assigneeName: string; assigneeContact: string; workDate: string };

export function WorkOrderBoard({ repo, onSelect }: { repo: AdminRepo; onSelect?: (id: string) => void }) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<WorkTypeTemplate[]>([]);
  const [edit, setEdit] = useState<Edit | null>(null);

  function reload() { repo.listWorkOrders().then(setOrders); }
  useEffect(() => {
    reload();
    repo.listCustomers().then(setCustomers);
    repo.listTemplates().then(setTemplates);
  }, [repo]);
  const custName = (id: string) => customers.find((c) => c.id === id)?.name ?? id;
  const tplRoute = (id: string) => templates.find((t) => t.id === id)?.route ?? id;

  async function remove(o: WorkOrder) {
    const warn = o.status === 'published'
      ? '발행된 작업입니다. 삭제하면 수신자 링크와 사진도 함께 사라집니다. 삭제할까요?'
      : '이 작업과 사진·링크를 삭제할까요?';
    if (!window.confirm(warn)) return;
    await repo.deleteWorkOrder(o.id);
    reload();
  }
  function startEdit(o: WorkOrder) {
    setEdit({ id: o.id, assigneeName: o.assigneeName ?? '', assigneeContact: o.assigneeContact ?? '', workDate: o.workDate ?? '' });
  }
  async function save() {
    if (!edit) return;
    await repo.updateWorkOrder(edit.id, {
      assigneeName: edit.assigneeName, assigneeContact: edit.assigneeContact, workDate: edit.workDate || null,
    });
    setEdit(null);
    reload();
  }

  if (orders.length === 0) {
    return <EmptyState title="아직 작업이 없습니다" hint="상단 '새 작업'으로 첫 작업 지시를 만드세요." />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {orders.map((o) => edit && edit.id === o.id ? (
        <div key={o.id} data-testid="wo-row" style={sx.editCard}>
          <div style={{ fontWeight: 600, color: C.navy, marginBottom: 8 }}>{custName(o.customerId)} · {tplRoute(o.templateId)}</div>
          <Field label="담당자 이름"><input style={inputStyle} value={edit.assigneeName} onChange={(e) => setEdit({ ...edit, assigneeName: e.target.value })} /></Field>
          <Field label="담당자 연락처"><input style={inputStyle} value={edit.assigneeContact} onChange={(e) => setEdit({ ...edit, assigneeContact: e.target.value })} /></Field>
          <Field label="작업일"><input type="date" style={inputStyle} value={edit.workDate} onChange={(e) => setEdit({ ...edit, workDate: e.target.value })} /></Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" onClick={save}>저장</Button>
            <Button type="button" variant="ghost" onClick={() => setEdit(null)}>취소</Button>
          </div>
        </div>
      ) : (
        <div key={o.id} data-testid="wo-row" style={sx.row}>
          <div onClick={() => onSelect?.(o.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, cursor: onSelect ? 'pointer' : 'default', minWidth: 0 }}>
            <Chip style={{ minWidth: 52, textAlign: 'center' }}>{tplRoute(o.templateId)}</Chip>
            <span style={{ flex: 1, fontWeight: 600, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{custName(o.customerId)}</span>
            <span style={{ fontSize: 13, color: C.text }}>{o.assigneeName}</span>
            <Badge tone={TONE[o.status]}>{statusLabel(o.status)}</Badge>
          </div>
          <span style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
            <Button variant="ghost" onClick={() => startEdit(o)} style={{ padding: '5px 10px' }}>수정</Button>
            <Button variant="ghost" onClick={() => remove(o)} style={{ padding: '5px 10px' }}>삭제</Button>
          </span>
        </div>
      ))}
    </div>
  );
}

const sx = {
  row: { display: 'flex', alignItems: 'center', padding: '14px 16px', background: C.white, border: `1px solid ${C.line}`, borderRadius: 12 } as const,
  editCard: { padding: 16, background: C.white, border: `1px solid ${C.teal}`, borderRadius: 12 } as const,
};
