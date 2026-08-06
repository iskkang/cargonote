export function QueueStatus({ pending, uploaded, online, errors = 0 }: { pending: number; uploaded: number; online: boolean; errors?: number }) {
  return (
    <div data-testid="queue-status" style={{ marginTop: 16, fontSize: 14, color: '#9FB2C2' }}>
      <span style={{ color: online ? '#15A34A' : '#E0A100' }}>{online ? 'オンライン' : 'オフライン'}</span>
      {' · '}待機 {pending} · アップロード済み {uploaded}
      {errors > 0 && <span style={{ color: '#DC2626' }}>{' · '}失敗 {errors}</span>}
    </div>
  );
}
