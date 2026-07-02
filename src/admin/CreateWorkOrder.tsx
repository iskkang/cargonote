import { useEffect, useState } from 'react';
import type { AdminRepo } from './repo';
import type { Customer, WorkTypeTemplate } from '../domain/types';

export function CreateWorkOrder({ repo, onCreated }: { repo: AdminRepo; onCreated?: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<WorkTypeTemplate[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [containerNo, setContainerNo] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeContact, setAssigneeContact] = useState('');
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    repo.listCustomers().then((c) => { setCustomers(c); setCustomerId(c[0]?.id ?? ''); });
    repo.listTemplates().then((t) => { setTemplates(t); setTemplateId(t[0]?.id ?? ''); });
  }, [repo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { workerToken } = await repo.createWorkOrder({
      customerId, templateId, containerNos: containerNo.split(',').map((s) => s.trim()).filter(Boolean),
      workDate: workDate || null, assigneeName, assigneeContact,
    });
    setLink(`${location.origin}/c/${workerToken}`);
    onCreated?.();
  }

  const field = { display: 'block', width: '100%', marginTop: 4, marginBottom: 12 } as const;
  return (
    <form onSubmit={submit} style={{ maxWidth: 420, fontFamily: 'Pretendard, sans-serif' }}>
      <label>거래처<select style={field} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>템플릿<select style={field} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label>컨테이너 번호<input style={field} value={containerNo} onChange={(e) => setContainerNo(e.target.value)} placeholder="TCLU1234567 (쉼표로 여러 개)" /></label>
      <label>작업일<input type="date" style={field} value={workDate} onChange={(e) => setWorkDate(e.target.value)} /></label>
      <label>담당자 이름<input style={field} value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} /></label>
      <label>담당자 연락처<input style={field} value={assigneeContact} onChange={(e) => setAssigneeContact(e.target.value)} /></label>
      <button type="submit" style={{ background: '#FF6A00', color: '#fff', border: 0, borderRadius: 10, padding: '10px 16px', fontWeight: 600 }}>작업 생성</button>
      {link && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: '#5A6B7D' }}>작업자 링크</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code data-testid="worker-link" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, wordBreak: 'break-all' }}>{link}</code>
            <button type="button" onClick={() => navigator.clipboard?.writeText(link)}>복사</button>
          </div>
        </div>
      )}
    </form>
  );
}
