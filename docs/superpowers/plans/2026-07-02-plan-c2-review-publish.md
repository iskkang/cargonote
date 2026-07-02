# Plan C.2 — 검토·발행 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사무실(로그인)이 보드에서 작업을 열어 컨테이너별·슬롯당 최신 사진을 검토하고, 발행하면 수신자 링크 `/v/{token}`가 생성되고 상태가 published가 된다.

**Architecture:** 순수 헬퍼 `latestPerSlot`(슬롯당 최신 사진)로 재촬영 중복을 정리한다. `AdminRepo`에 `getWorkOrderReview`/`publish`를 추가하고 인메모리·Supabase 양쪽에 구현한다(발행은 `publications` 기록 + viewer `share_link` 생성/재사용 + `work_orders.status='published'`; Supabase 갱신용으로 `DbPort.update` 추가). 썸네일은 비공개 버킷이라 주입식 서명 URL 헬퍼로 표시한다(사무실은 authenticated → 0005 read). 검토 UI는 새 라우트 없이 콘솔 내 `ReviewPanel`(보드↔상세 토글)로 넣는다. 수신자 화면 자체는 Plan E 범위(C.2는 링크 생성·표시까지).

**Tech Stack:** TypeScript, React 18, Vite 5, `@supabase/supabase-js` v2 (Storage signed URLs + table update), Vitest + @testing-library/react.

## Global Constraints

- **슬롯당 최신본:** 검토 표시와 발행 매니페스트는 컨테이너별로 `latestPerSlot`(슬롯키별 `capturedAt` 최댓값) 결과를 쓴다. `capturedAt`은 ISO 문자열이라 사전순=시간순.
- **발행 의미:** `publish(id)`는 (1) viewer `share_link`를 생성하되 **이미 있으면 토큰 재사용**(링크 안정), (2) `publications` 행 기록(photo_manifest = 슬롯당 최신 photo id들), (3) `work_orders.status='published'`. 반환 `{ viewerToken }`.
- **누락 허용:** 체크리스트가 미완이어도 발행 가능(관리자 게이트). UI는 "누락 N장" 경고만.
- **검토 UI = 콘솔 내 패널**(새 라우트 없음). `WorkOrderBoard`에 optional `onSelect` 추가(기존 렌더 불변). `AdminConsole`이 `selectedId`로 보드/리뷰 전환.
- **썸네일:** 비공개 `captures` 버킷 → 서명 URL. 서명 함수는 주입식(테스트는 stub). Storage는 repo에서 분리.
- **인증 전제:** 검토·발행은 이미 `AuthGate` 뒤(`/admin`)라 authenticated. Supabase 경로는 테이블 직접 접근(RLS 통과). 테스트 환경은 팩토리가 인메모리라 컴포넌트 테스트가 백엔드 없이 돈다.
- **범위 밖:** `/v/:token` 수신자 화면(Plan E). C.2는 링크 생성·표시까지.
- 기존 테스트: 컴포넌트 직접 렌더 테스트 불변(`onSelect` optional). 새 의존성 금지. DRY, YAGNI, TDD.

---

## Task 1: `latestPerSlot` + 리뷰 타입 (순수)

**Files:**
- Create: `src/domain/review.ts`
- Test: `test/domain/review.test.ts`

**Interfaces:**
- Consumes: `Container`, `Customer`, `Photo`, `WorkOrder`, `WorkTypeTemplate` from `./types`.
- Produces: `interface ContainerReview { container: Container; photos: Photo[] }` (photos already latest-per-slot); `interface WorkOrderReview { order: WorkOrder; template: WorkTypeTemplate; customer: Customer | null; containers: ContainerReview[] }`; `latestPerSlot(photos: Photo[]): Photo[]`.

- [ ] **Step 1: Write failing test**

`test/domain/review.test.ts`:
```ts
import { latestPerSlot } from '../../src/domain/review';
import type { Photo } from '../../src/domain/types';

function ph(id: string, slotKey: string | null, capturedAt: string | null): Photo {
  return { id, containerId: 'k1', slotKey, originalPath: null, displayPath: `${id}.webp`, thumbPath: `${id}-t.webp`, fileHash: id, byteSize: 1, capturedAt, gpsLat: null, gpsLng: null, status: 'uploaded' };
}

test('keeps only the latest photo per slot key', () => {
  const out = latestPerSlot([
    ph('a', 'seal', '2026-07-02T01:00:00Z'),
    ph('b', 'seal', '2026-07-02T03:00:00Z'),
    ph('c', 'empty', '2026-07-02T02:00:00Z'),
  ]);
  const ids = out.map((p) => p.id).sort();
  expect(ids).toEqual(['b', 'c']);       // b (latest seal) + c (empty); a dropped
});

test('drops photos with a null slot key', () => {
  const out = latestPerSlot([ph('a', null, '2026-07-02T01:00:00Z'), ph('b', 'seal', '2026-07-02T01:00:00Z')]);
  expect(out.map((p) => p.id)).toEqual(['b']);
});

test('empty in, empty out', () => {
  expect(latestPerSlot([])).toEqual([]);
});
```

- [ ] **Step 2: Run test, verify fail** — `npm test -- domain/review` → FAIL (module not found).

- [ ] **Step 3: Implement**

`src/domain/review.ts`:
```ts
import type { Container, Customer, Photo, WorkOrder, WorkTypeTemplate } from './types';

export interface ContainerReview { container: Container; photos: Photo[] }
export interface WorkOrderReview { order: WorkOrder; template: WorkTypeTemplate; customer: Customer | null; containers: ContainerReview[] }

// One photo per slot: the latest by capturedAt (ISO string → lexicographic = chronological).
// Photos with no slotKey are dropped (not part of the required-photo checklist).
export function latestPerSlot(photos: Photo[]): Photo[] {
  const best = new Map<string, Photo>();
  for (const p of photos) {
    if (!p.slotKey) continue;
    const cur = best.get(p.slotKey);
    if (!cur || (p.capturedAt ?? '') > (cur.capturedAt ?? '')) best.set(p.slotKey, p);
  }
  return [...best.values()];
}
```

- [ ] **Step 4: Run test, verify pass** — `npm test -- domain/review` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/review.ts test/domain/review.test.ts
git commit -m "feat: latestPerSlot review helper + review types"
```

---

## Task 2: AdminRepo review/publish (인터페이스 + 인메모리)

**Files:**
- Modify: `src/admin/repo.ts`
- Test: `test/admin/review-inmemory.test.ts`

**Interfaces:**
- Consumes: `WorkOrderReview` + `latestPerSlot` from `../domain/review`.
- Produces: `AdminRepo` gains `getWorkOrderReview(id: string): Promise<WorkOrderReview | null>` and `publish(id: string): Promise<{ viewerToken: string }>`. In-memory implements both (adds `viewerTokens` map + `publications` array).

- [ ] **Step 1: Write failing test**

`test/admin/review-inmemory.test.ts`:
```ts
import { createInMemoryAdminRepo } from '../../src/admin/repo';

async function seeded() {
  const repo = createInMemoryAdminRepo();
  // ctn-1 belongs to wo-2 (TCR). Add two photos for the same slot + one other slot.
  await repo.insertPhoto({ containerId: 'ctn-1', slotKey: 'seal', displayPath: 'd1.webp', thumbPath: 't1.webp', fileHash: 'h1', byteSize: 1, capturedAt: '2026-07-02T01:00:00Z' });
  await repo.insertPhoto({ containerId: 'ctn-1', slotKey: 'seal', displayPath: 'd2.webp', thumbPath: 't2.webp', fileHash: 'h2', byteSize: 1, capturedAt: '2026-07-02T03:00:00Z' });
  await repo.insertPhoto({ containerId: 'ctn-1', slotKey: 'empty', displayPath: 'd3.webp', thumbPath: 't3.webp', fileHash: 'h3', byteSize: 1, capturedAt: '2026-07-02T02:00:00Z' });
  return repo;
}

test('getWorkOrderReview returns containers with latest-per-slot photos + customer/template', async () => {
  const repo = await seeded();
  const r = await repo.getWorkOrderReview('wo-2');
  expect(r).not.toBeNull();
  expect(r!.template.route).toBe('TCR');
  expect(r!.customer?.name).toContain('칭다오');
  expect(r!.containers).toHaveLength(1);
  const photos = r!.containers[0].photos;
  // seal deduped to the latest (h2), plus empty (h3)
  expect(photos.map((p) => p.fileHash).sort()).toEqual(['h2', 'h3']);
});

test('getWorkOrderReview returns null for an unknown id', async () => {
  const repo = createInMemoryAdminRepo();
  expect(await repo.getWorkOrderReview('nope')).toBeNull();
});

test('publish sets status=published and returns a viewer token, reused on re-publish', async () => {
  const repo = await seeded();
  const { viewerToken } = await repo.publish('wo-2');
  expect(viewerToken).toMatch(/^[A-Za-z0-9]+$/);
  const order = (await repo.listWorkOrders()).find((o) => o.id === 'wo-2');
  expect(order!.status).toBe('published');
  const again = await repo.publish('wo-2');
  expect(again.viewerToken).toBe(viewerToken); // stable link
});
```

- [ ] **Step 2: Run test, verify fail** — `npm test -- review-inmemory` → FAIL.

- [ ] **Step 3: Implement**

In `src/admin/repo.ts`:

Add imports at the top (after existing imports):
```ts
import type { WorkOrderReview } from '../domain/review';
import { latestPerSlot } from '../domain/review';
```

Add to the `AdminRepo` interface (after `listPhotos`):
```ts
  getWorkOrderReview(id: string): Promise<WorkOrderReview | null>;
  publish(id: string): Promise<{ viewerToken: string }>;
```

Inside `createInMemoryAdminRepo`, add state near `photos`:
```ts
  const viewerTokens = new Map<string, string>();
  const publications: { workOrderId: string; viewerToken: string; photoManifest: string[] }[] = [];
```

Add these two methods to the returned object (after `listPhotos`):
```ts
    async getWorkOrderReview(id) {
      const order = orders.find((o) => o.id === id);
      if (!order) return null;
      const template = templates.find((t) => t.id === order.templateId)!;
      const customer = customers.find((c) => c.id === order.customerId) ?? null;
      const cs = containers.filter((c) => c.workOrderId === id).map((container) => ({
        container,
        photos: latestPerSlot(photos.filter((p) => p.containerId === container.id)),
      }));
      return { order, template, customer, containers: cs };
    },
    async publish(id) {
      const order = orders.find((o) => o.id === id);
      if (!order) throw new Error('work order not found');
      order.status = 'published';
      const viewerToken = viewerTokens.get(id) ?? randomToken();
      viewerTokens.set(id, viewerToken);
      const manifest = containers
        .filter((c) => c.workOrderId === id)
        .flatMap((c) => latestPerSlot(photos.filter((p) => p.containerId === c.id)).map((p) => p.id));
      publications.push({ workOrderId: id, viewerToken, photoManifest: manifest });
      return { viewerToken };
    },
```

- [ ] **Step 4: Run tests, verify pass** — `npm test -- review-inmemory repo` → PASS (new + existing repo tests).

- [ ] **Step 5: Commit**

```bash
git add src/admin/repo.ts test/admin/review-inmemory.test.ts
git commit -m "feat: AdminRepo getWorkOrderReview + publish (in-memory)"
```

---

## Task 3: DbPort.update + SupabaseAdminRepo review/publish

**Files:**
- Modify: `src/admin/db.ts`
- Modify: `src/admin/supabaseRepo.ts`
- Test: `test/admin/review-supabase.test.ts`

**Interfaces:**
- Consumes: `latestPerSlot` (`../domain/review`), existing mappers/`parseTemplate`.
- Produces: `DbPort.update(table: string, match: Filter, values: Row): Promise<Row[]>`. `SupabaseAdminRepo` implements `getWorkOrderReview` + `publish`.

- [ ] **Step 1: Write failing test**

`test/admin/review-supabase.test.ts`:
```ts
import { createSupabaseAdminRepo } from '../../src/admin/supabaseRepo';
import type { DbPort, Row, Filter } from '../../src/admin/db';

function memPort(seed: Record<string, Row[]> = {}): DbPort {
  const tables: Record<string, Row[]> = { customers: [], work_type_templates: [], work_orders: [], containers: [], share_links: [], photos: [], publications: [], ...seed };
  const match = (r: Row, f: Filter) => String(r[f.col]) === f.val;
  return {
    async select(t, f) { const rows = tables[t] ?? []; return f ? rows.filter((r) => match(r, f)) : [...rows]; },
    async insert(t, v) {
      const arr = Array.isArray(v) ? v : [v];
      const ins = arr.map((r, i) => ({ id: r.id ?? `${t}-${(tables[t]?.length ?? 0) + i}`, ...r }));
      tables[t] = [...(tables[t] ?? []), ...ins];
      return ins;
    },
    async update(t, f, values) {
      const rows = tables[t] ?? [];
      const updated: Row[] = [];
      tables[t] = rows.map((r) => { if (match(r, f)) { const n = { ...r, ...values }; updated.push(n); return n; } return r; });
      return updated;
    },
  };
}

const tpl: Row = { id: 'tpl-tcr', name: 'TCR', carrier: '중국세관', route: 'TCR', anchor_type: 'container_no', min_count: 8, warning_text: null, rules: {}, required_photos: [{ key: 'seal', label: '씰', instruction: '', required: true }] };

function baseSeed(): Record<string, Row[]> {
  return {
    customers: [{ id: 'c1', name: '칭다오 파트너', contact: null, notes: null }],
    work_type_templates: [tpl],
    work_orders: [{ id: 'wo1', customer_id: 'c1', template_id: 'tpl-tcr', work_date: null, status: 'submitted', assignee_name: null, assignee_contact: null, shipper_label: null }],
    containers: [{ id: 'k1', work_order_id: 'wo1', container_no: 'ABCD1234567', seal_no: null, worker_memo: null }],
    photos: [
      { id: 'p-old', container_id: 'k1', slot_key: 'seal', display_path: 'o.webp', thumb_path: 'o-t.webp', file_hash: 'old', byte_size: 1, captured_at: '2026-07-02T01:00:00Z', original_path: null, gps_lat: null, gps_lng: null, status: 'uploaded' },
      { id: 'p-new', container_id: 'k1', slot_key: 'seal', display_path: 'n.webp', thumb_path: 'n-t.webp', file_hash: 'new', byte_size: 1, captured_at: '2026-07-02T05:00:00Z', original_path: null, gps_lat: null, gps_lng: null, status: 'uploaded' },
    ],
  };
}

test('getWorkOrderReview assembles order/template/customer/containers with latest-per-slot', async () => {
  const repo = createSupabaseAdminRepo(memPort(baseSeed()));
  const r = await repo.getWorkOrderReview('wo1');
  expect(r!.customer?.name).toContain('칭다오');
  expect(r!.template.route).toBe('TCR');
  expect(r!.containers[0].photos.map((p) => p.fileHash)).toEqual(['new']); // latest seal only
});

test('publish inserts a publication + viewer share_link, sets status, reuses token', async () => {
  const port = memPort(baseSeed());
  const repo = createSupabaseAdminRepo(port);
  const { viewerToken } = await repo.publish('wo1');
  expect(viewerToken).toMatch(/^[A-Za-z0-9]+$/);
  // status updated
  const wo = (await port.select('work_orders', { col: 'id', val: 'wo1' }))[0];
  expect(wo.status).toBe('published');
  // a viewer share_link exists with that token
  const links = await port.select('share_links', { col: 'work_order_id', val: 'wo1' });
  expect(links.some((l) => l.kind === 'viewer' && l.token === viewerToken)).toBe(true);
  // a publication row exists
  expect((await port.select('publications', { col: 'work_order_id', val: 'wo1' })).length).toBe(1);
  // re-publish reuses the same viewer token
  const again = await repo.publish('wo1');
  expect(again.viewerToken).toBe(viewerToken);
});
```

- [ ] **Step 2: Run test, verify fail** — `npm test -- review-supabase` → FAIL.

- [ ] **Step 3: Add `update` to DbPort**

In `src/admin/db.ts`, add to the interface:
```ts
  update(table: string, match: Filter, values: Row): Promise<Row[]>;
```
Add to `createSupabaseDbPort` return object (after `insert`):
```ts
    async update(table, match, values) {
      const { data, error } = await client.from(table).update(values).eq(match.col, match.val).select();
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
```

- [ ] **Step 4: Implement review/publish in `supabaseRepo.ts`**

Add imports:
```ts
import type { WorkOrderReview } from '../domain/review';
import { latestPerSlot } from '../domain/review';
```
Add these two methods to the returned object (after `listPhotos`):
```ts
    async getWorkOrderReview(id: string) {
      const [orderRow] = await db.select('work_orders', { col: 'id', val: id });
      if (!orderRow) return null;
      const order = rowToWorkOrder(orderRow);
      const [tplRow] = await db.select('work_type_templates', { col: 'id', val: order.templateId });
      const template = parseTemplate(tplRow as unknown as RawTemplateRow);
      const [custRow] = await db.select('customers', { col: 'id', val: order.customerId });
      const customer = custRow ? rowToCustomer(custRow) : null;
      const containerRows = await db.select('containers', { col: 'work_order_id', val: order.id });
      const containers = [];
      for (const cRow of containerRows) {
        const container = rowToContainer(cRow);
        const photos = latestPerSlot((await db.select('photos', { col: 'container_id', val: container.id })).map(rowToPhoto));
        containers.push({ container, photos });
      }
      return { order, template, customer, containers } as WorkOrderReview;
    },
    async publish(id: string) {
      const links = await db.select('share_links', { col: 'work_order_id', val: id });
      const existing = links.find((l) => l.kind === 'viewer');
      let viewerToken: string;
      if (existing) {
        viewerToken = String(existing.token);
      } else {
        viewerToken = randomToken();
        await db.insert('share_links', { work_order_id: id, token: viewerToken, kind: 'viewer' });
      }
      const containerRows = await db.select('containers', { col: 'work_order_id', val: id });
      const manifest: string[] = [];
      for (const cRow of containerRows) {
        const photos = latestPerSlot((await db.select('photos', { col: 'container_id', val: String(cRow.id) })).map(rowToPhoto));
        manifest.push(...photos.map((p) => p.id));
      }
      await db.insert('publications', { work_order_id: id, viewer_token: viewerToken, photo_manifest: manifest });
      await db.update('work_orders', { col: 'id', val: id }, { status: 'published' });
      return { viewerToken };
    },
```

- [ ] **Step 5: Run tests, verify pass** — `npm test -- review-supabase supabase-repo db` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/admin/db.ts src/admin/supabaseRepo.ts test/admin/review-supabase.test.ts
git commit -m "feat: DbPort.update + SupabaseAdminRepo getWorkOrderReview/publish"
```

---

## Task 4: 서명 썸네일 URL 헬퍼 (주입식)

**Files:**
- Create: `src/admin/thumbs.ts`
- Test: `test/admin/thumbs.test.ts`

**Interfaces:**
- Produces: `type SignedUrlFn = (paths: string[], expiresIn: number) => Promise<{ data: { path: string | null; signedUrl: string }[] | null; error: { message: string } | null }>`; `createThumbUrls(paths: string[], signer?: SignedUrlFn): Promise<Record<string, string>>` (maps path→signedUrl; default signer calls `supabase.storage.from('captures').createSignedUrls`).

- [ ] **Step 1: Write failing test**

`test/admin/thumbs.test.ts`:
```ts
import { createThumbUrls } from '../../src/admin/thumbs';

test('maps each path to its signed url', async () => {
  const signer = async (paths: string[]) => ({
    data: paths.map((p) => ({ path: p, signedUrl: `https://signed/${p}` })), error: null,
  });
  const out = await createThumbUrls(['a-t.webp', 'b-t.webp'], signer);
  expect(out).toEqual({ 'a-t.webp': 'https://signed/a-t.webp', 'b-t.webp': 'https://signed/b-t.webp' });
});

test('returns empty for no paths without calling the signer', async () => {
  let called = false;
  const signer = async () => { called = true; return { data: [], error: null }; };
  expect(await createThumbUrls([], signer)).toEqual({});
  expect(called).toBe(false);
});

test('throws on signer error', async () => {
  const signer = async () => ({ data: null, error: { message: 'nope' } });
  await expect(createThumbUrls(['x'], signer)).rejects.toThrow('nope');
});
```

- [ ] **Step 2: Run test, verify fail** — `npm test -- thumbs` → FAIL.

- [ ] **Step 3: Implement**

`src/admin/thumbs.ts`:
```ts
import { supabase } from '../lib/supabase';

export type SignedUrlFn = (
  paths: string[], expiresIn: number,
) => Promise<{ data: { path: string | null; signedUrl: string }[] | null; error: { message: string } | null }>;

const defaultSigner: SignedUrlFn = (paths, expiresIn) => supabase.storage.from('captures').createSignedUrls(paths, expiresIn);

export async function createThumbUrls(paths: string[], signer: SignedUrlFn = defaultSigner): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await signer(paths, 3600);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path) out[d.path] = d.signedUrl;
  return out;
}
```

- [ ] **Step 4: Run test, verify pass** — `npm test -- thumbs` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/thumbs.ts test/admin/thumbs.test.ts
git commit -m "feat: createThumbUrls signed-url helper (injectable)"
```

---

## Task 5: ReviewPanel + 콘솔·보드 배선 + 전체 스위트/build

**Files:**
- Create: `src/admin/ReviewPanel.tsx`
- Modify: `src/admin/WorkOrderBoard.tsx`
- Modify: `src/admin/AdminConsole.tsx`
- Test: `test/admin/review-panel.test.tsx`

**Interfaces:**
- Consumes: `AdminRepo` (`./repo`), `createThumbUrls`/`SignedUrlFn` (`./thumbs`), `requiredSlots` (`../domain/template`), `checklistStatus` (`../domain/checklist`).
- Produces: `<ReviewPanel workOrderId repo onBack thumbUrls? />`; `WorkOrderBoard` optional `onSelect(id)`.

**Notes:** `WorkOrderBoard`의 `onSelect`는 optional(기본 없음)이라 기존 board 테스트 불변. `AdminConsole`은 `selectedId` 상태로 보드↔ReviewPanel 전환. 검토는 `/admin`(AuthGate 뒤)이라 라우팅 변경 없음.

- [ ] **Step 1: Write failing test**

`test/admin/review-panel.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewPanel } from '../../src/admin/ReviewPanel';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

const stubThumbs = async () => ({});

test('shows container + checklist and publishes to a viewer link', async () => {
  const repo = createInMemoryAdminRepo();
  await repo.insertPhoto({ containerId: 'ctn-1', slotKey: 'seal', displayPath: 'd.webp', thumbPath: 't.webp', fileHash: 'h', byteSize: 1, capturedAt: '2026-07-02T01:00:00Z' });
  render(<ReviewPanel workOrderId="wo-2" repo={repo} onBack={() => {}} thumbUrls={stubThumbs} />);

  expect(await screen.findByText(/FBLU4204812/)).toBeInTheDocument();     // container plate
  expect(screen.getByText(/씰 번호/)).toBeInTheDocument();                // a required slot label (TCR)
  fireEvent.click(screen.getByRole('button', { name: /발행/ }));
  const link = await screen.findByTestId('viewer-link');
  expect(link.textContent).toMatch(/\/v\/[A-Za-z0-9]+/);
});

test('back button calls onBack', async () => {
  const repo = createInMemoryAdminRepo();
  let backed = false;
  render(<ReviewPanel workOrderId="wo-2" repo={repo} onBack={() => { backed = true; }} thumbUrls={stubThumbs} />);
  fireEvent.click(await screen.findByRole('button', { name: /뒤로/ }));
  expect(backed).toBe(true);
});
```
> Note: `findByTestId` — if the project's testing-library version uses `getByTestId`, use `await screen.findByTestId`. Both resolve `data-testid`.

- [ ] **Step 2: Run test, verify fail** — `npm test -- review-panel` → FAIL.

- [ ] **Step 3: Implement `ReviewPanel.tsx`**

`src/admin/ReviewPanel.tsx`:
```tsx
import { useEffect, useState } from 'react';
import type { AdminRepo } from './repo';
import type { WorkOrderReview } from '../domain/review';
import { requiredSlots } from '../domain/template';
import { checklistStatus } from '../domain/checklist';
import { createThumbUrls, type SignedUrlFn } from './thumbs';

export function ReviewPanel({
  workOrderId, repo, onBack, thumbUrls = (paths) => createThumbUrls(paths),
}: {
  workOrderId: string; repo: AdminRepo; onBack: () => void;
  thumbUrls?: (paths: string[]) => Promise<Record<string, string>>;
}) {
  const [review, setReview] = useState<WorkOrderReview | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [viewerLink, setViewerLink] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    repo.getWorkOrderReview(workOrderId).then(async (r) => {
      setReview(r);
      if (!r) return;
      const paths = r.containers.flatMap((c) => c.photos.map((p) => p.thumbPath).filter((x): x is string => !!x));
      setUrls(await thumbUrls(paths));
    });
  }, [workOrderId, repo, thumbUrls]);

  if (!review) return <section style={sx.panel}><button onClick={onBack} style={sx.back}>← 뒤로</button></section>;

  const slots = requiredSlots(review.template);

  async function publish() {
    setPublishing(true);
    try {
      const { viewerToken } = await repo.publish(workOrderId);
      setViewerLink(`${location.origin}/v/${viewerToken}`);
    } finally { setPublishing(false); }
  }

  return (
    <section style={sx.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={sx.back}>← 뒤로</button>
        <span style={{ fontSize: 13, color: '#5A6B7D' }}>{review.customer?.name} · {review.template.route} · {review.order.status}</span>
      </div>
      {review.containers.map(({ container, photos }) => {
        const captured = photos.map((p) => p.slotKey).filter((x): x is string => !!x);
        const status = checklistStatus(captured, review.template);
        return (
          <div key={container.id} style={sx.container}>
            <div style={sx.plate}>{container.containerNo}</div>
            <div style={{ fontSize: 13, color: status.complete ? '#15A34A' : '#E0A100', margin: '6px 0' }}>
              {status.satisfied.length} / {slots.length} 촬영{status.missing.length ? ` · 누락 ${status.missing.length}` : ''}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {slots.map((slot) => {
                const photo = photos.find((p) => p.slotKey === slot.key);
                const url = photo?.thumbPath ? urls[photo.thumbPath] : undefined;
                return (
                  <div key={slot.key} style={sx.slot}>
                    {url ? <img src={url} alt={slot.label} style={sx.thumb} /> : <div style={{ ...sx.thumb, ...sx.missing }}>미촬영</div>}
                    <div style={{ fontSize: 11, color: '#5A6B7D', marginTop: 2 }}>{slot.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: 16 }}>
        <button onClick={publish} disabled={publishing} style={sx.publish}>{publishing ? '발행 중…' : '발행'}</button>
        {viewerLink && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#5A6B7D' }}>수신자 링크</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code data-testid="viewer-link" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, wordBreak: 'break-all' }}>{viewerLink}</code>
              <button type="button" onClick={() => navigator.clipboard?.writeText(viewerLink)}>복사</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const sx = {
  panel: { background: '#fff', borderRadius: 14, padding: 20, marginTop: 12 } as const,
  back: { background: 'transparent', border: '1px solid rgba(90,107,125,0.3)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' } as const,
  container: { borderTop: '0.5px solid rgba(90,107,125,0.2)', paddingTop: 12, marginTop: 12 } as const,
  plate: { fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 16 } as const,
  slot: { width: 84 } as const,
  thumb: { width: 84, height: 84, objectFit: 'cover', borderRadius: 8, background: '#EEF2F5' } as const,
  missing: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#9FB2C2' } as const,
  publish: { background: '#FF6A00', color: '#fff', border: 0, borderRadius: 10, padding: '10px 18px', fontWeight: 600 } as const,
};
```

- [ ] **Step 4: Add `onSelect` to `WorkOrderBoard.tsx`**

Change the component signature to accept an optional `onSelect`, and make each row call it. Replace the signature line:
```tsx
export function WorkOrderBoard({ repo, onSelect }: { repo: AdminRepo; onSelect?: (id: string) => void }) {
```
On the row `<div ... data-testid="wo-row" ...>`, add a click handler + pointer cursor:
```tsx
        <div key={o.id} data-testid="wo-row" onClick={() => onSelect?.(o.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: '0.5px solid rgba(90,107,125,0.25)', cursor: onSelect ? 'pointer' : 'default' }}>
```

- [ ] **Step 5: Wire `AdminConsole.tsx`**

Add `selectedId` state and render the review panel when set. Add the import:
```ts
import { ReviewPanel } from './ReviewPanel';
```
Add state (with the others):
```ts
  const [selectedId, setSelectedId] = useState<string | null>(null);
```
Replace the board `<section>` block with a conditional (review when selected, else create-toggle + board):
```tsx
        {selectedId ? (
          <ReviewPanel workOrderId={selectedId} repo={repo} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            {creating && (
              <section style={{ background: '#fff', borderRadius: 14, padding: 20, margin: '12px 0' }}>
                <CreateWorkOrder repo={repo} onCreated={() => setRefreshKey((k) => k + 1)} />
              </section>
            )}
            <section style={{ background: '#fff', borderRadius: 14, padding: '8px 6px', marginTop: 12 }}>
              <WorkOrderBoard key={refreshKey} repo={repo} onSelect={setSelectedId} />
            </section>
          </>
        )}
```
(Remove the old standalone `creating` block + board section that this replaces.)

- [ ] **Step 6: Run the full suite** — `npm test` → all pass (new review-panel + existing console/board/routes unaffected: `onSelect` optional, board still renders by default; `console.test` clicks 새 작업 + sees board, still works).

- [ ] **Step 7: Typecheck + build** — `npm run build` → `tsc -b` clean + vite build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/admin/ReviewPanel.tsx src/admin/WorkOrderBoard.tsx src/admin/AdminConsole.tsx test/admin/review-panel.test.tsx
git commit -m "feat: ReviewPanel (per-container review + publish) wired into console"
```

---

## Manual Verification (라이브)

로그인 후 배포 콘솔에서:
1. 작업자로 몇 슬롯 촬영한 작업(상태 submitted/in_progress)을 보드에서 클릭 → 검토 패널에 컨테이너·슬롯 썸네일(서명 URL)·체크리스트 표시.
2. 같은 슬롯을 재촬영한 경우 **최신 1장만** 보이는지 확인.
3. **발행** → `work_orders.status='published'`(보드 배지), Supabase `publications`에 행 + `share_links`에 kind='viewer' 토큰, 수신자 링크 `/v/{token}` 표시. 재발행 시 같은 토큰.
4. (Plan E 전까지 `/v/{token}`은 스텁 화면.)

## 후속

- **Plan E:** `/v/:token` 수신자 갤러리 — anon viewer RPC(`viewer_bootstrap`)로 published 매니페스트 + 서명 URL 조회, 무로그인 열람.
- 발행 취소/재검토(status 되돌리기), soft_delete 수동 큐레이션, 감사 로그.

## Self-Review

- **Spec 커버:** latestPerSlot(슬롯당 최신)·검토(컨테이너/슬롯/체크리스트/썸네일)·발행(publication+viewer link+status, 토큰 재사용)·누락 허용·콘솔 패널 배선. 수신자 화면은 명시적 Plan E.
- **Placeholder scan:** 모든 스텝 실제 코드/테스트/명령.
- **Type/이름 일관성:** `WorkOrderReview`/`ContainerReview` 단일 정의(domain/review) 재사용. `getWorkOrderReview`/`publish` 시그니처 인터페이스(Task2)↔인메모리(Task2)↔Supabase(Task3)↔ReviewPanel(Task5) 일치. `DbPort.update` Task3에서 추가·사용. `createThumbUrls` 주입식(Task4)→ReviewPanel(Task5). `latestPerSlot` 발행 매니페스트·검토 표시 공통.
- **회귀:** `onSelect` optional → board/console 기존 테스트 불변. 검토는 AuthGate 뒤라 라우팅/게이트 변경 없음.
- **Live-only:** 서명 URL·실제 발행 후 published 상태·viewer 링크 동작은 라이브 검증.
