# Plan E — 수신자 갤러리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 수신자가 무로그인으로 `/v/{token}`을 열어 발행된 컨테이너 사진을 열람한다. 비공개 버킷이므로 발행 시 사무실(로그인)이 서명 URL을 만들어 매니페스트에 저장하고, anon `viewer_bootstrap` RPC가 그 매니페스트를 돌려주며, anon은 Storage를 직접 건드리지 않는다.

**Architecture:** 발행(C.2 `publish`)을 `publish(id, manifest)`로 바꾼다 — ReviewPanel이 리뷰의 thumb+display 경로를 **장기(1년) 서명 URL**로 만들고 순수 헬퍼 `buildViewerManifest`로 뷰어 페이로드를 조립해 넘기면, repo는 그 매니페스트를 `publications.photo_manifest`에 저장하고 viewer share_link 토큰 생성/재사용 + status='published'만 한다. anon `viewer_bootstrap(token)` RPC(SECURITY DEFINER, `worker_bootstrap` 미러)가 viewer 토큰을 검증하고 최신 publication의 매니페스트를 반환한다. `ViewerClient`(Supabase=RPC / 인메모리=repo)와 `getViewerClient()` 팩토리로 주입, `ViewerGallery`(`/v/:token`)가 렌더한다.

**Tech Stack:** TypeScript, React 18, Vite 5, `@supabase/supabase-js` v2 (rpc + Storage signed URLs), Vitest + @testing-library/react, PGlite (RPC 테스트).

## Global Constraints

- **서명은 발행 시 authenticated가**, anon은 절대 Storage/테이블 직접 접근 안 함(하드닝 유지). 수신자 데이터는 오직 `viewer_bootstrap` RPC로.
- **매니페스트 형식(고정):** `publications.photo_manifest`는 이제 id 배열이 아니라 뷰어 페이로드 객체를 저장한다:
  `{ route: string|null, customer: string|null, containers: [{ containerNo: string, photos: [{ slotKey: string|null, label: string, thumbUrl: string, displayUrl: string }] }] }`.
- **서명 만료:** 뷰어 URL은 `VIEWER_URL_TTL = 31536000`(1년). 리뷰 화면 썸네일(`createThumbUrls`)은 기존 3600초 유지. 재발행 시 갱신.
- **`publish` 시그니처:** `publish(id: string, manifest: ViewerManifest): Promise<{ viewerToken: string }>` — 양쪽 repo + 호출부(ReviewPanel) + 테스트가 함께 바뀌어야 빌드 초록.
- **viewer RPC:** `viewer_bootstrap(p_token text) returns jsonb`, SECURITY DEFINER, `set search_path = public`, share_link `kind='viewer' and revoked=false and (expires_at is null or expires_at > now())` 검증, 최신 publication(published_at desc) 반환, `revoke from public` + `grant execute to anon, authenticated`.
- **팩토리:** `getViewerClient()`는 기존 `isSupabaseConfigured` 게이트 재사용 → 테스트=인메모리.
- **기존 테스트:** publish 시그니처가 바뀌므로 `review-inmemory`/`review-supabase`/`review-panel` 테스트는 갱신(정당). `routes.test`의 `/v` 케이스는 Placeholder→ViewerGallery로 갱신. 그 외 불변.
- 새 의존성 금지. DRY, YAGNI, TDD.

## 수동 설정 (사용자 — 병합 후)

- 마이그레이션 `0007_viewer_rpc.sql` 적용(SQL Editor 또는 `supabase db push`). (기존 발행분 없음 → 재발행 불필요.)

---

## Task 1: `buildViewerManifest` + 뷰어 타입 (순수)

**Files:**
- Create: `src/domain/viewer.ts`
- Test: `test/domain/viewer.test.ts`

**Interfaces:**
- Consumes: `WorkOrderReview` from `./review`.
- Produces: `ViewerPhoto`/`ViewerContainer`/`ViewerManifest` types; `buildViewerManifest(review: WorkOrderReview, urls: Record<string,string>): ViewerManifest`.

- [ ] **Step 1: Write failing test**

`test/domain/viewer.test.ts`:
```ts
import { buildViewerManifest } from '../../src/domain/viewer';
import type { WorkOrderReview } from '../../src/domain/review';
import type { Photo, WorkTypeTemplate } from '../../src/domain/types';

function ph(slotKey: string, thumbPath: string, displayPath: string): Photo {
  return { id: slotKey, containerId: 'k1', slotKey, originalPath: null, displayPath, thumbPath, fileHash: 'h', byteSize: 1, capturedAt: '2026-07-02T00:00:00Z', gpsLat: null, gpsLng: null, status: 'uploaded' };
}
const template = {
  id: 't', name: 'T', carrier: '중국세관', route: 'TCR', anchorType: 'container_no', minCount: 8, warningText: null, rules: {},
  requiredPhotos: [{ key: 'seal', label: '씰 근접', instruction: '', required: true }],
} as WorkTypeTemplate;

const review: WorkOrderReview = {
  order: { id: 'wo1', customerId: 'c1', templateId: 't', workDate: null, status: 'submitted', assigneeName: null, assigneeContact: null, shipperLabel: null },
  template,
  customer: { id: 'c1', name: '칭다오 파트너', contact: null, notes: null },
  containers: [{ container: { id: 'k1', workOrderId: 'wo1', containerNo: 'ABCD1234567', sealNo: null, workerMemo: null }, photos: [ph('seal', 'seal-t.webp', 'seal-d.webp')] }],
};

test('builds a viewer manifest with route, customer, labels, and signed urls', () => {
  const urls = { 'seal-t.webp': 'https://s/seal-t', 'seal-d.webp': 'https://s/seal-d' };
  const m = buildViewerManifest(review, urls);
  expect(m.route).toBe('TCR');
  expect(m.customer).toBe('칭다오 파트너');
  expect(m.containers).toHaveLength(1);
  expect(m.containers[0].containerNo).toBe('ABCD1234567');
  expect(m.containers[0].photos[0]).toEqual({ slotKey: 'seal', label: '씰 근접', thumbUrl: 'https://s/seal-t', displayUrl: 'https://s/seal-d' });
});

test('falls back to slotKey as label and empty string for missing urls', () => {
  const review2: WorkOrderReview = { ...review, template: { ...template, requiredPhotos: [] }, containers: [{ container: review.containers[0].container, photos: [ph('csc', 'csc-t.webp', 'csc-d.webp')] }] };
  const m = buildViewerManifest(review2, {});
  expect(m.containers[0].photos[0].label).toBe('csc');
  expect(m.containers[0].photos[0].thumbUrl).toBe('');
});
```

- [ ] **Step 2: Run test, verify fail** — `npm test -- domain/viewer` → FAIL.

- [ ] **Step 3: Implement**

`src/domain/viewer.ts`:
```ts
import type { WorkOrderReview } from './review';

export interface ViewerPhoto { slotKey: string | null; label: string; thumbUrl: string; displayUrl: string }
export interface ViewerContainer { containerNo: string; photos: ViewerPhoto[] }
export interface ViewerManifest { route: string | null; customer: string | null; containers: ViewerContainer[] }

export function buildViewerManifest(review: WorkOrderReview, urls: Record<string, string>): ViewerManifest {
  return {
    route: review.template.route,
    customer: review.customer?.name ?? null,
    containers: review.containers.map((c) => ({
      containerNo: c.container.containerNo,
      photos: c.photos.map((p) => ({
        slotKey: p.slotKey,
        label: review.template.requiredPhotos.find((s) => s.key === p.slotKey)?.label ?? (p.slotKey ?? ''),
        thumbUrl: (p.thumbPath && urls[p.thumbPath]) || '',
        displayUrl: (p.displayPath && urls[p.displayPath]) || '',
      })),
    })),
  };
}
```

- [ ] **Step 4: Run test, verify pass** — `npm test -- domain/viewer` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/viewer.ts test/domain/viewer.test.ts
git commit -m "feat: buildViewerManifest + viewer manifest types"
```

---

## Task 2: 발행이 서명된 뷰어 매니페스트를 저장 (publish + ReviewPanel + thumbs)

**Files:**
- Modify: `src/admin/thumbs.ts`
- Modify: `src/admin/repo.ts`
- Modify: `src/admin/supabaseRepo.ts`
- Modify: `src/admin/ReviewPanel.tsx`
- Modify: `test/admin/review-inmemory.test.ts`, `test/admin/review-supabase.test.ts`, `test/admin/review-panel.test.tsx`

**Interfaces:**
- Consumes: `ViewerManifest`/`buildViewerManifest` (`../domain/viewer`).
- Produces: `AdminRepo.publish(id: string, manifest: ViewerManifest): Promise<{ viewerToken: string }>` (both impls). `createSignedViewerUrls(paths, signer?)` in `thumbs.ts` (1-year TTL). ReviewPanel signs+builds+passes the manifest.

**Notes:** `publish` no longer computes the manifest — it stores the one passed in. In-memory `publications` entry shape changes to `{ workOrderId; viewerToken; manifest: ViewerManifest }`. Supabase `publications.photo_manifest` now holds the manifest object (jsonb). Keep viewer-token reuse + status update.

- [ ] **Step 1: Update the failing tests first**

Edit `test/admin/review-inmemory.test.ts` — the publish test must pass a manifest. Replace the `publish` test body's call:
```ts
test('publish sets status=published and returns a viewer token, reused on re-publish', async () => {
  const repo = await seeded();
  const manifest = { route: 'TCR', customer: '칭다오 파트너', containers: [] };
  const { viewerToken } = await repo.publish('wo-2', manifest);
  expect(viewerToken).toMatch(/^[A-Za-z0-9]+$/);
  const order = (await repo.listWorkOrders()).find((o) => o.id === 'wo-2');
  expect(order!.status).toBe('published');
  const again = await repo.publish('wo-2', manifest);
  expect(again.viewerToken).toBe(viewerToken);
});
```

Edit `test/admin/review-supabase.test.ts` — the publish test passes a manifest:
```ts
test('publish inserts a publication + viewer share_link, sets status, reuses token', async () => {
  const port = memPort(baseSeed());
  const repo = createSupabaseAdminRepo(port);
  const manifest = { route: 'TCR', customer: '칭다오 파트너', containers: [] };
  const { viewerToken } = await repo.publish('wo1', manifest);
  expect(viewerToken).toMatch(/^[A-Za-z0-9]+$/);
  const wo = (await port.select('work_orders', { col: 'id', val: 'wo1' }))[0];
  expect(wo.status).toBe('published');
  const links = await port.select('share_links', { col: 'work_order_id', val: 'wo1' });
  expect(links.some((l) => l.kind === 'viewer' && l.token === viewerToken)).toBe(true);
  const pubs = await port.select('publications', { col: 'work_order_id', val: 'wo1' });
  expect(pubs.length).toBe(1);
  expect((pubs[0].photo_manifest as any).route).toBe('TCR');
  const again = await repo.publish('wo1', manifest);
  expect(again.viewerToken).toBe(viewerToken);
});
```

Edit `test/admin/review-panel.test.tsx` — inject a stub `signViewer` (so publish doesn't hit real Storage) and keep the publish assertion:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewPanel } from '../../src/admin/ReviewPanel';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

const stubThumbs = async () => ({});
const stubSign = async () => ({});

test('shows container + checklist and publishes to a viewer link', async () => {
  const repo = createInMemoryAdminRepo();
  await repo.insertPhoto({ containerId: 'ctn-1', slotKey: 'seal', displayPath: 'd.webp', thumbPath: 't.webp', fileHash: 'h', byteSize: 1, capturedAt: '2026-07-02T01:00:00Z' });
  render(<ReviewPanel workOrderId="wo-2" repo={repo} onBack={() => {}} thumbUrls={stubThumbs} signViewer={stubSign} />);
  expect(await screen.findByText(/FBLU4204812/)).toBeInTheDocument();
  expect(screen.getByText(/씰 번호/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /발행/ }));
  const link = await screen.findByTestId('viewer-link');
  expect(link.textContent).toMatch(/\/v\/[A-Za-z0-9]+/);
});

test('back button calls onBack', async () => {
  const repo = createInMemoryAdminRepo();
  let backed = false;
  render(<ReviewPanel workOrderId="wo-2" repo={repo} onBack={() => { backed = true; }} thumbUrls={stubThumbs} signViewer={stubSign} />);
  fireEvent.click(await screen.findByRole('button', { name: /뒤로/ }));
  expect(backed).toBe(true);
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test -- review-inmemory review-supabase review-panel` → FAIL (publish arity / signViewer prop).

- [ ] **Step 3: Add `createSignedViewerUrls` to `thumbs.ts`**

Refactor to share the mapping and export a 1-year variant. Replace the body of `src/admin/thumbs.ts` from `createThumbUrls` down with:
```ts
export const VIEWER_URL_TTL = 31536000; // 1 year

async function signUrls(paths: string[], expiresIn: number, signer: SignedUrlFn): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await signer(paths, expiresIn);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path) out[d.path] = d.signedUrl;
  return out;
}

export function createThumbUrls(paths: string[], signer: SignedUrlFn = defaultSigner): Promise<Record<string, string>> {
  return signUrls(paths, 3600, signer);
}

export function createSignedViewerUrls(paths: string[], signer: SignedUrlFn = defaultSigner): Promise<Record<string, string>> {
  return signUrls(paths, VIEWER_URL_TTL, signer);
}
```
(Keep the existing `SignedUrlFn` type and `defaultSigner` above.)

- [ ] **Step 4: Change `publish` in `repo.ts` (in-memory)**

Add the import: `import type { ViewerManifest } from '../domain/viewer';`
Change the interface line to: `publish(id: string, manifest: ViewerManifest): Promise<{ viewerToken: string }>;`
Change the `publications` state type to: `const publications: { workOrderId: string; viewerToken: string; manifest: ViewerManifest }[] = [];`
Replace the in-memory `publish` method with:
```ts
    async publish(id, manifest) {
      const order = orders.find((o) => o.id === id);
      if (!order) throw new Error('work order not found');
      order.status = 'published';
      const viewerToken = viewerTokens.get(id) ?? randomToken();
      viewerTokens.set(id, viewerToken);
      publications.push({ workOrderId: id, viewerToken, manifest });
      return { viewerToken };
    },
```
(`latestPerSlot` is still imported/used by `getWorkOrderReview`; leave it.)

- [ ] **Step 5: Change `publish` in `supabaseRepo.ts`**

Add the import: `import type { ViewerManifest } from '../domain/viewer';`
Replace the `publish` method with:
```ts
    async publish(id: string, manifest: ViewerManifest) {
      const links = await db.select('share_links', { col: 'work_order_id', val: id });
      const existing = links.find((l) => l.kind === 'viewer');
      let viewerToken: string;
      if (existing) {
        viewerToken = String(existing.token);
      } else {
        viewerToken = randomToken();
        await db.insert('share_links', { work_order_id: id, token: viewerToken, kind: 'viewer' });
      }
      await db.insert('publications', { work_order_id: id, viewer_token: viewerToken, photo_manifest: manifest });
      await db.update('work_orders', { col: 'id', val: id }, { status: 'published' });
      return { viewerToken };
    },
```

- [ ] **Step 6: Wire `ReviewPanel.tsx` to sign + build + pass the manifest**

Update imports:
```ts
import { createThumbUrls, createSignedViewerUrls } from './thumbs';
import { buildViewerManifest } from '../domain/viewer';
```
Add `signViewer` to the props (with default) — change the signature block to:
```tsx
export function ReviewPanel({
  workOrderId, repo, onBack, thumbUrls = (paths) => createThumbUrls(paths), signViewer = (paths) => createSignedViewerUrls(paths),
}: {
  workOrderId: string; repo: AdminRepo; onBack: () => void;
  thumbUrls?: (paths: string[]) => Promise<Record<string, string>>;
  signViewer?: (paths: string[]) => Promise<Record<string, string>>;
}) {
```
Replace the `publish` function with (signs thumb+display for the whole review, builds the manifest, passes it):
```tsx
  async function publish() {
    setPublishing(true);
    try {
      const paths = review!.containers.flatMap((c) => c.photos.flatMap((p) => [p.thumbPath, p.displayPath].filter((x): x is string => !!x)));
      const urls = await signViewer(paths);
      const manifest = buildViewerManifest(review!, urls);
      const { viewerToken } = await repo.publish(workOrderId, manifest);
      setViewerLink(`${location.origin}/v/${viewerToken}`);
    } finally { setPublishing(false); }
  }
```
(`review` is non-null after the loading guard; `review!` is safe. The rest of the component is unchanged.)

- [ ] **Step 7: Run tests, verify pass** — `npm test -- review-inmemory review-supabase review-panel thumbs` → PASS.

- [ ] **Step 8: Commit**

```bash
git add src/admin/thumbs.ts src/admin/repo.ts src/admin/supabaseRepo.ts src/admin/ReviewPanel.tsx test/admin/review-inmemory.test.ts test/admin/review-supabase.test.ts test/admin/review-panel.test.tsx
git commit -m "feat: publish stores signed viewer manifest (publish(id, manifest) + ReviewPanel signing)"
```

---

## Task 3: `viewer_bootstrap` RPC (0007) + `getViewerManifest`

**Files:**
- Create: `supabase/migrations/0007_viewer_rpc.sql`
- Modify: `src/admin/repo.ts`, `src/admin/supabaseRepo.ts`
- Test: `test/db/viewer-rpc.test.ts`, `test/admin/viewer-manifest.test.ts`

**Interfaces:**
- Produces: `viewer_bootstrap(p_token text) returns jsonb`. `AdminRepo.getViewerManifest(token: string): Promise<ViewerManifest | null>` (both impls).

- [ ] **Step 1: Write failing tests**

`test/db/viewer-rpc.test.ts`:
```ts
// @vitest-environment node
import stubs from './supabase-stubs.sql?raw';
import schema from '../../supabase/migrations/0001_core_schema.sql?raw';
import rpcs from '../../supabase/migrations/0007_viewer_rpc.sql?raw';
import { freshDb } from './pglite';

const seed = `
  insert into customers (id,name) values ('11111111-1111-1111-1111-111111111111','C');
  insert into work_type_templates (id,name,anchor_type) values ('22222222-2222-2222-2222-222222222222','T','container_no');
  insert into work_orders (id,customer_id,template_id,status) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','published');
  insert into share_links (work_order_id,token,kind) values ('33333333-3333-3333-3333-333333333333','VTOK','viewer');
  insert into share_links (work_order_id,token,kind,revoked) values ('33333333-3333-3333-3333-333333333333','VDEAD','viewer',true);
  insert into publications (work_order_id,viewer_token,photo_manifest,published_at)
    values ('33333333-3333-3333-3333-333333333333','VTOK','{"route":"TCR","customer":"C","containers":[]}'::jsonb, now() - interval '1 hour');
  insert into publications (work_order_id,viewer_token,photo_manifest,published_at)
    values ('33333333-3333-3333-3333-333333333333','VTOK','{"route":"TCR-latest","customer":"C","containers":[]}'::jsonb, now());
`;
async function db() { return freshDb([stubs, schema, rpcs, seed]); }

test('viewer_bootstrap returns the latest publication manifest for a valid token', async () => {
  const d = await db();
  const r = await d.query<{ m: any }>("select viewer_bootstrap('VTOK') as m;");
  expect(r.rows[0].m.route).toBe('TCR-latest'); // newest published_at wins
});

test('viewer_bootstrap returns null for unknown and revoked tokens', async () => {
  const d = await db();
  expect((await d.query<{ m: any }>("select viewer_bootstrap('NOPE') as m;")).rows[0].m).toBeNull();
  expect((await d.query<{ m: any }>("select viewer_bootstrap('VDEAD') as m;")).rows[0].m).toBeNull();
});
```

`test/admin/viewer-manifest.test.ts`:
```ts
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('in-memory getViewerManifest returns the latest published manifest by token', async () => {
  const repo = createInMemoryAdminRepo();
  const { viewerToken } = await repo.publish('wo-2', { route: 'TCR', customer: '칭다오 파트너', containers: [] });
  const m = await repo.getViewerManifest(viewerToken);
  expect(m?.route).toBe('TCR');
  expect(await repo.getViewerManifest('nope')).toBeNull();
});
```

- [ ] **Step 2: Run tests, verify fail** — `npm test -- viewer-rpc viewer-manifest` → FAIL.

- [ ] **Step 3: Implement the migration**

`supabase/migrations/0007_viewer_rpc.sql`:
```sql
-- Anon recipients read a published gallery ONLY through this token-validating SECURITY DEFINER function.
create or replace function viewer_bootstrap(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_link share_links; v_manifest jsonb;
begin
  select * into v_link from share_links
    where token = p_token and kind = 'viewer' and revoked = false
      and (expires_at is null or expires_at > now())
    limit 1;
  if not found then return null; end if;

  select photo_manifest into v_manifest from publications
    where work_order_id = v_link.work_order_id
    order by published_at desc
    limit 1;

  return v_manifest; -- null if never published
end $$;

revoke all on function viewer_bootstrap(text) from public;
grant execute on function viewer_bootstrap(text) to anon, authenticated;
```

- [ ] **Step 4: Add `getViewerManifest` to both repos**

In `repo.ts` — add to the `AdminRepo` interface (after `publish`):
```ts
  getViewerManifest(token: string): Promise<ViewerManifest | null>;
```
Add the in-memory method (after `publish`):
```ts
    async getViewerManifest(token) {
      const pub = [...publications].reverse().find((p) => p.viewerToken === token);
      return pub ? pub.manifest : null;
    },
```

In `supabaseRepo.ts` — add the method (after `publish`):
```ts
    async getViewerManifest(token: string) {
      const links = await db.select('share_links', { col: 'token', val: token });
      const link = links.find((l) => l.kind === 'viewer' && l.revoked !== true);
      if (!link) return null;
      const pubs = await db.select('publications', { col: 'work_order_id', val: String(link.work_order_id) });
      if (!pubs.length) return null;
      const latest = pubs.slice().sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))[0];
      return (latest.photo_manifest ?? null) as ViewerManifest | null;
    },
```

- [ ] **Step 5: Run tests, verify pass** — `npm test -- viewer-rpc viewer-manifest review-inmemory review-supabase` → PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0007_viewer_rpc.sql src/admin/repo.ts src/admin/supabaseRepo.ts test/db/viewer-rpc.test.ts test/admin/viewer-manifest.test.ts
git commit -m "feat: viewer_bootstrap RPC (0007) + getViewerManifest"
```

---

## Task 4: ViewerClient + `getViewerClient` 팩토리

**Files:**
- Create: `src/viewer/viewerClient.ts`
- Modify: `src/admin/repoFactory.ts`
- Test: `test/viewer/viewer-client.test.ts`

**Interfaces:**
- Produces: `interface ViewerClient { bootstrap(token: string): Promise<ViewerManifest | null> }`; `createSupabaseViewerClient(rpc?)`; `createInMemoryViewerClient(repo)`; `getViewerClient(): ViewerClient`.

- [ ] **Step 1: Write failing test**

`test/viewer/viewer-client.test.ts`:
```ts
import { createInMemoryViewerClient, createSupabaseViewerClient } from '../../src/viewer/viewerClient';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('in-memory viewer client returns the published manifest for its token', async () => {
  const repo = createInMemoryAdminRepo();
  const { viewerToken } = await repo.publish('wo-2', { route: 'TCR', customer: '칭다오 파트너', containers: [] });
  const client = createInMemoryViewerClient(repo);
  expect((await client.bootstrap(viewerToken))?.route).toBe('TCR');
  expect(await client.bootstrap('nope')).toBeNull();
});

test('supabase viewer client returns rpc data and null when absent', async () => {
  const ok = createSupabaseViewerClient((async () => ({ data: { route: 'TSR', customer: null, containers: [] }, error: null })) as any);
  expect((await ok.bootstrap('t'))?.route).toBe('TSR');
  const none = createSupabaseViewerClient((async () => ({ data: null, error: null })) as any);
  expect(await none.bootstrap('t')).toBeNull();
});

test('supabase viewer client throws on rpc error', async () => {
  const bad = createSupabaseViewerClient((async () => ({ data: null, error: { message: 'denied' } })) as any);
  await expect(bad.bootstrap('t')).rejects.toThrow('denied');
});
```

- [ ] **Step 2: Run test, verify fail** — `npm test -- viewer-client` → FAIL.

- [ ] **Step 3: Implement the client**

`src/viewer/viewerClient.ts`:
```ts
import type { AdminRepo } from '../admin/repo';
import type { ViewerManifest } from '../domain/viewer';
import { supabase } from '../lib/supabase';

export interface ViewerClient {
  bootstrap(token: string): Promise<ViewerManifest | null>;
}

type RpcFn = (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

export function createSupabaseViewerClient(rpc: RpcFn = (n, p) => supabase.rpc(n, p) as unknown as ReturnType<RpcFn>): ViewerClient {
  return {
    async bootstrap(token) {
      const { data, error } = await rpc('viewer_bootstrap', { p_token: token });
      if (error) throw new Error(error.message);
      return (data ?? null) as ViewerManifest | null;
    },
  };
}

export function createInMemoryViewerClient(repo: AdminRepo): ViewerClient {
  return { bootstrap: (token) => repo.getViewerManifest(token) };
}
```

- [ ] **Step 4: Add `getViewerClient()` to the factory**

In `src/admin/repoFactory.ts`, add:
```ts
import type { ViewerClient } from '../viewer/viewerClient';
import { createInMemoryViewerClient, createSupabaseViewerClient } from '../viewer/viewerClient';
```
```ts
let cachedViewer: ViewerClient | null = null;
export function getViewerClient(): ViewerClient {
  if (!cachedViewer) {
    cachedViewer = isSupabaseConfigured(import.meta.env.VITE_SUPABASE_URL as string | undefined)
      ? createSupabaseViewerClient()
      : createInMemoryViewerClient(getAdminRepo());
  }
  return cachedViewer;
}
```

- [ ] **Step 5: Run test, verify pass** — `npm test -- viewer-client repo-factory` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/viewer/viewerClient.ts src/admin/repoFactory.ts test/viewer/viewer-client.test.ts
git commit -m "feat: ViewerClient (rpc + in-memory) + getViewerClient factory"
```

---

## Task 5: ViewerGallery + 라우트 + 전체 스위트/build

**Files:**
- Create: `src/viewer/ViewerGallery.tsx`
- Modify: `src/routes.tsx`
- Modify: `test/admin/routes.test.tsx`
- Test: `test/viewer/viewer-gallery.test.tsx`

**Interfaces:**
- Consumes: `ViewerClient` (`./viewerClient`), `getViewerClient` (`../admin/repoFactory`), `ViewerManifest` (`../domain/viewer`).
- Produces: `<ViewerGallery client? />` at `/v/:token`.

- [ ] **Step 1: Write failing test**

`test/viewer/viewer-gallery.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ViewerGallery } from '../../src/viewer/ViewerGallery';
import type { ViewerClient } from '../../src/viewer/viewerClient';

function client(manifest: any): ViewerClient { return { bootstrap: async () => manifest }; }

test('renders the published gallery for a valid token', async () => {
  const manifest = { route: 'TCR', customer: '칭다오 파트너', containers: [{ containerNo: 'ABCD1234567', photos: [{ slotKey: 'seal', label: '씰 근접', thumbUrl: 'https://s/t', displayUrl: 'https://s/d' }] }] };
  render(
    <MemoryRouter initialEntries={['/v/VTOK']}>
      <Routes><Route path="/v/:token" element={<ViewerGallery client={client(manifest)} />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/ABCD1234567/)).toBeInTheDocument();
  expect(screen.getByText(/칭다오 파트너/)).toBeInTheDocument();
  expect(screen.getByAltText(/씰 근접/)).toBeInTheDocument();
});

test('shows an error for an invalid token', async () => {
  render(
    <MemoryRouter initialEntries={['/v/bad']}>
      <Routes><Route path="/v/:token" element={<ViewerGallery client={client(null)} />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/잘못된 링크/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Update `routes.test.tsx`** — the `/v` case is no longer a placeholder. Replace the placeholder test with:
```tsx
test('renders the viewer gallery route (invalid token → 잘못된 링크)', async () => {
  render(<MemoryRouter initialEntries={['/v/abc123']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByText(/잘못된 링크/)).toBeInTheDocument();
});
```
(In the test env the factory's in-memory viewer client returns null for an unknown token → 잘못된 링크.)

- [ ] **Step 3: Run tests, verify fail** — `npm test -- viewer-gallery routes` → FAIL.

- [ ] **Step 4: Implement `ViewerGallery.tsx`**

`src/viewer/ViewerGallery.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ViewerClient } from './viewerClient';
import { getViewerClient } from '../admin/repoFactory';
import type { ViewerManifest } from '../domain/viewer';

export function ViewerGallery({ client = getViewerClient() }: { client?: ViewerClient } = {}) {
  const { token } = useParams();
  const [manifest, setManifest] = useState<ViewerManifest | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'invalid'>('loading');

  useEffect(() => {
    client.bootstrap(token ?? '')
      .then((m) => { if (m) { setManifest(m); setState('ok'); } else setState('invalid'); })
      .catch(() => setState('invalid'));
  }, [client, token]);

  if (state === 'loading') return <main style={sx.page} />;
  if (state === 'invalid' || !manifest) return <main style={sx.page}><p style={{ color: '#E0A100' }}>잘못된 링크입니다.</p></main>;

  return (
    <main style={sx.page}>
      <header style={{ marginBottom: 16 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 18 }}>CARGO<span style={{ color: '#FF6A00' }}>LINK</span></span>
        <div style={{ fontSize: 14, color: '#5A6B7D', marginTop: 4 }}>{manifest.customer} · {manifest.route} 증빙</div>
      </header>
      {manifest.containers.map((c) => (
        <section key={c.containerNo} style={sx.container}>
          <div style={sx.plate}>{c.containerNo}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {c.photos.map((p, i) => (
              <a key={`${p.slotKey}-${i}`} href={p.displayUrl} target="_blank" rel="noreferrer" style={sx.slot}>
                <img src={p.thumbUrl} alt={p.label} style={sx.thumb} />
                <div style={{ fontSize: 11, color: '#5A6B7D', marginTop: 2 }}>{p.label}</div>
              </a>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

const sx = {
  page: { minHeight: '100vh', background: '#D7DEE5', fontFamily: 'Pretendard, sans-serif', color: '#0F1B26', padding: 20, maxWidth: 720, margin: '0 auto' } as const,
  container: { background: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 } as const,
  plate: { fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 16 } as const,
  slot: { width: 96, textDecoration: 'none', color: 'inherit' } as const,
  thumb: { width: 96, height: 96, objectFit: 'cover', borderRadius: 8, background: '#EEF2F5', display: 'block' } as const,
};
```

- [ ] **Step 5: Wire the route in `routes.tsx`**

Add the import and replace the `/v/:token` route:
```tsx
import { ViewerGallery } from './viewer/ViewerGallery';
```
```tsx
      <Route path="/v/:token" element={<ViewerGallery />} />
```
(Leave the `Placeholder` import for the `*` route.)

- [ ] **Step 6: Run the full suite** — `npm test` → all pass (new viewer tests + updated routes test; the other three routes tests + all admin/worker tests unaffected).

- [ ] **Step 7: Typecheck + build** — `npm run build` → `tsc -b` clean + vite build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/viewer/ViewerGallery.tsx src/routes.tsx test/admin/routes.test.tsx test/viewer/viewer-gallery.test.tsx
git commit -m "feat: ViewerGallery at /v/:token (published photo gallery)"
```

---

## Manual Verification (라이브)

1. `0007_viewer_rpc.sql` 적용.
2. 로그인 → 작업 검토 → **발행** → `/v/{token}` 링크 확보.
3. `/v/{token}`을 **다른 기기/시크릿창(무로그인)** 에서 열기 → 거래처·루트 헤더 + 컨테이너별 썸네일, 클릭 시 원본 이미지(서명 URL, `…/object/sign/captures/…`). 잘못된/revoked 토큰 → "잘못된 링크".
4. anon으로 `POST /rest/v1/rpc/viewer_bootstrap {p_token:"<valid>"}` → 매니페스트, 무효 토큰 → null.

## 후속

- 발행 취소(publications/share_links revoked), 접근 로깅, 서명 URL 만료 임박 자동 재발행, 다중 컨테이너 워커 캡처.

## Self-Review

- **Spec 커버:** buildViewerManifest·publish 서명 저장·viewer_bootstrap RPC·getViewerManifest·ViewerClient/팩토리·ViewerGallery/라우트. anon은 RPC로만(하드닝 유지). 서명 1년+재발행.
- **Placeholder scan:** 모든 스텝 실제 코드/SQL/테스트/명령.
- **Type/이름 일관성:** `ViewerManifest` 단일 정의(domain/viewer) 재사용(publish·getViewerManifest·ViewerClient·ViewerGallery). `publish(id, manifest)` 시그니처가 인터페이스↔양쪽 repo↔ReviewPanel↔테스트에서 일치(Task 2에서 함께 착지 → 빌드 초록). `viewer_bootstrap` 이름/파라미터 RPC↔ViewerClient 일치. `getViewerClient`는 `isSupabaseConfigured` 게이트(테스트=인메모리).
- **회귀:** publish 시그니처 변경으로 review-inmemory/review-supabase/review-panel 테스트 갱신(Task 2), routes /v 갱신(Task 5) — 모두 정당한 동작 변경. 나머지 불변.
- **Live-only:** 서명 URL·실 발행/열람·RLS/RPC 역할은 라이브 검증.
