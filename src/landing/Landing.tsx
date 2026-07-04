import { useNavigate } from 'react-router-dom';
import { PageShell, Brand, Button } from '../ui/kit';
import { C, R, SH, FONT } from '../ui/tokens';

const ROLES = [
  { tag: '작업자 · 현장', title: '설치 없이 사진만 찍는다', desc: '문자로 받은 링크를 열면 촬영 화면. 앱 설치도 로그인도 없이, 안내 순서대로 찍어 전송.', points: ['무설치 링크 촬영', '단계별 촬영 안내', '데미지 화물 별도 기록'] },
  { tag: '관리자 · 사무실', title: '상태를 한눈에 통제한다', desc: '작업 생성부터 링크·QR 발급, 사진 검수, 리포트 발행까지 한 화면에서.', points: ['컨테이너별 검수', '완료율·누락·데미지 표시', '발행본 고정'] },
  { tag: '수신자 · 해외', title: '로그인 없이 증빙을 본다', desc: '받은 링크 하나로 컨테이너 사진과 증빙을 열람. 도착지 언어로.', points: ['무로그인 갤러리', '4개 언어(한·영·중·러)', '사진 일괄 다운로드'] },
];

const STEPS = ['작업 생성', '링크·QR 발급', '현장 촬영', '사진 검수', '발행 · 열람'];

const FEATURES = [
  { k: '무설치', v: '링크로 바로 촬영 — 앱·로그인 불필요' },
  { k: '증빙 고정', v: '발행 시점 스냅샷으로 버전 고정' },
  { k: '다국어 열람', v: '수신 국가 언어로 리포트 확인' },
  { k: '데미지 증빙', v: '손상 화물을 현장에서 별도 촬영' },
];

export function Landing() {
  const nav = useNavigate();
  const goLogin = () => nav('/admin');
  const goHow = () => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <PageShell>
      <div style={sx.wrap}>
        {/* Top nav */}
        <nav style={sx.nav}>
          <Brand />
          <Button onClick={goLogin}>관리자 로그인 →</Button>
        </nav>

        {/* Hero */}
        <section style={sx.hero}>
          <div style={sx.heroCopy}>
            <span style={sx.kicker}>MTL · 컨테이너 작업 증빙</span>
            <h1 style={sx.h1}>컨테이너 작업 증빙,<br />한 링크로 끝낸다</h1>
            <p style={sx.lead}>
              이메일로 주고받던 적입 사진을 — 무설치 링크 촬영부터
              검수·발행, 수신자 열람까지 하나의 흐름으로.
            </p>
            <div style={sx.ctaRow}>
              <Button onClick={goLogin} style={{ padding: '12px 22px', fontSize: 15 }}>지금 시작</Button>
              <Button variant="ghost" onClick={goHow} style={{ padding: '12px 22px', fontSize: 15 }}>작동 방식</Button>
            </div>
          </div>

          {/* Proof card visual */}
          <div style={sx.proofCard}>
            <div style={sx.proofHead}>
              <div>
                <div style={sx.proofKicker}>CONCHECK 증빙 리포트</div>
                <div style={sx.proofTitle}>TSR 검수 · FBLU4204812</div>
              </div>
              <span style={sx.verified}>VERIFIED</span>
            </div>
            <div style={sx.proofBody}>
              <div style={sx.proofTiles}>
                <ProofTile label="완료율" value="100%" accent={C.positive} />
                <ProofTile label="사진" value="8/8" />
                <ProofTile label="데미지" value="0" />
              </div>
              <div style={sx.proofThumbs}>
                {[C.blue50, C.blue45, C.tealHeavy, C.blue55, C.tealStrong].map((bg, i) => (
                  <div key={i} style={{ ...sx.proofThumb, background: bg }} />
                ))}
              </div>
              <div style={sx.proofFoot}>
                <span>발행 · 연태지점</span>
                <span style={{ color: C.tealBright, fontWeight: 700 }}>🔒 발행본 고정</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3 roles */}
        <section style={sx.section}>
          <div style={sx.secHead}>세 사람, 하나의 흐름</div>
          <div style={sx.roleGrid}>
            {ROLES.map((r) => (
              <div key={r.tag} style={sx.roleCard}>
                <div style={sx.roleTagRow}>
                  <span style={sx.dot} />
                  <span style={sx.roleTag}>{r.tag}</span>
                </div>
                <div style={sx.roleTitle}>{r.title}</div>
                <p style={sx.roleDesc}>{r.desc}</p>
                <ul style={sx.roleList}>
                  {r.points.map((p) => (
                    <li key={p} style={sx.roleLi}><span style={sx.dot} />{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" style={sx.section}>
          <div style={sx.secHead}>작동 방식</div>
          <div style={sx.steps}>
            {STEPS.map((s, i) => (
              <div key={s} style={sx.stepWrap}>
                <div style={sx.step}>
                  <span style={sx.stepNo}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={sx.stepLabel}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <span style={sx.stepArrow}>→</span>}
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section style={sx.section}>
          <div style={sx.featGrid}>
            {FEATURES.map((f) => (
              <div key={f.k} style={sx.featCard}>
                <div style={sx.featK}>{f.k}</div>
                <div style={sx.featV}>{f.v}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section style={sx.cta}>
          <div style={sx.ctaTitle}>지금 첫 작업을 만들어 보세요</div>
          <div style={sx.ctaSub}>사무실 계정으로 로그인하면 바로 시작할 수 있습니다.</div>
          <Button onClick={goLogin} style={{ padding: '13px 26px', fontSize: 15, marginTop: 16 }}>관리자 로그인</Button>
        </section>

        <footer style={sx.footer}>© MTL · ConCheck — 컨테이너 작업 증빙 자동화</footer>
      </div>
    </PageShell>
  );
}

function ProofTile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={sx.proofTile}>
      <div style={{ fontSize: 10, color: C.onDarkDim }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: accent ?? C.onDark, marginTop: 2 }}>{value}</div>
    </div>
  );
}

const sx = {
  wrap: { maxWidth: 1040, margin: '0 auto', padding: '20px 24px 40px' } as const,
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 } as const,

  hero: { display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' as const, padding: '40px 0 24px' } as const,
  heroCopy: { flex: '1 1 340px', minWidth: 300 } as const,
  kicker: { display: 'inline-block', fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: C.teal, background: C.tealTint, borderRadius: R.pill, padding: '5px 12px' } as const,
  h1: { fontSize: 40, lineHeight: 1.18, letterSpacing: '-0.02em', color: C.navy, margin: '18px 0 0', fontWeight: 800 } as const,
  lead: { fontSize: 16, lineHeight: 1.6, color: C.text, margin: '16px 0 0', maxWidth: 460 } as const,
  ctaRow: { display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap' as const } as const,

  proofCard: { flex: '1 1 320px', minWidth: 300, maxWidth: 400, background: C.brandNavy, borderRadius: R.xl, boxShadow: SH.dark, overflow: 'hidden' } as const,
  proofHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '18px 20px' } as const,
  proofKicker: { fontSize: 11, letterSpacing: '.08em', color: C.onDarkDim } as const,
  proofTitle: { fontSize: 18, fontWeight: 800, color: C.onDark, marginTop: 4 } as const,
  verified: { border: `2px solid ${C.tealBright}`, color: C.tealBright, borderRadius: 8, padding: '5px 9px', fontSize: 11, fontWeight: 800 } as const,
  proofBody: { background: C.white, margin: 10, borderRadius: R.lg, padding: 16 } as const,
  proofTiles: { display: 'flex', gap: 8 } as const,
  proofTile: { flex: 1, background: C.brandNavy, borderRadius: 10, padding: '10px 12px' } as const,
  proofThumbs: { display: 'flex', gap: 6, margin: '12px 0' } as const,
  proofThumb: { flex: 1, height: 46, borderRadius: 6 } as const,
  proofFoot: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.text, paddingTop: 10, borderTop: `1px solid ${C.line}` } as const,

  section: { padding: '30px 0' } as const,
  secHead: { fontSize: 22, fontWeight: 800, color: C.navy, letterSpacing: '-0.01em', marginBottom: 18 } as const,

  roleGrid: { display: 'flex', gap: 16, flexWrap: 'wrap' as const } as const,
  roleCard: { flex: '1 1 260px', minWidth: 240, background: C.white, border: `1px solid ${C.line}`, borderRadius: R.xl, boxShadow: SH.card, padding: 20 } as const,
  roleTagRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } as const,
  roleTag: { fontSize: 12, fontWeight: 700, color: C.teal, letterSpacing: '.04em' } as const,
  roleTitle: { fontSize: 17, fontWeight: 700, color: C.navy, lineHeight: 1.35 } as const,
  roleDesc: { fontSize: 13.5, lineHeight: 1.6, color: C.text, margin: '8px 0 14px' } as const,
  roleList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' as const, gap: 7 } as const,
  roleLi: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.textStrong } as const,
  dot: { width: 7, height: 7, borderRadius: 999, background: C.teal, flexShrink: 0 } as const,

  steps: { display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: 8 } as const,
  stepWrap: { display: 'flex', alignItems: 'center', gap: 8 } as const,
  step: { display: 'flex', alignItems: 'center', gap: 10, background: C.white, border: `1px solid ${C.line}`, borderRadius: R.pill, padding: '10px 16px', boxShadow: SH.card } as const,
  stepNo: { fontFamily: FONT.sans, fontWeight: 800, fontSize: 12, color: C.white, background: C.teal, borderRadius: 999, padding: '2px 7px' } as const,
  stepLabel: { fontSize: 14, fontWeight: 700, color: C.navy } as const,
  stepArrow: { color: C.muted, fontWeight: 700 } as const,

  featGrid: { display: 'flex', gap: 12, flexWrap: 'wrap' as const } as const,
  featCard: { flex: '1 1 200px', minWidth: 180, background: C.surfaceAlt, borderRadius: R.lg, padding: '16px 18px' } as const,
  featK: { fontSize: 15, fontWeight: 800, color: C.teal } as const,
  featV: { fontSize: 13, lineHeight: 1.55, color: C.text, marginTop: 6 } as const,

  cta: { textAlign: 'center' as const, background: C.brandNavy, borderRadius: R.xl, boxShadow: SH.dark, padding: '36px 24px', margin: '20px 0' } as const,
  ctaTitle: { fontSize: 24, fontWeight: 800, color: C.onDark } as const,
  ctaSub: { fontSize: 14, color: C.onDarkDim, marginTop: 8 } as const,

  footer: { textAlign: 'center' as const, fontSize: 12, color: C.text, paddingTop: 16 } as const,
};
