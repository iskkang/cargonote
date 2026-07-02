# Supabase 연결 (Path A — 동작 우선) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 콘솔과 작업자 캡처 화면을 공유된 실 Supabase DB에 연결해, 콘솔에서 만든 작업자 링크가 실제 작업자 화면에서 열리고 촬영 사진이 Storage + `photos` 행으로 실제 저장되는 end-to-end 루프를 완성한다.

**Architecture:** 기존 `AdminRepo` 인터페이스를 실 테이블 위에서 구현하는 `SupabaseAdminRepo`를 추가한다. Supabase 체이닝 API는 얇은 `DbPort` 어댑터(`select`/`insert`) 뒤로 격리하여, repo의 조립 로직은 인메모리 fake `DbPort`로 완전히 단위 테스트한다. 행↔도메인 매핑은 순수 함수로 분리해 테스트한다. `getAdminRepo()` 팩토리가 환경변수로 Supabase/인메모리를 선택하며 싱글톤이라 한 SPA 세션에서 콘솔·워커가 같은 repo를 공유한다. 작업자 촬영은 온라인 업로드 프리미티브 `uploadSlotPhoto`(display+thumb → Storage, `photos` 행 insert, 주입식)로 처리한다.

**Tech Stack:** TypeScript, React 18, Vite 5, `@supabase/supabase-js` v2, Vitest + @testing-library/react. Supabase Postgres(마이그레이션 0001/0002 적용 완료), Storage 버킷 `captures`(anon insert 정책 적용 완료).

## Global Constraints

- **환경 선택 규칙:** `isSupabaseConfigured(url)`는 `url`이 존재하고 `.supabase.co`를 포함하며 `placeholder`를 포함하지 않을 때만 `true`. 테스트 환경 URL은 `http://localhost:54321`(vite.config test.env), placeholder는 `https://placeholder.supabase.co`, 실 프로젝트는 `https://sjycsfcfclthbxqcleim.supabase.co`. 즉 테스트·placeholder에서는 반드시 인메모리 repo가 선택되어 기존 테스트가 깨지지 않아야 한다.
- **기존 테스트 불변:** `test/admin/console.test.tsx`, `test/admin/routes.test.tsx`, `test/worker/worker-capture.test.tsx`는 repo prop을 주입하지 않고 기본값(팩토리)에 의존한다. 이들은 계속 통과해야 한다(테스트 환경 → 인메모리 → `demotoken123`/`MTL 지사` 시드 존재).
- **DB 컬럼은 snake_case, 도메인은 camelCase.** 매핑은 `src/admin/supabaseMappers.ts`의 순수 함수로만 한다. 템플릿 행은 기존 `parseTemplate(RawTemplateRow)`(`src/domain/template.ts`)로 파싱한다.
- **오프라인 프리미티브 보존:** `src/worker/capture.ts`(`captureToSlot`,`capturedSlotKeys`), `src/lib/captureQueue.ts`, `src/lib/sync.ts`는 삭제·변경하지 않는다. `/spike`(App.tsx)와 각자 테스트가 계속 사용한다. Path A 작업자 화면은 온라인 `uploadSlotPhoto`로 전환하되, 오프라인 드레인은 문서화된 후속 작업이다.
- **보안 주의(이번 범위 밖, 후속 필수):** 현재 RLS가 꺼져 있어 anon 키로 모든 테이블 읽기/쓰기가 가능하다. 이 플랜은 그 상태를 전제로 동작만 붙인다. RLS·인증·토큰 RPC는 바로 다음 플랜에서 잠근다.
- DRY, YAGNI, TDD, 빈번한 커밋. 새 의존성 추가 금지(현 package.json 범위 내).

## 수동 설정 상태 (사용자 완료)

- ✅ 마이그레이션 0001(스키마)·0002(TSR/TCR 시드) 적용 — 라이브 확인됨(`work_type_templates`에 TCR/TSR).
- ✅ Storage 버킷 `captures` 생성 + anon insert 정책.
- ✅ `.env.local`에 `VITE_SUPABASE_URL`+`VITE_SUPABASE_ANON_KEY`, Netlify 환경변수 설정.

---

## Task 1: 행 매퍼 + 환경 선택 술어 (순수 함수)

**Files:**
- Create: `src/admin/supabaseMappers.ts`
- Create: `src/admin/repoConfig.ts`
- Test: `test/admin/mappers.test.ts`, `test/admin/repo-config.test.ts`

**Interfaces:**
- Consumes: `Container`, `Customer`, `Photo`, `WorkOrder`, `WorkOrderStatus` from `src/domain/types.ts`.
- Produces: `rowToCustomer(r)`, `rowToWorkOrder(r)`, `rowToContainer(r)`, `rowToPhoto(r)` (each `(Record<string,unknown>) => domain`); `isSupabaseConfigured(url?: string): boolean`.

- [ ] **Step 1: Write failing tests**

`test/admin/mappers.test.ts`:
```ts
import { rowToContainer, rowToCustomer, rowToPhoto, rowToWorkOrder } from '../../src/admin/supabaseMappers';

test('rowToWorkOrder maps snake_case columns to camelCase domain', () => {
  const wo = rowToWorkOrder({
    id: 'wo1', customer_id: 'c1', template_id: 't1', work_date: '2026-07-02',
    status: 'sent', assignee_name: '김', assignee_contact: '010', shipper_label: null,
  });
  expect(wo).toEqual({
    id: 'wo1', customerId: 'c1', templateId: 't1', workDate: '2026-07-02',
    status: 'sent', assigneeName: '김', assigneeContact: '010', shipperLabel: null,
  });
});

test('rowToContainer and rowToCustomer map nullable fields', () => {
  expect(rowToContainer({ id: 'k1', work_order_id: 'wo1', container_no: 'ABCD1234567', seal_no: null, worker_memo: null }))
    .toEqual({ id: 'k1', workOrderId: 'wo1', containerNo: 'ABCD1234567', sealNo: null, workerMemo: null });
  expect(rowToCustomer({ id: 'c1', name: 'MTL', contact: null, notes: null }))
    .toEqual({ id: 'c1', name: 'MTL', contact: null, notes: null });
});

test('rowToPhoto maps paths, hash, byte size, status', () => {
  const p = rowToPhoto({
    id: 'p1', container_id: 'k1', slot_key: 'seal', original_path: null,
    display_path: 'containers/k1/seal-h.webp', thumb_path: 'containers/k1/seal-h-thumb.webp',
    file_hash: 'h', byte_size: 1234, captured_at: '2026-07-02T00:00:00Z',
    gps_lat: null, gps_lng: null, status: 'uploaded',
  });
  expect(p.containerId).toBe('k1');
  expect(p.slotKey).toBe('seal');
  expect(p.displayPath).toBe('containers/k1/seal-h.webp');
  expect(p.thumbPath).toBe('containers/k1/seal-h-thumb.webp');
  expect(p.byteSize).toBe(1234);
  expect(p.status).toBe('uploaded');
});
```

`test/admin/repo-config.test.ts`:
```ts
import { isSupabaseConfigured } from '../../src/admin/repoConfig';

test('true only for a real supabase.co URL', () => {
  expect(isSupabaseConfigured('https://sjycsfcfclthbxqcleim.supabase.co')).toBe(true);
});
test('false for placeholder, localhost, empty', () => {
  expect(isSupabaseConfigured('https://placeholder.supabase.co')).toBe(false);
  expect(isSupabaseConfigured('http://localhost:54321')).toBe(false);
  expect(isSupabaseConfigured(undefined)).toBe(false);
  expect(isSupabaseConfigured('')).toBe(false);
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- mappers repo-config`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

`src/admin/repoConfig.ts`:
```ts
export function isSupabaseConfigured(url?: string): boolean {
  return !!url && url.includes('.supabase.co') && !url.includes('placeholder');
}
```

`src/admin/supabaseMappers.ts`:
```ts
import type { Container, Customer, Photo, WorkOrder, WorkOrderStatus } from '../domain/types';

type Row = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' ? v : null);

export function rowToCustomer(r: Row): Customer {
  return { id: str(r.id), name: str(r.name), contact: strOrNull(r.contact), notes: strOrNull(r.notes) };
}

export function rowToWorkOrder(r: Row): WorkOrder {
  return {
    id: str(r.id), customerId: str(r.customer_id), templateId: str(r.template_id),
    workDate: strOrNull(r.work_date), status: str(r.status) as WorkOrderStatus,
    assigneeName: strOrNull(r.assignee_name), assigneeContact: strOrNull(r.assignee_contact),
    shipperLabel: strOrNull(r.shipper_label),
  };
}

export function rowToContainer(r: Row): Container {
  return {
    id: str(r.id), workOrderId: str(r.work_order_id), containerNo: str(r.container_no),
    sealNo: strOrNull(r.seal_no), workerMemo: strOrNull(r.worker_memo),
  };
}

export function rowToPhoto(r: Row): Photo {
  return {
    id: str(r.id), containerId: str(r.container_id), slotKey: strOrNull(r.slot_key),
    originalPath: strOrNull(r.original_path), displayPath: strOrNull(r.display_path), thumbPath: strOrNull(r.thumb_path),
    fileHash: str(r.file_hash), byteSize: numOrNull(r.byte_size), capturedAt: strOrNull(r.captured_at),
    gpsLat: numOrNull(r.gps_lat), gpsLng: numOrNull(r.gps_lng),
    status: r.status === 'soft_deleted' ? 'soft_deleted' : 'uploaded',
  };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- mappers repo-config`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/supabaseMappers.ts src/admin/repoConfig.ts test/admin/mappers.test.ts test/admin/repo-config.test.ts
git commit -m "feat: row mappers + supabase config predicate"
```

---

## Task 2: DbPort 어댑터 + Supabase 구현

**Files:**
- Create: `src/admin/db.ts`
- Test: `test/admin/db.test.ts`

**Interfaces:**
- Consumes: `SupabaseClient` type from `@supabase/supabase-js`.
- Produces: `type Row = Record<string, unknown>`; `interface Filter { col: string; val: string }`; `interface DbPort { select(table: string, filter?: Filter): Promise<Row[]>; insert(table: string, values: Row | Row[]): Promise<Row[]> }`; `createSupabaseDbPort(client): DbPort`.

- [ ] **Step 1: Write failing test**

`test/admin/db.test.ts`:
```ts
import { createSupabaseDbPort } from '../../src/admin/db';

// Minimal fake of the supabase query builder: a thenable that also chains .eq/.select/.insert.
function fakeClient(resp: { data?: unknown; error?: { message: string } | null }) {
  const result = { data: resp.data ?? null, error: resp.error ?? null };
  const calls: any[] = [];
  const builder: any = {
    select: (...a: any[]) => { calls.push(['select', ...a]); return builder; },
    insert: (...a: any[]) => { calls.push(['insert', ...a]); return builder; },
    eq: (...a: any[]) => { calls.push(['eq', ...a]); return builder; },
    then: (onF: any, onR: any) => Promise.resolve(result).then(onF, onR),
  };
  const client: any = { from: (t: string) => { calls.push(['from', t]); return builder; } };
  return { client, calls };
}

test('select returns rows', async () => {
  const { client } = fakeClient({ data: [{ id: '1' }] });
  const db = createSupabaseDbPort(client);
  expect(await db.select('customers')).toEqual([{ id: '1' }]);
});

test('select with filter calls eq', async () => {
  const { client, calls } = fakeClient({ data: [] });
  const db = createSupabaseDbPort(client);
  await db.select('work_orders', { col: 'id', val: 'wo1' });
  expect(calls).toContainEqual(['eq', 'id', 'wo1']);
});

test('select throws on error', async () => {
  const { client } = fakeClient({ error: { message: 'boom' } });
  const db = createSupabaseDbPort(client);
  await expect(db.select('customers')).rejects.toThrow('boom');
});

test('insert returns inserted rows', async () => {
  const { client } = fakeClient({ data: [{ id: 'x' }] });
  const db = createSupabaseDbPort(client);
  expect(await db.insert('work_orders', { a: 1 })).toEqual([{ id: 'x' }]);
});

test('insert throws on error', async () => {
  const { client } = fakeClient({ error: { message: 'nope' } });
  const db = createSupabaseDbPort(client);
  await expect(db.insert('photos', { a: 1 })).rejects.toThrow('nope');
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npm test -- admin/db`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/admin/db.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export type Row = Record<string, unknown>;
export interface Filter { col: string; val: string }

export interface DbPort {
  select(table: string, filter?: Filter): Promise<Row[]>;
  insert(table: string, values: Row | Row[]): Promise<Row[]>;
}

export function createSupabaseDbPort(client: SupabaseClient): DbPort {
  return {
    async select(table, filter) {
      let q = client.from(table).select('*');
      if (filter) q = q.eq(filter.col, filter.val) as typeof q;
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
    async insert(table, values) {
      const { data, error } = await client.from(table).insert(values).select();
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  };
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npm test -- admin/db`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/db.ts test/admin/db.test.ts
git commit -m "feat: DbPort adapter over supabase client"
```

---

## Task 3: AdminRepo 확장(사진) + 인메모리 구현

**Files:**
- Modify: `src/admin/repo.ts`
- Test: `test/admin/repo-photos.test.ts`

**Interfaces:**
- Consumes: `Photo` from `src/domain/types.ts`.
- Produces: `interface NewPhoto { containerId: string; slotKey: string; displayPath: string; thumbPath: string; fileHash: string; byteSize: number; capturedAt: string }`. `AdminRepo` gains `insertPhoto(p: NewPhoto): Promise<void>` and `listPhotos(containerId: string): Promise<Photo[]>`. `createInMemoryAdminRepo()` implements both.

- [ ] **Step 1: Write failing test**

`test/admin/repo-photos.test.ts`:
```ts
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('insertPhoto then listPhotos returns it for that container only', async () => {
  const repo = createInMemoryAdminRepo();
  await repo.insertPhoto({
    containerId: 'ctn-1', slotKey: 'seal', displayPath: 'containers/ctn-1/seal-h.webp',
    thumbPath: 'containers/ctn-1/seal-h-thumb.webp', fileHash: 'h', byteSize: 10, capturedAt: '2026-07-02T00:00:00Z',
  });
  const mine = await repo.listPhotos('ctn-1');
  expect(mine.map((p) => p.slotKey)).toEqual(['seal']);
  expect(mine[0].displayPath).toBe('containers/ctn-1/seal-h.webp');
  expect(mine[0].status).toBe('uploaded');
  expect(await repo.listPhotos('ctn-other')).toEqual([]);
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npm test -- repo-photos`
Expected: FAIL (`insertPhoto` not a function).

- [ ] **Step 3: Implement**

In `src/admin/repo.ts`, add `Photo` to the domain import and add the `NewPhoto` interface + interface methods + in-memory implementation.

Change the import line:
```ts
import type { Container, Customer, Photo, WorkOrder, WorkTypeTemplate } from '../domain/types';
```

Add after the `NewWorkOrder` interface:
```ts
export interface NewPhoto {
  containerId: string; slotKey: string; displayPath: string; thumbPath: string;
  fileHash: string; byteSize: number; capturedAt: string;
}
```

Add to the `AdminRepo` interface (after `getByWorkerToken`):
```ts
  insertPhoto(p: NewPhoto): Promise<void>;
  listPhotos(containerId: string): Promise<Photo[]>;
```

Inside `createInMemoryAdminRepo`, add state near the other seed arrays:
```ts
  const photos: Photo[] = [];
  let pseq = 0;
```

Add these two methods to the returned object (e.g. after `createWorkOrder`):
```ts
    async insertPhoto(p) {
      photos.push({
        id: `photo-${++pseq}`, containerId: p.containerId, slotKey: p.slotKey,
        originalPath: null, displayPath: p.displayPath, thumbPath: p.thumbPath,
        fileHash: p.fileHash, byteSize: p.byteSize, capturedAt: p.capturedAt,
        gpsLat: null, gpsLng: null, status: 'uploaded',
      });
    },
    async listPhotos(containerId) {
      return photos.filter((p) => p.containerId === containerId);
    },
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test -- repo-photos repo`
Expected: PASS (new photo test + existing repo tests).

- [ ] **Step 5: Commit**

```bash
git add src/admin/repo.ts test/admin/repo-photos.test.ts
git commit -m "feat: AdminRepo photo methods + in-memory impl"
```

---

## Task 4: SupabaseAdminRepo

**Files:**
- Create: `src/admin/supabaseRepo.ts`
- Test: `test/admin/supabase-repo.test.ts`

**Interfaces:**
- Consumes: `AdminRepo`, `NewWorkOrder`, `NewPhoto` from `./repo`; `DbPort`, `Row` from `./db`; mappers from `./supabaseMappers`; `parseTemplate`, `RawTemplateRow` from `../domain/template`; `randomToken` from `./token`.
- Produces: `createSupabaseAdminRepo(db: DbPort): AdminRepo`.

**Notes:** DB에 `select *`를 요청하므로 template 행은 `parseTemplate`가 기대하는 컬럼(`anchor_type`,`min_count`,`warning_text`,`rules`,`required_photos`)을 포함한다. `createWorkOrder`는 order insert → containers insert(있을 때) → share_link insert(worker 토큰) 순. `getByWorkerToken`은 token으로 share_link 조회 후 kind==='worker' && revoked!==true 인 것만 사용.

- [ ] **Step 1: Write failing test**

`test/admin/supabase-repo.test.ts`:
```ts
import { createSupabaseAdminRepo } from '../../src/admin/supabaseRepo';
import type { DbPort, Row, Filter } from '../../src/admin/db';

// In-memory fake DbPort: tables keyed by name; insert assigns an id when missing.
function memPort(seed: Record<string, Row[]> = {}): DbPort {
  const tables: Record<string, Row[]> = { customers: [], work_type_templates: [], work_orders: [], containers: [], share_links: [], photos: [], ...seed };
  return {
    async select(table: string, filter?: Filter) {
      const rows = tables[table] ?? [];
      return filter ? rows.filter((r) => String(r[filter.col]) === filter.val) : [...rows];
    },
    async insert(table: string, values: Row | Row[]) {
      const arr = Array.isArray(values) ? values : [values];
      const inserted = arr.map((r, i) => ({ id: r.id ?? `${table}-${(tables[table]?.length ?? 0) + i}`, ...r }));
      tables[table] = [...(tables[table] ?? []), ...inserted];
      return inserted;
    },
  };
}

const tplRow: Row = {
  id: 'tpl-tcr', name: 'TCR', carrier: '중국세관', route: 'TCR', anchor_type: 'container_no',
  min_count: 8, warning_text: '반송 주의', rules: {}, required_photos: [{ key: 'seal', label: '씰', instruction: '', required: true }],
};

test('list methods map rows to domain', async () => {
  const db = memPort({
    customers: [{ id: 'c1', name: 'MTL', contact: null, notes: null }],
    work_type_templates: [tplRow],
    work_orders: [{ id: 'wo1', customer_id: 'c1', template_id: 'tpl-tcr', work_date: null, status: 'sent', assignee_name: 'A', assignee_contact: 'B', shipper_label: null }],
  });
  const repo = createSupabaseAdminRepo(db);
  expect((await repo.listCustomers())[0].name).toBe('MTL');
  expect((await repo.listTemplates())[0].route).toBe('TCR');
  expect((await repo.listWorkOrders())[0].id).toBe('wo1');
});

test('createWorkOrder inserts order + containers + worker share_link, token resolves back', async () => {
  const db = memPort({ work_type_templates: [tplRow], customers: [{ id: 'c1', name: 'MTL', contact: null, notes: null }] });
  const repo = createSupabaseAdminRepo(db);
  const { order, workerToken } = await repo.createWorkOrder({
    customerId: 'c1', templateId: 'tpl-tcr', containerNos: ['ABCD1234567'],
    workDate: null, assigneeName: '박', assigneeContact: '010',
  });
  expect(order.status).toBe('sent');
  expect(workerToken).toMatch(/^[A-Za-z0-9]+$/);
  const r = await repo.getByWorkerToken(workerToken);
  expect(r).not.toBeNull();
  expect(r!.order.id).toBe(order.id);
  expect(r!.template.route).toBe('TCR');
  expect(r!.containers.map((c) => c.containerNo)).toEqual(['ABCD1234567']);
});

test('getByWorkerToken returns null for unknown and revoked tokens', async () => {
  const db = memPort({
    share_links: [{ id: 's1', work_order_id: 'wo1', token: 'revoked-tok', kind: 'worker', revoked: true }],
  });
  const repo = createSupabaseAdminRepo(db);
  expect(await repo.getByWorkerToken('nope')).toBeNull();
  expect(await repo.getByWorkerToken('revoked-tok')).toBeNull();
});

test('insertPhoto then listPhotos round-trips through the port', async () => {
  const db = memPort();
  const repo = createSupabaseAdminRepo(db);
  await repo.insertPhoto({ containerId: 'k1', slotKey: 'seal', displayPath: 'd.webp', thumbPath: 't.webp', fileHash: 'h', byteSize: 5, capturedAt: '2026-07-02T00:00:00Z' });
  const list = await repo.listPhotos('k1');
  expect(list.map((p) => p.slotKey)).toEqual(['seal']);
  expect(list[0].displayPath).toBe('d.webp');
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npm test -- supabase-repo`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/admin/supabaseRepo.ts`:
```ts
import type { AdminRepo, NewPhoto, NewWorkOrder } from './repo';
import type { DbPort } from './db';
import { parseTemplate, type RawTemplateRow } from '../domain/template';
import { rowToContainer, rowToCustomer, rowToPhoto, rowToWorkOrder } from './supabaseMappers';
import { randomToken } from './token';

export function createSupabaseAdminRepo(db: DbPort): AdminRepo {
  return {
    async listCustomers() {
      return (await db.select('customers')).map(rowToCustomer);
    },
    async listTemplates() {
      return (await db.select('work_type_templates')).map((r) => parseTemplate(r as unknown as RawTemplateRow));
    },
    async listWorkOrders() {
      return (await db.select('work_orders')).map(rowToWorkOrder);
    },
    async createWorkOrder(input: NewWorkOrder) {
      const [orderRow] = await db.insert('work_orders', {
        customer_id: input.customerId, template_id: input.templateId, work_date: input.workDate,
        status: 'sent', assignee_name: input.assigneeName, assignee_contact: input.assigneeContact,
      });
      const order = rowToWorkOrder(orderRow);
      if (input.containerNos.length) {
        await db.insert('containers', input.containerNos.map((no) => ({ work_order_id: order.id, container_no: no })));
      }
      const workerToken = randomToken();
      await db.insert('share_links', { work_order_id: order.id, token: workerToken, kind: 'worker' });
      return { order, workerToken };
    },
    async getByWorkerToken(token: string) {
      const links = await db.select('share_links', { col: 'token', val: token });
      const link = links.find((l) => l.kind === 'worker' && l.revoked !== true);
      if (!link) return null;
      const [orderRow] = await db.select('work_orders', { col: 'id', val: String(link.work_order_id) });
      if (!orderRow) return null;
      const order = rowToWorkOrder(orderRow);
      const [tplRow] = await db.select('work_type_templates', { col: 'id', val: order.templateId });
      if (!tplRow) return null;
      const template = parseTemplate(tplRow as unknown as RawTemplateRow);
      const containers = (await db.select('containers', { col: 'work_order_id', val: order.id })).map(rowToContainer);
      return { order, template, containers };
    },
    async insertPhoto(p: NewPhoto) {
      await db.insert('photos', {
        container_id: p.containerId, slot_key: p.slotKey, display_path: p.displayPath, thumb_path: p.thumbPath,
        file_hash: p.fileHash, byte_size: p.byteSize, captured_at: p.capturedAt, status: 'uploaded',
      });
    },
    async listPhotos(containerId: string) {
      return (await db.select('photos', { col: 'container_id', val: containerId })).map(rowToPhoto);
    },
  };
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npm test -- supabase-repo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/supabaseRepo.ts test/admin/supabase-repo.test.ts
git commit -m "feat: SupabaseAdminRepo over DbPort"
```

---

## Task 5: 작업자 온라인 업로드 프리미티브 `uploadSlotPhoto`

**Files:**
- Create: `src/worker/uploadPhoto.ts`
- Test: `test/worker/upload-photo.test.ts`

**Interfaces:**
- Consumes: `NewPhoto` from `../admin/repo`.
- Produces: `interface PhotoStorage { upload(path, body, opts): Promise<{ error: { message: string } | null }> }`; `interface UploadSlotDeps { makeVariants(b): Promise<{ display: Blob; thumb: Blob }>; sha256Hex(b): Promise<string>; storage: PhotoStorage; insertPhoto(p: NewPhoto): Promise<void>; now(): string }`; `uploadSlotPhoto(photo: Blob, ctx: { slotKey: string; containerId: string }, deps): Promise<{ displayPath: string; thumbPath: string; hash: string }>`.

**Notes:** 경로 규칙 `containers/{containerId}/{slotKey}-{hash}.webp`(display), `...-{hash}-thumb.webp`(thumb). display/thumb 둘 다 `upsert:true`, `image/webp`. `byteSize`는 display blob 크기. display 업로드 실패 시 thumb·insert를 하지 않고 throw. `now`는 주입식(테스트 결정성) — 컴포넌트는 `() => new Date().toISOString()` 전달.

- [ ] **Step 1: Write failing test**

`test/worker/upload-photo.test.ts`:
```ts
import { uploadSlotPhoto, type UploadSlotDeps } from '../../src/worker/uploadPhoto';
import type { NewPhoto } from '../../src/admin/repo';

function deps(over: Partial<UploadSlotDeps> = {}): { deps: UploadSlotDeps; uploads: any[]; inserted: NewPhoto[] } {
  const uploads: any[] = [];
  const inserted: NewPhoto[] = [];
  const d: UploadSlotDeps = {
    makeVariants: async () => ({ display: new Blob(['dddd']), thumb: new Blob(['t']) }),
    sha256Hex: async () => 'hash1',
    storage: { async upload(path, _body, opts) { uploads.push({ path, opts }); return { error: null }; } },
    insertPhoto: async (p) => { inserted.push(p); },
    now: () => '2026-07-02T00:00:00Z',
    ...over,
  };
  return { deps: d, uploads, inserted };
}

test('uploads display + thumb to slot paths and inserts a photo row', async () => {
  const { deps: d, uploads, inserted } = deps();
  const res = await uploadSlotPhoto(new Blob(['orig']), { slotKey: 'seal', containerId: 'ctn-1' }, d);
  expect(res).toEqual({
    displayPath: 'containers/ctn-1/seal-hash1.webp',
    thumbPath: 'containers/ctn-1/seal-hash1-thumb.webp',
    hash: 'hash1',
  });
  expect(uploads.map((u) => u.path)).toEqual([
    'containers/ctn-1/seal-hash1.webp',
    'containers/ctn-1/seal-hash1-thumb.webp',
  ]);
  expect(uploads[0].opts).toEqual({ contentType: 'image/webp', upsert: true });
  expect(inserted).toHaveLength(1);
  expect(inserted[0]).toMatchObject({
    containerId: 'ctn-1', slotKey: 'seal', fileHash: 'hash1',
    displayPath: 'containers/ctn-1/seal-hash1.webp', capturedAt: '2026-07-02T00:00:00Z',
  });
  expect(inserted[0].byteSize).toBeGreaterThan(0);
});

test('throws and does not insert when display upload fails', async () => {
  const { deps: d, inserted } = deps({ storage: { async upload() { return { error: { message: 'up-fail' } }; } } });
  await expect(uploadSlotPhoto(new Blob(['o']), { slotKey: 'empty', containerId: 'k' }, d)).rejects.toThrow('up-fail');
  expect(inserted).toHaveLength(0);
});

test('throws when thumb upload fails (after display ok)', async () => {
  let n = 0;
  const { deps: d, inserted } = deps({
    storage: { async upload() { n += 1; return n === 1 ? { error: null } : { error: { message: 'thumb-fail' } }; } },
  });
  await expect(uploadSlotPhoto(new Blob(['o']), { slotKey: 'empty', containerId: 'k' }, d)).rejects.toThrow('thumb-fail');
  expect(inserted).toHaveLength(0);
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npm test -- upload-photo`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/worker/uploadPhoto.ts`:
```ts
import type { NewPhoto } from '../admin/repo';

export interface PhotoStorage {
  upload(path: string, body: Blob, opts: { contentType: string; upsert: boolean }): Promise<{ error: { message: string } | null }>;
}

export interface UploadSlotDeps {
  makeVariants(b: Blob): Promise<{ display: Blob; thumb: Blob }>;
  sha256Hex(b: Blob): Promise<string>;
  storage: PhotoStorage;
  insertPhoto(p: NewPhoto): Promise<void>;
  now(): string;
}

export async function uploadSlotPhoto(
  photo: Blob,
  ctx: { slotKey: string; containerId: string },
  deps: UploadSlotDeps,
): Promise<{ displayPath: string; thumbPath: string; hash: string }> {
  const { display, thumb } = await deps.makeVariants(photo);
  const hash = await deps.sha256Hex(display);
  const base = `containers/${ctx.containerId}/${ctx.slotKey}-${hash}`;
  const displayPath = `${base}.webp`;
  const thumbPath = `${base}-thumb.webp`;

  const d = await deps.storage.upload(displayPath, display, { contentType: 'image/webp', upsert: true });
  if (d.error) throw new Error(d.error.message);
  const t = await deps.storage.upload(thumbPath, thumb, { contentType: 'image/webp', upsert: true });
  if (t.error) throw new Error(t.error.message);

  await deps.insertPhoto({
    containerId: ctx.containerId, slotKey: ctx.slotKey, displayPath, thumbPath,
    fileHash: hash, byteSize: display.size, capturedAt: deps.now(),
  });
  return { displayPath, thumbPath, hash };
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npm test -- upload-photo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/worker/uploadPhoto.ts test/worker/upload-photo.test.ts
git commit -m "feat: uploadSlotPhoto online capture primitive"
```

---

## Task 6: repo 팩토리 + 콘솔·워커 화면 배선

**Files:**
- Create: `src/admin/repoFactory.ts`
- Modify: `src/admin/AdminConsole.tsx`
- Modify: `src/worker/WorkerCapture.tsx`
- Test: `test/admin/repo-factory.test.ts`

**Interfaces:**
- Consumes: `isSupabaseConfigured` (`./repoConfig`), `createSupabaseAdminRepo` (`./supabaseRepo`), `createSupabaseDbPort` (`./db`), `createInMemoryAdminRepo` (`./repo`), `supabase` (`../lib/supabase`), `uploadSlotPhoto` (`../worker/uploadPhoto`), `makeVariants` (`../lib/image`), `sha256Hex` (`../lib/hash`).
- Produces: `getAdminRepo(): AdminRepo` (singleton).

**Notes:** 팩토리는 `import.meta.env.VITE_SUPABASE_URL`을 `isSupabaseConfigured`로 판정. 테스트 환경(`localhost`) → 인메모리라 기존 테스트 유지. 싱글톤(`cached`)이라 한 세션에서 콘솔·워커가 같은 인스턴스를 공유(인메모리 fallback에서도 크로스-화면 동작). WorkerCapture는 오프라인 큐(`allItems`/`captureToSlot`) 대신 `repo.listPhotos`(체크리스트) + `uploadSlotPhoto`(촬영)를 사용. supabase Storage는 얇은 래퍼로 `PhotoStorage`에 어댑트.

- [ ] **Step 1: Write failing test**

`test/admin/repo-factory.test.ts`:
```ts
import { getAdminRepo } from '../../src/admin/repoFactory';

// Test env URL is http://localhost:54321 (vite.config test.env) → not configured → in-memory repo.
test('returns the in-memory repo in the test environment (demo token resolves)', async () => {
  const repo = getAdminRepo();
  const r = await repo.getByWorkerToken('demotoken123');
  expect(r).not.toBeNull();
  expect(r!.template.route).toBe('TCR');
});

test('is a singleton (same instance across calls)', () => {
  expect(getAdminRepo()).toBe(getAdminRepo());
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npm test -- repo-factory`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the factory**

`src/admin/repoFactory.ts`:
```ts
import type { AdminRepo } from './repo';
import { createInMemoryAdminRepo } from './repo';
import { createSupabaseAdminRepo } from './supabaseRepo';
import { createSupabaseDbPort } from './db';
import { isSupabaseConfigured } from './repoConfig';
import { supabase } from '../lib/supabase';

let cached: AdminRepo | null = null;

export function getAdminRepo(): AdminRepo {
  if (!cached) {
    cached = isSupabaseConfigured(import.meta.env.VITE_SUPABASE_URL as string | undefined)
      ? createSupabaseAdminRepo(createSupabaseDbPort(supabase))
      : createInMemoryAdminRepo();
  }
  return cached;
}
```

- [ ] **Step 4: Run factory test, verify pass**

Run: `npm test -- repo-factory`
Expected: PASS.

- [ ] **Step 5: Wire AdminConsole**

In `src/admin/AdminConsole.tsx`: remove the module-level `const repo = createInMemoryAdminRepo()` and its import; accept an optional injected repo defaulting to the factory.

Replace the top imports:
```ts
import { useState } from 'react';
import { getAdminRepo } from './repoFactory';
import type { AdminRepo } from './repo';
import { WorkOrderBoard } from './WorkOrderBoard';
import { CreateWorkOrder } from './CreateWorkOrder';
```

Replace the function signature line (was `export function AdminConsole() {`) with:
```ts
export function AdminConsole({ repo = getAdminRepo() }: { repo?: AdminRepo } = {}) {
```

(The `repo` is now the parameter; the module-level `const repo` line is deleted. The JSX already references `repo`.)

- [ ] **Step 6: Wire WorkerCapture to online upload**

Rewrite `src/worker/WorkerCapture.tsx` to use the factory repo, read the checklist from `repo.listPhotos`, and upload on capture. Full file:
```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { AdminRepo } from '../admin/repo';
import { getAdminRepo } from '../admin/repoFactory';
import type { Container, WorkTypeTemplate } from '../domain/types';
import { checklistStatus } from '../domain/checklist';
import { makeVariants } from '../lib/image';
import { sha256Hex } from '../lib/hash';
import { supabase } from '../lib/supabase';
import { uploadSlotPhoto } from './uploadPhoto';

export function WorkerCapture({ repo = getAdminRepo() }: { repo?: AdminRepo } = {}) {
  const { token } = useParams();
  const [state, setState] = useState<{ template: WorkTypeTemplate; container: Container; workOrderId: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [captured, setCaptured] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    repo.getByWorkerToken(token ?? '').then((r) => {
      if (!r || r.containers.length === 0) { setNotFound(true); return; }
      setState({ template: r.template, container: r.containers[0], workOrderId: r.order.id });
    });
  }, [repo, token]);

  async function refresh(containerId: string) {
    const photos = await repo.listPhotos(containerId);
    setCaptured(photos.filter((p) => p.slotKey).map((p) => p.slotKey as string));
  }
  useEffect(() => { if (state) void refresh(state.container.id); }, [state]);

  if (notFound) return <main style={sx.page}><p style={{ color: '#E0A100' }}>잘못된 링크입니다.</p></main>;
  if (!state) return <main style={sx.page} />;

  const status = checklistStatus(captured, state.template);

  async function shoot(slotKey: string, photo: Blob) {
    setError(null);
    try {
      await uploadSlotPhoto(photo, { slotKey, containerId: state!.container.id }, {
        makeVariants, sha256Hex,
        storage: { upload: (path, body, opts) => supabase.storage.from('captures').upload(path, body, opts) },
        insertPhoto: (p) => repo.insertPhoto(p),
        now: () => new Date().toISOString(),
      });
      await refresh(state!.container.id);
    } catch (e) {
      setError('업로드 실패 — 신호를 확인하고 다시 시도하세요.');
    }
  }

  return (
    <main style={sx.page}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#9FB2C2' }}>거래처 링크 · {state.template.route}</div>
      <div style={sx.plate}>{state.container.containerNo}</div>
      {state.template.warningText && <div style={sx.warn}>{state.template.warningText}</div>}
      {error && <div style={{ ...sx.warn, color: '#DC2626', borderColor: 'rgba(220,38,38,0.4)', background: 'rgba(220,38,38,0.1)' }}>{error}</div>}
      <div style={{ marginTop: 12 }}>
        {state.template.requiredPhotos.filter((s) => s.required).map((slot) => {
          const done = captured.includes(slot.key);
          return (
            <div key={slot.key} style={sx.row}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: '#fff' }}>{slot.label}</div>
                <div style={{ fontSize: 12, color: '#9FB2C2' }}>{slot.instruction}</div>
              </div>
              {done ? <span style={{ color: '#15A34A', fontSize: 13 }}>완료</span> : (
                <label style={sx.shoot}>촬영
                  <input type="file" accept="image/*" capture="environment" hidden
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) shoot(slot.key, f); e.target.value = ''; }} />
                </label>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, fontSize: 13, color: status.complete ? '#15A34A' : '#E0A100' }}>
        {status.satisfied.length} / {status.satisfied.length + status.missing.length} 촬영{status.missing.length ? ` · 누락 ${status.missing.length}` : ''}
      </div>
      <button onClick={() => setSubmitted(true)} disabled={submitted}
        style={{ ...sx.submit, opacity: submitted ? 0.6 : 1 }}>
        {submitted ? '제출됨' : status.complete ? '제출' : '누락 있음 — 그래도 제출'}
      </button>
    </main>
  );
}

const sx = {
  page: { minHeight: '100vh', background: '#0F1B26', color: '#E7ECF1', fontFamily: 'Pretendard, sans-serif', padding: 16, maxWidth: 420, margin: '0 auto' } as const,
  plate: { fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 20, letterSpacing: 0.5, background: '#16242F', border: '1px solid #22507A', borderRadius: 10, padding: '10px 14px', marginTop: 6 } as const,
  warn: { marginTop: 10, fontSize: 12, color: '#E0A100', background: 'rgba(224,161,0,0.1)', border: '1px solid rgba(224,161,0,0.3)', borderRadius: 8, padding: '8px 10px' } as const,
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '0.5px solid rgba(159,178,194,0.2)' } as const,
  shoot: { background: '#FF6A00', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' } as const,
  submit: { width: '100%', marginTop: 16, padding: 11, borderRadius: 10, border: 0, background: '#FF6A00', color: '#fff', fontSize: 15, fontWeight: 600 } as const,
};
```

- [ ] **Step 7: Run the full suite, verify green**

Run: `npm test`
Expected: PASS — all existing tests (console/routes/worker-capture use the factory → in-memory in test env) plus the new tests.

- [ ] **Step 8: Typecheck + build**

Run: `npm run build`
Expected: `tsc -b` clean, vite build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/admin/repoFactory.ts src/admin/AdminConsole.tsx src/worker/WorkerCapture.tsx test/admin/repo-factory.test.ts
git commit -m "feat: repo factory + wire console/worker to shared repo & online upload"
```

---

## Manual Verification (라이브 — 자동 스위트 밖)

빌드·병합 후 사용자 프로젝트에서 확인한다. (RLS가 꺼져 있어 anon 키로 아래가 동작한다.)

1. **콘솔 → 워커 크로스-화면(라이브):** 배포된 `/admin`에서 "새 작업" → 거래처/템플릿/컨테이너 입력 → 생성 → 발급된 `/c/{token}` 링크를 다른 기기/시크릿창에서 연다. 실제 컨테이너·체크리스트가 뜨면 share_link가 실 DB에 저장·조회된 것.
2. **촬영 업로드:** 워커 화면에서 슬롯 촬영 → "완료" 표시 → Supabase 대시보드 Storage `captures/containers/{id}/...`에 `.webp`(display)와 `-thumb.webp`가, `photos` 테이블에 행이 생기는지 확인.
3. **에이전트 스모크(선택):** REST + anon 키로 `work_orders`/`containers`/`share_links` 임시 행을 넣고 `getByWorkerToken` 경로를 재현 후 삭제(정리)하여 조립을 확인.

## 후속(이 플랜 밖, 우선순위 순)

- **보안 하드닝(즉시 다음):** RLS on + 사무실 Supabase Auth + 작업자/수신자 토큰 검증 RPC(또는 Edge Function). 현재 DB 공개 상태 해소.
- **오프라인 드레인:** 신호 불량 현장 대비. 기존 `captureQueue`+`sync.drainQueue`를 Storage+`photos` insert로 연결(업로드 실패 시 큐로 폴백).
- **Plan C.2(검토·발행)·Plan E(수신자 갤러리):** 사진 조회는 비공개 버킷 서명 URL 필요.

## Self-Review

- **Spec/scope coverage:** SupabaseAdminRepo(모든 AdminRepo 메서드) ✓, 팩토리 환경 선택 ✓, 콘솔·워커 배선 ✓, 실 사진 업로드(display+thumb+row) ✓. 보안/오프라인/갤러리는 명시적으로 범위 밖(후속).
- **Placeholder scan:** 모든 코드 스텝에 실제 코드·테스트·명령 포함, TBD 없음.
- **Type consistency:** `NewPhoto`(camel) 단일 정의(repo.ts) → supabaseRepo·uploadPhoto·WorkerCapture 재사용. `DbPort.select/insert` 시그니처 Task 2↔4 일치. `PhotoStorage.upload` 반환 `{error}`만 사용 → supabase storage `{data,error}`와 호환(래퍼로 어댑트). `getByWorkerToken` 반환 `{order,template,containers}`는 기존 WorkerCapture 사용부와 일치.
- **기존 테스트 회귀:** console/routes/worker-capture는 팩토리 기본값 사용 → 테스트 환경 localhost → 인메모리 → 시드(`demotoken123`,`MTL 지사`,`빈 컨테이너`,`반송`) 유지되어 통과.
