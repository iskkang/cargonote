import { useEffect, useState } from 'react';
import type { AdminRepo, WorkOrderSummary } from './repo';
import { EmptyState, Button, Badge, Skeleton } from '../ui/kit';
import { useT } from './i18n';
import { C, FONT } from '../ui/tokens';

/** Published-report list: every work order in `published` status, click to open its report. */
export function ReportsList({ repo, onSelect }: { repo: AdminRepo; onSelect: (id: string) => void }) {
  const t = useT();
  const [rows, setRows] = useState<WorkOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { repo.listWorkOrderSummaries().then((r) => { setRows(r); setLoading(false); }); }, [repo]);

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={50} style={{ borderRadius: 12 }} />)}</div>;
  const published = rows.filter((s) => s.order.status === 'published');
  if (published.length === 0) {
    return <EmptyState title={t.reports.empty} hint={t.reports.emptyHint} />;
  }

  return (
    <div style={sx.table}>
      <div style={sx.headRow}>
        <span style={sx.cCont}>{t.reports.col.container}</span>
        <span style={sx.cCust}>{t.reports.col.customer}</span>
        <span style={sx.cType}>{t.reports.col.type}</span>
        <span style={sx.cState} />
        <span style={sx.cAction} />
      </div>
      {published.map((s) => (
        <div key={s.order.id} className="cn-row" style={sx.row} onClick={() => onSelect(s.order.id)}>
          <span style={{ ...sx.cCont, ...sx.mono }}>{s.containerNo}</span>
          <span style={{ ...sx.cCust, fontWeight: 600, color: C.navy }}>{s.customerName}</span>
          <span style={sx.cType}>{s.route ?? '—'}</span>
          <span style={sx.cState}>{s.damageCount > 0 ? <Badge tone="negative">{t.reports.damage} {s.damageCount}</Badge> : <Badge tone="positive">{t.reports.done}</Badge>}</span>
          <span style={{ ...sx.cAction, textAlign: 'right' }}><Button variant="ghost" onClick={() => onSelect(s.order.id)} style={{ padding: '5px 11px', fontSize: 13 }}>{t.reports.open}</Button></span>
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
