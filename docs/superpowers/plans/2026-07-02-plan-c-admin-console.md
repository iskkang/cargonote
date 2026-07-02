# Plan C — 관리자 콘솔 (dispatch half) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사무실이 작업을 만들고 배정하는 진입점을 만든다 — 라우팅 셸 + 인메모리 admin 데이터 계층(TSR/TCR 시드) + 작업현황 보드 + 작업지시 생성 폼 + 작업자 토큰 링크 발급. Supabase 없이 목 데이터로 완전 동작하며, 나중에 Supabase 구현으로 repo만 교체.

**Architecture:** react-router로 멀티 스크린 구조 도입(`/admin` 콘솔, `/spike` 기존 캡처 스파이크, `/c/:token`·`/v/:token` 스텁 — Plan D/E 자리). 데이터는 `AdminRepo` 인터페이스에 의존하고 이번엔 **인메모리 구현**(Plan A의 StorageLike/SyncDeps 주입 패턴과 동일)을 씀 — Supabase 연결 시 `SupabaseAdminRepo`로 교체. UI는 주입된 repo로 렌더/테스트. 디자인은 CargoLink 토큰(navy `#0F1B26`/orange `#FF6A00`, Pretendard + JetBrains Mono)을 적용하되 특정 프로토타입 픽셀 재현은 하지 않는다(후속에서 정밀화 가능).

**Tech Stack:** React 18 · react-router-dom 6 · TypeScript · Vitest + @testing-library/react · 기존 `src/domain` 타입(Plan B).

## Global Constraints

- **Supabase 미사용(이번 플랜).** 데이터는 `AdminRepo` 인터페이스 + 인메모리 구현. 실제 Supabase 연동은 Supabase-연결 플랜.
- 작업지시 필드 = 스펙: 거래처(customer) · 템플릿(TSR/TCR) · 컨테이너 번호(1..N) · 작업일 · 담당자(이름/연락처). 생성 시 상태 `sent` + **작업자 토큰 링크** 발급.
- 상태 = `draft|sent|in_progress|submitted|published` (Plan B `WorkOrderStatus`). 상태별 색으로 통제(스펙 H2).
- 토큰 = 무작위 URL-safe 문자열; 작업자 링크 = `/c/{token}`, 수신자 링크 = `/v/{token}`(후속).
- 도메인 타입은 **Plan B `src/domain`** 재사용(중복 정의 금지). 템플릿 소비는 `parseTemplate` 경유 습관(원장 후속노트).
- 디자인 토큰: navy `#0F1B26`·오렌지 `#FF6A00`·보조 `#5A6B7D`·성공 `#15A34A`·주의 `#E0A100`·실패 `#DC2626`; 로고/번호/코드 = JetBrains Mono.
- **Netlify SPA 폴백 필수**(라우팅 도입 → 딥링크/새로고침 위해 `/* -> /index.html 200`).
- 기존 캡처 스파이크(Plan A)는 `/spike`에서 계속 접근 가능해야 한다(iOS Task 9용).
- Node ≥ 20, npm. 컴포넌트 테스트는 기본 jsdom.

## File Structure

```
cargonote/
  public/_redirects              # Netlify SPA fallback
  src/
    main.tsx                     # (수정) BrowserRouter + AppRoutes 렌더
    routes.tsx                   # 라우트 정의
    App.tsx                      # (기존 캡처 스파이크 — 그대로, /spike 라우트)
    admin/
      repo.ts                    # AdminRepo 인터페이스 + InMemoryAdminRepo(시드)
      status.ts                  # statusLabel/statusColor (순수)
      token.ts                   # randomToken (순수)
      AdminConsole.tsx           # 콘솔 페이지(보드 + 새 작업)
      WorkOrderBoard.tsx         # 작업현황 보드
      CreateWorkOrder.tsx        # 작업지시 생성 폼 + 링크 발급
      Placeholder.tsx            # /c /v 스텁 페이지
  test/
    admin/
      repo.test.ts
      status.test.ts
      token.test.ts
      board.test.tsx
      create.test.tsx
      routes.test.tsx
```

---

### Task 1: 라우팅 셸 + Netlify SPA 폴백

**Files:**
- Modify: `package.json`(add react-router-dom), `src/main.tsx`
- Create: `src/routes.tsx`, `src/admin/AdminConsole.tsx`(stub), `src/admin/Placeholder.tsx`, `public/_redirects`, `test/admin/routes.test.tsx`

**Interfaces:**
- Produces: `<AppRoutes/>` with routes — `/` → redirect `/admin`; `/admin` → `<AdminConsole/>`; `/spike` → `<App/>`(기존 캡처); `/c/:token`·`/v/:token` → `<Placeholder/>`.

- [ ] **Step 1: 의존성 추가**

Run: `npm install react-router-dom@^6.26.0`
Expected: 설치 성공.

- [ ] **Step 2: 실패 테스트 작성**

`test/admin/routes.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../src/routes';

test('renders the admin console at /admin', () => {
  render(<MemoryRouter initialEntries={['/admin']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: /관리자 콘솔/ })).toBeInTheDocument();
});

test('renders the capture spike at /spike', () => {
  render(<MemoryRouter initialEntries={['/spike']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: /캡처 스파이크/ })).toBeInTheDocument();
});

test('renders a placeholder for a worker capture link', () => {
  render(<MemoryRouter initialEntries={['/c/abc123']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByText(/준비 중/)).toBeInTheDocument();
});
```

- [ ] **Step 3: 실행 → 실패 확인**

Run: `npx vitest run test/admin/routes.test.tsx`
Expected: FAIL — `../../src/routes` 없음.

- [ ] **Step 4: 구현**

`src/admin/Placeholder.tsx`:
```tsx
export function Placeholder({ title }: { title: string }) {
  return (
    <main style={{ padding: 24, fontFamily: 'Pretendard, sans-serif', color: '#E7ECF1' }}>
      <h1 style={{ color: '#fff' }}>{title}</h1>
      <p style={{ color: '#9FB2C2' }}>준비 중입니다.</p>
    </main>
  );
}
```

`src/admin/AdminConsole.tsx` (stub — Task 5에서 확장):
```tsx
export function AdminConsole() {
  return (
    <main style={{ padding: 24, fontFamily: 'Pretendard, sans-serif', color: '#0F1B26' }}>
      <h1>관리자 콘솔</h1>
    </main>
  );
}
```

`src/routes.tsx`:
```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { AdminConsole } from './admin/AdminConsole';
import { Placeholder } from './admin/Placeholder';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<AdminConsole />} />
      <Route path="/spike" element={<App />} />
      <Route path="/c/:token" element={<Placeholder title="작업자 촬영" />} />
      <Route path="/v/:token" element={<Placeholder title="증빙 갤러리" />} />
      <Route path="*" element={<Placeholder title="페이지 없음" />} />
    </Routes>
  );
}
```

`src/main.tsx` (교체):
```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter><AppRoutes /></BrowserRouter>
  </React.StrictMode>,
);
```

`public/_redirects`:
```
/*    /index.html   200
```

- [ ] **Step 5: 실행 → 통과 확인**

Run: `npx vitest run test/admin/routes.test.tsx`
Expected: PASS (3 passed). Then full `npm test` → all green(기존 26 + 3), pristine. `npm run build` → 성공(`dist/_redirects` 포함).

- [ ] **Step 6: 커밋**

```bash
git add package.json package-lock.json src/main.tsx src/routes.tsx src/admin/AdminConsole.tsx src/admin/Placeholder.tsx public/_redirects test/admin/routes.test.tsx
git commit -m "feat: react-router shell (/admin, /spike, token stubs) + netlify SPA fallback"
```

---

### Task 2: Admin 데이터 계층 + 상태/토큰 유틸

**Files:**
- Create: `src/admin/token.ts`, `src/admin/status.ts`, `src/admin/repo.ts`, `test/admin/token.test.ts`, `test/admin/status.test.ts`, `test/admin/repo.test.ts`

**Interfaces:**
- `token.ts`: `export function randomToken(len?: number): string` — URL-safe(A–Za–z0–9), 기본 20자.
- `status.ts`: `export function statusLabel(s: WorkOrderStatus): string`; `export function statusColor(s: WorkOrderStatus): string`(디자인 토큰 hex).
- `repo.ts`:
```ts
export interface NewWorkOrder { customerId: string; templateId: string; containerNos: string[]; workDate: string | null; assigneeName: string; assigneeContact: string; }
export interface AdminRepo {
  listCustomers(): Promise<Customer[]>;
  listTemplates(): Promise<WorkTypeTemplate[]>;
  listWorkOrders(): Promise<WorkOrder[]>;
  createWorkOrder(input: NewWorkOrder): Promise<{ order: WorkOrder; workerToken: string }>;
}
export function createInMemoryAdminRepo(): AdminRepo; // TSR/TCR 템플릿 + 샘플 거래처/작업 시드
```

- [ ] **Step 1: 실패 테스트 작성**

`test/admin/token.test.ts`:
```ts
import { randomToken } from '../../src/admin/token';
test('produces a url-safe token of the requested length', () => {
  const t = randomToken(24);
  expect(t).toHaveLength(24);
  expect(t).toMatch(/^[A-Za-z0-9]+$/);
});
test('produces different tokens', () => {
  expect(randomToken()).not.toBe(randomToken());
});
```

`test/admin/status.test.ts`:
```ts
import { statusLabel, statusColor } from '../../src/admin/status';
test('maps every status to a Korean label', () => {
  expect(statusLabel('draft')).toBe('작성 중');
  expect(statusLabel('sent')).toBe('전송됨');
  expect(statusLabel('in_progress')).toBe('진행 중');
  expect(statusLabel('submitted')).toBe('제출됨');
  expect(statusLabel('published')).toBe('발행됨');
});
test('published is the success color, submitted the caution color', () => {
  expect(statusColor('published')).toBe('#15A34A');
  expect(statusColor('submitted')).toBe('#E0A100');
});
```

`test/admin/repo.test.ts`:
```ts
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('seeds the TSR and TCR templates', async () => {
  const repo = createInMemoryAdminRepo();
  const routes = (await repo.listTemplates()).map((t) => t.route).sort();
  expect(routes).toEqual(['TCR', 'TSR']);
});

test('seeds at least one customer and some work orders', async () => {
  const repo = createInMemoryAdminRepo();
  expect((await repo.listCustomers()).length).toBeGreaterThan(0);
  expect((await repo.listWorkOrders()).length).toBeGreaterThan(0);
});

test('createWorkOrder adds a sent order and returns a worker token', async () => {
  const repo = createInMemoryAdminRepo();
  const [cust] = await repo.listCustomers();
  const [tpl] = await repo.listTemplates();
  const before = (await repo.listWorkOrders()).length;
  const { order, workerToken } = await repo.createWorkOrder({
    customerId: cust.id, templateId: tpl.id, containerNos: ['TCLU1234567'],
    workDate: '2026-07-02', assigneeName: '홍길동', assigneeContact: '010',
  });
  expect(order.status).toBe('sent');
  expect(workerToken).toMatch(/^[A-Za-z0-9]+$/);
  expect((await repo.listWorkOrders()).length).toBe(before + 1);
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/admin/token.test.ts test/admin/status.test.ts test/admin/repo.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`src/admin/token.ts`:
```ts
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export function randomToken(len = 20): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
```

`src/admin/status.ts`:
```ts
import type { WorkOrderStatus } from '../domain/types';

const LABELS: Record<WorkOrderStatus, string> = {
  draft: '작성 중', sent: '전송됨', in_progress: '진행 중', submitted: '제출됨', published: '발행됨',
};
const COLORS: Record<WorkOrderStatus, string> = {
  draft: '#5A6B7D', sent: '#16334B', in_progress: '#E0A100', submitted: '#E0A100', published: '#15A34A',
};
export function statusLabel(s: WorkOrderStatus): string { return LABELS[s]; }
export function statusColor(s: WorkOrderStatus): string { return COLORS[s]; }
```

`src/admin/repo.ts`:
```ts
import type { Customer, WorkOrder, WorkTypeTemplate } from '../domain/types';
import { randomToken } from './token';

export interface NewWorkOrder {
  customerId: string; templateId: string; containerNos: string[];
  workDate: string | null; assigneeName: string; assigneeContact: string;
}
export interface AdminRepo {
  listCustomers(): Promise<Customer[]>;
  listTemplates(): Promise<WorkTypeTemplate[]>;
  listWorkOrders(): Promise<WorkOrder[]>;
  createWorkOrder(input: NewWorkOrder): Promise<{ order: WorkOrder; workerToken: string }>;
}

function tpl(id: string, route: string, carrier: string, minCount: number): WorkTypeTemplate {
  return { id, name: `컨테이너 적입 — ${route}`, carrier, route, anchorType: 'container_no', minCount, warningText: null, rules: {}, requiredPhotos: [] };
}

export function createInMemoryAdminRepo(): AdminRepo {
  const customers: Customer[] = [
    { id: 'cust-mtl', name: 'MTL 지사(블라디보스토크)', contact: 'vlad@example.com', notes: null },
    { id: 'cust-cn', name: '칭다오 파트너', contact: 'qd@example.com', notes: null },
  ];
  const templates: WorkTypeTemplate[] = [
    tpl('tpl-tsr', 'TSR', 'FESCO', 8),
    tpl('tpl-tcr', 'TCR', '중국세관', 8),
  ];
  const orders: WorkOrder[] = [
    { id: 'wo-1', customerId: 'cust-mtl', templateId: 'tpl-tsr', workDate: '2026-07-01', status: 'submitted', assigneeName: '김작업', assigneeContact: '010-1111', shipperLabel: null },
    { id: 'wo-2', customerId: 'cust-cn', templateId: 'tpl-tcr', workDate: '2026-07-02', status: 'sent', assigneeName: '이현장', assigneeContact: '010-2222', shipperLabel: null },
  ];
  let seq = orders.length;
  return {
    async listCustomers() { return [...customers]; },
    async listTemplates() { return [...templates]; },
    async listWorkOrders() { return [...orders]; },
    async createWorkOrder(input) {
      const order: WorkOrder = {
        id: `wo-${++seq}`, customerId: input.customerId, templateId: input.templateId,
        workDate: input.workDate, status: 'sent', assigneeName: input.assigneeName,
        assigneeContact: input.assigneeContact, shipperLabel: null,
      };
      orders.push(order);
      return { order, workerToken: randomToken() };
    },
  };
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/admin/token.test.ts test/admin/status.test.ts test/admin/repo.test.ts`
Expected: PASS (7 passed). `npm run build` → 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/admin/token.ts src/admin/status.ts src/admin/repo.ts test/admin/token.test.ts test/admin/status.test.ts test/admin/repo.test.ts
git commit -m "feat: in-memory AdminRepo (seeded) + status/token utils"
```

---

### Task 3: 작업현황 보드

**Files:**
- Create: `src/admin/WorkOrderBoard.tsx`, `test/admin/board.test.tsx`

**Interfaces:**
- Consumes: `AdminRepo`, `statusLabel/statusColor`.
- `WorkOrderBoard` props: `{ repo: AdminRepo }`. 마운트 시 작업지시를 불러와 카드/행으로 표시(거래처명·템플릿 route·상태 칩). 상태 필터.

- [ ] **Step 1: 실패 테스트 작성**

`test/admin/board.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { WorkOrderBoard } from '../../src/admin/WorkOrderBoard';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('lists seeded work orders with customer and status', async () => {
  render(<WorkOrderBoard repo={createInMemoryAdminRepo()} />);
  expect(await screen.findByText(/MTL 지사/)).toBeInTheDocument();
  expect(await screen.findByText(/제출됨/)).toBeInTheDocument();
  expect(await screen.findByText(/전송됨/)).toBeInTheDocument();
});

test('shows a row per seeded order', async () => {
  render(<WorkOrderBoard repo={createInMemoryAdminRepo()} />);
  const rows = await screen.findAllByTestId('wo-row');
  expect(rows.length).toBe(2);
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/admin/board.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`src/admin/WorkOrderBoard.tsx`:
```tsx
import { useEffect, useState } from 'react';
import type { AdminRepo } from './repo';
import type { Customer, WorkOrder, WorkTypeTemplate } from '../domain/types';
import { statusLabel, statusColor } from './status';

export function WorkOrderBoard({ repo }: { repo: AdminRepo }) {
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

  return (
    <div>
      {orders.map((o) => (
        <div key={o.id} data-testid="wo-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: '0.5px solid rgba(90,107,125,0.25)' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#5A6B7D', minWidth: 56 }}>{tplRoute(o.templateId)}</span>
          <span style={{ flex: 1, fontWeight: 500, color: '#0F1B26' }}>{custName(o.customerId)}</span>
          <span style={{ fontSize: 12, color: '#5A6B7D' }}>{o.assigneeName}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: statusColor(o.status), borderRadius: 999, padding: '3px 10px' }}>{statusLabel(o.status)}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/admin/board.test.tsx`
Expected: PASS (2 passed). 전체 `npm test` green. build 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/admin/WorkOrderBoard.tsx test/admin/board.test.tsx
git commit -m "feat: work-order status board (color-coded)"
```

---

### Task 4: 작업지시 생성 폼 + 작업자 링크

**Files:**
- Create: `src/admin/CreateWorkOrder.tsx`, `test/admin/create.test.tsx`

**Interfaces:**
- Consumes: `AdminRepo`.
- `CreateWorkOrder` props: `{ repo: AdminRepo; onCreated?: () => void }`. 폼(거래처 select·템플릿 select·컨테이너번호 input·작업일·담당자) → 제출 시 `repo.createWorkOrder` → **작업자 링크(`/c/{token}`) 표시 + 복사 버튼**.

- [ ] **Step 1: 실패 테스트 작성**

`test/admin/create.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateWorkOrder } from '../../src/admin/CreateWorkOrder';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('creates a work order and shows a worker capture link', async () => {
  const repo = createInMemoryAdminRepo();
  render(<CreateWorkOrder repo={repo} />);
  fireEvent.change(await screen.findByLabelText(/컨테이너 번호/), { target: { value: 'TCLU7654321' } });
  fireEvent.change(screen.getByLabelText(/담당자 이름/), { target: { value: '박현장' } });
  fireEvent.click(screen.getByRole('button', { name: /작업 생성/ }));
  const link = await screen.findByTestId('worker-link');
  expect(link.textContent).toMatch(/\/c\/[A-Za-z0-9]+/);
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/admin/create.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`src/admin/CreateWorkOrder.tsx`:
```tsx
import { useEffect, useState } from 'react';
import type { AdminRepo } from './repo';
import type { Customer, WorkTypeTemplate } from '../domain/types';

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

  const field = { display: 'block', width: '100%', marginTop: 4, marginBottom: 12 } as const;
  return (
    <form onSubmit={submit} style={{ maxWidth: 420, fontFamily: 'Pretendard, sans-serif' }}>
      <label>거래처<select style={field} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>템플릿<select style={field} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label>컨테이너 번호<input style={field} value={containerNo} onChange={(e) => setContainerNo(e.target.value)} placeholder="TCLU1234567 (쉼표로 여러 개)" /></label>
      <label>작업일<input type="date" style={field} value={workDate} onChange={(e) => setWorkDate(e.target.value)} /></label>
      <label>담당자 이름<input style={field} value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} /></label>
      <label>담당자 연락처<input style={field} value={assigneeContact} onChange={(e) => setAssigneeContact(e.target.value)} /></label>
      <button type="submit" style={{ background: '#FF6A00', color: '#fff', border: 0, borderRadius: 10, padding: '10px 16px', fontWeight: 600 }}>작업 생성</button>
      {link && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: '#5A6B7D' }}>작업자 링크</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code data-testid="worker-link" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, wordBreak: 'break-all' }}>{link}</code>
            <button type="button" onClick={() => navigator.clipboard?.writeText(link)}>복사</button>
          </div>
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/admin/create.test.tsx`
Expected: PASS. 전체 `npm test` green. build 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/admin/CreateWorkOrder.tsx test/admin/create.test.tsx
git commit -m "feat: create-work-order form with worker link generation"
```

---

### Task 5: 콘솔 조립 (보드 + 새 작업)

**Files:**
- Modify: `src/admin/AdminConsole.tsx`
- Test: `test/admin/routes.test.tsx` (확장), or a new `test/admin/console.test.tsx`

**Interfaces:**
- `AdminConsole`가 헤더(로고 `CARGOLINK`) + `WorkOrderBoard` + "새 작업" 토글 → `CreateWorkOrder`를 조립. 기본 repo = `createInMemoryAdminRepo()`(모듈 상수 1개).

- [ ] **Step 1: 실패 테스트 작성**

`test/admin/console.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminConsole } from '../../src/admin/AdminConsole';

test('console shows the board and reveals the create form', async () => {
  render(<AdminConsole />);
  expect(screen.getByRole('heading', { name: /관리자 콘솔/ })).toBeInTheDocument();
  expect(await screen.findByText(/MTL 지사/)).toBeInTheDocument();           // board loaded
  fireEvent.click(screen.getByRole('button', { name: /새 작업/ }));
  expect(await screen.findByRole('button', { name: /작업 생성/ })).toBeInTheDocument(); // form revealed
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/admin/console.test.tsx`
Expected: FAIL — `AdminConsole`가 아직 stub.

- [ ] **Step 3: 구현**

`src/admin/AdminConsole.tsx` (교체):
```tsx
import { useState } from 'react';
import { createInMemoryAdminRepo } from './repo';
import { WorkOrderBoard } from './WorkOrderBoard';
import { CreateWorkOrder } from './CreateWorkOrder';

const repo = createInMemoryAdminRepo();

export function AdminConsole() {
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <main style={{ minHeight: '100vh', background: '#D7DEE5', fontFamily: 'Pretendard, sans-serif', color: '#0F1B26' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#fff', borderBottom: '0.5px solid rgba(90,107,125,0.25)' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 18 }}>CARGO<span style={{ color: '#FF6A00' }}>LINK</span></span>
        <button onClick={() => setCreating((v) => !v)} style={{ background: '#FF6A00', color: '#fff', border: 0, borderRadius: 10, padding: '8px 14px', fontWeight: 600 }}>새 작업</button>
      </header>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
        <h1 style={{ fontSize: 20 }}>관리자 콘솔</h1>
        {creating && (
          <section style={{ background: '#fff', borderRadius: 14, padding: 20, margin: '12px 0' }}>
            <CreateWorkOrder repo={repo} onCreated={() => setRefreshKey((k) => k + 1)} />
          </section>
        )}
        <section style={{ background: '#fff', borderRadius: 14, padding: '8px 6px', marginTop: 12 }}>
          <WorkOrderBoard key={refreshKey} repo={repo} />
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/admin/console.test.tsx`
Expected: PASS. 전체 `npm test` green(기존 + admin 신규). `npm run build` 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/admin/AdminConsole.tsx test/admin/console.test.tsx
git commit -m "feat: assemble admin console (board + create toggle, branded header)"
```

---

## Self-Review

**1. Spec coverage (Plan C dispatch half):** 라우팅 셸(멀티스크린) → Task 1. 데이터 계층(주입식, 시드) → Task 2. 작업현황 보드(상태색) → Task 3. 작업지시 생성 + 작업자 링크 발급 → Task 4. 콘솔 조립·브랜딩 → Task 5. **범위 밖(Plan C.2):** 검토 뷰(사진별 체크리스트)·발행(publication/뷰어 링크) — 실제 제출 사진 필요. **범위 밖(Supabase 연결):** `SupabaseAdminRepo`(실 DB), 토큰접근 강제.

**2. Placeholder scan:** 모든 스텝에 실제 코드/명령/기대결과. 시드 데이터는 데모용(거래처/작업 샘플) — 실 데이터는 Supabase repo에서.

**3. Type consistency:** `AdminRepo`/`NewWorkOrder`가 Task 2에서 정의되어 Task 3·4에서 주입·소비. `WorkOrderStatus`/`Customer`/`WorkOrder`/`WorkTypeTemplate`는 Plan B `src/domain/types.ts` 재사용(중복 정의 없음). `statusColor` hex는 디자인 토큰과 일치. 작업자 링크 형식 `/c/{token}`이 Task 1 라우트(`/c/:token`)와 일치.

**4. Ambiguity:** 기본 repo는 `AdminConsole` 모듈 상수 1개(테스트에서 컴포넌트는 주입 repo 사용, 콘솔은 인메모리). Supabase 연결 시 이 한 줄만 교체.

---

## 알려진 한계 (의도적)
- 인메모리 repo라 새로고침 시 생성분 초기화(데모용). 영속은 Supabase repo(후속).
- 검토·발행(C.2)·수신자 갤러리(Plan E)·실제 토큰접근(Supabase 연결)은 이 플랜 밖.
- 디자인은 토큰 적용 수준(프로토타입 H2 정밀 재현은 후속).
