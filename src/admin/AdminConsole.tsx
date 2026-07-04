import { useEffect, useState } from 'react';
import { getAdminRepo } from './repoFactory';
import type { AdminRepo } from './repo';
import { WorkOrderBoard } from './WorkOrderBoard';
import { CreateWorkOrder } from './CreateWorkOrder';
import { ReviewPanel } from './ReviewPanel';
import { CustomerManager } from './CustomerManager';
import { ReportsList } from './ReportsList';
import { Dashboard } from './Dashboard';
import { AdminSidebar, type AdminView } from './AdminSidebar';
import { WorkOrderPreview, type WorkOrderPreviewData } from './WorkOrderPreview';
import { defaultAuthDeps } from '../auth/session';
import { Card, Button } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

const TITLES: Record<AdminView, string> = {
  home: '대시보드', new: '새 작업 만들기', board: '작업 현황', customers: '거래처 관리', reports: '리포트',
};
const SUBS: Record<AdminView, string> = {
  home: '오늘의 작업 현황을 한눈에.',
  new: '촬영 항목과 담당자를 정의하면 작업자에게 보낼 링크가 만들어집니다.',
  board: '컨테이너·작업일로 검색하고, 상태별로 검수하세요.',
  customers: '작업을 지시할 거래처를 추가·수정합니다.',
  reports: '발행된 증빙 리포트 목록입니다.',
};

export function AdminConsole({ repo = getAdminRepo() }: { repo?: AdminRepo } = {}) {
  const [view, setView] = useState<AdminView>('home');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [preview, setPreview] = useState<WorkOrderPreviewData | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    defaultAuthDeps.getSession().then((s) => setEmail(s?.user?.email ?? null)).catch(() => {});
  }, []);

  function select(v: AdminView) { setView(v); setSelectedId(null); setReportId(null); }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: `linear-gradient(180deg,${C.page1},${C.page2})`, fontFamily: FONT.sans }}>
      <AdminSidebar view={view} onSelect={select} email={email} onSignOut={() => defaultAuthDeps.signOut()} />
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <main style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 32px 40px' }}>
          {(() => {
            const inDetail = (view === 'board' && !!selectedId) || (view === 'reports' && !!reportId);
            const title = inDetail ? (view === 'board' ? '작업 검수' : '증빙 리포트') : TITLES[view];
            const showNew = (view === 'home' || view === 'board') && !inDetail;
            return (
              <header style={sx.appbar}>
                <div style={{ minWidth: 0 }}>
                  <h1 style={{ fontSize: 22, color: C.navy, margin: 0 }}>{title}</h1>
                  {!inDetail && SUBS[view] && <p style={sx.sub}>{SUBS[view]}</p>}
                </div>
                {showNew && <Button onClick={() => select('new')}>＋ 새 작업</Button>}
              </header>
            );
          })()}

          {view === 'home' && (
            <Dashboard repo={repo}
              onNew={() => select('new')}
              onOpenBoard={() => select('board')}
              onOpenReview={(id) => { setView('board'); setSelectedId(id); setReportId(null); }} />
          )}

          {view === 'new' && (
            <>
              <div style={sx.split}>
                <Card><CreateWorkOrder repo={repo} onPreviewChange={setPreview}
                  onManageCustomers={() => setView('customers')}
                  onDone={() => setView('board')}
                  onCreated={() => setRefreshKey((k) => k + 1)} /></Card>
                <WorkOrderPreview data={preview ?? { customerName: '', route: null, carrier: null, containerNos: [], requiredCount: 0 }} />
              </div>
            </>
          )}

          {view === 'board' && (selectedId
            ? <ReviewPanel workOrderId={selectedId} repo={repo} onBack={() => { setSelectedId(null); setRefreshKey((k) => k + 1); }} />
            : <div style={{ marginTop: 16 }}><WorkOrderBoard key={refreshKey} repo={repo} onSelect={setSelectedId} /></div>
          )}

          {view === 'customers' && <div style={{ marginTop: 8 }}><CustomerManager repo={repo} /></div>}

          {view === 'reports' && (
            <div style={{ marginTop: 12 }}>
              {reportId
                ? <ReviewPanel workOrderId={reportId} repo={repo} startAsReport backLabel="리포트" onBack={() => setReportId(null)} />
                : <ReportsList repo={repo} onSelect={setReportId} />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const sx = {
  appbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20, flexWrap: 'wrap' as const } as const,
  sub: { color: C.text, fontSize: 14, margin: '4px 0 0' } as const,
  split: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,360px)', gap: 20, alignItems: 'start' } as const,
};
