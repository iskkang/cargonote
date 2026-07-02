import { useState } from 'react';
import { createInMemoryAdminRepo } from './repo';
import { WorkOrderBoard } from './WorkOrderBoard';
import { CreateWorkOrder } from './CreateWorkOrder';

const repo = createInMemoryAdminRepo();

export function AdminConsole() {
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <main style={{ minHeight: '100vh', background: '#D7DEE5', fontFamily: 'Pretendard, sans-serif', color: '#0F1B26' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#fff', borderBottom: '0.5px solid rgba(90,107,125,0.25)' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 18 }}>CARGO<span style={{ color: '#FF6A00' }}>LINK</span></span>
        <button onClick={() => setCreating((v) => !v)} style={{ background: '#FF6A00', color: '#fff', border: 0, borderRadius: 10, padding: '8px 14px', fontWeight: 600 }}>새 작업</button>
      </header>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
        <h1 style={{ fontSize: 20, color: '#0F1B26' }}>관리자 콘솔</h1>
        {creating && (
          <section style={{ background: '#fff', borderRadius: 14, padding: 20, margin: '12px 0' }}>
            <CreateWorkOrder repo={repo} onCreated={() => setRefreshKey((k) => k + 1)} />
          </section>
        )}
        <section style={{ background: '#fff', borderRadius: 14, padding: '8px 6px', marginTop: 12 }}>
          <WorkOrderBoard key={refreshKey} repo={repo} />
        </section>
      </div>
    </main>
  );
}
