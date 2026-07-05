import { useEffect, useState } from 'react';
import type { AdminRepo, WorkOrderSummary } from './repo';
import { Badge, EmptyState, Button, Field, Skeleton, inputStyle } from '../ui/kit';
import { useConfirm, useToast } from '../ui/overlays';
import { useIsMobile } from '../ui/useIsMobile';
import { useT } from './i18n';
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
  const t = useT();
  const confirm = useConfirm();
  const toast = useToast();
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<WorkOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [filter, setFilter] = useState<StatusKey | '전체'>('전체');
  const [q, setQ] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  function reload() { repo.listWorkOrderSummaries().then((r) => { setRows(r); setLoading(false); }); }
  useEffect(() => { setLoading(true); reload(); }, [repo]);

  async function remove(s: WorkOrderSummary) {
    const ok = await confirm({
      title: t.board.delTitle,
      message: s.order.status === 'published' ? t.board.delPublished : t.board.delMsg,
      confirmLabel: t.common.delete, danger: true,
    });
    if (!ok) return;
    await repo.deleteWorkOrder(s.order.id);
    reload();
    toast(t.board.deleted, 'positive');
  }
  function startEdit(s: WorkOrderSummary) {
    setEdit({ id: s.order.id, assigneeName: s.order.assigneeName ?? '', assigneeContact: s.order.assigneeContact ?? '', workDate: s.order.workDate ?? '' });
  }
  async function save() {
    if (!edit) return;
    await repo.updateWorkOrder(edit.id, { assigneeName: edit.assigneeName, assigneeContact: edit.assigneeContact, workDate: edit.workDate || null });
    setEdit(null);
    reload();
    toast(t.board.saved, 'positive');
  }

  if (loading) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={52} style={{ borderRadius: 12 }} />)}</div>;
  }
  if (rows.length === 0) {
    return <EmptyState title={t.board.empty} hint={t.board.emptyHint} />;
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

  const editForm = (s: WorkOrderSummary) => (
    <div key={s.order.id} data-testid="wo-row" style={sx.editRow}>
      <div style={{ fontWeight: 600, color: C.navy, marginBottom: 8 }}>{s.containerNo} · {s.customerName}</div>
      <Field label={t.board.editName}><input style={inputStyle} value={edit!.assigneeName} onChange={(e) => setEdit({ ...edit!, assigneeName: e.target.value })} /></Field>
      <Field label={t.board.editContact}><input style={inputStyle} value={edit!.assigneeContact} onChange={(e) => setEdit({ ...edit!, assigneeContact: e.target.value })} /></Field>
      <Field label={t.board.editDate}><input type="date" style={inputStyle} value={edit!.workDate} onChange={(e) => setEdit({ ...edit!, workDate: e.target.value })} /></Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="button" onClick={save}>{t.common.save}</Button>
        <Button type="button" variant="ghost" onClick={() => setEdit(null)}>{t.common.cancel}</Button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={sx.controls}>
        <input style={sx.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.board.search} />
        <input type="date" style={sx.date} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} title={t.board.date} />
        {dateFilter && <Button variant="ghost" onClick={() => setDateFilter('')} style={{ padding: '6px 10px' }}>{t.board.clearDate}</Button>}
      </div>

      <div style={sx.filters}>
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} style={{ ...sx.chip, ...(filter === f ? sx.chipActive : {}) }}>
            {t.board.filters[f]}<span style={sx.chipCount}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 && <div style={sx.noMatch}>{t.board.noMatch}</div>}

      {/* Desktop table */}
      {!isMobile && shown.length > 0 && (
        <div className="cn-board-table" style={sx.table}>
          <div style={sx.headRow}>
            <span style={sx.cCont}>{t.board.col.container}</span>
            <span style={sx.cCust}>{t.board.col.customer}</span>
            <span style={sx.cType}>{t.board.col.type}</span>
            <span style={sx.cDate}>{t.board.col.date}</span>
            <span style={sx.cAssignee}>{t.board.col.assignee}</span>
            <span style={sx.cProg}>{t.board.col.progress}</span>
            <span style={sx.cStatus}>{t.board.col.status}</span>
            <span style={sx.cActions} />
          </div>
          {shown.map((s) => edit && edit.id === s.order.id ? editForm(s) : (
            <div key={s.order.id} data-testid="wo-row" className="cn-row" style={sx.row}>
              <span style={sx.cCont} onClick={() => onSelect?.(s.order.id)}>
                <span style={sx.mono}>{s.containerNo}</span>
                {s.order.plannedContainerType && <span style={sx.planChip}>{t.board.plan} {s.order.plannedContainerType}×{s.order.plannedContainerCount}</span>}
              </span>
              <span style={{ ...sx.cCust, ...sx.link }} onClick={() => onSelect?.(s.order.id)}>{s.customerName}</span>
              <span style={sx.cType}>{s.route ?? '—'}</span>
              <span style={sx.cDate}>{s.order.workDate || '—'}</span>
              <span style={sx.cAssignee}>{s.order.assigneeName || '—'}</span>
              <span style={sx.cProg}>{s.capturedCount}/{s.requiredCount}</span>
              <span style={sx.cStatus}>{(() => { const b = boardStatus(s); return <Badge tone={b.tone}>{t.board.status[b.label]}</Badge>; })()}</span>
              <span style={{ ...sx.cActions, display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={() => startEdit(s)} style={{ padding: '4px 9px', fontSize: 12 }}>{t.common.edit}</Button>
                <Button variant="ghost" onClick={() => remove(s)} style={{ padding: '4px 9px', fontSize: 12 }}>{t.common.delete}</Button>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Mobile cards */}
      {isMobile && shown.length > 0 && (
        <div className="cn-board-cards">
          {shown.map((s) => edit && edit.id === s.order.id ? editForm(s) : (
            <div key={s.order.id} data-testid="wo-row" style={sx.mcard}>
              <div style={sx.mcTop} onClick={() => onSelect?.(s.order.id)}>
                <div style={{ minWidth: 0 }}>
                  <div style={sx.mcCont}>{s.containerNo}</div>
                  {s.order.plannedContainerType && <span style={{ ...sx.planChip, marginTop: 3 }}>{t.board.plan} {s.order.plannedContainerType}×{s.order.plannedContainerCount}</span>}
                  <div style={sx.mcCust}>{s.customerName}</div>
                </div>
                {(() => { const b = boardStatus(s); return <Badge tone={b.tone}>{t.board.status[b.label]}</Badge>; })()}
              </div>
              <div style={sx.mcMeta}>
                <span>{s.route ?? '—'}</span><span>·</span><span>{s.order.workDate || '—'}</span>
                <span>·</span><span>{s.capturedCount}/{s.requiredCount}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <Button variant="ghost" onClick={() => startEdit(s)} style={{ padding: '6px 12px', fontSize: 13 }}>{t.common.edit}</Button>
                <Button variant="ghost" onClick={() => remove(s)} style={{ padding: '6px 12px', fontSize: 13 }}>{t.common.delete}</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={sx.hint}>{t.board.hint}</div>
    </div>
  );
}

const sx = {
  controls: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' as const } as const,
  search: { flex: 1, minWidth: 180, boxSizing: 'border-box' as const, padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.line}`, background: C.white, color: C.textStrong, fontSize: 14, fontFamily: FONT.sans } as const,
  date: { boxSizing: 'border-box' as const, padding: '9px 11px', borderRadius: 10, border: `1px solid ${C.line}`, background: C.white, color: C.textStrong, fontSize: 14, fontFamily: FONT.sans } as const,
  filters: { display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 14 } as const,
  chip: { display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, padding: '7px 13px', borderRadius: 999, border: `1px solid ${C.line}`, background: C.white, color: C.text, cursor: 'pointer' } as const,
  chipActive: { background: C.navy, color: C.white, border: `1px solid ${C.navy}` } as const,
  chipCount: { fontSize: 11, opacity: 0.75 } as const,
  table: { background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' } as const,
  headRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${C.line}`, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: '.02em' } as const,
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderTop: `1px solid ${C.line}`, fontFamily: FONT.sans, fontSize: 14, color: C.textStrong } as const,
  editRow: { padding: 16, borderTop: `1px solid ${C.teal}`, background: C.surfaceAlt, borderRadius: 12 } as const,
  noMatch: { padding: '24px 16px', textAlign: 'center' as const, fontFamily: FONT.sans, fontSize: 13, color: C.muted } as const,
  link: { fontWeight: 600, color: C.navy, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const } as const,
  mono: { cursor: 'pointer', letterSpacing: '.03em', color: C.navy, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const } as const,
  cCont: { flex: 1.4, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, cursor: 'pointer' } as const,
  planChip: { display: 'inline-block', alignSelf: 'flex-start', fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, color: C.tealStrong, background: C.tealTint, borderRadius: 6, padding: '1px 7px' } as const,
  cCust: { flex: 1.3, minWidth: 0 } as const,
  cType: { flex: 0.9, color: C.text, fontSize: 13 } as const,
  cDate: { flex: 0.9, color: C.text, fontSize: 13 } as const,
  cAssignee: { flex: 0.9, color: C.text, fontSize: 13 } as const,
  cProg: { width: 52, color: C.text, fontSize: 13 } as const,
  cStatus: { width: 88 } as const,
  cActions: { width: 108 } as const,
  mcard: { background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14 } as const,
  mcTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, cursor: 'pointer' } as const,
  mcCont: { fontWeight: 700, color: C.navy, letterSpacing: '.03em' } as const,
  mcCust: { fontSize: 13, color: C.text, marginTop: 2 } as const,
  mcMeta: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginTop: 8, fontSize: 12.5, color: C.muted } as const,
  hint: { fontSize: 12, color: C.muted, marginTop: 10, fontFamily: FONT.sans } as const,
};
