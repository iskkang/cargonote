import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6 }}>
      <img
        src="/concheck_primary_logo_no_korean_transparent.png"
        alt="ConCheck"
        style={{
          height: 30, width: 'auto', display: 'block', alignSelf: 'flex-start',
          ...(dark ? { background: C.white, borderRadius: 8, padding: '5px 9px', boxShadow: '0 2px 8px rgba(15,27,38,.28)' } : null),
        }}
      />
      {tagline && <span style={{ fontFamily: FONT.sans, fontSize: 11, color: dark ? C.onDarkDim : C.text }}>{tagline}</span>}
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
    ? { background: C.teal, color: C.white, boxShadow: SH.primary }
    : { background: 'transparent', color: C.text, border: `1px solid ${C.line}` };
  return <button type={type} disabled={disabled} onClick={onClick} className={`cn-btn cn-btn-${variant}`} style={{ ...base, ...skin, ...style }}>{children}</button>;
}

export function Select({ value, onChange, options, ariaLabel }:
  { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const current = options.find((o) => o.value === value);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        style={{ ...inputStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current?.label ?? ''}</span>
        <span style={{ color: C.muted, marginLeft: 8, fontSize: 11 }}>▾</span>
      </button>
      {open && (
        <ul role="listbox" style={selMenu}>
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{ ...selItem, ...(o.value === value ? selItemActive : {}) }}>{o.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', style }: { height?: number | string; width?: number | string; style?: CSSProperties }) {
  return <div className="cn-skel" style={{ height, width, borderRadius: 8, ...style }} />;
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

const selMenu: CSSProperties = {
  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 30, listStyle: 'none', margin: 0, padding: 4,
  background: C.white, border: `1px solid ${C.line}`, borderRadius: R.md, boxShadow: SH.hover, maxHeight: 240, overflowY: 'auto',
};
const selItem: CSSProperties = { padding: '9px 11px', borderRadius: 8, fontSize: 14, color: C.textStrong, fontFamily: FONT.sans, cursor: 'pointer' };
const selItemActive: CSSProperties = { background: C.tealTint, color: C.tealStrong, fontWeight: 700 };
