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
import { AdminLangProvider, useT } from './i18n';
import { defaultAuthDeps } from '../auth/session';
import { Card, Button, Brand } from '../ui/kit';
import { ConfirmProvider, ToastProvider } from '../ui/overlays';
import { C, FONT } from '../ui/tokens';

function AdminConsoleInner({ repo }: { repo: AdminRepo }) {
  const t = useT();
  const [view, setView] = useState<AdminView>('home');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [preview, setPreview] = useState<WorkOrderPreviewData | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    defaultAuthDeps.getSession().then((s) => setEmail(s?.user?.email ?? null)).catch(() => {});
  }, []);

  function select(v: AdminView) { setView(v); setSelectedId(null); setReportId(null); setNavOpen(false); }

  const inDetail = (view === 'board' && !!selectedId) || (view === 'reports' && !!reportId);
  const title = inDetail ? (view === 'board' ? t.titles.review : t.titles.report) : t.titles[view];
  const showNew = (view === 'home' || view === 'board') && !inDetail;

  return (
    <div className="cn-admin-shell" style={{ background: `linear-gradient(180deg,${C.page1},${C.page2})`, fontFamily: FONT.sans }}>
      <AdminSidebar view={view} onSelect={select} email={email} onSignOut={() => defaultAuthDeps.signOut()} open={navOpen} onClose={() => setNavOpen(false)} />
      <div className={`cn-scrim${navOpen ? ' cn-open' : ''}`} onClick={() => setNavOpen(false)} />

      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <div className="cn-topbar">
          <button type="button" aria-label={t.menu} onClick={() => setNavOpen(true)} style={sx.hamb}>☰</button>
          <Brand />
          <span style={{ width: 30 }} />
        </div>

        <main className="cn-main" style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 32px 40px' }}>
          <header style={sx.appbar}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 22, color: C.navy, margin: 0 }}>{title}</h1>
              {!inDetail && t.subs[view as keyof typeof t.subs] && <p style={sx.sub}>{t.subs[view as keyof typeof t.subs]}</p>}
            </div>
            {showNew && <Button onClick={() => select('new')}>{t.newJob}</Button>}
          </header>

          {view === 'home' && (
            <Dashboard repo={repo}
              onNew={() => select('new')}
              onOpenBoard={() => select('board')}
              onOpenReview={(id) => { setView('board'); setSelectedId(id); setReportId(null); }} />
          )}

          {view === 'new' && (
            <div className="cn-split">
              <Card><CreateWorkOrder repo={repo} onPreviewChange={setPreview}
                onManageCustomers={() => setView('customers')}
                onDone={() => setView('board')}
                onCreated={() => setRefreshKey((k) => k + 1)} /></Card>
              <WorkOrderPreview data={preview ?? { customerName: '', route: null, carrier: null, containerNos: [], requiredCount: 0 }} />
            </div>
          )}

          {view === 'board' && (selectedId
            ? <ReviewPanel workOrderId={selectedId} repo={repo} onBack={() => { setSelectedId(null); setRefreshKey((k) => k + 1); }} />
            : <div style={{ marginTop: 4 }}><WorkOrderBoard key={refreshKey} repo={repo} onSelect={setSelectedId} /></div>
          )}

          {view === 'customers' && <div style={{ marginTop: 4 }}><CustomerManager repo={repo} /></div>}

          {view === 'reports' && (
            <div style={{ marginTop: 4 }}>
              {reportId
                ? <ReviewPanel workOrderId={reportId} repo={repo} startAsReport backLabel={t.nav.reports} onBack={() => setReportId(null)} />
                : <ReportsList repo={repo} onSelect={setReportId} />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export function AdminConsole({ repo = getAdminRepo() }: { repo?: AdminRepo } = {}) {
  return (
    <AdminLangProvider>
      <ConfirmProvider>
        <ToastProvider>
          <AdminConsoleInner repo={repo} />
        </ToastProvider>
      </ConfirmProvider>
    </AdminLangProvider>
  );
}

const sx = {
  appbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20, flexWrap: 'wrap' as const } as const,
  sub: { color: C.text, fontSize: 14, margin: '4px 0 0' } as const,
  hamb: { border: 0, background: 'transparent', fontSize: 22, lineHeight: 1, color: C.navy, cursor: 'pointer', padding: 4 } as const,
};
