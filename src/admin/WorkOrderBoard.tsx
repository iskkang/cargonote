import { useEffect, useState } from 'react';
import type { AdminRepo, WorkOrderSummary } from './repo';
import { Badge, EmptyState, Button, Field, inputStyle } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

type Edit = { id: string; assigneeName: string; assigneeContact: string; workDate: string };
export type StatusKey = '대기' | '진행중' | '확인필요' | '완료' | '데미지';
export type StatusTone = 'neutral' | 'caution' | 'positive' | 'negative';

export function boardStatus(s: WorkOrderSummary): { label: StatusKey; tone: StatusTone } {
  if (s.damageCount > 0) return { label: '데미지', tone: 'negative' };
  if (s.order.status === 'published') return { label: '완료', tone: 'positive' };
  if (s.requiredCount > 0 && s.capturedCount >= s.requiredCount) return { label: '확인필요', tone: 'caution' };
  if (s.capturedCount > 0) return { label: '진행중', tone: 'neutral' };
  return { label: '대기', tone: 'neutral' };
}

const FILTERS: (StatusKey | '전체')[] = ['전체', '확인필요', '진행중', '완료', '데미지'];

export function WorkOrderBoard({ repo, onSelect }: { repo: AdminRepo; onSelect?: (id: string) => void }) {
  const [rows, setRows] = useState<WorkOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [filter, setFilter] = useState<StatusKey | '전체'>('전체');
  const [q, setQ] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  function reload() { repo.listWorkOrderSummaries().then((r) => { setRows(r); setLoading(false); }); }
  useEffect(() => { setLoading(true); reload(); }, [repo]);

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

  if (loading) return <div style={sx.loading}>로딩 중…</div>;
  if (rows.length === 0) {
    return <EmptyState title="아직 작업이 없습니다" hint="상단 '새 작업'으로 첫 작업 지시를 만드세요." />;
  }

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === '전체' ? rows.length : rows.filter((r) => boardStatus(r).label === f).length;
    return acc;
  }, {} as Record<string, number>);

  const term = q.trim().toLowerCase();
  const shown = rows.filter((r) => {
    if (filter !== '전체' && boardStatus(r).label !== filter) return false;
    if (term && !`${r.containerNo} ${r.customerName}`.toLowerCase().includes(term)) return false;
    if (dateFilter && r.order.workDate !== dateFilter) return false;
    return true;
  });

  return (
    <div>
      <div style={sx.controls}>
        <input style={sx.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="컨테이너 번호·고객사 검색" />
        <input type="date" style={sx.date} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} title="작업일" />
        {dateFilter && <Button variant="ghost" onClick={() => setDateFilter('')} style={{ padding: '6px 10px' }}>날짜 해제</Button>}
      </div>

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
          <span style={sx.cCont}>컨테이너</span>
          <span style={sx.cCust}>고객사</span>
          <span style={sx.cType}>작업 유형</span>
          <span style={sx.cDate}>작업일</span>
          <span style={sx.cAssignee}>담당</span>
          <span style={sx.cProg}>진행</span>
          <span style={sx.cStatus}>상태</span>
          <span style={sx.cActions} />
        </div>

        {shown.length === 0 && <div style={sx.noMatch}>조건에 맞는 작업이 없습니다.</div>}

        {shown.map((s) => edit && edit.id === s.order.id ? (
          <div key={s.order.id} data-testid="wo-row" style={sx.editRow}>
            <div style={{ fontWeight: 600, color: C.navy, marginBottom: 8 }}>{s.containerNo} · {s.customerName}</div>
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
            <span style={{ ...sx.cCont, ...sx.mono }} onClick={() => onSelect?.(s.order.id)}>{s.containerNo}</span>
            <span style={{ ...sx.cCust, ...sx.link }} onClick={() => onSelect?.(s.order.id)}>{s.customerName}</span>
            <span style={sx.cType}>{s.route ?? '—'}</span>
            <span style={sx.cDate}>{s.order.workDate || '—'}</span>
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
      <div style={sx.hint}>컨테이너·고객사를 누르면 작업 검수 화면으로 이동합니다.</div>
    </div>
  );
}

const sx = {
  loading: { fontFamily: FONT.sans, fontSize: 13, color: C.text, padding: '40px 0', textAlign: 'center' as const } as const,
  controls: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' as const } as const,
  search: { flex: 1, minWidth: 200, boxSizing: 'border-box' as const, padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.line}`, background: C.white, color: C.textStrong, fontSize: 14, fontFamily: FONT.sans } as const,
  date: { boxSizing: 'border-box' as const, padding: '9px 11px', borderRadius: 10, border: `1px solid ${C.line}`, background: C.white, color: C.textStrong, fontSize: 14, fontFamily: FONT.sans } as const,
  filters: { display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 14 } as const,
  chip: { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, padding: '7px 13px', borderRadius: 999, border: `1px solid ${C.line}`, background: C.white, color: C.text, cursor: 'pointer' } as const,
  chipActive: { background: C.navy, color: C.white, border: `1px solid ${C.navy}` } as const,
  chipCount: { fontSize: 11, opacity: 0.75 } as const,
  table: { background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' } as const,
  headRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${C.line}`, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '.02em' } as const,
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderTop: `1px solid ${C.line}`, fontFamily: FONT.sans, fontSize: 14, color: C.textStrong } as const,
  editRow: { padding: 16, borderTop: `1px solid ${C.teal}`, background: C.surfaceAlt } as const,
  noMatch: { padding: '24px 16px', textAlign: 'center' as const, fontFamily: FONT.sans, fontSize: 13, color: C.muted } as const,
  link: { fontWeight: 600, color: C.navy, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const } as const,
  mono: { cursor: 'pointer', letterSpacing: '.03em', color: C.navy, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const } as const,
  cCont: { flex: 1.4, minWidth: 0 } as const,
  cCust: { flex: 1.3, minWidth: 0 } as const,
  cType: { flex: 0.9, color: C.text, fontSize: 13 } as const,
  cDate: { flex: 0.9, color: C.text, fontSize: 13 } as const,
  cAssignee: { flex: 0.9, color: C.text, fontSize: 13 } as const,
  cProg: { width: 52, color: C.text, fontSize: 13 } as const,
  cStatus: { width: 76 } as const,
  cActions: { width: 108 } as const,
  hint: { fontSize: 12, color: C.muted, marginTop: 10, fontFamily: FONT.sans } as const,
};
