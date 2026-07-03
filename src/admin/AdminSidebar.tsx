import { Brand, Button } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

export type AdminView = 'new' | 'board' | 'customers' | 'reports';

const ITEMS: { key: AdminView; label: string; disabled?: boolean }[] = [
  { key: 'new', label: '새 작업' },
  { key: 'board', label: '작업 현황' },
  { key: 'customers', label: '거래처' },
  { key: 'reports', label: '리포트', disabled: true },
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
              <span>{it.label}</span>
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
