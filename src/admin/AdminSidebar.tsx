import type { ReactNode } from 'react';
import { Brand, Button } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

export type AdminView = 'new' | 'board' | 'customers' | 'reports';

const Ico = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);
const ICONS: Record<AdminView, ReactNode> = {
  new: <Ico d="M12 5v14M5 12h14" />,
  board: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" style={{ flexShrink: 0 }}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  customers: <Ico d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
  reports: <Ico d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8M8 9h2" />,
};

const ITEMS: { key: AdminView; label: string; disabled?: boolean }[] = [
  { key: 'new', label: '새 작업' },
  { key: 'board', label: '작업 현황' },
  { key: 'customers', label: '거래처' },
  { key: 'reports', label: '리포트' },
];

export function AdminSidebar({
  view, onSelect, email, onSignOut,
}: {
  view: AdminView;
  onSelect: (v: AdminView) => void;
  email?: string | null;
  onSignOut: () => void;
}) {
  return (
    <aside style={sx.aside}>
      <div style={{ padding: '18px 16px 8px' }}>
        <Brand dark />
      </div>
      <nav style={{ padding: '10px 10px', flex: 1 }}>
        {ITEMS.map((it) => {
          const active = view === it.key;
          return (
            <button
              key={it.key}
              type="button"
              disabled={it.disabled}
              aria-current={active ? 'page' : undefined}
              onClick={() => !it.disabled && onSelect(it.key)}
              style={{
                ...sx.item,
                background: active ? C.teal : 'transparent',
                color: it.disabled ? C.onDarkDim : active ? C.white : C.onDark,
                cursor: it.disabled ? 'default' : 'pointer',
                opacity: it.disabled ? 0.55 : 1,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>{ICONS[it.key]}{it.label}</span>
              {it.disabled && <span style={sx.soon}>준비중</span>}
            </button>
          );
        })}
      </nav>
      <div style={sx.footer}>
        {email && (
          <div style={sx.profile}>
            <span style={sx.avatar}>{email[0]?.toUpperCase() ?? '?'}</span>
            <span style={{ minWidth: 0 }}>
              <div style={sx.profileEmail} title={email}>{email}</div>
              <div style={sx.profileRole}>사무실 관리자</div>
            </span>
          </div>
        )}
        <Button variant="ghost" onClick={onSignOut} style={{ width: '100%', color: C.onDarkDim, borderColor: 'rgba(159,178,194,.3)' }}>로그아웃</Button>
      </div>
    </aside>
  );
}

const sx = {
  aside: {
    width: 232, flexShrink: 0, minHeight: '100vh',
    background: C.navy, color: C.onDark,
    display: 'flex', flexDirection: 'column',
    fontFamily: FONT.sans,
  } as const,
  item: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    border: 0, borderRadius: 10, padding: '11px 14px', marginBottom: 4,
    fontFamily: FONT.sans, fontWeight: 600, fontSize: 14, textAlign: 'left' as const,
  } as const,
  soon: { fontSize: 10, fontWeight: 700, color: C.onDarkDim, border: `1px solid ${C.onDarkDim}`, borderRadius: 999, padding: '1px 7px' } as const,
  footer: { padding: '14px 16px', borderTop: '1px solid rgba(159,178,194,.18)' } as const,
  profile: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } as const,
  avatar: { width: 34, height: 34, borderRadius: 999, background: C.teal, color: C.white, fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as const,
  profileEmail: { fontSize: 12, color: C.onDark, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const } as const,
  profileRole: { fontSize: 11, color: C.onDarkDim } as const,
};
