import { Card } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

export interface WorkOrderPreviewData {
  customerName: string;
  route: string | null;
  carrier: string | null;
  containerNos: string[];
  requiredCount: number;
}

export function WorkOrderPreview({ data }: { data: WorkOrderPreviewData }) {
  const firstNo = data.containerNos[0] || 'CONTAINER No.';
  const extra = data.containerNos.length > 1 ? ` 외 ${data.containerNos.length - 1}` : '';
  return (
    <Card dark style={{ padding: 0, overflow: 'hidden' }}>
      <div style={sx.header}>작업자에게 전달될 링크 미리보기</div>
      <div style={{ padding: 18 }}>
        <div style={sx.plate}>
          <div style={sx.plateLabel}>CONTAINER No.</div>
          <div style={sx.plateNo}>{firstNo}{extra}</div>
        </div>
        <Row label="작업 유형" value={data.route ? `${data.route} 적입 검수` : '—'} />
        <Row label="거래처" value={data.customerName || '—'} />
        <Row label="캐리어" value={data.carrier || '—'} />
        <div style={sx.divider} />
        <Row label="필요 사진" value={`${data.requiredCount}장`} strong />
        <div style={sx.hint}>작업자는 이 링크만 누르면 앱 설치 없이 바로 촬영을 시작합니다.</div>
      </div>
    </Card>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={sx.row}>
      <span style={sx.rowLabel}>{label}</span>
      <span style={{ ...sx.rowValue, color: strong ? C.tealBright : C.onDark, fontWeight: strong ? 800 : 600 }}>{value}</span>
    </div>
  );
}

const sx = {
  header: { background: C.brandNavy, color: C.onDark, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, padding: '10px 18px' } as const,
  plate: { background: '#16242F', borderLeft: `4px solid ${C.teal}`, borderRadius: 10, padding: '12px 14px', marginBottom: 16 } as const,
  plateLabel: { fontFamily: FONT.sans, fontSize: 10, letterSpacing: '.12em', color: C.onDarkDim, marginBottom: 4 } as const,
  plateNo: { fontFamily: FONT.sans, fontWeight: 800, fontSize: 20, letterSpacing: '.06em', color: C.onDark } as const,
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', fontFamily: FONT.sans } as const,
  rowLabel: { fontSize: 13, color: C.onDarkDim } as const,
  rowValue: { fontSize: 13, color: C.onDark, fontWeight: 600 } as const,
  divider: { height: 1, background: 'rgba(159,178,194,.18)', margin: '8px 0' } as const,
  hint: { fontSize: 11, color: C.onDarkDim, marginTop: 14, lineHeight: 1.6, fontFamily: FONT.sans } as const,
};
