# 거래처 CRUD + 콘솔 온보딩 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 앱 안에서 거래처를 추가·수정·삭제하고 "새 작업"에서 선택하며, 콘솔이 로그인 후 다음 행동을 안내하도록 만든다.

**Architecture:** 기존 저장소 추상화(`AdminRepo` / `DbPort`)에 거래처 CRUD를 얹고, 인메모리·Supabase 양쪽에 구현한다. UI는 전용 `CustomerManager` 패널을 신설하고 `AdminConsole` 헤더 버튼으로 뷰를 전환한다. 삭제는 참조 무결성(FK)으로 차단하고 UI가 오류를 안내로 변환한다.

**Tech Stack:** React + TypeScript + Vite, Vitest + @testing-library/react, Supabase(@supabase/supabase-js), PGlite(스키마 테스트).

## Global Constraints

- 모든 UI는 기존 `src/ui/kit.tsx`(PageShell·Brand·Card·Button·Badge·Chip·EmptyState·Field·inputStyle)와 `src/ui/tokens`(`C`, `FONT`)만 사용한다. 새 색/폰트 하드코딩 금지.
- 테스트 러너는 Vitest. 전역 `test`/`expect` 사용(기존 파일과 동일, import 불필요). RTL은 `render/screen/fireEvent`.
- DB 스키마 테스트는 파일 상단에 `// @vitest-environment node`, 마이그레이션은 `?raw` import + `freshDb([...])`.
- 마이그레이션은 비파괴(컬럼 add만, drop 금지). 기존 `contact`/`notes` 컬럼 유지.
- 인메모리 저장소의 초기 시드(거래처 `cust-mtl`/`cust-cn`, 작업 `wo-1`/`wo-2`, 토큰 `demotoken123`)는 기존 테스트가 의존하므로 유지한다.
- 커밋 메시지 말미에 다음 줄 포함: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- 작업 브랜치: `feat/customer-crud-onboarding` (이미 생성됨).

---

### Task 1: 거래처 도메인 필드 확장 + 매퍼

**Files:**
- Modify: `src/domain/types.ts` (Customer 인터페이스)
- Modify: `src/admin/supabaseMappers.ts` (`rowToCustomer`)
- Test: `test/admin/mappers.test.ts` (기존 테스트 갱신)

**Interfaces:**
- Produces: `Customer` = `{ id, name, contactName, phone, email, contact, notes }` (뒤 두 개는 하위호환·미사용, 모두 `string | null` 단 `id`/`name`은 `string`). `rowToCustomer(r: Row): Customer`가 `contact_name`/`phone`/`email` 컬럼을 매핑.

- [ ] **Step 1: 기존 매퍼 테스트를 신규 필드 기대값으로 갱신 (실패 유도)**

`test/admin/mappers.test.ts`의 `rowToCustomer` 단언을 교체:

```ts
test('rowToContainer and rowToCustomer map nullable fields', () => {
  expect(rowToContainer({ id: 'k1', work_order_id: 'wo1', container_no: 'ABCD1234567', seal_no: null, worker_memo: null }))
    .toEqual({ id: 'k1', workOrderId: 'wo1', containerNo: 'ABCD1234567', sealNo: null, workerMemo: null });
  expect(rowToCustomer({ id: 'c1', name: 'MTL', contact_name: '김담당', phone: '010-1', email: 'a@b.c', contact: null, notes: null }))
    .toEqual({ id: 'c1', name: 'MTL', contactName: '김담당', phone: '010-1', email: 'a@b.c', contact: null, notes: null });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/admin/mappers.test.ts`
Expected: FAIL — 반환 객체에 `contactName`/`phone`/`email` 없음(현재 매퍼).

- [ ] **Step 3: Customer 타입 확장**

`src/domain/types.ts:29` 교체:

```ts
export interface Customer {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  contact: string | null;
  notes: string | null;
}
```

- [ ] **Step 4: rowToCustomer 확장**

`src/admin/supabaseMappers.ts:8-10` 교체:

```ts
export function rowToCustomer(r: Row): Customer {
  return {
    id: str(r.id), name: str(r.name),
    contactName: strOrNull(r.contact_name), phone: strOrNull(r.phone), email: strOrNull(r.email),
    contact: strOrNull(r.contact), notes: strOrNull(r.notes),
  };
}
```

- [ ] **Step 5: 테스트 통과 확인 + 타입체크**

Run: `npx vitest run test/admin/mappers.test.ts && npx tsc --noEmit`
Expected: PASS. tsc는 이 시점에 인메모리 시드가 신규 필드를 안 넣어 에러가 날 수 있음 — Task 3에서 해소되므로 tsc 에러가 `repo.ts` 한정이면 진행. (mappers 테스트는 통과해야 함.)

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/admin/supabaseMappers.ts test/admin/mappers.test.ts
git commit -m "feat: extend Customer with contactName/phone/email + mapper"
```

---

### Task 2: DbPort.delete 추가

**Files:**
- Modify: `src/admin/db.ts` (`DbPort` 인터페이스 + Supabase 구현)
- Test: `test/admin/db.test.ts` (delete 케이스 추가)

**Interfaces:**
- Produces: `DbPort.delete(table: string, match: Filter): Promise<void>` — Supabase에서 `client.from(table).delete().eq(match.col, match.val)`, error 시 throw.

- [ ] **Step 1: 실패 테스트 작성**

`test/admin/db.test.ts` 맨 아래에 추가(파일 상단 import는 기존 것 재사용; 없으면 아래 import 추가). 기존 파일의 Supabase 클라이언트 목 패턴을 따른다. 이 테스트는 `.delete().eq()` 체인이 호출되고 error 시 throw됨을 검증한다:

```ts
test('delete calls from().delete().eq() and throws on error', async () => {
  const calls: string[] = [];
  const eq = (col: string, val: string) => { calls.push(`eq:${col}=${val}`); return Promise.resolve({ error: null }); };
  const del = () => { calls.push('delete'); return { eq }; };
  const client = { from: (t: string) => { calls.push(`from:${t}`); return { delete: del }; } } as unknown as import('@supabase/supabase-js').SupabaseClient;
  const port = createSupabaseDbPort(client);
  await port.delete('customers', { col: 'id', val: 'c1' });
  expect(calls).toEqual(['from:customers', 'delete', 'eq:id=c1']);

  const errClient = { from: () => ({ delete: () => ({ eq: () => Promise.resolve({ error: { message: 'fk violation' } }) }) }) } as unknown as import('@supabase/supabase-js').SupabaseClient;
  await expect(createSupabaseDbPort(errClient).delete('customers', { col: 'id', val: 'c1' })).rejects.toThrow('fk violation');
});
```

(파일에 `import { createSupabaseDbPort } from '../../src/admin/db';`가 없으면 추가.)

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/admin/db.test.ts`
Expected: FAIL — `port.delete` is not a function.

- [ ] **Step 3: DbPort에 delete 추가**

`src/admin/db.ts`의 인터페이스에 한 줄 추가(`update` 다음):

```ts
  update(table: string, match: Filter, values: Row): Promise<Row[]>;
  delete(table: string, match: Filter): Promise<void>;
```

구현부에 `update` 다음 추가:

```ts
    async delete(table, match) {
      const { error } = await client.from(table).delete().eq(match.col, match.val);
      if (error) throw new Error(error.message);
    },
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/admin/db.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/db.ts test/admin/db.test.ts
git commit -m "feat: add DbPort.delete for Supabase"
```

---

### Task 3: AdminRepo 거래처 CRUD — 인터페이스 + 인메모리 구현

**Files:**
- Modify: `src/admin/repo.ts` (`AdminRepo` 인터페이스, `NewCustomer` 타입, 인메모리 구현, 시드 필드 보강)
- Test: `test/admin/repo.test.ts` (CRUD 케이스 추가)

**Interfaces:**
- Consumes: `Customer`, `NewCustomer`.
- Produces:
  - `NewCustomer = { name: string; contactName: string | null; phone: string | null; email: string | null }`
  - `AdminRepo.createCustomer(input: NewCustomer): Promise<Customer>`
  - `AdminRepo.updateCustomer(id: string, input: NewCustomer): Promise<Customer>`
  - `AdminRepo.deleteCustomer(id: string): Promise<void>` — 참조하는 work_order가 있으면 throw.

- [ ] **Step 1: 실패 테스트 작성**

`test/admin/repo.test.ts` 맨 아래에 추가:

```ts
test('createCustomer adds a customer with contact fields', async () => {
  const repo = createInMemoryAdminRepo();
  const before = (await repo.listCustomers()).length;
  const c = await repo.createCustomer({ name: '동방물류', contactName: '박담당', phone: '010-9', email: 'db@x.com' });
  expect(c.name).toBe('동방물류');
  expect(c.contactName).toBe('박담당');
  expect((await repo.listCustomers()).length).toBe(before + 1);
});

test('updateCustomer changes fields in place', async () => {
  const repo = createInMemoryAdminRepo();
  const c = await repo.createCustomer({ name: 'A', contactName: null, phone: null, email: null });
  const u = await repo.updateCustomer(c.id, { name: 'B', contactName: '이', phone: '02', email: 'b@x.com' });
  expect(u.name).toBe('B');
  expect((await repo.listCustomers()).find((x) => x.id === c.id)!.contactName).toBe('이');
});

test('deleteCustomer removes an unreferenced customer', async () => {
  const repo = createInMemoryAdminRepo();
  const c = await repo.createCustomer({ name: 'Temp', contactName: null, phone: null, email: null });
  await repo.deleteCustomer(c.id);
  expect((await repo.listCustomers()).find((x) => x.id === c.id)).toBeUndefined();
});

test('deleteCustomer throws when the customer has work orders', async () => {
  const repo = createInMemoryAdminRepo();
  const [order] = await repo.listWorkOrders();
  await expect(repo.deleteCustomer(order.customerId)).rejects.toThrow();
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/admin/repo.test.ts`
Expected: FAIL — `repo.createCustomer` is not a function.

- [ ] **Step 3: NewCustomer 타입 + 인터페이스 추가**

`src/admin/repo.ts`의 `NewWorkOrder` 인터페이스 다음에 추가:

```ts
export interface NewCustomer {
  name: string; contactName: string | null; phone: string | null; email: string | null;
}
```

`AdminRepo` 인터페이스 `listCustomers` 다음에 추가:

```ts
  createCustomer(input: NewCustomer): Promise<Customer>;
  updateCustomer(id: string, input: NewCustomer): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
```

- [ ] **Step 4: 인메모리 시드 필드 보강**

`src/admin/repo.ts`의 `customers` 배열을 신규 필드 포함으로 교체:

```ts
  const customers: Customer[] = [
    { id: 'cust-mtl', name: 'MTL 지사(블라디보스토크)', contactName: null, phone: null, email: 'vlad@example.com', contact: 'vlad@example.com', notes: null },
    { id: 'cust-cn', name: '칭다오 파트너', contactName: null, phone: null, email: 'qd@example.com', contact: 'qd@example.com', notes: null },
  ];
```

- [ ] **Step 5: 인메모리 CRUD 구현**

`createInMemoryAdminRepo`의 반환 객체 안, `async listCustomers() { ... },` 다음에 추가(그 위에 카운터 선언: `let cseq = 0;` 는 `const customers` 선언 직후에 둔다):

```ts
    async createCustomer(input) {
      const c: Customer = { id: `cust-new-${++cseq}`, name: input.name, contactName: input.contactName, phone: input.phone, email: input.email, contact: null, notes: null };
      customers.push(c);
      return c;
    },
    async updateCustomer(id, input) {
      const c = customers.find((x) => x.id === id);
      if (!c) throw new Error('customer not found');
      c.name = input.name; c.contactName = input.contactName; c.phone = input.phone; c.email = input.email;
      return c;
    },
    async deleteCustomer(id) {
      if (orders.some((o) => o.customerId === id)) throw new Error('customer has work orders');
      const i = customers.findIndex((x) => x.id === id);
      if (i >= 0) customers.splice(i, 1);
    },
```

`let cseq = 0;`를 `const customers = [...]` 바로 다음 줄에 추가.

- [ ] **Step 6: 테스트 통과 + 타입체크**

Run: `npx vitest run test/admin/repo.test.ts && npx tsc --noEmit`
Expected: repo 테스트 PASS. tsc는 이제 `supabaseRepo.ts`가 `AdminRepo`의 새 메서드를 구현 안 해 에러 — Task 4에서 해소. supabaseRepo 외 에러가 없으면 진행.

- [ ] **Step 7: Commit**

```bash
git add src/admin/repo.ts test/admin/repo.test.ts
git commit -m "feat: customer CRUD on AdminRepo + in-memory impl"
```

---

### Task 4: Supabase 저장소 거래처 CRUD 구현

**Files:**
- Modify: `src/admin/supabaseRepo.ts` (CRUD 3종)
- Test: `test/admin/supabase-repo.test.ts` (memPort fake에 delete 추가 + CRUD 케이스)

**Interfaces:**
- Consumes: `DbPort.insert/update/delete`, `NewCustomer`, `rowToCustomer`.
- Produces: `createSupabaseAdminRepo`가 `createCustomer`/`updateCustomer`/`deleteCustomer` 구현.

- [ ] **Step 1: memPort fake에 delete 추가 + 실패 테스트 작성**

`test/admin/supabase-repo.test.ts`의 `memPort` 반환 객체 `update` 다음에 추가:

```ts
    async delete(table: string, match: Filter) {
      tables[table] = (tables[table] ?? []).filter((r) => String(r[match.col]) !== match.val);
    },
```

파일 맨 아래에 CRUD 테스트 추가:

```ts
test('createCustomer inserts and maps contact fields', async () => {
  const db = memPort();
  const repo = createSupabaseAdminRepo(db);
  const c = await repo.createCustomer({ name: '동방', contactName: '박', phone: '010', email: 'd@x.com' });
  expect(c.name).toBe('동방');
  expect(c.contactName).toBe('박');
  expect((await repo.listCustomers()).length).toBe(1);
});

test('updateCustomer updates and deleteCustomer removes', async () => {
  const db = memPort({ customers: [{ id: 'c1', name: 'A', contact_name: null, phone: null, email: null, contact: null, notes: null }] });
  const repo = createSupabaseAdminRepo(db);
  const u = await repo.updateCustomer('c1', { name: 'B', contactName: '이', phone: '02', email: 'b@x.com' });
  expect(u.name).toBe('B');
  await repo.deleteCustomer('c1');
  expect((await repo.listCustomers()).length).toBe(0);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/admin/supabase-repo.test.ts`
Expected: FAIL — `repo.createCustomer` is not a function.

- [ ] **Step 3: Supabase CRUD 구현**

`src/admin/supabaseRepo.ts`의 반환 객체 `async listCustomers() { ... },` 다음에 추가:

```ts
    async createCustomer(input) {
      const [row] = await db.insert('customers', {
        name: input.name, contact_name: input.contactName, phone: input.phone, email: input.email,
      });
      if (!row) throw new Error('customer insert returned no row (check RLS)');
      return rowToCustomer(row);
    },
    async updateCustomer(id, input) {
      const [row] = await db.update('customers', { col: 'id', val: id }, {
        name: input.name, contact_name: input.contactName, phone: input.phone, email: input.email,
      });
      if (!row) throw new Error('customer update returned no row');
      return rowToCustomer(row);
    },
    async deleteCustomer(id) {
      await db.delete('customers', { col: 'id', val: id });
    },
```

- [ ] **Step 4: 테스트 통과 + 전체 타입체크**

Run: `npx vitest run test/admin/supabase-repo.test.ts && npx tsc --noEmit`
Expected: PASS. tsc 에러 0.

- [ ] **Step 5: Commit**

```bash
git add src/admin/supabaseRepo.ts test/admin/supabase-repo.test.ts
git commit -m "feat: customer CRUD on Supabase repo"
```

---

### Task 5: 마이그레이션 0008 — 거래처 연락처 컬럼

**Files:**
- Create: `supabase/migrations/0008_customer_contact_fields.sql`
- Test: `test/db/customer-contact-fields.test.ts`

**Interfaces:**
- Produces: `customers` 테이블에 `contact_name`, `phone`, `email` (모두 `text`, nullable).

- [ ] **Step 1: 실패 테스트 작성**

`test/db/customer-contact-fields.test.ts` 생성:

```ts
// @vitest-environment node
import schema from '../../supabase/migrations/0001_core_schema.sql?raw';
import contactCols from '../../supabase/migrations/0008_customer_contact_fields.sql?raw';
import { freshDb } from './pglite';

test('0008 adds contact_name, phone, email to customers', async () => {
  const d = await freshDb([schema, contactCols]);
  const res = await d.query<{ column_name: string }>(
    "select column_name from information_schema.columns where table_name='customers';");
  const cols = res.rows.map((r) => r.column_name);
  expect(cols).toContain('contact_name');
  expect(cols).toContain('phone');
  expect(cols).toContain('email');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/db/customer-contact-fields.test.ts`
Expected: FAIL — 마이그레이션 파일 없음(import 오류) 또는 컬럼 없음.

- [ ] **Step 3: 마이그레이션 작성**

`supabase/migrations/0008_customer_contact_fields.sql` 생성:

```sql
-- Add structured contact fields to customers (non-destructive; keeps legacy contact/notes)
alter table customers add column if not exists contact_name text;
alter table customers add column if not exists phone text;
alter table customers add column if not exists email text;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/db/customer-contact-fields.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0008_customer_contact_fields.sql test/db/customer-contact-fields.test.ts
git commit -m "feat: migration 0008 customer contact fields"
```

---

### Task 6: CustomerManager UI

**Files:**
- Create: `src/admin/CustomerManager.tsx`
- Test: `test/admin/customer-manager.test.tsx`

**Interfaces:**
- Consumes: `AdminRepo`(listCustomers/createCustomer/updateCustomer/deleteCustomer), `NewCustomer`, `Customer`, ui/kit.
- Produces: `export function CustomerManager({ repo }: { repo: AdminRepo }): JSX.Element`. 거래처 행에 `data-testid="customer-row"`.

- [ ] **Step 1: 실패 테스트 작성**

`test/admin/customer-manager.test.tsx` 생성:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerManager } from '../../src/admin/CustomerManager';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('lists seeded customers and adds a new one', async () => {
  const repo = createInMemoryAdminRepo();
  render(<CustomerManager repo={repo} />);
  expect(await screen.findByText(/칭다오 파트너/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/거래처명/), { target: { value: '신규물류' } });
  fireEvent.click(screen.getByRole('button', { name: /^추가$/ }));
  expect(await screen.findByText(/신규물류/)).toBeInTheDocument();
});

test('shows a blocking message when deleting a referenced customer', async () => {
  const repo = createInMemoryAdminRepo();
  const spy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  render(<CustomerManager repo={repo} />);
  await screen.findByText(/MTL 지사/);
  // MTL 지사(cust-mtl)는 wo-1에서 참조 → 삭제 차단
  const row = screen.getByText(/MTL 지사/).closest('[data-testid="customer-row"]')!;
  fireEvent.click(row.querySelector('button:last-of-type') as HTMLButtonElement);
  expect(await screen.findByText(/작업이 있어 삭제할 수 없습니다/)).toBeInTheDocument();
  spy.mockRestore();
});
```

(`vi`는 Vitest 전역. 없으면 `import { vi } from 'vitest';` 추가.)

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/admin/customer-manager.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: CustomerManager 구현**

`src/admin/CustomerManager.tsx` 생성:

```tsx
import { useEffect, useState } from 'react';
import type { AdminRepo, NewCustomer } from './repo';
import type { Customer } from '../domain/types';
import { Card, Button, Field, EmptyState, inputStyle } from '../ui/kit';
import { C } from '../ui/tokens';

const EMPTY: NewCustomer = { name: '', contactName: '', phone: '', email: '' };

export function CustomerManager({ repo }: { repo: AdminRepo }) {
  const [list, setList] = useState<Customer[]>([]);
  const [form, setForm] = useState<NewCustomer>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() { setList(await repo.listCustomers()); }
  useEffect(() => { refresh(); }, [repo]);

  function edit(c: Customer) {
    setEditingId(c.id);
    setForm({ name: c.name, contactName: c.contactName ?? '', phone: c.phone ?? '', email: c.email ?? '' });
    setError(null);
  }
  function reset() { setEditingId(null); setForm(EMPTY); setError(null); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: NewCustomer = {
      name: form.name.trim(),
      contactName: form.contactName?.trim() || null,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
    };
    if (!input.name) { setError('거래처명을 입력하세요.'); return; }
    if (editingId) await repo.updateCustomer(editingId, input);
    else await repo.createCustomer(input);
    reset();
    await refresh();
  }

  async function remove(c: Customer) {
    if (!window.confirm(`'${c.name}' 거래처를 삭제할까요?`)) return;
    setError(null);
    try { await repo.deleteCustomer(c.id); await refresh(); }
    catch { setError('이 거래처로 만든 작업이 있어 삭제할 수 없습니다.'); }
  }

  return (
    <div>
      <h2 style={{ fontSize: 17, color: C.navy, margin: '4px 0 14px' }}>거래처 관리</h2>
      {error && <div style={{ color: C.negative, fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {list.length === 0 ? (
        <EmptyState title="등록된 거래처가 없습니다" hint="아래에서 첫 거래처를 추가하세요." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {list.map((c) => (
            <div key={c.id} data-testid="customer-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: C.white, border: `1px solid ${C.line}`, borderRadius: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: C.navy }}>{c.name}</div>
                <div style={{ fontSize: 12, color: C.text, marginTop: 2 }}>
                  {[c.contactName, c.phone, c.email].filter(Boolean).join(' · ') || '연락처 없음'}
                </div>
              </div>
              <Button variant="ghost" onClick={() => edit(c)} style={{ padding: '5px 10px' }}>수정</Button>
              <Button variant="ghost" onClick={() => remove(c)} style={{ padding: '5px 10px' }}>삭제</Button>
            </div>
          ))}
        </div>
      )}
      <Card>
        <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10 }}>{editingId ? '거래처 수정' : '거래처 추가'}</div>
        <form onSubmit={submit} style={{ maxWidth: 420 }}>
          <Field label="거래처명"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="담당자"><input style={inputStyle} value={form.contactName ?? ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></Field>
          <Field label="전화번호"><input style={inputStyle} value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="이메일"><input type="email" style={inputStyle} value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="submit">{editingId ? '저장' : '추가'}</Button>
            {editingId && <Button variant="ghost" onClick={reset}>취소</Button>}
          </div>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/admin/customer-manager.test.tsx`
Expected: PASS (두 테스트 모두).

- [ ] **Step 5: Commit**

```bash
git add src/admin/CustomerManager.tsx test/admin/customer-manager.test.tsx
git commit -m "feat: CustomerManager UI with CRUD + delete guard"
```

---

### Task 7: AdminConsole 헤더 버튼 + 뷰 전환 + 사용 방법 스트립

**Files:**
- Modify: `src/admin/AdminConsole.tsx`
- Test: `test/admin/console.test.tsx` (뷰 전환 케이스 추가)

**Interfaces:**
- Consumes: `CustomerManager`, `CreateWorkOrder`(신규 `onManageCustomers` prop은 Task 8), ui/kit.
- Produces: 헤더에 "거래처" 버튼, `view: 'board' | 'customers'` 상태, 상단 "사용 방법" 스트립.

- [ ] **Step 1: 실패 테스트 작성**

`test/admin/console.test.tsx` 맨 아래에 추가:

```ts
test('거래처 button switches to the customer manager view', async () => {
  render(<AdminConsole />);
  await screen.findByText(/MTL 지사/);
  fireEvent.click(screen.getByRole('button', { name: /^거래처$/ }));
  expect(await screen.findByRole('heading', { name: /거래처 관리/ })).toBeInTheDocument();
});

test('shows the usage guide strip', async () => {
  render(<AdminConsole />);
  expect(await screen.findByText(/사용 방법/)).toBeInTheDocument();
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/admin/console.test.tsx`
Expected: FAIL — "거래처" 버튼/"사용 방법" 없음.

- [ ] **Step 3: AdminConsole 구현 교체**

`src/admin/AdminConsole.tsx` 전체 교체:

```tsx
import { useState } from 'react';
import { getAdminRepo } from './repoFactory';
import type { AdminRepo } from './repo';
import { WorkOrderBoard } from './WorkOrderBoard';
import { CreateWorkOrder } from './CreateWorkOrder';
import { ReviewPanel } from './ReviewPanel';
import { CustomerManager } from './CustomerManager';
import { defaultAuthDeps } from '../auth/session';
import { PageShell, Brand, Card, Button } from '../ui/kit';
import { C } from '../ui/tokens';

function UsageGuide() {
  const [open, setOpen] = useState(true);
  const steps = [
    '① 새 작업 생성 → 작업자 링크 전송',
    '② 현장이 촬영·제출',
    '③ 검수 후 발행 → 수신자 링크 공유',
  ];
  return (
    <Card style={{ marginBottom: 14, background: C.surfaceAlt }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, color: C.navy }}>사용 방법</span>
        <Button variant="ghost" onClick={() => setOpen((v) => !v)} style={{ padding: '3px 10px' }}>{open ? '접기' : '펼치기'}</Button>
      </div>
      {open && (
        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, color: C.text, fontSize: 13, lineHeight: 1.9 }}>
          {steps.map((s) => <li key={s}>{s}</li>)}
        </ul>
      )}
    </Card>
  );
}

export function AdminConsole({ repo = getAdminRepo() }: { repo?: AdminRepo } = {}) {
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'board' | 'customers'>('board');

  function goBoard() { setView('board'); setSelectedId(null); }

  return (
    <PageShell>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', background: C.white, borderBottom: `1px solid ${C.line}` }}>
        <Brand />
        <span style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => { goBoard(); setCreating((v) => !v); }}>새 작업</Button>
          <Button variant="ghost" onClick={() => { setView('customers'); setCreating(false); setSelectedId(null); }}>거래처</Button>
          <Button variant="ghost" onClick={() => defaultAuthDeps.signOut()}>로그아웃</Button>
        </span>
      </header>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 22 }}>
        <h1 style={{ fontSize: 20, color: C.navy }}>관리자 콘솔</h1>
        {view === 'customers' ? (
          <CustomerManager repo={repo} />
        ) : selectedId ? (
          <ReviewPanel workOrderId={selectedId} repo={repo} onBack={() => { setSelectedId(null); setCreating(false); setRefreshKey((k) => k + 1); }} />
        ) : (
          <>
            <UsageGuide />
            {creating && <Card style={{ margin: '14px 0' }}><CreateWorkOrder repo={repo} onManageCustomers={() => { setView('customers'); setCreating(false); }} onCreated={() => setRefreshKey((k) => k + 1)} /></Card>}
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

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/admin/console.test.tsx`
Expected: PASS. (기존 "reveals the create form" 테스트도 유지되어야 함.)

- [ ] **Step 5: Commit**

```bash
git add src/admin/AdminConsole.tsx test/admin/console.test.tsx
git commit -m "feat: console 거래처 view + usage guide strip"
```

---

### Task 8: CreateWorkOrder 거래처 0개 가드

**Files:**
- Modify: `src/admin/CreateWorkOrder.tsx`
- Test: `test/admin/create.test.tsx` (0개 케이스 추가)

**Interfaces:**
- Consumes: `AdminRepo.listCustomers`.
- Produces: `CreateWorkOrder` props에 `onManageCustomers?: () => void` 추가. 거래처 0개면 안내 + 작업 생성 비활성.

- [ ] **Step 1: 실패 테스트 작성**

`test/admin/create.test.tsx` 맨 아래에 추가:

```tsx
test('guides to add a customer when none exist', async () => {
  const empty = { ...createInMemoryAdminRepo(), listCustomers: async () => [] };
  render(<CreateWorkOrder repo={empty} />);
  expect(await screen.findByText(/먼저 거래처를 등록하세요/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /작업 생성/ })).toBeDisabled();
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/admin/create.test.tsx`
Expected: FAIL — 안내 문구 없음, 버튼 비활성 아님.

- [ ] **Step 3: CreateWorkOrder 가드 구현**

`src/admin/CreateWorkOrder.tsx` 변경:

1) props 시그니처 교체:

```tsx
export function CreateWorkOrder({ repo, onCreated, onManageCustomers }: { repo: AdminRepo; onCreated?: () => void; onManageCustomers?: () => void }) {
```

2) 상태에 `ready` 추가(`const [link, ...]` 다음):

```tsx
  const [ready, setReady] = useState(false);
```

3) useEffect의 customers 로드를 교체:

```tsx
    repo.listCustomers().then((c) => { setCustomers(c); setCustomerId(c[0]?.id ?? ''); setReady(true); });
```

4) `<form>` 안 거래처 `Field`를 조건부로 교체:

```tsx
      {ready && customers.length === 0 ? (
        <div style={{ marginBottom: 12, padding: '12px 14px', background: C.surfaceAlt, borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>먼저 거래처를 등록하세요.</div>
          {onManageCustomers && <Button variant="ghost" onClick={onManageCustomers}>거래처 관리로 이동</Button>}
        </div>
      ) : (
        <Field label="거래처"><select style={inputStyle} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      )}
```

5) 작업 생성 버튼 비활성:

```tsx
      <Button type="submit" disabled={ready && customers.length === 0}>작업 생성</Button>
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/admin/create.test.tsx`
Expected: PASS (기존 "creates a work order" 테스트도 유지).

- [ ] **Step 5: Commit**

```bash
git add src/admin/CreateWorkOrder.tsx test/admin/create.test.tsx
git commit -m "feat: CreateWorkOrder guard when no customers"
```

---

### Task 9: 전체 회귀 검증

**Files:** 없음(검증만).

- [ ] **Step 1: 전체 테스트 + 타입체크 + 빌드**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: 전체 PASS, tsc 에러 0, 빌드 성공.

- [ ] **Step 2: (선택) 로컬 수동 확인**

Run: `npm run dev` → `/admin` 로그인 우회 불가 시 인메모리 모드로 확인. "거래처" 버튼 → 추가/수정/삭제, "새 작업"에서 거래처 선택, 참조된 거래처 삭제 차단 메시지 확인.

- [ ] **Step 3: 검증 결과 기록(커밋 불필요)**

이상 없으면 완료. 이후 배포 전제(Netlify 환경변수 + 마이그레이션 적용)는 별도 안내.

---

## 배포 전제 (구현 후 ops — 코드 아님)

1. Supabase 프로젝트에 `0001`~`0008` 마이그레이션 적용.
2. Netlify 환경변수 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 설정 → `isSupabaseConfigured`가 true → Supabase 저장소로 전환(인메모리 데모 거래처 사라짐, 빈 상태에서 실제 거래처 등록).
3. 재배포 후 관리자 계정으로 로그인 → 거래처 등록 → 작업 생성 흐름 검증.
