import { useState } from 'react';
import { getAdminRepo } from './repoFactory';
import type { AdminRepo } from './repo';
import { WorkOrderBoard } from './WorkOrderBoard';
import { CreateWorkOrder } from './CreateWorkOrder';
import { ReviewPanel } from './ReviewPanel';
import { defaultAuthDeps } from '../auth/session';
import { PageShell, Brand, Card, Button } from '../ui/kit';
import { C } from '../ui/tokens';

export function AdminConsole({ repo = getAdminRepo() }: { repo?: AdminRepo } = {}) {
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <PageShell>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', background: C.white, borderBottom: `1px solid ${C.line}` }}>
        <Brand />
        <span style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => setCreating((v) => !v)}>새 작업</Button>
          <Button variant="ghost" onClick={() => defaultAuthDeps.signOut()}>로그아웃</Button>
        </span>
      </header>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 22 }}>
        <h1 style={{ fontSize: 20, color: C.navy }}>관리자 콘솔</h1>
        {selectedId ? (
          <ReviewPanel workOrderId={selectedId} repo={repo} onBack={() => { setSelectedId(null); setCreating(false); setRefreshKey((k) => k + 1); }} />
        ) : (
          <>
            {creating && <Card style={{ margin: '14px 0' }}><CreateWorkOrder repo={repo} onCreated={() => setRefreshKey((k) => k + 1)} /></Card>}
            <div style={{ marginTop: 14 }}>
              <WorkOrderBoard key={refreshKey} repo={repo} onSelect={setSelectedId} />
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
