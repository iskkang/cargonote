import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { AdminRepo } from './repo';
import type { Customer, WorkTypeTemplate } from '../domain/types';
import { Field, Button, Card, inputStyle } from '../ui/kit';
import { C, FONT } from '../ui/tokens';
import { ShareLinkBar } from '../ui/ShareLinkBar';
import type { WorkOrderPreviewData } from './WorkOrderPreview';

export function CreateWorkOrder({ repo, onCreated, onManageCustomers, onPreviewChange, onDone }: {
  repo: AdminRepo; onCreated?: () => void; onManageCustomers?: () => void;
  onPreviewChange?: (p: WorkOrderPreviewData) => void; onDone?: () => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<WorkTypeTemplate[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [containerNo, setContainerNo] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeContact, setAssigneeContact] = useState('');
  const [created, setCreated] = useState<{ containerNo: string; customer: string; route: string | null; requiredCount: number; link: string } | null>(null);
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
  const selectedTpl = templates.find((t) => t.id === templateId);
  const requiredSlots = selectedTpl ? selectedTpl.requiredPhotos.filter((s) => s.required) : [];

  function reset() { setCreated(null); setContainerNo(''); setAssigneeName(''); setAssigneeContact(''); setWorkDate(''); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const { workerToken } = await repo.createWorkOrder({
      customerId, templateId, containerNos,
      workDate: workDate || null, assigneeName, assigneeContact,
    });
    const tpl = templates.find((t) => t.id === templateId);
    setCreated({
      containerNo: containerNos[0] + (containerNos.length > 1 ? ` 외 ${containerNos.length - 1}` : ''),
      customer: customers.find((c) => c.id === customerId)?.name ?? '',
      route: tpl?.route ?? null,
      requiredCount: tpl ? (tpl.requiredPhotos.filter((s) => s.required).length || tpl.minCount) : 0,
      link: `${location.origin}/c/${workerToken}`,
    });
    onCreated?.();
  }

  if (created) {
    return (
      <Card style={{ maxWidth: 560, border: `1px solid ${C.teal}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={crd.check}>✓</span>
          <strong style={{ color: C.navy, fontSize: 16 }}>링크가 발급되었습니다</strong>
        </div>
        <div style={{ fontSize: 13, color: C.text, marginBottom: 16 }}>작업자에게 카카오톡·문자로 보내거나 QR을 보여주세요.</div>
        <div style={crd.split}>
          <div style={crd.qrBox}>
            <QRCodeSVG value={created.link} size={148} bgColor="#ffffff" fgColor={C.navy} />
            <div style={{ fontSize: 12, color: C.text, marginTop: 8 }}>현장에서 스캔</div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={crd.plate}>
              <div style={crd.plateLabel}>CONTAINER No.</div>
              <div style={crd.plateNo}>{created.containerNo}</div>
            </div>
            <div style={{ fontSize: 12, color: C.text, marginBottom: 4 }}>작업자에게 링크 보내기</div>
            <ShareLinkBar url={created.link} title="적입 검수 촬영 링크" testId="worker-link" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={reset}>새 작업 하나 더</Button>
          {onDone && <Button onClick={onDone}>작업 현황으로 →</Button>}
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 480 }}>
      {ready && customers.length === 0 ? (
        <div style={{ marginBottom: 12, padding: '12px 14px', background: C.surfaceAlt, borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>먼저 거래처를 등록하세요.</div>
          {onManageCustomers && <Button variant="ghost" onClick={onManageCustomers}>거래처 관리로 이동</Button>}
        </div>
      ) : (
        <Field label="거래처"><select style={inputStyle} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      )}

      <Field label="작업 유형">
        <div style={crd.chips}>
          {templates.map((t) => (
            <button key={t.id} type="button" onClick={() => setTemplateId(t.id)}
              style={{ ...crd.chip, ...(t.id === templateId ? crd.chipActive : {}) }}>{t.name}</button>
          ))}
        </div>
      </Field>

      <Field label="컨테이너 번호"><input style={inputStyle} value={containerNo} onChange={(e) => setContainerNo(e.target.value)} placeholder="TCLU1234567 (쉼표로 여러 개)" /></Field>
      {ready && customers.length > 0 && containerNos.length === 0 && (
        <div style={{ fontSize: 12, color: C.text, marginTop: -6, marginBottom: 12 }}>촬영할 컨테이너 번호를 1개 이상 입력하세요.</div>
      )}

      {requiredSlots.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={crd.miniLabel}>필요 사진 · {requiredSlots.length}장</div>
          <div style={crd.chips}>
            {requiredSlots.map((s) => <span key={s.key} style={crd.photoChip}>{s.label}</span>)}
          </div>
        </div>
      )}

      <Field label="작업일"><input type="date" style={inputStyle} value={workDate} onChange={(e) => setWorkDate(e.target.value)} /></Field>
      <Field label="담당자 이름"><input style={inputStyle} value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} /></Field>
      <Field label="담당자 연락처"><input style={inputStyle} value={assigneeContact} onChange={(e) => setAssigneeContact(e.target.value)} /></Field>
      <Button type="submit" disabled={ready && !canSubmit}>링크·QR 발급하기</Button>
    </form>
  );
}

const crd = {
  check: { width: 24, height: 24, borderRadius: 999, background: C.tealTint, color: C.teal, fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' } as const,
  split: { display: 'flex', gap: 20, flexWrap: 'wrap' as const, alignItems: 'flex-start' } as const,
  qrBox: { background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, textAlign: 'center' as const, fontFamily: FONT.sans } as const,
  plate: { background: C.navy, borderLeft: `4px solid ${C.teal}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12 } as const,
  plateLabel: { fontFamily: FONT.sans, fontSize: 10, letterSpacing: '.12em', color: C.onDarkDim, marginBottom: 3 } as const,
  plateNo: { fontFamily: FONT.sans, fontWeight: 800, fontSize: 20, letterSpacing: '.04em', color: C.onDark } as const,
  chips: { display: 'flex', flexWrap: 'wrap' as const, gap: 8 } as const,
  chip: { fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 999, border: `1px solid ${C.line}`, background: C.white, color: C.text, cursor: 'pointer' } as const,
  chipActive: { background: C.navy, color: C.white, border: `1px solid ${C.navy}` } as const,
  miniLabel: { fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 } as const,
  photoChip: { fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999, border: `1px solid ${C.teal}`, color: C.teal, background: C.tealTint } as const,
};
