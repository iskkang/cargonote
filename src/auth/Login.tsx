import { useState } from 'react';
import type { AuthDeps } from './session';
import { PageShell, Brand, Card, Button, Field, inputStyle } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

const PILLARS = [
  { h: 'H1', tag: '작업자 · 간단함', title: '현장은 사진만 찍는다', sub: '무설치 가이드 촬영 · 모바일' },
  { h: 'H2', tag: '관리자 · 통제', title: '상태 색으로 한눈에 통제', sub: '작업 생성 · 검수 · 발행' },
  { h: 'H3', tag: '고객 · 신뢰', title: '로그인 없이 증빙을 본다', sub: '공유 갤러리 · 체인오브커스터디' },
];

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
    <PageShell style={{ padding: '32px 24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <Brand tagline="컨테이너 작업 증빙 자동화" />
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 28, marginTop: 28, alignItems: 'start' }}>
          <div>
            <h1 style={{ fontSize: 30, lineHeight: 1.3, color: C.navy, letterSpacing: '-0.02em' }}>
              현장 촬영부터 수신자 열람까지,<br />한 링크로.
            </h1>
            <p style={{ color: C.text, fontSize: 15, marginTop: 10 }}>이메일 대신 링크. 지시·촬영·검수·발행·열람을 한 흐름으로.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 22 }}>
              {PILLARS.map((p) => (
                <Card key={p.h} style={{ padding: '15px 17px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                    <span style={{ fontFamily: FONT.sans, fontWeight: 800, fontSize: 13, color: C.orange }}>{p.h}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.text, letterSpacing: '.04em' }}>{p.tag}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, lineHeight: 1.35 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: C.text, marginTop: 4 }}>{p.sub}</div>
                </Card>
              ))}
            </div>
          </div>
          <Card style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.navy, marginBottom: 4 }}>관리자 로그인</div>
            <div style={{ fontSize: 12, color: C.text, marginBottom: 16 }}>사무실 계정으로 로그인하세요.</div>
            <form onSubmit={submit}>
              <Field label="이메일"><input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
              <Field label="비밀번호"><input type="password" style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
              {error && <div style={{ color: C.negative, fontSize: 13, marginBottom: 10 }}>{error}</div>}
              <Button type="submit" disabled={busy} style={{ width: '100%' }}>로그인</Button>
            </form>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
