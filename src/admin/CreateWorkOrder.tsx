import { useEffect, useState } from 'react';
import type { AdminRepo } from './repo';
import type { Customer, WorkTypeTemplate } from '../domain/types';
import { Field, Button, inputStyle } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

export function CreateWorkOrder({ repo, onCreated, onManageCustomers }: { repo: AdminRepo; onCreated?: () => void; onManageCustomers?: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<WorkTypeTemplate[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [containerNo, setContainerNo] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeContact, setAssigneeContact] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    repo.listCustomers().then((c) => { setCustomers(c); setCustomerId(c[0]?.id ?? ''); setReady(true); });
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

  return (
    <form onSubmit={submit} style={{ maxWidth: 440 }}>
      {ready && customers.length === 0 ? (
        <div style={{ marginBottom: 12, padding: '12px 14px', background: C.surfaceAlt, borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>먼저 거래처를 등록하세요.</div>
          {onManageCustomers && <Button variant="ghost" onClick={onManageCustomers}>거래처 관리로 이동</Button>}
        </div>
      ) : (
        <Field label="거래처"><select style={inputStyle} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      )}
      <Field label="템플릿"><select style={inputStyle} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
      <Field label="컨테이너 번호"><input style={inputStyle} value={containerNo} onChange={(e) => setContainerNo(e.target.value)} placeholder="TCLU1234567 (쉼표로 여러 개)" /></Field>
      <Field label="작업일"><input type="date" style={inputStyle} value={workDate} onChange={(e) => setWorkDate(e.target.value)} /></Field>
      <Field label="담당자 이름"><input style={inputStyle} value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} /></Field>
      <Field label="담당자 연락처"><input style={inputStyle} value={assigneeContact} onChange={(e) => setAssigneeContact(e.target.value)} /></Field>
      <Button type="submit" disabled={ready && customers.length === 0}>작업 생성</Button>
      {link && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: C.text }}>작업자 링크</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <code data-testid="worker-link" style={{ fontFamily: FONT.sans, fontSize: 12, wordBreak: 'break-all', color: C.navy }}>{link}</code>
            <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(link)} style={{ padding: '5px 10px' }}>복사</Button>
          </div>
        </div>
      )}
    </form>
  );
}
