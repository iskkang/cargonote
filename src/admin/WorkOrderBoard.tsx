import { useEffect, useState } from 'react';
import type { AdminRepo, WorkOrderSummary } from './repo';
import { Badge, EmptyState, Chip, Button, Field, inputStyle } from '../ui/kit';
import { C } from '../ui/tokens';

type Edit = { id: string; assigneeName: string; assigneeContact: string; workDate: string };

function boardStatus(s: WorkOrderSummary): { label: string; tone: 'neutral' | 'caution' | 'positive' } {
  if (s.order.status === 'published') return { label: '발행됨', tone: 'positive' };
  if (s.requiredCount > 0 && s.capturedCount >= s.requiredCount) return { label: '수신됨', tone: 'positive' };
  if (s.capturedCount > 0) return { label: '수신중', tone: 'caution' };
  return { label: '생성됨', tone: 'caution' };
}

export function WorkOrderBoard({ repo, onSelect }: { repo: AdminRepo; onSelect?: (id: string) => void }) {
  const [rows, setRows] = useState<WorkOrderSummary[]>([]);
  const [edit, setEdit] = useState<Edit | null>(null);

  function reload() { repo.listWorkOrderSummaries().then(setRows); }
  useEffect(() => { reload(); }, [repo]);

  async function remove(s: WorkOrderSummary) {
    const warn = s.order.status === 'published'
      ? '발행된 작업입니다. 삭제하면 수신자 링크와 사진도 함께 사라집니다. 삭제할까요?'
      : '이 작업과 사진·링크를 삭제할까요?';
    if (!window.confirm(warn)) return;
    await repo.deleteWorkOrder(s.order.id);
    reload();
  }
  function startEdit(s: WorkOrderSummary) {
    setEdit({ id: s.order.id, assigneeName: s.order.assigneeName ?? '', assigneeContact: s.order.assigneeContact ?? '', workDate: s.order.workDate ?? '' });
  }
  async function save() {
    if (!edit) return;
    await repo.updateWorkOrder(edit.id, { assigneeName: edit.assigneeName, assigneeContact: edit.assigneeContact, workDate: edit.workDate || null });
    setEdit(null);
    reload();
  }

  if (rows.length === 0) {
    return <EmptyState title="아직 작업이 없습니다" hint="상단 '새 작업'으로 첫 작업 지시를 만드세요." />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((s) => edit && edit.id === s.order.id ? (
        <div key={s.order.id} data-testid="wo-row" style={sx.editCard}>
          <div style={{ fontWeight: 600, color: C.navy, marginBottom: 8 }}>{s.customerName} · {s.route}</div>
          <Field label="담당자 이름"><input style={inputStyle} value={edit.assigneeName} onChange={(e) => setEdit({ ...edit, assigneeName: e.target.value })} /></Field>
          <Field label="담당자 연락처"><input style={inputStyle} value={edit.assigneeContact} onChange={(e) => setEdit({ ...edit, assigneeContact: e.target.value })} /></Field>
          <Field label="작업일"><input type="date" style={inputStyle} value={edit.workDate} onChange={(e) => setEdit({ ...edit, workDate: e.target.value })} /></Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" onClick={save}>저장</Button>
            <Button type="button" variant="ghost" onClick={() => setEdit(null)}>취소</Button>
          </div>
        </div>
      ) : (
        <div key={s.order.id} data-testid="wo-row" style={sx.row}>
          <div onClick={() => onSelect?.(s.order.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: onSelect ? 'pointer' : 'default', minWidth: 0 }}>
            <Chip style={{ minWidth: 48, textAlign: 'center' }}>{s.route}</Chip>
            <span style={{ flex: 1, fontWeight: 600, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.customerName}</span>
            <span style={sx.meta}>{s.order.workDate || '—'}</span>
            <span style={sx.meta}>사진 {s.capturedCount}/{s.requiredCount}</span>
            {(() => { const b = boardStatus(s); return <Badge tone={b.tone}>{b.label}</Badge>; })()}
          </div>
          <span style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
            <Button variant="ghost" onClick={() => startEdit(s)} style={{ padding: '5px 10px' }}>수정</Button>
            <Button variant="ghost" onClick={() => remove(s)} style={{ padding: '5px 10px' }}>삭제</Button>
          </span>
        </div>
      ))}
    </div>
  );
}

const sx = {
  row: { display: 'flex', alignItems: 'center', padding: '14px 16px', background: C.white, border: `1px solid ${C.line}`, borderRadius: 12 } as const,
  editCard: { padding: 16, background: C.white, border: `1px solid ${C.teal}`, borderRadius: 12 } as const,
  meta: { fontSize: 13, color: C.text, whiteSpace: 'nowrap' as const } as const,
};
