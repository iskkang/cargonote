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
          <div style={sx.heroArt}><ContainerArt /></div>
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

/** Corrugated shipping container with a doors end, seal check, and a floating proof chip. */
function ContainerArt() {
  const ribs = Array.from({ length: 11 }, (_, i) => 56 + i * 21);
  const corners: [number, number][] = [[40, 72], [362, 72], [40, 200], [362, 200]];
  return (
    <svg viewBox="0 0 420 288" width="100%" style={{ height: 'auto', display: 'block' }} role="img" aria-label="컨테이너 증빙 일러스트">
      <defs>
        <linearGradient id="cc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.tealBright} /><stop offset="1" stopColor={C.tealStrong} />
        </linearGradient>
        <linearGradient id="cc-rail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.tealStrong} /><stop offset="1" stopColor={C.tealHeavy} />
        </linearGradient>
        <filter id="cc-sh" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0F1B26" floodOpacity="0.26" />
        </filter>
      </defs>

      <ellipse cx="210" cy="248" rx="150" ry="15" fill="#0F1B26" opacity="0.12" />

      <g filter="url(#cc-sh)">
        <rect x="46" y="78" width="328" height="140" rx="9" fill="url(#cc-body)" />
        <rect x="46" y="78" width="328" height="18" rx="9" fill="url(#cc-rail)" />
        <rect x="46" y="200" width="328" height="18" rx="9" fill="url(#cc-rail)" />
        {ribs.map((x) => (
          <g key={x}>
            <rect x={x} y="98" width="7" height="102" fill="#ffffff" opacity="0.06" />
            <rect x={x + 7} y="98" width="3" height="102" fill="#0F1B26" opacity="0.10" />
          </g>
        ))}
        {/* doors end */}
        <rect x="300" y="96" width="74" height="106" fill="#0F1B26" opacity="0.06" />
        <line x1="300" y1="96" x2="300" y2="202" stroke="#0F1B26" strokeOpacity="0.18" strokeWidth="2" />
        {[318, 344].map((x) => (
          <g key={x}>
            <rect x={x} y="100" width="5" height="98" rx="2.5" fill={C.navy} opacity="0.5" />
            <rect x={x - 3} y="140" width="11" height="14" rx="3" fill={C.navy} opacity="0.68" />
          </g>
        ))}
        {/* seal check on the door */}
        <circle cx="331" cy="118" r="12" fill="#ffffff" />
        <path d="M325 118 l4 4 l8 -8" fill="none" stroke={C.positive} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {corners.map(([x, y], i) => <rect key={i} x={x} y={y} width="18" height="18" rx="3" fill={C.brandNavy} />)}
        <text x="66" y="126" fontFamily="ui-monospace, monospace" fontSize="15" fontWeight="700" fill="#ffffff" opacity="0.92">CONU 420481</text>
        <text x="66" y="150" fontFamily="ui-monospace, monospace" fontSize="11" fontWeight="700" fill="#ffffff" opacity="0.7">22G1 · TSR</text>
      </g>

      {/* floating proof chip */}
      <g filter="url(#cc-sh)">
        <rect x="236" y="28" width="152" height="46" rx="12" fill="#ffffff" />
        <circle cx="260" cy="51" r="12" fill={C.positive} />
        <path d="M254 51 l4 4 l8 -8" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <text x="280" y="47" fontFamily={FONT.sans} fontSize="12" fontWeight="700" fill={C.navy}>촬영 완료</text>
        <text x="280" y="64" fontFamily={FONT.sans} fontSize="12" fontWeight="800" fill={C.teal}>8 / 8 · VERIFIED</text>
      </g>
    </svg>
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
  heroArt: { flex: '1 1 300px', minWidth: 260, maxWidth: 460, margin: '0 auto' } as const,

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
