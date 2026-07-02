import { useEffect, useState } from 'react';
import type { AdminRepo } from './repo';
import type { Customer, WorkTypeTemplate } from '../domain/types';
import { Field, Button, inputStyle } from '../ui/kit';
import { C } from '../ui/tokens';
import { ShareLinkBar } from '../ui/ShareLinkBar';
import type { WorkOrderPreviewData } from './WorkOrderPreview';

export function CreateWorkOrder({ repo, onCreated, onManageCustomers, onPreviewChange }: {
  repo: AdminRepo; onCreated?: () => void; onManageCustomers?: () => void;
  onPreviewChange?: (p: WorkOrderPreviewData) => void;
}) {
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

  useEffect(() => {
    if (!onPreviewChange) return;
    const tpl = templates.find((t) => t.id === templateId);
    const required = tpl ? tpl.requiredPhotos.filter((s) => s.required).length || tpl.minCount : 0;
    onPreviewChange({
      customerName: customers.find((c) => c.id === customerId)?.name ?? '',
      route: tpl?.route ?? null,
      carrier: tpl?.carrier ?? null,
      containerNos: containerNo.split(',').map((s) => s.trim()).filter(Boolean),
      requiredCount: required,
    });
  }, [onPreviewChange, customers, templates, customerId, templateId, containerNo]);

  const containerNos = containerNo.split(',').map((s) => s.trim()).filter(Boolean);
  const canSubmit = customers.length > 0 && containerNos.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const { workerToken } = await repo.createWorkOrder({
      customerId, templateId, containerNos,
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
      {ready && customers.length > 0 && containerNos.length === 0 && (
        <div style={{ fontSize: 12, color: C.text, marginTop: -6, marginBottom: 12 }}>촬영할 컨테이너 번호를 1개 이상 입력하세요.</div>
      )}
      <Field label="작업일"><input type="date" style={inputStyle} value={workDate} onChange={(e) => setWorkDate(e.target.value)} /></Field>
      <Field label="담당자 이름"><input style={inputStyle} value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} /></Field>
      <Field label="담당자 연락처"><input style={inputStyle} value={assigneeContact} onChange={(e) => setAssigneeContact(e.target.value)} /></Field>
      <Button type="submit" disabled={ready && !canSubmit}>작업 생성</Button>
      {link && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: C.text, marginBottom: 2 }}>작업자에게 링크 보내기</div>
          <ShareLinkBar url={link} title="적입 검수 촬영 링크" testId="worker-link" />
        </div>
      )}
    </form>
  );
}
