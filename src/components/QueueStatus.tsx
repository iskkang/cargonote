export function QueueStatus({ pending, uploaded, online }: { pending: number; uploaded: number; online: boolean }) {
  return (
    <div data-testid="queue-status" style={{ marginTop: 16, fontSize: 14, color: '#9FB2C2' }}>
      <span style={{ color: online ? '#15A34A' : '#E0A100' }}>{online ? '온라인' : '오프라인'}</span>
      {' · '}대기 {pending} · 업로드 {uploaded}
    </div>
  );
}
