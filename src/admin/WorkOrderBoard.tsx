import { useEffect, useState } from 'react';
import type { AdminRepo, WorkOrderSummary } from './repo';
import { Badge, EmptyState, Button, Field, inputStyle } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

type Edit = { id: string; assigneeName: string; assigneeContact: string; workDate: string };
type StatusKey = '생성됨' | '수신중' | '수신됨' | '발행됨';

function boardStatus(s: WorkOrderSummary): { label: StatusKey; tone: 'neutral' | 'caution' | 'positive' } {
  if (s.order.status === 'published') return { label: '발행됨', tone: 'positive' };
  if (s.requiredCount > 0 && s.capturedCount >= s.requiredCount) return { label: '수신됨', tone: 'positive' };
  if (s.capturedCount > 0) return { label: '수신중', tone: 'caution' };
  return { label: '생성됨', tone: 'caution' };
}

const FILTERS: (StatusKey | '전체')[] = ['전체', '생성됨', '수신중', '수신됨', '발행됨'];

export function WorkOrderBoard({ repo, onSelect }: { repo: AdminRepo; onSelect?: (id: string) => void }) {
  const [rows, setRows] = useState<WorkOrderSummary[]>([]);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [filter, setFilter] = useState<StatusKey | '전체'>('전체');

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

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === '전체' ? rows.length : rows.filter((r) => boardStatus(r).label === f).length;
    return acc;
  }, {} as Record<string, number>);
  const shown = filter === '전체' ? rows : rows.filter((r) => boardStatus(r).label === filter);

  return (
    <div>
      <div style={sx.filters}>
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            style={{ ...sx.chip, ...(filter === f ? sx.chipActive : {}) }}>
            {f}<span style={sx.chipCount}>{counts[f]}</span>
          </button>
        ))}
      </div>

      <div style={sx.table}>
        <div style={sx.headRow}>
          <span style={sx.cCust}>고객사</span>
          <span style={sx.cCont}>컨테이너</span>
          <span style={sx.cType}>작업 유형</span>
          <span style={sx.cAssignee}>담당</span>
          <span style={sx.cProg}>진행</span>
          <span style={sx.cStatus}>상태</span>
          <span style={sx.cActions} />
        </div>

        {shown.map((s) => edit && edit.id === s.order.id ? (
          <div key={s.order.id} data-testid="wo-row" style={sx.editRow}>
            <div style={{ fontWeight: 600, color: C.navy, marginBottom: 8 }}>{s.customerName} · {s.containerNo}</div>
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
            <span style={{ ...sx.cCust, ...sx.link }} onClick={() => onSelect?.(s.order.id)}>{s.customerName}</span>
            <span style={{ ...sx.cCont, ...sx.mono }} onClick={() => onSelect?.(s.order.id)}>{s.containerNo}</span>
            <span style={sx.cType}>{s.route ?? '—'}</span>
            <span style={sx.cAssignee}>{s.order.assigneeName || '—'}</span>
            <span style={sx.cProg}>{s.capturedCount}/{s.requiredCount}</span>
            <span style={sx.cStatus}>{(() => { const b = boardStatus(s); return <Badge tone={b.tone}>{b.label}</Badge>; })()}</span>
            <span style={{ ...sx.cActions, display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => startEdit(s)} style={{ padding: '4px 9px', fontSize: 12 }}>수정</Button>
              <Button variant="ghost" onClick={() => remove(s)} style={{ padding: '4px 9px', fontSize: 12 }}>삭제</Button>
            </span>
          </div>
        ))}
      </div>
      <div style={sx.hint}>고객사·컨테이너를 누르면 작업 검수 화면으로 이동합니다.</div>
    </div>
  );
}

const sx = {
  filters: { display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 14 } as const,
  chip: { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, padding: '7px 13px', borderRadius: 999, border: `1px solid ${C.line}`, background: C.white, color: C.text, cursor: 'pointer' } as const,
  chipActive: { background: C.navy, color: C.white, border: `1px solid ${C.navy}` } as const,
  chipCount: { fontSize: 11, opacity: 0.75 } as const,
  table: { background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' } as const,
  headRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${C.line}`, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '.02em' } as const,
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderTop: `1px solid ${C.line}`, fontFamily: FONT.sans, fontSize: 14, color: C.textStrong } as const,
  editRow: { padding: 16, borderTop: `1px solid ${C.teal}`, background: C.surfaceAlt } as const,
  link: { fontWeight: 600, color: C.navy, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const } as const,
  mono: { cursor: 'pointer', letterSpacing: '.03em', color: C.navy, fontWeight: 600 } as const,
  cCust: { flex: 1.4, minWidth: 0 } as const,
  cCont: { flex: 1.4, minWidth: 0 } as const,
  cType: { flex: 1, color: C.text, fontSize: 13 } as const,
  cAssignee: { flex: 1, color: C.text, fontSize: 13 } as const,
  cProg: { width: 56, color: C.text, fontSize: 13 } as const,
  cStatus: { width: 76 } as const,
  cActions: { width: 108 } as const,
  hint: { fontSize: 12, color: C.muted, marginTop: 10, fontFamily: FONT.sans } as const,
};
