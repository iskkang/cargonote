import type { CSSProperties, ReactNode } from 'react';
import { C, R, SH, FONT } from './tokens';

type Tone = 'positive' | 'caution' | 'negative' | 'neutral';
const TONE: Record<Tone, { fg: string; bg: string }> = {
  positive: { fg: C.positive, bg: C.positiveTint },
  caution: { fg: C.caution, bg: C.cautionTint },
  negative: { fg: C.negative, bg: C.negativeTint },
  neutral: { fg: C.text, bg: C.surfaceAlt },
};

export function PageShell({ children, tone = 'light', style }: { children: ReactNode; tone?: 'light' | 'dark'; style?: CSSProperties }) {
  const light = tone === 'light';
  return (
    <main style={{
      minHeight: '100vh',
      background: light ? `linear-gradient(180deg,${C.page1},${C.page2})` : C.navy,
      color: light ? C.textStrong : C.onDark,
      fontFamily: FONT.sans, ...style,
    }}>{children}</main>
  );
}

export function Brand({ tagline, dark }: { tagline?: string; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: dark ? C.orange : C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(15,27,38,.28)' }}>
        <div style={{ width: 15, height: 15, border: `2.6px solid ${dark ? C.navy : C.orange}`, borderRadius: 3 }} />
      </div>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontFamily: FONT.sans, fontWeight: 800, fontSize: 20, letterSpacing: '.02em', color: dark ? C.onDark : C.navy }}>CARGO<span style={{ color: C.orange }}>LINK</span></div>
        {tagline && <div style={{ fontSize: 11, color: dark ? C.onDarkDim : C.text, marginTop: 4 }}>{tagline}</div>}
      </div>
    </div>
  );
}

export function Card({ children, dark, style }: { children: ReactNode; dark?: boolean; style?: CSSProperties }) {
  return (
    <section style={{
      background: dark ? C.navy : C.white,
      color: dark ? C.onDark : C.textStrong,
      border: dark ? 'none' : `1px solid ${C.line}`,
      borderRadius: R.xl, boxShadow: dark ? SH.dark : SH.card, padding: 20, ...style,
    }}>{children}</section>
  );
}

export function Button({ children, variant = 'primary', type = 'button', disabled, onClick, style }:
  { children: ReactNode; variant?: 'primary' | 'ghost'; type?: 'button' | 'submit'; disabled?: boolean; onClick?: () => void; style?: CSSProperties }) {
  const base: CSSProperties = { fontFamily: FONT.sans, fontWeight: 600, borderRadius: R.md, padding: '9px 16px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1, border: 0 };
  const skin: CSSProperties = variant === 'primary'
    ? { background: C.orange, color: C.white, boxShadow: SH.primary }
    : { background: 'transparent', color: C.text, border: `1px solid ${C.line}` };
  return <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...skin, ...style }}>{children}</button>;
}

export function Badge({ children, tone = 'neutral', style }: { children: ReactNode; tone?: Tone; style?: CSSProperties }) {
  const t = TONE[tone];
  return <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 700, color: t.fg, background: t.bg, borderRadius: R.pill, padding: '4px 11px', ...style }}>{children}</span>;
}

export function Chip({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color: C.text, background: C.surfaceAlt, borderRadius: 6, padding: '5px 9px', fontFamily: FONT.sans, ...style }}>{children}</span>;
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: C.text }}>
      <div style={{ width: 44, height: 44, margin: '0 auto 14px', borderRadius: 12, background: C.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 18, height: 18, border: `2.4px solid ${C.muted}`, borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.textStrong }}>{title}</div>
      {hint && <div style={{ fontSize: 13, marginTop: 6 }}>{hint}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

export const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: R.md,
  border: `1px solid ${C.line}`, background: C.white, color: C.textStrong, fontSize: 14, fontFamily: FONT.sans,
};
