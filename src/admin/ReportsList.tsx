import { useEffect, useState } from 'react';
import type { AdminRepo, WorkOrderSummary } from './repo';
import { EmptyState, Button, Badge } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

/** Published-report list: every work order in `published` status, click to open its report. */
export function ReportsList({ repo, onSelect }: { repo: AdminRepo; onSelect: (id: string) => void }) {
  const [rows, setRows] = useState<WorkOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { repo.listWorkOrderSummaries().then((r) => { setRows(r); setLoading(false); }); }, [repo]);

  if (loading) return <div style={sx.loading}>로딩 중…</div>;
  const published = rows.filter((s) => s.order.status === 'published');
  if (published.length === 0) {
    return <EmptyState title="발행된 리포트가 없습니다" hint="작업 검수에서 '리포트 발행'을 하면 여기에 쌓입니다." />;
  }

  return (
    <div style={sx.table}>
      <div style={sx.headRow}>
        <span style={sx.cCont}>컨테이너</span>
        <span style={sx.cCust}>고객사</span>
        <span style={sx.cType}>작업 유형</span>
        <span style={sx.cState} />
        <span style={sx.cAction} />
      </div>
      {published.map((s) => (
        <div key={s.order.id} style={sx.row} onClick={() => onSelect(s.order.id)}>
          <span style={{ ...sx.cCont, ...sx.mono }}>{s.containerNo}</span>
          <span style={{ ...sx.cCust, fontWeight: 600, color: C.navy }}>{s.customerName}</span>
          <span style={sx.cType}>{s.route ?? '—'}</span>
          <span style={sx.cState}>{s.damageCount > 0 ? <Badge tone="negative">데미지 {s.damageCount}</Badge> : <Badge tone="positive">완료</Badge>}</span>
          <span style={{ ...sx.cAction, textAlign: 'right' }}><Button variant="ghost" onClick={() => onSelect(s.order.id)} style={{ padding: '5px 11px', fontSize: 13 }}>리포트 보기</Button></span>
        </div>
      ))}
    </div>
  );
}

const sx = {
  loading: { fontFamily: FONT.sans, fontSize: 13, color: C.text, padding: '40px 0', textAlign: 'center' as const } as const,
  table: { background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' } as const,
  headRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: `1px solid ${C.line}`, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, color: C.muted } as const,
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderTop: `1px solid ${C.line}`, fontFamily: FONT.sans, fontSize: 14, color: C.textStrong, cursor: 'pointer' } as const,
  mono: { letterSpacing: '.03em', color: C.navy, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const } as const,
  cCont: { flex: 1.4, minWidth: 0 } as const,
  cCust: { flex: 1.3, minWidth: 0 } as const,
  cType: { flex: 0.9, color: C.text, fontSize: 13 } as const,
  cState: { width: 96 } as const,
  cAction: { width: 108 } as const,
};
