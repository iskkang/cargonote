import { useEffect, useState } from 'react';
import { getAdminRepo } from './repoFactory';
import type { AdminRepo } from './repo';
import { WorkOrderBoard } from './WorkOrderBoard';
import { CreateWorkOrder } from './CreateWorkOrder';
import { ReviewPanel } from './ReviewPanel';
import { CustomerManager } from './CustomerManager';
import { AdminSidebar, type AdminView } from './AdminSidebar';
import { WorkOrderPreview, type WorkOrderPreviewData } from './WorkOrderPreview';
import { defaultAuthDeps } from '../auth/session';
import { Card, EmptyState } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

const TITLES: Record<AdminView, string> = {
  new: '새 작업 만들기', board: '작업 현황', customers: '거래처 관리', reports: '리포트',
};

export function AdminConsole({ repo = getAdminRepo() }: { repo?: AdminRepo } = {}) {
  const [view, setView] = useState<AdminView>('new');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<WorkOrderPreviewData | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    defaultAuthDeps.getSession().then((s) => setEmail(s?.user?.email ?? null)).catch(() => {});
  }, []);

  function select(v: AdminView) { setView(v); setSelectedId(null); }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: `linear-gradient(180deg,${C.page1},${C.page2})`, fontFamily: FONT.sans }}>
      <AdminSidebar view={view} onSelect={select} email={email} onSignOut={() => defaultAuthDeps.signOut()} />
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <main style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 32px' }}>
          <h1 style={{ fontSize: 22, color: C.navy, marginBottom: 4 }}>
            {selectedId && view === 'board' ? '작업 검수' : TITLES[view]}
          </h1>

          {view === 'new' && (
            <>
              <p style={sx.sub}>촬영 항목과 담당자를 정의하면 작업자에게 보낼 링크가 만들어집니다.</p>
              <div style={sx.split}>
                <Card><CreateWorkOrder repo={repo} onPreviewChange={setPreview}
                  onManageCustomers={() => setView('customers')}
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
            <div style={{ marginTop: 24 }}>
              <EmptyState title="리포트 — 준비중" hint="PDF 증빙 리포트는 다음 단계에서 제공됩니다." />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const sx = {
  sub: { color: C.text, fontSize: 14, marginTop: 0, marginBottom: 18 } as const,
  split: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,360px)', gap: 20, alignItems: 'start' } as const,
};
