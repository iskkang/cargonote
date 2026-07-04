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

const STATES = [
  { label: '빈 컨테이너', level: 0 },
  { label: '절반 적입', level: 0.5 },
  { label: '만재', level: 1 },
  { label: '봉인', level: 1, sealed: true },
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
          <Button onClick={goLogin} style={sx.navBtn}>로그인 →</Button>
        </nav>

        {/* Hero */}
        <section className="lp-hero" style={sx.hero}>
          <div style={sx.heroCopy}>
            <span style={sx.kicker}>MTL · 컨테이너 작업 증빙</span>
            <h1 style={sx.h1}>컨테이너 작업 증빙,<br />한 링크로 끝낸다</h1>
            <p className="lp-lead" style={sx.lead}>
              이메일로 주고받던 적입 사진을 — 무설치 링크 촬영부터
              검수·발행, 수신자 열람까지 하나의 흐름으로.
            </p>
            <div className="lp-cta" style={sx.ctaRow}>
              <Button onClick={goLogin} style={sx.ctaBtn}>지금 시작</Button>
              <Button variant="ghost" onClick={goHow} style={sx.ctaBtn}>작동 방식</Button>
            </div>
          </div>

          {/* Proof card with container-state illustrations */}
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
              <div style={sx.stateRow}>
                {STATES.map((s) => <StateTile key={s.label} {...s} />)}
              </div>
              <div style={sx.proofFoot}>
                <span>발행 · 연태지점</span>
                <span style={{ color: C.tealStrong, fontWeight: 700 }}>🔒 발행본 고정</span>
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
              <div key={s} style={sx.step}>
                <span style={sx.stepNo}>{String(i + 1).padStart(2, '0')}</span>
                <span style={sx.stepLabel}>{s}</span>
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
          <Button onClick={goLogin} style={{ ...sx.ctaBtn, marginTop: 16 }}>관리자 로그인</Button>
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

/** Mini corrugated container showing an inspection state: fill level 0→1, optional seal. */
function StateTile({ label, level, sealed }: { label: string; level: number; sealed?: boolean }) {
  const ribs = [14, 22, 30, 38, 46];
  const bottom = 33, top = 33 - 20 * level;
  return (
    <div style={sx.stTile}>
      <svg viewBox="0 0 60 44" width="100%" style={{ display: 'block' }} aria-hidden="true">
        <rect x="4" y="9" width="52" height="26" rx="4" fill="#F4F8F9" stroke={C.teal} strokeWidth="2" />
        {ribs.map((x) => <line key={x} x1={x} y1="12" x2={x} y2="32" stroke={C.teal} strokeOpacity="0.16" strokeWidth="1.4" />)}
        {level > 0 && (
          <g>
            <rect x="7" y={top} width="46" height={bottom - top} rx="2" fill={C.caution} />
            <line x1="22" y1={top} x2="22" y2={bottom} stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" />
            <line x1="38" y1={top} x2="38" y2={bottom} stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" />
          </g>
        )}
        {sealed && (
          <g>
            <line x1="45" y1="10" x2="45" y2="34" stroke={C.tealHeavy} strokeWidth="1.5" />
            <rect x="47.5" y="16" width="3" height="4" rx="1.5" fill="none" stroke={C.negative} strokeWidth="1.4" />
            <circle cx="49" cy="23" r="4.2" fill={C.negative} />
          </g>
        )}
      </svg>
      <span style={sx.stLabel}>{label}</span>
    </div>
  );
}

const sx = {
  wrap: { maxWidth: 1040, margin: '0 auto', padding: '20px clamp(16px,4vw,24px) 40px' } as const,
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingBottom: 8 } as const,
  navBtn: { padding: '9px 14px', whiteSpace: 'nowrap' as const } as const,

  hero: { display: 'flex', gap: 'clamp(20px,4vw,36px)', alignItems: 'center', flexWrap: 'wrap' as const, padding: 'clamp(24px,5vw,44px) 0 24px' } as const,
  heroCopy: { flex: '1 1 340px', minWidth: 280 } as const,
  kicker: { display: 'inline-block', fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: C.teal, background: C.tealTint, borderRadius: R.pill, padding: '5px 12px' } as const,
  h1: { fontSize: 'clamp(28px,7vw,40px)', lineHeight: 1.18, letterSpacing: '-0.02em', color: C.navy, margin: '18px 0 0', fontWeight: 800 } as const,
  lead: { fontSize: 'clamp(15px,3.6vw,16px)', lineHeight: 1.6, color: C.text, margin: '16px 0 0', maxWidth: 460 } as const,
  ctaRow: { display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap' as const } as const,
  ctaBtn: { padding: '12px 22px', fontSize: 15 } as const,

  proofCard: { flex: '1 1 320px', minWidth: 288, maxWidth: 420, margin: '0 auto', background: C.brandNavy, borderRadius: R.xl, boxShadow: SH.dark, overflow: 'hidden' } as const,
  proofHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '18px 20px' } as const,
  proofKicker: { fontSize: 11, letterSpacing: '.08em', color: C.onDarkDim } as const,
  proofTitle: { fontSize: 18, fontWeight: 800, color: C.onDark, marginTop: 4 } as const,
  verified: { border: `2px solid ${C.tealBright}`, color: C.tealBright, borderRadius: 8, padding: '5px 9px', fontSize: 11, fontWeight: 800 } as const,
  proofBody: { background: C.white, margin: 10, borderRadius: R.lg, padding: 16 } as const,
  proofTiles: { display: 'flex', gap: 8 } as const,
  proofTile: { flex: 1, background: C.brandNavy, borderRadius: 10, padding: '10px 12px' } as const,
  stateRow: { display: 'flex', gap: 6, margin: '14px 0 4px' } as const,
  stTile: { flex: 1, textAlign: 'center' as const } as const,
  stLabel: { display: 'block', fontSize: 9.5, fontWeight: 700, color: C.text, marginTop: 4, whiteSpace: 'nowrap' as const } as const,
  proofFoot: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.text, paddingTop: 12, marginTop: 8, borderTop: `1px solid ${C.line}` } as const,

  section: { padding: 'clamp(22px,5vw,30px) 0' } as const,
  secHead: { fontSize: 'clamp(19px,5vw,22px)', fontWeight: 800, color: C.navy, letterSpacing: '-0.01em', marginBottom: 18 } as const,

  roleGrid: { display: 'flex', gap: 16, flexWrap: 'wrap' as const } as const,
  roleCard: { flex: '1 1 260px', minWidth: 240, background: C.white, border: `1px solid ${C.line}`, borderRadius: R.xl, boxShadow: SH.card, padding: 20 } as const,
  roleTagRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } as const,
  roleTag: { fontSize: 12, fontWeight: 700, color: C.teal, letterSpacing: '.04em' } as const,
  roleTitle: { fontSize: 17, fontWeight: 700, color: C.navy, lineHeight: 1.35 } as const,
  roleDesc: { fontSize: 13.5, lineHeight: 1.6, color: C.text, margin: '8px 0 14px' } as const,
  roleList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' as const, gap: 7 } as const,
  roleLi: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.textStrong } as const,
  dot: { width: 7, height: 7, borderRadius: 999, background: C.teal, flexShrink: 0 } as const,

  steps: { display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: 10 } as const,
  step: { display: 'flex', alignItems: 'center', gap: 10, background: C.white, border: `1px solid ${C.line}`, borderRadius: R.pill, padding: '10px 16px', boxShadow: SH.card } as const,
  stepNo: { fontFamily: FONT.sans, fontWeight: 800, fontSize: 12, color: C.white, background: C.teal, borderRadius: 999, padding: '2px 7px' } as const,
  stepLabel: { fontSize: 14, fontWeight: 700, color: C.navy } as const,

  featGrid: { display: 'flex', gap: 12, flexWrap: 'wrap' as const } as const,
  featCard: { flex: '1 1 200px', minWidth: 160, background: C.surfaceAlt, borderRadius: R.lg, padding: '16px 18px' } as const,
  featK: { fontSize: 15, fontWeight: 800, color: C.teal } as const,
  featV: { fontSize: 13, lineHeight: 1.55, color: C.text, marginTop: 6 } as const,

  cta: { textAlign: 'center' as const, background: C.brandNavy, borderRadius: R.xl, boxShadow: SH.dark, padding: 'clamp(28px,6vw,36px) 24px', margin: '20px 0' } as const,
  ctaTitle: { fontSize: 'clamp(20px,5.5vw,24px)', fontWeight: 800, color: C.onDark } as const,
  ctaSub: { fontSize: 14, color: C.onDarkDim, marginTop: 8 } as const,

  footer: { textAlign: 'center' as const, fontSize: 12, color: C.text, paddingTop: 16 } as const,
};
