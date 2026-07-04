import { useEffect, useState } from 'react';
import type { AdminRepo, WorkOrderSummary } from './repo';
import { boardStatus, type StatusKey, type StatusTone } from './WorkOrderBoard';
import { Badge, Button, EmptyState } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

const KPIS: { key: StatusKey; label: string; tone: StatusTone }[] = [
  { key: '확인필요', label: '확인 필요', tone: 'caution' },
  { key: '진행중', label: '진행 중', tone: 'neutral' },
  { key: '완료', label: '완료', tone: 'positive' },
  { key: '데미지', label: '데미지', tone: 'negative' },
];

const TONE_COLOR: Record<StatusTone, string> = {
  caution: C.caution, neutral: C.muted, positive: C.positive, negative: C.negative,
};

export function Dashboard({ repo, onNew, onOpenBoard, onOpenReview }: {
  repo: AdminRepo; onNew: () => void; onOpenBoard: () => void; onOpenReview: (id: string) => void;
}) {
  const [rows, setRows] = useState<WorkOrderSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    repo.listWorkOrderSummaries().then((r) => !cancelled && setRows(r)).catch(() => !cancelled && setRows([]));
    return () => { cancelled = true; };
  }, [repo]);

  if (rows === null) return <div style={sx.loading}>로딩 중…</div>;

  const counts = KPIS.reduce((a, k) => { a[k.key] = rows.filter((r) => boardStatus(r).label === k.key).length; return a; }, {} as Record<string, number>);
  const recent = rows.slice(-6).reverse();

  return (
    <div style={{ marginTop: 4 }}>
      <div style={sx.kpiRow}>
        {KPIS.map((k) => (
          <button key={k.key} type="button" onClick={onOpenBoard} className="lp-card" style={sx.kpi}>
            <span style={{ ...sx.kpiDot, background: TONE_COLOR[k.tone] }} />
            <span style={sx.kpiNum}>{counts[k.key]}</span>
            <span style={sx.kpiLabel}>{k.label}</span>
          </button>
        ))}
      </div>

      <div style={sx.grid}>
        <div style={sx.recentCard}>
          <div style={sx.cardHead}>
            <span style={sx.cardTitle}>최근 작업</span>
            <Button variant="ghost" onClick={onOpenBoard} style={{ padding: '5px 11px', fontSize: 12 }}>전체 보기</Button>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="아직 작업이 없습니다" hint="첫 작업을 만들어 링크를 발급하세요." action={<Button onClick={onNew}>＋ 새 작업</Button>} />
          ) : (
            <div>
              {recent.map((s) => {
                const b = boardStatus(s);
                return (
                  <button key={s.order.id} type="button" onClick={() => onOpenReview(s.order.id)} style={sx.recentRow}>
                    <span style={sx.rcCont}>{s.containerNo}</span>
                    <span style={sx.rcCust}>{s.customerName}</span>
                    <span style={sx.rcDate}>{s.order.workDate || '—'}</span>
                    <Badge tone={b.tone}>{b.label}</Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={sx.sideCol}>
          <div style={sx.quickCard}>
            <div style={sx.quickTitle}>빠른 시작</div>
            <div style={sx.quickSub}>촬영 항목과 담당자를 정하면 작업자 링크가 만들어집니다.</div>
            <Button onClick={onNew} style={{ width: '100%', marginTop: 14 }}>＋ 새 작업 만들기</Button>
            <Button variant="ghost" onClick={onOpenBoard} style={{ width: '100%', marginTop: 8 }}>작업 현황 보기</Button>
          </div>
          <div style={sx.totalCard}>
            <span style={sx.totalNum}>{rows.length}</span>
            <span style={sx.totalLabel}>전체 작업</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const sx = {
  loading: { fontFamily: FONT.sans, fontSize: 13, color: C.text, padding: '40px 0', textAlign: 'center' as const } as const,
  kpiRow: { display: 'flex', gap: 12, flexWrap: 'wrap' as const, marginBottom: 18 } as const,
  kpi: { flex: '1 1 150px', minWidth: 130, display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start', gap: 4, background: C.white, border: `1px solid ${C.line}`, borderRadius: 14, boxShadow: '0 1px 3px rgba(15,27,38,.08)', padding: '16px 18px', cursor: 'pointer', textAlign: 'left' as const, fontFamily: FONT.sans } as const,
  kpiDot: { width: 9, height: 9, borderRadius: 999 } as const,
  kpiNum: { fontSize: 30, fontWeight: 800, color: C.navy, lineHeight: 1 } as const,
  kpiLabel: { fontSize: 13, fontWeight: 600, color: C.text } as const,

  grid: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 16, alignItems: 'start' } as const,
  recentCard: { background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, boxShadow: '0 1px 3px rgba(15,27,38,.08)', padding: 8 } as const,
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px 8px' } as const,
  cardTitle: { fontFamily: FONT.sans, fontSize: 15, fontWeight: 700, color: C.navy } as const,
  recentRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', border: 0, borderTop: `1px solid ${C.line}`, background: 'transparent', cursor: 'pointer', fontFamily: FONT.sans, textAlign: 'left' as const } as const,
  rcCont: { flex: 1.3, minWidth: 0, fontWeight: 700, color: C.navy, letterSpacing: '.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const } as const,
  rcCust: { flex: 1.2, minWidth: 0, fontSize: 13, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const } as const,
  rcDate: { width: 92, fontSize: 12, color: C.muted } as const,

  sideCol: { display: 'flex', flexDirection: 'column' as const, gap: 12 } as const,
  quickCard: { background: C.white, border: `1px solid ${C.line}`, borderRadius: 16, boxShadow: '0 1px 3px rgba(15,27,38,.08)', padding: 18 } as const,
  quickTitle: { fontFamily: FONT.sans, fontSize: 15, fontWeight: 700, color: C.navy } as const,
  quickSub: { fontFamily: FONT.sans, fontSize: 12.5, lineHeight: 1.5, color: C.text, marginTop: 6 } as const,
  totalCard: { background: C.brandNavy, borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column' as const, gap: 2 } as const,
  totalNum: { fontFamily: FONT.sans, fontSize: 28, fontWeight: 800, color: C.onDark, lineHeight: 1 } as const,
  totalLabel: { fontFamily: FONT.sans, fontSize: 12, color: C.onDarkDim } as const,
};
