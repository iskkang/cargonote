import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageShell, Brand, Button } from '../ui/kit';
import { C, R, SH, FONT } from '../ui/tokens';
import { T, LANGS, type Lang } from './i18n';

export function Landing() {
  const nav = useNavigate();
  const [lang, setLang] = useState<Lang>('ko');
  const t = T[lang];
  const goLogin = () => nav('/admin');
  const goHow = () => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <PageShell>
      <div style={sx.wrap}>
        {/* Top nav */}
        <nav style={sx.nav}>
          <Brand />
          <div style={sx.navRight}>
            <div style={sx.langBar}>
              {LANGS.map((l) => (
                <button key={l.code} type="button" onClick={() => setLang(l.code)}
                  style={{ ...sx.langBtn, ...(lang === l.code ? sx.langActive : {}) }}>{l.label}</button>
              ))}
            </div>
            <Button onClick={goLogin} style={sx.navBtn}>{t.login}</Button>
          </div>
        </nav>

        {/* Hero (premium dark card) */}
        <section style={sx.heroCard}>
          <div style={sx.glow} />
          <div style={sx.glow2} />
          <div className="lp-hero" style={sx.heroInner}>
            <div style={sx.heroCopy}>
              <span style={sx.kicker}>{t.kicker}</span>
              <h1 style={sx.h1}>{t.h1a}<br /><span style={sx.h1grad}>{t.h1b}</span></h1>
              <p className="lp-lead" style={sx.lead}>{t.lead}</p>
              <div className="lp-cta" style={sx.ctaRow}>
                <button type="button" onClick={goLogin} style={sx.primaryBtn}>{t.start}</button>
                <button type="button" onClick={goHow} style={sx.ghostBtn}>{t.how}</button>
              </div>
              <div style={sx.trust}>
                {t.trust.map((w) => (
                  <span key={w} style={sx.trustItem}><span style={sx.check}>✓</span>{w}</span>
                ))}
              </div>
            </div>
            <div style={sx.heroArt}><ContainerArt doneLabel={t.proofDone} /></div>
          </div>
        </section>

        {/* 3 roles */}
        <section style={sx.section}>
          <div style={sx.secHead}>{t.rolesHead}</div>
          <div style={sx.roleGrid}>
            {t.roles.map((r) => (
              <div key={r.tag} className="lp-card" style={sx.roleCard}>
                <div style={sx.roleTagRow}><span style={sx.dot} /><span style={sx.roleTag}>{r.tag}</span></div>
                <div style={sx.roleTitle}>{r.title}</div>
                <p style={sx.roleDesc}>{r.desc}</p>
                <ul style={sx.roleList}>
                  {r.points.map((p) => <li key={p} style={sx.roleLi}><span style={sx.dot} />{p}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" style={sx.section}>
          <div style={sx.secHead}>{t.stepsHead}</div>
          <div style={sx.steps}>
            {t.steps.map((s, i) => (
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
            {t.features.map((f) => (
              <div key={f.k} className="lp-card" style={sx.featCard}>
                <div style={sx.featK}>{f.k}</div>
                <div style={sx.featV}>{f.v}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section style={sx.cta}>
          <div style={sx.glow3} />
          <div style={sx.ctaTitle}>{t.ctaTitle}</div>
          <div style={sx.ctaSub}>{t.ctaSub}</div>
          <button type="button" onClick={goLogin} style={{ ...sx.primaryBtn, marginTop: 18 }}>{t.ctaBtn}</button>
        </section>

        <footer style={sx.footer}>© {t.footer}</footer>
      </div>
    </PageShell>
  );
}

/** Corrugated shipping container with a doors end, seal check, and a floating proof chip. */
function ContainerArt({ doneLabel }: { doneLabel: string }) {
  const ribs = Array.from({ length: 11 }, (_, i) => 56 + i * 21);
  const corners: [number, number][] = [[40, 72], [362, 72], [40, 200], [362, 200]];
  return (
    <svg viewBox="0 0 420 288" width="100%" style={{ height: 'auto', display: 'block' }} role="img" aria-label="container proof illustration">
      <defs>
        <linearGradient id="cc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.tealBright} /><stop offset="1" stopColor={C.tealStrong} />
        </linearGradient>
        <linearGradient id="cc-rail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.tealStrong} /><stop offset="1" stopColor={C.tealHeavy} />
        </linearGradient>
        <radialGradient id="cc-spot" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={C.tealBright} stopOpacity="0.35" /><stop offset="1" stopColor={C.tealBright} stopOpacity="0" />
        </radialGradient>
        <filter id="cc-sh" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000000" floodOpacity="0.32" />
        </filter>
      </defs>

      <ellipse cx="210" cy="244" rx="170" ry="34" fill="url(#cc-spot)" />

      <g filter="url(#cc-sh)">
        <rect x="46" y="78" width="328" height="140" rx="9" fill="url(#cc-body)" />
        <rect x="46" y="78" width="328" height="18" rx="9" fill="url(#cc-rail)" />
        <rect x="46" y="200" width="328" height="18" rx="9" fill="url(#cc-rail)" />
        {ribs.map((x) => (
          <g key={x}>
            <rect x={x} y="98" width="7" height="102" fill="#ffffff" opacity="0.07" />
            <rect x={x + 7} y="98" width="3" height="102" fill="#0F1B26" opacity="0.10" />
          </g>
        ))}
        <rect x="300" y="96" width="74" height="106" fill="#0F1B26" opacity="0.06" />
        <line x1="300" y1="96" x2="300" y2="202" stroke="#0F1B26" strokeOpacity="0.18" strokeWidth="2" />
        {[318, 344].map((x) => (
          <g key={x}>
            <rect x={x} y="100" width="5" height="98" rx="2.5" fill={C.navy} opacity="0.5" />
            <rect x={x - 3} y="140" width="11" height="14" rx="3" fill={C.navy} opacity="0.68" />
          </g>
        ))}
        <circle cx="331" cy="118" r="12" fill="#ffffff" />
        <path d="M325 118 l4 4 l8 -8" fill="none" stroke={C.positive} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {corners.map(([x, y], i) => <rect key={i} x={x} y={y} width="18" height="18" rx="3" fill={C.brandNavy} />)}
        <text x="66" y="126" fontFamily="ui-monospace, monospace" fontSize="15" fontWeight="700" fill="#ffffff" opacity="0.92">TCLU 765432</text>
        <text x="66" y="150" fontFamily="ui-monospace, monospace" fontSize="11" fontWeight="700" fill="#ffffff" opacity="0.7">22G1 · 40ft HC</text>
      </g>

      <g filter="url(#cc-sh)">
        <rect x="232" y="26" width="164" height="46" rx="12" fill="#ffffff" />
        <circle cx="256" cy="49" r="12" fill={C.positive} />
        <path d="M250 49 l4 4 l8 -8" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <text x="276" y="45" fontFamily={FONT.sans} fontSize="12" fontWeight="700" fill={C.navy}>{doneLabel}</text>
        <text x="276" y="62" fontFamily={FONT.sans} fontSize="12" fontWeight="800" fill={C.teal}>8 / 8 · VERIFIED</text>
      </g>
    </svg>
  );
}

const sx = {
  wrap: { maxWidth: 1060, margin: '0 auto', padding: '18px clamp(16px,4vw,24px) 40px' } as const,
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingBottom: 14 } as const,
  navRight: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const } as const,
  langBar: { display: 'inline-flex', gap: 3, background: C.white, border: `1px solid ${C.line}`, borderRadius: 999, padding: 3 } as const,
  langBtn: { fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, border: 0, background: 'transparent', color: C.text, cursor: 'pointer' } as const,
  langActive: { background: C.navy, color: C.white } as const,
  navBtn: { padding: '9px 14px', whiteSpace: 'nowrap' as const } as const,

  // Premium dark hero card
  heroCard: { position: 'relative' as const, overflow: 'hidden', borderRadius: 24, background: `linear-gradient(135deg, ${C.brandNavy} 0%, ${C.navy} 100%)`, boxShadow: '0 30px 60px -30px rgba(11,34,71,.7)', border: '1px solid rgba(255,255,255,.06)', padding: 'clamp(28px,5vw,52px)' } as const,
  glow: { position: 'absolute' as const, top: -120, right: -80, width: 420, height: 420, background: `radial-gradient(circle, ${C.tealBright}55, transparent 62%)`, pointerEvents: 'none' as const } as const,
  glow2: { position: 'absolute' as const, bottom: -160, left: -120, width: 420, height: 420, background: 'radial-gradient(circle, rgba(34,80,122,.5), transparent 65%)', pointerEvents: 'none' as const } as const,
  heroInner: { position: 'relative' as const, display: 'flex', gap: 'clamp(24px,4vw,40px)', alignItems: 'center', flexWrap: 'wrap' as const } as const,
  heroCopy: { flex: '1 1 340px', minWidth: 280 } as const,
  kicker: { display: 'inline-block', fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: C.tealBright, background: 'rgba(22,169,176,.14)', border: '1px solid rgba(22,169,176,.3)', borderRadius: R.pill, padding: '5px 13px' } as const,
  h1: { fontSize: 'clamp(30px,7vw,46px)', lineHeight: 1.14, letterSpacing: '-0.02em', color: C.onDark, margin: '18px 0 0', fontWeight: 800 } as const,
  h1grad: { backgroundImage: `linear-gradient(90deg, ${C.tealBright}, #86E6EA)`, WebkitBackgroundClip: 'text', backgroundClip: 'text' as const, color: 'transparent', WebkitTextFillColor: 'transparent' } as const,
  lead: { fontSize: 'clamp(15px,3.6vw,17px)', lineHeight: 1.6, color: C.onDarkDim, margin: '18px 0 0', maxWidth: 480 } as const,
  ctaRow: { display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' as const } as const,
  primaryBtn: { fontFamily: FONT.sans, fontWeight: 700, fontSize: 15, color: C.white, border: 0, borderRadius: R.md, padding: '13px 26px', cursor: 'pointer', background: `linear-gradient(135deg, ${C.tealBright}, ${C.teal})`, boxShadow: '0 12px 26px -10px rgba(1,136,143,.7)' } as const,
  ghostBtn: { fontFamily: FONT.sans, fontWeight: 700, fontSize: 15, color: C.onDark, borderRadius: R.md, padding: '13px 24px', cursor: 'pointer', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.22)' } as const,
  trust: { display: 'flex', flexWrap: 'wrap' as const, gap: '10px 18px', marginTop: 26 } as const,
  trustItem: { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: C.onDarkDim } as const,
  check: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 999, background: 'rgba(22,169,176,.2)', color: C.tealBright, fontSize: 10, fontWeight: 800 } as const,
  heroArt: { flex: '1 1 300px', minWidth: 260, maxWidth: 460, margin: '0 auto' } as const,

  section: { padding: 'clamp(24px,5vw,34px) 0' } as const,
  secHead: { fontSize: 'clamp(20px,5vw,24px)', fontWeight: 800, color: C.navy, letterSpacing: '-0.01em', marginBottom: 20 } as const,

  roleGrid: { display: 'flex', gap: 16, flexWrap: 'wrap' as const } as const,
  roleCard: { flex: '1 1 260px', minWidth: 240, background: C.white, border: `1px solid ${C.line}`, borderRadius: R.xl, boxShadow: SH.card, padding: 22 } as const,
  roleTagRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } as const,
  roleTag: { fontSize: 12, fontWeight: 700, color: C.teal, letterSpacing: '.04em' } as const,
  roleTitle: { fontSize: 17, fontWeight: 700, color: C.navy, lineHeight: 1.35 } as const,
  roleDesc: { fontSize: 13.5, lineHeight: 1.6, color: C.text, margin: '8px 0 14px' } as const,
  roleList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' as const, gap: 7 } as const,
  roleLi: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.textStrong } as const,
  dot: { width: 7, height: 7, borderRadius: 999, background: C.teal, flexShrink: 0 } as const,

  steps: { display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: 10 } as const,
  step: { display: 'flex', alignItems: 'center', gap: 10, background: C.white, border: `1px solid ${C.line}`, borderRadius: R.pill, padding: '10px 16px', boxShadow: SH.card } as const,
  stepNo: { fontFamily: FONT.sans, fontWeight: 800, fontSize: 12, color: C.white, background: `linear-gradient(135deg, ${C.tealBright}, ${C.teal})`, borderRadius: 999, padding: '2px 7px' } as const,
  stepLabel: { fontSize: 14, fontWeight: 700, color: C.navy } as const,

  featGrid: { display: 'flex', gap: 12, flexWrap: 'wrap' as const } as const,
  featCard: { flex: '1 1 210px', minWidth: 170, background: C.white, border: `1px solid ${C.line}`, borderRadius: R.lg, padding: '18px 18px', boxShadow: SH.card } as const,
  featK: { fontSize: 15, fontWeight: 800, color: C.teal } as const,
  featV: { fontSize: 13, lineHeight: 1.55, color: C.text, marginTop: 6 } as const,

  cta: { position: 'relative' as const, overflow: 'hidden', textAlign: 'center' as const, background: `linear-gradient(135deg, ${C.brandNavy}, ${C.navy})`, borderRadius: 22, boxShadow: '0 30px 60px -30px rgba(11,34,71,.7)', padding: 'clamp(30px,6vw,44px) 24px', margin: '24px 0' } as const,
  glow3: { position: 'absolute' as const, top: -140, left: '50%', width: 460, height: 320, transform: 'translateX(-50%)', background: `radial-gradient(circle, ${C.tealBright}40, transparent 62%)`, pointerEvents: 'none' as const } as const,
  ctaTitle: { position: 'relative' as const, fontSize: 'clamp(22px,5.5vw,28px)', fontWeight: 800, color: C.onDark } as const,
  ctaSub: { position: 'relative' as const, fontSize: 14, color: C.onDarkDim, marginTop: 10 } as const,

  footer: { textAlign: 'center' as const, fontSize: 12, color: C.text, paddingTop: 18 } as const,
};
