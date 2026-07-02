import { useState } from 'react';
import type { AuthDeps } from './session';

export function Login({ deps }: { deps: AuthDeps }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    try { await deps.signIn(email, password); }
    catch { setError('로그인 실패 — 이메일/비밀번호를 확인하세요.'); }
    finally { setBusy(false); }
  }

  const field = { display: 'block', width: '100%', marginTop: 4, marginBottom: 12, padding: 8 } as const;
  return (
    <main style={{ minHeight: '100vh', background: '#D7DEE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Pretendard, sans-serif' }}>
      <form onSubmit={submit} style={{ background: '#fff', borderRadius: 14, padding: 28, width: 320 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 18, marginBottom: 16 }}>CARGO<span style={{ color: '#FF6A00' }}>LINK</span></div>
        <label>이메일<input type="email" style={field} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>비밀번호<input type="password" style={field} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <button type="submit" disabled={busy} style={{ width: '100%', padding: 10, borderRadius: 10, border: 0, background: '#FF6A00', color: '#fff', fontWeight: 600, opacity: busy ? 0.6 : 1 }}>로그인</button>
      </form>
    </main>
  );
}
