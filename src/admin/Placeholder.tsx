export function Placeholder({ title }: { title: string }) {
  return (
    <main style={{ padding: 24, fontFamily: 'Pretendard, sans-serif', color: '#E7ECF1' }}>
      <h1 style={{ color: '#fff' }}>{title}</h1>
      <p style={{ color: '#9FB2C2' }}>준비 중입니다.</p>
    </main>
  );
}
