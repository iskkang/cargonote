# 디자인 다듬기(전 화면 통일) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 핸드오프(Wanted DS 인더스트리얼 리스킨)의 디자인 언어를 공용 디자인 시스템으로 만들고, 모든 화면(로그인/랜딩·콘솔·검토·작업자·수신자)을 그 언어로 통일한다. 빈 상태 안내를 추가하고, 로그인 화면에 프로토타입의 히어로·가치카드 톤을 반영한다.

**Architecture:** 새 의존성 없이 (1) 글로벌 CSS 토큰+폰트+베이스(`src/styles.css`), (2) JS 토큰(`src/ui/tokens.ts`) + 공용 React 프리미티브(`src/ui/kit.tsx`: PageShell·Brand·Card·Button·Badge·Chip·EmptyState·Field)를 만들고, 각 화면을 이 프리미티브로 리팩터한다. **모든 리팩터는 기존 테스트가 검증하는 텍스트·`data-testid`·역할(role)·label 연결을 그대로 보존**해 109개 테스트가 계속 통과해야 한다.

**Tech Stack:** React 18 + TypeScript + Vite, 인라인 스타일 + 글로벌 CSS(폰트: Pretendard/JetBrains Mono CDN). 새 의존성 없음.

## Global Constraints

- **새 의존성 금지.** Tailwind/CSS-in-JS 등 도입 안 함 — 토큰(ts) + 프리미티브(tsx) + 글로벌 CSS만.
- **디자인 토큰(핸드오프에서 확정):** orange `#FF6A00`(strong `#E55E00`, heavy `#CC5400`), navy `#0F1B26`, blue `#16334B/#1B3E5C/#22507A`, 페이지 그라데이션 `#D7DEE5→#C9D2DB`, on-dark `#E7ECF1/#9FB2C2`, text `#5A6B7D`, muted `#8895A2`, line `#E1E7ED`, surfaceAlt `#EEF2F5`, positive `#15A34A`(tint `#E6F6EC`), caution `#E0A100`(tint `#FBF1D6`), negative `#DC2626`(tint `#FCEAEA`). radius 7/10/14/16/999. 그림자 card `0 1px 3px rgba(15,27,38,.08)`, dark `0 14px 30px -16px rgba(15,27,38,.5)`, primary `0 8px 20px -8px rgba(255,106,0,.5)`. focus-ring `0 0 0 3px rgba(255,106,0,.26)`. **폰트 Pretendard만 사용**(JetBrains Mono 미로드·미참조; 코드/plate/워드마크도 Pretendard bold + letter-spacing으로). 새 폰트 로드는 Pretendard CDN 하나만.
- **테스트 불변식(보존 필수):** 각 리팩터는 아래를 그대로 유지 —
  - 로그인: `이메일`/`비밀번호` label이 input과 연결(`getByLabelText`), 버튼 `로그인`, 실패 시 `로그인 실패` 텍스트.
  - 콘솔: heading `관리자 콘솔`(role=heading), 버튼 `새 작업`·`작업 생성`, `MTL 지사` 표시, `data-testid="wo-row"`, `data-testid="worker-link"`, `복사`.
  - 검토: `뒤로` 버튼, 컨테이너번호 텍스트, 슬롯 label(`씰 번호` 등), `발행` 버튼, `data-testid="viewer-link"`, `n / N 촬영` 카운트.
  - 작업자: `거래처 링크`, 컨테이너 plate, warningText, `촬영`/`완료`/`제출`, `잘못된 링크입니다.`.
  - 수신자: 거래처·route 텍스트, 컨테이너번호, 사진 `alt`=label, `잘못된 링크입니다.`.
- **범위 밖:** `/spike`(App.tsx)는 iOS 검증용 개발 하네스라 리팩터하지 않음. 단 글로벌 `h1{color:#fff}` 제거 시 스파이크 heading이 안 보이지 않도록 App.tsx의 heading에 색만 명시(Task 1).
- **기능·데이터 흐름 변경 금지** — 순수 프레젠테이션 리팩터. props/repo/client 시그니처 불변.
- DRY, YAGNI, TDD, 빈번한 커밋.

---

## Task 1: 디자인 시스템 기반 (토큰 + 프리미티브 + 글로벌 CSS)

**Files:**
- Rewrite: `src/styles.css`
- Create: `src/ui/tokens.ts`, `src/ui/kit.tsx`
- Modify: `src/App.tsx` (스파이크 heading 색 명시 — 1줄)
- Test: `test/ui/kit.test.tsx`

**Interfaces:**
- Produces: `C`(colors), `R`(radii), `SH`(shadows), `FONT` from `tokens.ts`; `PageShell`, `Brand`, `Card`, `Button`, `Badge`, `Chip`, `EmptyState`, `Field` from `kit.tsx`.

- [ ] **Step 1: Write failing test**

`test/ui/kit.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { Badge, Button, Card, EmptyState, Field } from '../../src/ui/kit';

test('Badge renders its label', () => {
  render(<Badge tone="positive">완료</Badge>);
  expect(screen.getByText('완료')).toBeInTheDocument();
});

test('Button renders as a button with its label', () => {
  render(<Button>발행</Button>);
  expect(screen.getByRole('button', { name: '발행' })).toBeInTheDocument();
});

test('Card renders children', () => {
  render(<Card><span>내용</span></Card>);
  expect(screen.getByText('내용')).toBeInTheDocument();
});

test('Field associates its label with the input', () => {
  render(<Field label="이메일"><input type="email" /></Field>);
  expect(screen.getByLabelText('이메일')).toBeInTheDocument();
});

test('EmptyState shows title and hint', () => {
  render(<EmptyState title="아직 작업이 없습니다" hint="새 작업으로 시작하세요" />);
  expect(screen.getByText('아직 작업이 없습니다')).toBeInTheDocument();
  expect(screen.getByText('새 작업으로 시작하세요')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test, verify fail** — `npm test -- ui/kit` → FAIL.

- [ ] **Step 3: Implement tokens**

`src/ui/tokens.ts`:
```ts
export const C = {
  orange: '#FF6A00', orangeStrong: '#E55E00', orangeHeavy: '#CC5400',
  navy: '#0F1B26', blue50: '#16334B', blue45: '#1B3E5C', blue55: '#22507A',
  page1: '#D7DEE5', page2: '#C9D2DB',
  onDark: '#E7ECF1', onDarkDim: '#9FB2C2',
  text: '#5A6B7D', textStrong: '#0F1B26', muted: '#8895A2',
  line: '#E1E7ED', white: '#fff', surfaceAlt: '#EEF2F5',
  positive: '#15A34A', positiveTint: '#E6F6EC',
  caution: '#E0A100', cautionTint: '#FBF1D6',
  negative: '#DC2626', negativeTint: '#FCEAEA',
} as const;
export const R = { sm: 7, md: 10, lg: 14, xl: 16, pill: 999 } as const;
export const SH = {
  card: '0 1px 3px rgba(15,27,38,.08)',
  hover: '0 6px 18px -6px rgba(15,27,38,.25)',
  dark: '0 14px 30px -16px rgba(15,27,38,.5)',
  primary: '0 8px 20px -8px rgba(255,106,0,.5)',
} as const;
export const FONT = {
  sans: 'Pretendard, -apple-system, "Malgun Gothic", sans-serif',
} as const;
```

- [ ] **Step 4: Implement kit primitives**

`src/ui/kit.tsx`:
```tsx
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
```
> `Field` wraps its `children` in a `<label>` whose text is `label`, so `getByLabelText(label)` matches the contained input.

- [ ] **Step 5: Rewrite global CSS**

`src/styles.css`:
```css
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");

:root {
  --navy: #0F1B26; --orange: #FF6A00; --gray: #5A6B7D;
  --page-1: #D7DEE5; --page-2: #C9D2DB; --line: #E1E7ED;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { margin: 0; }
body {
  background: linear-gradient(180deg, var(--page-1), var(--page-2));
  color: var(--navy);
  font-family: Pretendard, -apple-system, "Malgun Gothic", sans-serif;
}
h1 { font-size: 20px; margin: 0; }   /* color inherited from the screen container */
:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(255,106,0,.26); border-radius: 6px; }
```
(Removed the global `h1{color:#fff}` — screens set their own text color.)

- [ ] **Step 6: Keep the spike heading visible**

In `src/App.tsx`, the capture-spike `<h1>캡처 스파이크</h1>` relied on the removed global white color. Add an explicit color so it stays visible on its dark background. Find the `<h1>` and give it `style={{ color: '#E7ECF1' }}` (or match its container's existing text color). One-line change; do not otherwise touch the spike.

- [ ] **Step 7: Run tests + build** — `npm test -- ui/kit` (5 pass) then `npm test` (full: still 109+5) then `npm run build` (clean).

- [ ] **Step 8: Commit**

```bash
git add src/ui/tokens.ts src/ui/kit.tsx src/styles.css src/App.tsx test/ui/kit.test.tsx
git commit -m "feat(ui): design tokens + kit primitives + global CSS (fonts, page gradient)"
```

---

## Task 2: 로그인/랜딩 (히어로 + 가치카드 + 로그인 카드)

**Files:**
- Modify: `src/auth/Login.tsx`
- Test: `test/auth/auth-gate.test.tsx` is UNCHANGED and must still pass.

**Interfaces:** Consumes `PageShell`, `Brand`, `Card`, `Button`, `Field`, `inputStyle` (`../ui/kit`), `C`/`FONT` (`../ui/tokens`).

**Preserve:** `이메일`/`비밀번호` label→input 연결, 버튼 `로그인`, 실패 시 `로그인 실패 …` 텍스트. `Login` props(`{ deps }`) 불변.

- [ ] **Step 1: Rewrite `Login.tsx`** — hero(브랜드+태그라인) + 3 가치카드(작업자/관리자/고객) + 로그인 카드. Full file:
```tsx
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
```

- [ ] **Step 2: Run tests** — `npm test -- auth-gate` (3 pass, unchanged).

- [ ] **Step 3: Commit**
```bash
git add src/auth/Login.tsx
git commit -m "feat(ui): login landing with hero + value cards"
```

---

## Task 3: 콘솔 + 보드 + 생성폼

**Files:** Modify `src/admin/AdminConsole.tsx`, `src/admin/WorkOrderBoard.tsx`, `src/admin/CreateWorkOrder.tsx`. (Optionally read `src/admin/status.ts` for status labels.)
**Test:** `test/admin/console.test.tsx`, `board.test.tsx`, `create.test.tsx`, `routes.test.tsx` UNCHANGED must pass.

**Preserve:** heading `관리자 콘솔`(role=heading), buttons `새 작업`/`작업 생성`/`로그아웃`/`복사`, `data-testid="wo-row"`, `data-testid="worker-link"`, board shows customer name (`MTL 지사`) + route + assignee + status label. `AdminConsole`/`WorkOrderBoard`/`CreateWorkOrder` props unchanged (incl. `WorkOrderBoard` optional `onSelect`).

- [ ] **Step 1: Refactor `WorkOrderBoard.tsx`** — card rows + status `Badge` + `EmptyState` when empty. Full file:
```tsx
import { useEffect, useState } from 'react';
import type { AdminRepo } from './repo';
import type { Customer, WorkOrder, WorkTypeTemplate, WorkOrderStatus } from '../domain/types';
import { statusLabel } from './status';
import { Badge, EmptyState, Chip } from '../ui/kit';
import { C } from '../ui/tokens';

const TONE: Record<WorkOrderStatus, 'neutral' | 'caution' | 'positive'> = {
  draft: 'neutral', sent: 'caution', in_progress: 'caution', submitted: 'caution', published: 'positive',
};

export function WorkOrderBoard({ repo, onSelect }: { repo: AdminRepo; onSelect?: (id: string) => void }) {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<WorkTypeTemplate[]>([]);
  useEffect(() => {
    repo.listWorkOrders().then(setOrders);
    repo.listCustomers().then(setCustomers);
    repo.listTemplates().then(setTemplates);
  }, [repo]);
  const custName = (id: string) => customers.find((c) => c.id === id)?.name ?? id;
  const tplRoute = (id: string) => templates.find((t) => t.id === id)?.route ?? id;

  if (orders.length === 0) {
    return <EmptyState title="아직 작업이 없습니다" hint="상단 ‘새 작업’으로 첫 작업 지시를 만드세요." />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {orders.map((o) => (
        <div key={o.id} data-testid="wo-row" onClick={() => onSelect?.(o.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, cursor: onSelect ? 'pointer' : 'default' }}>
          <Chip style={{ minWidth: 52, textAlign: 'center' }}>{tplRoute(o.templateId)}</Chip>
          <span style={{ flex: 1, fontWeight: 600, color: C.navy }}>{custName(o.customerId)}</span>
          <span style={{ fontSize: 13, color: C.text }}>{o.assigneeName}</span>
          <Badge tone={TONE[o.status]}>{statusLabel(o.status)}</Badge>
        </div>
      ))}
    </div>
  );
}
```
> Board no longer imports `FONT` (Pretendard-only; no mono).

- [ ] **Step 2: Refactor `CreateWorkOrder.tsx`** — use `Field`/`inputStyle`/`Button`. Keep submit logic, `worker-link` testid, `복사`. Full file:
```tsx
import { useEffect, useState } from 'react';
import type { AdminRepo } from './repo';
import type { Customer, WorkTypeTemplate } from '../domain/types';
import { Field, Button, inputStyle } from '../ui/kit';
import { C, FONT } from '../ui/tokens';

export function CreateWorkOrder({ repo, onCreated }: { repo: AdminRepo; onCreated?: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<WorkTypeTemplate[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [containerNo, setContainerNo] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeContact, setAssigneeContact] = useState('');
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    repo.listCustomers().then((c) => { setCustomers(c); setCustomerId(c[0]?.id ?? ''); });
    repo.listTemplates().then((t) => { setTemplates(t); setTemplateId(t[0]?.id ?? ''); });
  }, [repo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { workerToken } = await repo.createWorkOrder({
      customerId, templateId, containerNos: containerNo.split(',').map((s) => s.trim()).filter(Boolean),
      workDate: workDate || null, assigneeName, assigneeContact,
    });
    setLink(`${location.origin}/c/${workerToken}`);
    onCreated?.();
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 440 }}>
      <Field label="거래처"><select style={inputStyle} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="템플릿"><select style={inputStyle} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
      <Field label="컨테이너 번호"><input style={inputStyle} value={containerNo} onChange={(e) => setContainerNo(e.target.value)} placeholder="TCLU1234567 (쉼표로 여러 개)" /></Field>
      <Field label="작업일"><input type="date" style={inputStyle} value={workDate} onChange={(e) => setWorkDate(e.target.value)} /></Field>
      <Field label="담당자 이름"><input style={inputStyle} value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} /></Field>
      <Field label="담당자 연락처"><input style={inputStyle} value={assigneeContact} onChange={(e) => setAssigneeContact(e.target.value)} /></Field>
      <Button type="submit">작업 생성</Button>
      {link && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: C.text }}>작업자 링크</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <code data-testid="worker-link" style={{ fontFamily: FONT.sans, fontSize: 12, wordBreak: 'break-all', color: C.navy }}>{link}</code>
            <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(link)} style={{ padding: '5px 10px' }}>복사</Button>
          </div>
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 3: Refactor `AdminConsole.tsx`** — `PageShell` + branded header (`Brand` + `새 작업`/`로그아웃` Buttons) + `Card` sections. Keep `관리자 콘솔` heading, `selectedId`↔`ReviewPanel`, `onBack` refresh. Full file:
```tsx
import { useState } from 'react';
import { getAdminRepo } from './repoFactory';
import type { AdminRepo } from './repo';
import { WorkOrderBoard } from './WorkOrderBoard';
import { CreateWorkOrder } from './CreateWorkOrder';
import { ReviewPanel } from './ReviewPanel';
import { defaultAuthDeps } from '../auth/session';
import { PageShell, Brand, Card, Button } from '../ui/kit';
import { C } from '../ui/tokens';

export function AdminConsole({ repo = getAdminRepo() }: { repo?: AdminRepo } = {}) {
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <PageShell>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', background: C.white, borderBottom: `1px solid ${C.line}` }}>
        <Brand />
        <span style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => setCreating((v) => !v)}>새 작업</Button>
          <Button variant="ghost" onClick={() => defaultAuthDeps.signOut()}>로그아웃</Button>
        </span>
      </header>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 22 }}>
        <h1 style={{ fontSize: 20, color: C.navy }}>관리자 콘솔</h1>
        {selectedId ? (
          <ReviewPanel workOrderId={selectedId} repo={repo} onBack={() => { setSelectedId(null); setCreating(false); setRefreshKey((k) => k + 1); }} />
        ) : (
          <>
            {creating && <Card style={{ margin: '14px 0' }}><CreateWorkOrder repo={repo} onCreated={() => setRefreshKey((k) => k + 1)} /></Card>}
            <div style={{ marginTop: 14 }}>
              <WorkOrderBoard key={refreshKey} repo={repo} onSelect={setSelectedId} />
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
```

- [ ] **Step 4: Run tests + build** — `npm test -- admin routes` then `npm run build`. All pass.

- [ ] **Step 5: Commit**
```bash
git add src/admin/AdminConsole.tsx src/admin/WorkOrderBoard.tsx src/admin/CreateWorkOrder.tsx
git commit -m "feat(ui): polished console — card board, status badges, empty state"
```

---

## Task 4: 검토 패널

**Files:** Modify `src/admin/ReviewPanel.tsx`. **Test:** `test/admin/review-panel.test.tsx` UNCHANGED must pass.

**Preserve:** `뒤로` 버튼(role=button), 컨테이너 plate 텍스트, 슬롯 label(`씰 번호` 등), `n / N 촬영` 카운트, `발행` 버튼, `data-testid="viewer-link"`, `복사`, `signViewer`/`thumbUrls` props + publish 로직 불변(순수 프레젠테이션만).

- [ ] **Step 1: Refactor `ReviewPanel.tsx`** using `Card`/`Button`/`Badge`. Keep all logic (getWorkOrderReview effect, signViewer, buildViewerManifest, publish). Replace the presentational wrapper/styles with kit primitives; the container plate uses mono; per-container is a `Card`; checklist count uses `Badge` (positive when complete, else caution); thumbnails grid unchanged in behavior; publish button = `Button`; viewer-link block keeps `data-testid="viewer-link"` + `복사`. Preserve the exact texts. (Implementer: keep the component's props, state, effects, and the two `import`s for `buildViewerManifest`/`createSignedViewerUrls`/`createThumbUrls`; only swap the JSX presentation to kit primitives + tokens. Also replace any existing `'JetBrains Mono, monospace'` inline font with Pretendard/`FONT.sans` — Pretendard only, no mono anywhere.)

- [ ] **Step 2: Run tests + build** — `npm test -- review-panel` then `npm run build`. Pass.

- [ ] **Step 3: Commit**
```bash
git add src/admin/ReviewPanel.tsx
git commit -m "feat(ui): polished review panel (cards, status badges)"
```

---

## Task 5: 작업자 캡처 (다크)

**Files:** Modify `src/worker/WorkerCapture.tsx`. **Test:** `test/worker/worker-capture.test.tsx` UNCHANGED must pass.

**Preserve:** `거래처 링크 · {route}`, 컨테이너 plate, warningText, 필수 슬롯 label + instruction, `촬영`/`완료`, `n / N 촬영` 카운트, `제출`/`제출됨`/`누락 있음 — 그래도 제출`, `잘못된 링크입니다.`, error 텍스트. `client`/token 로직 불변.

- [ ] **Step 1: Refactor `WorkerCapture.tsx`** — dark theme polish via `PageShell tone="dark"` + `Brand dark` header; container plate as a navy plate (Pretendard bold + letter-spacing, NOT a mono font) + orange accent (per the phone-mockup look); required-slot rows with clear 촬영/완료 states (완료 = `Badge tone="positive"`); warning as a caution card; progress line; submit `Button` full-width. Keep ALL preserved texts + the `shoot`/`refresh`/`bootstrap` logic + `data`/props unchanged — presentation only. Replace any `'JetBrains Mono, monospace'` inline font with Pretendard/`FONT.sans`.

- [ ] **Step 2: Run tests + build** — `npm test -- worker-capture` then `npm run build`. Pass.

- [ ] **Step 3: Commit**
```bash
git add src/worker/WorkerCapture.tsx
git commit -m "feat(ui): polished worker capture (dark, plate, slot states)"
```

---

## Task 6: 수신자 갤러리 + 전체 스위트/빌드

**Files:** Modify `src/viewer/ViewerGallery.tsx`. **Test:** `test/viewer/viewer-gallery.test.tsx` + `test/admin/routes.test.tsx` UNCHANGED must pass.

**Preserve:** loading/ok/invalid states, 거래처·route 헤더 텍스트, 컨테이너번호, 사진 `alt`=label + `href`=displayUrl, `잘못된 링크입니다.`. `client` prop 로직 불변.

- [ ] **Step 1: Refactor `ViewerGallery.tsx`** — `PageShell` + `Brand` hero header (`{customer} · {route} 증빙`) + per-container `Card` with a plate (Pretendard bold + letter-spacing, no mono) + thumbnail grid (`<a href={displayUrl}><img alt={label}/></a>`), consistent radii/spacing. Invalid → centered "잘못된 링크입니다." Keep the bootstrap effect + states + all preserved texts.

- [ ] **Step 2: Run the FULL suite** — `npm test` → all pass (114 = 109 + 5 kit).

- [ ] **Step 3: Typecheck + build** — `npm run build` → `tsc -b` clean + vite build succeeds. Remove any unused imports flagged by tsc.

- [ ] **Step 4: Commit**
```bash
git add src/viewer/ViewerGallery.tsx
git commit -m "feat(ui): polished recipient gallery (hero header, card grid)"
```

---

## Manual Verification (라이브)

배포 후 눈으로 확인: 로그인 랜딩(히어로+가치카드), 콘솔(빈 상태 안내 → 작업 생성 시 카드 보드 + 상태 배지), 검토(카드+썸네일), 작업자(다크 plate), 수신자(갤러리 카드). 폰트가 Pretendard로 렌더되는지(mono 없음).

## Self-Review

- **Spec 커버:** 토큰+프리미티브(Task1) → 로그인 히어로(2) → 콘솔/보드/폼(3) → 검토(4) → 작업자(5) → 수신자(6). 빈 상태·랜딩 히어로 포함. 스파이크는 범위 밖(단 h1 색 보정).
- **회귀 방지:** 각 태스크가 보존해야 할 텍스트·testid·role·label을 명시. 기능/props/데이터 흐름 불변(순수 프레젠테이션). 기존 109 테스트 + kit 5 테스트 통과가 게이트.
- **Placeholder scan:** Task 1~3, 6은 완전한 코드. Task 4·5는 "프리미티브로 프레젠테이션만 교체 + 보존 목록"으로 지시(로직 코드가 이미 있고 재작성 위험이 커서, 전체 재작성 대신 프레젠테이션 스왑을 명시) — 구현자는 기존 로직을 보존하고 JSX만 kit으로 교체.
- **Type 일관성:** 모든 화면이 `src/ui/tokens.ts`·`kit.tsx` 단일 소스 사용. 미사용 import는 tsc에서 정리.
- **새 의존성 없음:** 폰트는 CSS `@import`(CDN), 나머지 인라인 스타일.
