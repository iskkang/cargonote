import { useState } from 'react';
import type { AuthDeps } from './session';
import { PageShell, Brand, Card, Button, Field, inputStyle } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

const FEATURES = ['무설치 촬영', '발행본 고정', '다국어 열람'];

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

  return (
    <PageShell>
      <div style={sx.top}>
        <Brand />
        <a href="/" style={sx.back}>← 소개 보기</a>
      </div>

      <div style={sx.center}>
        <Card style={{ width: '100%', maxWidth: 380, padding: 28 }}>
          <div style={sx.title}>관리자 로그인</div>
          <div style={sx.sub}>사무실 계정으로 로그인하세요.</div>
          <form onSubmit={submit}>
            <Field label="이메일">
              <input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </Field>
            <Field label="비밀번호">
              <input type="password" style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </Field>
            {error && <div style={sx.error}>{error}</div>}
            <Button type="submit" disabled={busy} style={{ width: '100%', marginTop: 4 }}>
              {busy ? '로그인 중…' : '로그인'}
            </Button>
          </form>
        </Card>

        <div style={sx.features}>
          {FEATURES.map((f, i) => (
            <span key={f} style={sx.feat}>
              {i > 0 && <span style={sx.sep}>·</span>}{f}
            </span>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

const sx = {
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1040, margin: '0 auto', padding: '20px 24px' } as const,
  back: { fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, color: C.text, textDecoration: 'none' } as const,
  center: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 18, padding: '6vh 24px 40px' } as const,
  title: { fontFamily: FONT.sans, fontSize: 20, fontWeight: 800, color: C.navy } as const,
  sub: { fontFamily: FONT.sans, fontSize: 13, color: C.text, margin: '4px 0 18px' } as const,
  error: { color: C.negative, fontSize: 13, margin: '0 0 10px' } as const,
  features: { display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, color: C.muted } as const,
  feat: { display: 'inline-flex', alignItems: 'center', gap: 8 } as const,
  sep: { color: C.line } as const,
};
