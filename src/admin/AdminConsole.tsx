import { useState } from 'react';
import { getAdminRepo } from './repoFactory';
import type { AdminRepo } from './repo';
import { WorkOrderBoard } from './WorkOrderBoard';
import { CreateWorkOrder } from './CreateWorkOrder';
import { ReviewPanel } from './ReviewPanel';
import { CustomerManager } from './CustomerManager';
import { defaultAuthDeps } from '../auth/session';
import { PageShell, Brand, Card, Button } from '../ui/kit';
import { C } from '../ui/tokens';

function UsageGuide() {
  const [open, setOpen] = useState(true);
  const steps = [
    '① 새 작업 생성 → 작업자 링크 전송',
    '② 현장이 촬영·제출',
    '③ 검수 후 발행 → 수신자 링크 공유',
  ];
  return (
    <Card style={{ marginBottom: 14, background: C.surfaceAlt }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, color: C.navy }}>사용 방법</span>
        <Button variant="ghost" onClick={() => setOpen((v) => !v)} style={{ padding: '3px 10px' }}>{open ? '접기' : '펼치기'}</Button>
      </div>
      {open && (
        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, color: C.text, fontSize: 13, lineHeight: 1.9 }}>
          {steps.map((s) => <li key={s}>{s}</li>)}
        </ul>
      )}
    </Card>
  );
}

export function AdminConsole({ repo = getAdminRepo() }: { repo?: AdminRepo } = {}) {
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'board' | 'customers'>('board');

  function goBoard() { setView('board'); setSelectedId(null); }

  return (
    <PageShell>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', background: C.white, borderBottom: `1px solid ${C.line}` }}>
        <Brand />
        <span style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => { goBoard(); setCreating((v) => !v); }}>새 작업</Button>
          <Button variant="ghost" onClick={() => { setView('customers'); setCreating(false); setSelectedId(null); }}>거래처</Button>
          <Button variant="ghost" onClick={() => defaultAuthDeps.signOut()}>로그아웃</Button>
        </span>
      </header>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 22 }}>
        <h1 style={{ fontSize: 20, color: C.navy }}>관리자 콘솔</h1>
        {view === 'customers' ? (
          <CustomerManager repo={repo} />
        ) : selectedId ? (
          <ReviewPanel workOrderId={selectedId} repo={repo} onBack={() => { setSelectedId(null); setCreating(false); setRefreshKey((k) => k + 1); }} />
        ) : (
          <>
            <UsageGuide />
            {creating && <Card style={{ margin: '14px 0' }}><CreateWorkOrder repo={repo} onManageCustomers={() => { setView('customers'); setCreating(false); }} onCreated={() => setRefreshKey((k) => k + 1)} /></Card>}
            <div style={{ marginTop: 14 }}>
              <WorkOrderBoard key={refreshKey} repo={repo} onSelect={setSelectedId} />
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
