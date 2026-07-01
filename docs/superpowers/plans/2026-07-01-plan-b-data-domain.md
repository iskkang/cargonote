# Plan B — 데이터 & 도메인 (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 1 데이터 기반을 확정한다 — 전체 DB 스키마(Supabase 마이그레이션) + TSR/TCR 시드 템플릿 + 도메인 TS 타입/파서 — 를 **pglite(WASM Postgres, Docker 불필요)로 지금 실제 검증**한다.

**Architecture:** 마이그레이션은 `supabase/migrations/*.sql`로 작성해 나중에 `supabase db push`로 적용. 테스트는 pglite 인스턴스에 마이그레이션을 적용하고 구조·제약·시드를 검증. 도메인 타입은 스키마를 손으로 미러링하고, `parseTemplate`가 DB jsonb ↔ 타입 경계를 담당(순수·테스트). **Supabase 런타임 의존부(auth 기반 RLS · Storage 버킷 · 토큰접근 Edge Function)는 이 플랜 범위 밖** — Supabase 연결 시점의 별도 플랜에서 적용·통합테스트.

**Tech Stack:** Supabase(Postgres 16) 마이그레이션 SQL · `@electric-sql/pglite`(테스트용 WASM Postgres) · TypeScript · Vitest(node 환경).

## Global Constraints

- 스키마는 **스펙 §7 데이터 모델**을 따른다(Phase 1 테이블만; AI/PDF/멀티테넌시용 테이블·컬럼은 넣지 않는다 — Phase 2).
- 정리·귀속 단위 = **컨테이너**. `work_order → containers`(1:N), `container → photos`(1:N). 삭제는 상위→하위 cascade.
- **증빙 필드**: photos에 `file_hash`(not null) · `captured_at` · `gps_lat`/`gps_lng` · display/thumb 경로. 원본 삭제는 soft delete(`status`).
- **egress**: photos는 `original_path`·`display_path`·`thumb_path` 3개 경로.
- **작업유형 템플릿 = 캐리어/루트별 사진 스펙.** 시드 2종: TSR(FESCO)·TCR(중국세관). 각 `required_photos`(슬롯 배열)·`rules`·`min_count`·`warning_text`·`carrier`·`route`.
- id = `uuid` `default gen_random_uuid()`(Postgres16 내장). 시간 = `timestamptz`.
- **RLS는 이 플랜에서 켜지 않는다**(pglite는 superuser라 무의미; auth 기반 정책은 Supabase 연결 플랜). 0001은 순수 스키마.
- Node ≥ 20, npm. DB 테스트 파일은 `// @vitest-environment node`.
- 마이그레이션은 `supabase/migrations/NNNN_*.sql` 규칙(연결 시 `supabase db push`가 순서대로 적용).

---

## File Structure

```
cargonote/
  supabase/
    migrations/
      0001_core_schema.sql      # Phase 1 테이블·제약·인덱스 (RLS 없음)
      0002_seed_templates.sql   # TSR + TCR work_type_templates 시드
  src/
    domain/
      types.ts                  # 스키마 미러 도메인 타입
      template.ts               # parseTemplate: raw row -> 타입 (순수)
  test/
    db/
      pglite.ts                 # 마이그레이션 적용된 fresh pglite 헬퍼
      schema.test.ts            # 구조·제약·cascade·인덱스
      seed.test.ts              # TSR/TCR 시드 검증
    domain/
      template.test.ts          # parseTemplate 순수 테스트
```

*(범위 밖·후속: `0003_rls.sql`, `supabase/config.toml` 버킷, `supabase/functions/access/` — Supabase 연결 플랜.)*

---

### Task 1: pglite 테스트 하네스

**Files:**
- Modify: `package.json` (add `@electric-sql/pglite` devDependency)
- Create: `test/db/pglite.ts`, `test/db/pglite.smoke.test.ts`

**Interfaces:**
- Produces: `export async function freshDb(sqlChunks?: string[]): Promise<PGlite>` — 새 인메모리 pglite에 주어진 SQL을 순서대로 `exec`하고 반환.

- [ ] **Step 1: 의존성 추가**

Run: `npm install -D @electric-sql/pglite@^0.2.0`
Expected: 설치 성공, `package.json` devDependencies에 추가됨.

- [ ] **Step 2: 실패 테스트 작성**

`test/db/pglite.smoke.test.ts`:
```ts
// @vitest-environment node
import { freshDb } from './pglite';

test('fresh pglite runs SQL and returns rows', async () => {
  const db = await freshDb(['create table t (id int);', 'insert into t values (1),(2);']);
  const res = await db.query<{ n: number }>('select count(*)::int as n from t;');
  expect(res.rows[0].n).toBe(2);
});
```

- [ ] **Step 3: 실행 → 실패 확인**

Run: `npx vitest run test/db/pglite.smoke.test.ts`
Expected: FAIL — "Cannot find module './pglite'".

- [ ] **Step 4: 헬퍼 구현**

`test/db/pglite.ts`:
```ts
import { PGlite } from '@electric-sql/pglite';

export async function freshDb(sqlChunks: string[] = []): Promise<PGlite> {
  const db = new PGlite();
  for (const chunk of sqlChunks) {
    await db.exec(chunk);
  }
  return db;
}
```

- [ ] **Step 5: 실행 → 통과 확인**

Run: `npx vitest run test/db/pglite.smoke.test.ts`
Expected: PASS (1 passed).

- [ ] **Step 6: 커밋**

```bash
git add package.json package-lock.json test/db/pglite.ts test/db/pglite.smoke.test.ts
git commit -m "test: pglite harness for migration testing (no docker)"
```

---

### Task 2: 코어 스키마 마이그레이션 (0001)

**Files:**
- Create: `supabase/migrations/0001_core_schema.sql`, `test/db/schema.test.ts`

**Interfaces:**
- Consumes: `freshDb` (Task 1).
- Produces: 0001 마이그레이션 SQL. 테이블: `customers · work_type_templates · work_orders · containers · photos · share_links · publications · audit_logs`.

- [ ] **Step 1: 실패 테스트 작성**

`test/db/schema.test.ts`:
```ts
// @vitest-environment node
import schema from '../../supabase/migrations/0001_core_schema.sql?raw';
import { freshDb } from './pglite';

async function db() { return freshDb([schema]); }

test('creates the 8 phase-1 tables', async () => {
  const d = await db();
  const res = await d.query<{ table_name: string }>(
    "select table_name from information_schema.tables where table_schema='public' order by 1;");
  expect(res.rows.map((r) => r.table_name)).toEqual([
    'audit_logs', 'containers', 'customers', 'photos',
    'publications', 'share_links', 'work_orders', 'work_type_templates',
  ]);
});

test('work_orders.status rejects an invalid value', async () => {
  const d = await db();
  await d.exec("insert into customers (id, name) values ('11111111-1111-1111-1111-111111111111','C');");
  await d.exec(`insert into work_type_templates (id, name, anchor_type) values ('22222222-2222-2222-2222-222222222222','T','container_no');`);
  await expect(
    d.query(`insert into work_orders (customer_id, template_id, status) values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','bogus');`),
  ).rejects.toThrow();
});

test('deleting a work_order cascades to containers and photos', async () => {
  const d = await db();
  await d.exec(`
    insert into customers (id,name) values ('11111111-1111-1111-1111-111111111111','C');
    insert into work_type_templates (id,name,anchor_type) values ('22222222-2222-2222-2222-222222222222','T','container_no');
    insert into work_orders (id,customer_id,template_id) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
    insert into containers (id,work_order_id,container_no) values ('44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333','TCLU1234567');
    insert into photos (container_id,file_hash) values ('44444444-4444-4444-4444-444444444444','abc');
  `);
  await d.exec("delete from work_orders where id='33333333-3333-3333-3333-333333333333';");
  const c = await d.query<{ n: number }>('select count(*)::int n from containers;');
  const p = await d.query<{ n: number }>('select count(*)::int n from photos;');
  expect(c.rows[0].n).toBe(0);
  expect(p.rows[0].n).toBe(0);
});

test('share_links.token is unique', async () => {
  const d = await db();
  await d.exec(`
    insert into customers (id,name) values ('11111111-1111-1111-1111-111111111111','C');
    insert into work_type_templates (id,name,anchor_type) values ('22222222-2222-2222-2222-222222222222','T','container_no');
    insert into work_orders (id,customer_id,template_id) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
    insert into share_links (work_order_id,token,kind) values ('33333333-3333-3333-3333-333333333333','TOK','worker');
  `);
  await expect(
    d.query("insert into share_links (work_order_id,token,kind) values ('33333333-3333-3333-3333-333333333333','TOK','viewer');"),
  ).rejects.toThrow();
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/db/schema.test.ts`
Expected: FAIL — 마이그레이션 파일 없음.

- [ ] **Step 3: 마이그레이션 구현**

`supabase/migrations/0001_core_schema.sql`:
```sql
-- Phase 1 core schema (no RLS; RLS is applied at Supabase-connect time)

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  notes text,
  created_at timestamptz not null default now()
);

create table work_type_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  carrier text,
  route text,
  anchor_type text not null,
  required_photos jsonb not null default '[]'::jsonb,
  rules jsonb not null default '{}'::jsonb,
  min_count int not null default 0,
  warning_text text,
  ocr_targets jsonb not null default '[]'::jsonb,
  tag_set jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table work_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  template_id uuid not null references work_type_templates(id),
  work_date date,
  status text not null default 'draft'
    check (status in ('draft','sent','in_progress','submitted','published')),
  assignee_name text,
  assignee_contact text,
  shipper_label text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table containers (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  container_no text not null,
  seal_no text,
  worker_memo text,
  created_at timestamptz not null default now()
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  container_id uuid not null references containers(id) on delete cascade,
  slot_key text,
  original_path text,
  display_path text,
  thumb_path text,
  file_hash text not null,
  byte_size int,
  captured_at timestamptz,
  gps_lat double precision,
  gps_lng double precision,
  status text not null default 'uploaded' check (status in ('uploaded','soft_deleted')),
  created_at timestamptz not null default now()
);

create table share_links (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  token text not null unique,
  kind text not null check (kind in ('worker','viewer')),
  revoked boolean not null default false,
  expires_at timestamptz,
  password_hash text,
  created_at timestamptz not null default now()
);

create table publications (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  published_at timestamptz not null default now(),
  published_by uuid,
  viewer_token text,
  photo_manifest jsonb not null default '[]'::jsonb
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  actor text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index idx_work_orders_customer on work_orders(customer_id);
create index idx_work_orders_status on work_orders(status);
create index idx_containers_work_order on containers(work_order_id);
create index idx_photos_container on photos(container_id);
create index idx_photos_container_slot on photos(container_id, slot_key);
create index idx_audit_entity on audit_logs(entity_type, entity_id);
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/db/schema.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/0001_core_schema.sql test/db/schema.test.ts
git commit -m "feat: phase-1 core schema migration (+ pglite structure/constraint tests)"
```

---

### Task 3: TSR/TCR 시드 마이그레이션 (0002)

**Files:**
- Create: `supabase/migrations/0002_seed_templates.sql`, `test/db/seed.test.ts`

**Interfaces:**
- Consumes: `freshDb`, 0001 스키마.
- Produces: `work_type_templates`에 TSR·TCR 2행. `required_photos` = 슬롯 배열 `{key,label,instruction,required}`.

- [ ] **Step 1: 실패 테스트 작성**

`test/db/seed.test.ts`:
```ts
// @vitest-environment node
import schema from '../../supabase/migrations/0001_core_schema.sql?raw';
import seed from '../../supabase/migrations/0002_seed_templates.sql?raw';
import { freshDb } from './pglite';

async function db() { return freshDb([schema, seed]); }

test('seeds exactly the TSR and TCR templates', async () => {
  const d = await db();
  const r = await d.query<{ route: string; carrier: string; min_count: number }>(
    'select route, carrier, min_count from work_type_templates order by route;');
  expect(r.rows).toEqual([
    { route: 'TCR', carrier: '중국세관', min_count: 8 },
    { route: 'TSR', carrier: 'FESCO', min_count: 8 },
  ]);
});

test('TSR template has 8 required photo slots incl. seal + csc', async () => {
  const d = await db();
  const r = await d.query<{ slots: number; has_seal: boolean; has_csc: boolean }>(`
    select jsonb_array_length(required_photos) as slots,
           required_photos @> '[{"key":"seal"}]' as has_seal,
           required_photos @> '[{"key":"csc"}]'  as has_csc
    from work_type_templates where route='TSR';`);
  expect(r.rows[0].slots).toBe(8);
  expect(r.rows[0].has_seal).toBe(true);
  expect(r.rows[0].has_csc).toBe(true);
});

test('TSR carries the FESCO rail-rejection warning and bolt-seal rule', async () => {
  const d = await db();
  const r = await d.query<{ warning_text: string; seal_type: string }>(`
    select warning_text, rules->>'seal_type' as seal_type
    from work_type_templates where route='TSR';`);
  expect(r.rows[0].warning_text).toContain('철도');
  expect(r.rows[0].seal_type).toBe('bolt');
});

test('TCR carries the customs return-to-Korea warning', async () => {
  const d = await db();
  const r = await d.query<{ warning_text: string }>(
    "select warning_text from work_type_templates where route='TCR';");
  expect(r.rows[0].warning_text).toContain('반송');
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/db/seed.test.ts`
Expected: FAIL — 시드 파일 없음.

- [ ] **Step 3: 시드 구현**

`supabase/migrations/0002_seed_templates.sql`:
```sql
-- Carrier/route photo-spec templates (from FESCO TSR + 중국세관 TCR work-photo specs)

insert into work_type_templates (name, carrier, route, anchor_type, min_count, warning_text, rules, required_photos) values
(
  '컨테이너 적입 — TSR (FESCO)', 'FESCO', 'TSR', 'container_no', 8,
  '필수 7장 + CSC · 모든 사진에 컨테이너 번호 노출. 누락 시 러시아 철도 적재 거부 → 재마킹까지 지연 + 보관·작업료.',
  '{"container_no_visible":true,"csc_exempt":true,"seal_type":"bolt","seal_position":"right_door_left_lever"}'::jsonb,
  '[
    {"key":"empty","label":"빈 컨테이너","instruction":"번호 보이게","required":true},
    {"key":"half","label":"절반 적재","instruction":"번호 보이게","required":true},
    {"key":"full","label":"만재","instruction":"번호 보이게","required":true},
    {"key":"shoring","label":"쇼링·고박 후","instruction":"번호 보이게, 단단히 고정","required":true},
    {"key":"one_door","label":"한쪽 문 닫힘","instruction":"번호 전체 보이게","required":true},
    {"key":"sealed","label":"봉인 완료(양쪽 문)","instruction":"말뚝씰·오른쪽 문/왼쪽 레바","required":true},
    {"key":"seal","label":"씰 근접","instruction":"씰 번호 판독 가능하게","required":true},
    {"key":"csc","label":"CSC 명판","instruction":"번호 규칙 예외","required":true}
  ]'::jsonb
),
(
  '컨테이너 적입 — TCR (중국세관)', '중국세관', 'TCR', 'container_no', 8,
  '필수 8장 · 중국 세관 제출 필수, 미충족 시 한국으로 반송될 수 있음.',
  '{"container_no_visible":true,"csc_exempt":true}'::jsonb,
  '[
    {"key":"empty","label":"빈 컨테이너","instruction":"번호 보이게","required":true},
    {"key":"half","label":"절반 적재","instruction":"번호 보이게","required":true},
    {"key":"full","label":"만재","instruction":"번호 보이게","required":true},
    {"key":"shoring","label":"쇼링·고박 후","instruction":"번호 보이게, 단단히 고정","required":true},
    {"key":"one_door","label":"한쪽 문 닫힘","instruction":"번호 전체 보이게","required":true},
    {"key":"sealed","label":"봉인 완료(양쪽 문)","instruction":"씰 봉인","required":true},
    {"key":"seal","label":"씰 근접","instruction":"씰 번호 판독 가능하게","required":true},
    {"key":"csc","label":"CSC 명판","instruction":"번호 규칙 예외","required":true}
  ]'::jsonb
);
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/db/seed.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/0002_seed_templates.sql test/db/seed.test.ts
git commit -m "feat: seed TSR (FESCO) and TCR (중국세관) work-type templates"
```

---

### Task 4: 도메인 타입 + parseTemplate

**Files:**
- Create: `src/domain/types.ts`, `src/domain/template.ts`, `test/domain/template.test.ts`

**Interfaces:**
- Produces (`types.ts`): `RequiredPhotoSlot`, `TemplateRules`, `WorkTypeTemplate`, `WorkOrderStatus`, and row types `Customer`/`WorkOrder`/`Container`/`Photo`/`ShareLink`.
- Produces (`template.ts`):
  - `export function parseTemplate(row: RawTemplateRow): WorkTypeTemplate` — jsonb 필드를 타입으로 좁히고, 배열/필수키 검증. 형식 오류 시 throw.
  - `export function requiredSlots(t: WorkTypeTemplate): RequiredPhotoSlot[]` — `required===true`만.

- [ ] **Step 1: 실패 테스트 작성**

`test/domain/template.test.ts`:
```ts
import { parseTemplate, requiredSlots } from '../../src/domain/template';

const raw = {
  id: 'x', name: '컨테이너 적입 — TSR (FESCO)', carrier: 'FESCO', route: 'TSR',
  anchor_type: 'container_no', min_count: 8, warning_text: 'w',
  rules: { container_no_visible: true, seal_type: 'bolt' },
  required_photos: [
    { key: 'empty', label: '빈 컨테이너', instruction: '번호 보이게', required: true },
    { key: 'csc', label: 'CSC 명판', instruction: '번호 규칙 예외', required: false },
  ],
};

test('parses a raw template row into typed slots and rules', () => {
  const t = parseTemplate(raw as any);
  expect(t.route).toBe('TSR');
  expect(t.requiredPhotos).toHaveLength(2);
  expect(t.requiredPhotos[0]).toEqual({ key: 'empty', label: '빈 컨테이너', instruction: '번호 보이게', required: true });
  expect(t.rules.seal_type).toBe('bolt');
});

test('requiredSlots returns only required slots', () => {
  const t = parseTemplate(raw as any);
  expect(requiredSlots(t).map((s) => s.key)).toEqual(['empty']);
});

test('throws when required_photos is not an array', () => {
  expect(() => parseTemplate({ ...raw, required_photos: {} } as any)).toThrow();
});

test('throws when a slot is missing its key', () => {
  expect(() => parseTemplate({ ...raw, required_photos: [{ label: 'x' }] } as any)).toThrow();
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/domain/template.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`src/domain/types.ts`:
```ts
export type WorkOrderStatus = 'draft' | 'sent' | 'in_progress' | 'submitted' | 'published';

export interface RequiredPhotoSlot {
  key: string;
  label: string;
  instruction: string;
  required: boolean;
}

export interface TemplateRules {
  container_no_visible?: boolean;
  csc_exempt?: boolean;
  seal_type?: string;
  seal_position?: string;
}

export interface WorkTypeTemplate {
  id: string;
  name: string;
  carrier: string | null;
  route: string | null;
  anchorType: string;
  minCount: number;
  warningText: string | null;
  rules: TemplateRules;
  requiredPhotos: RequiredPhotoSlot[];
}

export interface Customer { id: string; name: string; contact: string | null; notes: string | null; }
export interface WorkOrder {
  id: string; customerId: string; templateId: string; workDate: string | null;
  status: WorkOrderStatus; assigneeName: string | null; assigneeContact: string | null; shipperLabel: string | null;
}
export interface Container { id: string; workOrderId: string; containerNo: string; sealNo: string | null; workerMemo: string | null; }
export interface Photo {
  id: string; containerId: string; slotKey: string | null;
  originalPath: string | null; displayPath: string | null; thumbPath: string | null;
  fileHash: string; capturedAt: string | null; gpsLat: number | null; gpsLng: number | null;
  status: 'uploaded' | 'soft_deleted';
}
export interface ShareLink { id: string; workOrderId: string; token: string; kind: 'worker' | 'viewer'; revoked: boolean; }
```

`src/domain/template.ts`:
```ts
import type { RequiredPhotoSlot, TemplateRules, WorkTypeTemplate } from './types';

export interface RawTemplateRow {
  id: string; name: string; carrier: string | null; route: string | null;
  anchor_type: string; min_count: number; warning_text: string | null;
  rules: unknown; required_photos: unknown;
}

function parseSlot(raw: unknown): RequiredPhotoSlot {
  if (typeof raw !== 'object' || raw === null) throw new Error('slot must be an object');
  const s = raw as Record<string, unknown>;
  if (typeof s.key !== 'string') throw new Error('slot missing key');
  return {
    key: s.key,
    label: typeof s.label === 'string' ? s.label : '',
    instruction: typeof s.instruction === 'string' ? s.instruction : '',
    required: s.required === true,
  };
}

export function parseTemplate(row: RawTemplateRow): WorkTypeTemplate {
  if (!Array.isArray(row.required_photos)) throw new Error('required_photos must be an array');
  return {
    id: row.id,
    name: row.name,
    carrier: row.carrier,
    route: row.route,
    anchorType: row.anchor_type,
    minCount: row.min_count,
    warningText: row.warning_text,
    rules: (typeof row.rules === 'object' && row.rules !== null ? row.rules : {}) as TemplateRules,
    requiredPhotos: row.required_photos.map(parseSlot),
  };
}

export function requiredSlots(t: WorkTypeTemplate): RequiredPhotoSlot[] {
  return t.requiredPhotos.filter((s) => s.required);
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/domain/template.test.ts`
Expected: PASS (4 passed).

- [ ] **Step 5: 전체 스위트 + 빌드**

Run: `npm test` then `npm run build`
Expected: 전부 PASS(기존 Plan A 13 + Plan B 신규), 빌드 성공.

- [ ] **Step 6: 커밋**

```bash
git add src/domain/types.ts src/domain/template.ts test/domain/template.test.ts
git commit -m "feat: domain types + parseTemplate (typed DB<->domain boundary)"
```

---

## Self-Review

**1. Spec coverage (Plan B 범위):**
- 전체 Phase 1 스키마(스펙 §7 테이블 8종) → Task 2. TSR/TCR 캐리어 템플릿 시드(§6) → Task 3. 도메인 타입/파서(계약) → Task 4. pglite 검증 하네스 → Task 1. → 커버.
- 범위 밖(명시·후속): RLS(auth 기반)·Storage 버킷·토큰접근 Edge Function → Supabase 연결 플랜. photos AI 컬럼·reports·org/roles → Phase 2.

**2. Placeholder scan:** 모든 스텝에 실제 SQL/코드/명령/기대결과. 시드 슬롯 라벨은 캐리어 PDF의 실측 문구 전사(업무상 미세조정은 seed 수정으로 가능 — 값이 바뀌면 seed.test의 개수/키 단언만 갱신).

**3. Type consistency:** `RequiredPhotoSlot`/`TemplateRules`/`WorkTypeTemplate`(types.ts)가 template.ts에서 사용·반환됨. `RawTemplateRow`의 snake_case 컬럼(min_count 등)이 0001/0002 SQL 컬럼명과 일치. `WorkOrderStatus` 유니온이 work_orders.status CHECK 목록과 일치. share_links.kind 유니온 일치.

**4. Ambiguity:** min_count는 "필수 슬롯 수(8)"로 통일하고 캐리어의 "최소 7장/8장" 문구는 warning_text에 보존 — seed.test가 8/8을 단언. (실 업무 수치는 seed에서 조정 가능, 이 플랜은 구조·계약 검증이 목적.)

---

## 알려진 한계 (의도적)
- pglite는 실제 Postgres16이지만 Supabase 서비스(auth·storage·PostgREST·Edge Functions)는 없음 → RLS·토큰접근·버킷은 이 플랜에서 검증 불가, Supabase 연결 시 통합테스트.
- 도메인 repo(Supabase client로 실제 질의)는 소비처(Plan C 관리자 콘솔)에서 목/통합으로 검증. 이 플랜은 스키마·시드·타입 계약까지.
