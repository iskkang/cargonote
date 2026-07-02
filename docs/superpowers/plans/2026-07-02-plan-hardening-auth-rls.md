# 보안 하드닝 (Auth + RLS + 토큰 RPC) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공개 anon 키로 열려 있던 DB를 잠근다 — 사무실은 Supabase Auth(이메일+비밀번호) 로그인 뒤 RLS로 접근, 작업자/수신자(anon)는 테이블 직접 접근을 막고 토큰 검증 SECURITY DEFINER RPC로만 접근.

**Architecture:** 모든 테이블 RLS on. `authenticated` 역할(로그인한 사무실)만 테이블 전체 접근; `anon`은 테이블 정책 없음(=거부). 작업자 화면은 `AdminRepo`(테이블) 대신 새 `WorkerClient`(RPC 호출)를 쓰며, RPC 함수가 share_link 토큰을 내부 검증한다. 관리자 콘솔은 `AuthGate`로 감싸 세션이 없으면 로그인 폼을 보인다. 인증/워커 데이터 경로는 주입식(`AuthDeps`, `WorkerClient`)이라 컴포넌트·단위 테스트가 실 백엔드 없이 돈다. RLS/RPC 마이그레이션은 pglite에 Supabase 스텁(roles + `auth.uid()`)을 선적용해 함수 로직·적용 가능성을 검증하고, 역할 강제는 라이브로 확인한다.

**Tech Stack:** TypeScript, React 18, Vite 5, `@supabase/supabase-js` v2 (Auth + rpc), Vitest + @testing-library/react, PGlite (마이그레이션/함수 테스트). Postgres RLS + PL/pgSQL SECURITY DEFINER 함수.

## Global Constraints

- **인증:** Supabase Auth 이메일+비밀번호, **초대제**. 공개 가입 끄기·직원 계정 생성은 사용자의 대시보드 작업(코드 아님). 코드 측: `supabase.ts`에 `persistSession: true`.
- **RLS:** 8개 앱 테이블 전부 `enable row level security`. `authenticated` → `for all ... using (true) with check (true)`. `anon` → 정책 없음(전면 거부). `work_orders.created_by` 기본값 `auth.uid()`.
- **토큰 접근(anon):** 오직 3개 SECURITY DEFINER 함수로만. 시그니처 고정:
  - `worker_bootstrap(p_token text) returns jsonb`
  - `worker_insert_photo(p_token text, p_container_id uuid, p_slot_key text, p_display_path text, p_thumb_path text, p_file_hash text, p_byte_size int, p_captured_at timestamptz) returns void`
  - `worker_list_photos(p_token text, p_container_id uuid) returns setof photos`
  각 함수는 share_link를 `kind='worker' and revoked=false and (expires_at is null or expires_at > now())`로 검증. insert/list는 컨테이너가 그 work_order 소속인지도 확인. `revoke all ... from public; grant execute ... to anon`.
- **라우트 게이트:** `/admin`(및 향후 검토·발행)은 세션 필요; `/c/:token`·`/v/:token`·`/spike`는 무로그인.
- **pglite 한계:** Supabase 스텁(`test/db/supabase-stubs.sql`: `anon`/`authenticated` 역할 + `auth` 스키마 + `auth.uid()`)을 마이그레이션보다 먼저 적용해야 0003/0004가 적용된다. **RLS 역할 강제와 `auth.uid()` 실값은 pglite로 검증 불가 → 라이브 검증.** pglite로는 (a) 마이그레이션이 깨끗이 적용되고 RLS 플래그가 켜지는지, (b) RPC 함수 본문 로직을 검증한다.
- **기존 테스트:** 컴포넌트를 직접 렌더하는 테스트(console/board/create/worker-capture)는 불변. `test/admin/routes.test.tsx`의 `/admin` 케이스만 게이트 반영해 갱신(정당한 동작 변경). 그 외 수정 금지.
- **Storage:** `captures` 작업자 anon-insert 유지(기존). 사무실 열람용 authenticated read 정책 추가(0005, 라이브 전용). per-token 서명 URL은 후속.
- 새 의존성 금지. DRY, YAGNI, TDD, 빈번한 커밋.

## 수동 설정 (사용자 — 플랜 실행/병합 후)

- 마이그레이션 0003/0004/0005/0006 적용(SQL Editor 또는 `supabase db push`).
- **Storage:** `captures` 버킷 + anon INSERT 정책이 있어야 워커/스파이크 업로드가 됨. 기존 라이브엔 Plan A 때 대시보드로 만든 `spike anon insert` 정책이 이미 있음. 0006이 이를 코드화(다른 이름, 추가 적용해도 무해). 새 프로젝트/`db reset` 후엔 0006이 필수.
- Supabase 대시보드 → Authentication → **이메일 공개 가입(Sign-ups) 끄기**, **직원 계정 생성**.
- (권장) DB가 열려 있던 동안의 더미데이터 정리.

---

## Task 1: RLS 마이그레이션 0003 + Storage 0005 + pglite Supabase 스텁

**Files:**
- Create: `test/db/supabase-stubs.sql`
- Create: `supabase/migrations/0003_rls.sql`
- Create: `supabase/migrations/0005_storage_read.sql`
- Test: `test/db/rls.test.ts`

**Interfaces:**
- Produces: `test/db/supabase-stubs.sql` (roles + `auth.uid()` stub) reused by Task 2's RPC test. 0003 (RLS) and 0005 (storage read) migrations.

**Notes:** 0005(storage.objects)는 pglite에 storage 스키마가 없어 **테스트하지 않는다**(라이브 전용). rls.test는 stubs+0001+0003만 적용한다.

- [ ] **Step 1: Write the stub + failing test**

`test/db/supabase-stubs.sql`:
```sql
-- Minimal Supabase-compat stubs so RLS/RPC migrations apply under PGlite (no auth schema/roles there).
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
```

`test/db/rls.test.ts`:
```ts
// @vitest-environment node
import stubs from './supabase-stubs.sql?raw';
import schema from '../../supabase/migrations/0001_core_schema.sql?raw';
import rls from '../../supabase/migrations/0003_rls.sql?raw';
import { freshDb } from './pglite';

test('0003 applies cleanly and enables RLS on all 8 app tables', async () => {
  const d = await freshDb([stubs, schema, rls]);
  const r = await d.query<{ relname: string }>(`
    select c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relrowsecurity=true
    order by 1;`);
  expect(r.rows.map((x) => x.relname)).toEqual([
    'audit_logs', 'containers', 'customers', 'photos',
    'publications', 'share_links', 'work_orders', 'work_type_templates',
  ]);
});

test('authenticated has a policy on work_orders; anon has none', async () => {
  const d = await freshDb([stubs, schema, rls]);
  const r = await d.query<{ roles: string }>(
    "select array_to_string(polroles::regrole[], ',') as roles from pg_policy where polrelid='work_orders'::regclass;");
  const joined = r.rows.map((x) => x.roles).join(';');
  expect(joined).toContain('authenticated');
  expect(joined).not.toContain('anon');
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- db/rls`
Expected: FAIL (0003 not found).

- [ ] **Step 3: Implement the migrations**

`supabase/migrations/0003_rls.sql`:
```sql
-- Lock down all app tables. authenticated (office staff) get full access; anon gets none
-- (workers/viewers reach data only through the SECURITY DEFINER RPCs in 0004).

alter table customers            enable row level security;
alter table work_type_templates  enable row level security;
alter table work_orders          enable row level security;
alter table containers           enable row level security;
alter table photos               enable row level security;
alter table share_links          enable row level security;
alter table publications         enable row level security;
alter table audit_logs           enable row level security;

create policy auth_all_customers   on customers           for all to authenticated using (true) with check (true);
create policy auth_all_templates   on work_type_templates for all to authenticated using (true) with check (true);
create policy auth_all_workorders  on work_orders         for all to authenticated using (true) with check (true);
create policy auth_all_containers  on containers          for all to authenticated using (true) with check (true);
create policy auth_all_photos      on photos              for all to authenticated using (true) with check (true);
create policy auth_all_sharelinks  on share_links         for all to authenticated using (true) with check (true);
create policy auth_all_pubs        on publications        for all to authenticated using (true) with check (true);
create policy auth_all_audit       on audit_logs          for all to authenticated using (true) with check (true);

-- record the creating office user for audit
alter table work_orders alter column created_by set default auth.uid();
```

`supabase/migrations/0005_storage_read.sql`:
```sql
-- Office (authenticated) can read/download captured photos (review + gallery).
-- Worker upload keeps the existing anon INSERT policy on the captures bucket.
-- NOTE: storage schema is absent under PGlite; this migration is applied live only.
create policy "authenticated read captures"
  on storage.objects for select to authenticated
  using (bucket_id = 'captures');
```

- [ ] **Step 4: Run test, verify pass**

Run: `npm test -- db/rls`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add test/db/supabase-stubs.sql supabase/migrations/0003_rls.sql supabase/migrations/0005_storage_read.sql test/db/rls.test.ts
git commit -m "feat: RLS lockdown (0003) + storage read (0005) + pglite supabase stubs"
```

---

## Task 2: 워커 토큰 RPC 마이그레이션 0004

**Files:**
- Create: `supabase/migrations/0004_worker_rpcs.sql`
- Test: `test/db/worker-rpcs.test.ts`

**Interfaces:**
- Consumes: `test/db/supabase-stubs.sql`, `0001_core_schema.sql`.
- Produces: `worker_bootstrap`, `worker_insert_photo`, `worker_list_photos` (signatures per Global Constraints).

- [ ] **Step 1: Write failing test**

`test/db/worker-rpcs.test.ts`:
```ts
// @vitest-environment node
import stubs from './supabase-stubs.sql?raw';
import schema from '../../supabase/migrations/0001_core_schema.sql?raw';
import rpcs from '../../supabase/migrations/0004_worker_rpcs.sql?raw';
import { freshDb } from './pglite';

const seed = `
  insert into customers (id,name) values ('11111111-1111-1111-1111-111111111111','C');
  insert into work_type_templates (id,name,anchor_type,route) values ('22222222-2222-2222-2222-222222222222','T','container_no','TCR');
  insert into work_orders (id,customer_id,template_id) values ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');
  insert into containers (id,work_order_id,container_no) values ('44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333','TCLU1234567');
  insert into share_links (work_order_id,token,kind) values ('33333333-3333-3333-3333-333333333333','GOODTOK','worker');
  insert into share_links (work_order_id,token,kind,revoked) values ('33333333-3333-3333-3333-333333333333','DEADTOK','worker',true);
`;

async function db() { return freshDb([stubs, schema, rpcs, seed]); }

test('worker_bootstrap returns order+template+containers for a valid token', async () => {
  const d = await db();
  const r = await d.query<{ b: any }>("select worker_bootstrap('GOODTOK') as b;");
  const b = r.rows[0].b;
  expect(b.order.id).toBe('33333333-3333-3333-3333-333333333333');
  expect(b.template.route).toBe('TCR');
  expect(b.containers.map((c: any) => c.container_no)).toEqual(['TCLU1234567']);
});

test('worker_bootstrap returns null for unknown and revoked tokens', async () => {
  const d = await db();
  const bad = await d.query<{ b: any }>("select worker_bootstrap('NOPE') as b;");
  const dead = await d.query<{ b: any }>("select worker_bootstrap('DEADTOK') as b;");
  expect(bad.rows[0].b).toBeNull();
  expect(dead.rows[0].b).toBeNull();
});

test('worker_insert_photo inserts for a valid token+container', async () => {
  const d = await db();
  await d.query(`select worker_insert_photo('GOODTOK','44444444-4444-4444-4444-444444444444','seal','d.webp','t.webp','h',10,now());`);
  const c = await d.query<{ n: number }>('select count(*)::int n from photos;');
  expect(c.rows[0].n).toBe(1);
});

test('worker_insert_photo rejects a container not in the work order', async () => {
  const d = await db();
  await expect(
    d.query(`select worker_insert_photo('GOODTOK','55555555-5555-5555-5555-555555555555','seal','d','t','h',1,now());`),
  ).rejects.toThrow();
});

test('worker_insert_photo rejects an invalid token', async () => {
  const d = await db();
  await expect(
    d.query(`select worker_insert_photo('NOPE','44444444-4444-4444-4444-444444444444','seal','d','t','h',1,now());`),
  ).rejects.toThrow();
});

test('worker_list_photos returns the container photos for a valid token', async () => {
  const d = await db();
  await d.query(`select worker_insert_photo('GOODTOK','44444444-4444-4444-4444-444444444444','seal','d.webp','t.webp','h',10,now());`);
  const r = await d.query<{ slot_key: string }>(`select slot_key from worker_list_photos('GOODTOK','44444444-4444-4444-4444-444444444444');`);
  expect(r.rows.map((x) => x.slot_key)).toEqual(['seal']);
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npm test -- worker-rpcs`
Expected: FAIL (0004 not found).

- [ ] **Step 3: Implement**

`supabase/migrations/0004_worker_rpcs.sql`:
```sql
-- Anon workers/viewers reach data ONLY through these token-validating SECURITY DEFINER functions.
-- They run as owner (bypass RLS) but enforce the share-link token themselves.

create or replace function worker_bootstrap(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_link share_links; v_order work_orders; v_template jsonb; v_containers jsonb;
begin
  select * into v_link from share_links
    where token = p_token and kind = 'worker' and revoked = false
      and (expires_at is null or expires_at > now())
    limit 1;
  if not found then return null; end if;

  select * into v_order from work_orders where id = v_link.work_order_id;
  if not found then return null; end if;

  select to_jsonb(t) into v_template from work_type_templates t where t.id = v_order.template_id;
  if v_template is null then return null; end if;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at), '[]'::jsonb) into v_containers
    from containers c where c.work_order_id = v_order.id;

  return jsonb_build_object('order', to_jsonb(v_order), 'template', v_template, 'containers', v_containers);
end $$;

create or replace function worker_insert_photo(
  p_token text, p_container_id uuid, p_slot_key text,
  p_display_path text, p_thumb_path text, p_file_hash text, p_byte_size int, p_captured_at timestamptz
) returns void language plpgsql security definer set search_path = public as $$
declare v_wo uuid;
begin
  select work_order_id into v_wo from share_links
    where token = p_token and kind = 'worker' and revoked = false
      and (expires_at is null or expires_at > now())
    limit 1;
  if v_wo is null then raise exception 'invalid token'; end if;
  if not exists (select 1 from containers where id = p_container_id and work_order_id = v_wo) then
    raise exception 'container not in work order';
  end if;
  insert into photos (container_id, slot_key, display_path, thumb_path, file_hash, byte_size, captured_at, status)
  values (p_container_id, p_slot_key, p_display_path, p_thumb_path, p_file_hash, p_byte_size, p_captured_at, 'uploaded');
end $$;

create or replace function worker_list_photos(p_token text, p_container_id uuid)
returns setof photos language plpgsql security definer set search_path = public as $$
declare v_wo uuid;
begin
  select work_order_id into v_wo from share_links
    where token = p_token and kind = 'worker' and revoked = false
      and (expires_at is null or expires_at > now())
    limit 1;
  if v_wo is null then raise exception 'invalid token'; end if;
  if not exists (select 1 from containers where id = p_container_id and work_order_id = v_wo) then
    raise exception 'container not in work order';
  end if;
  return query select * from photos where container_id = p_container_id order by created_at;
end $$;

revoke all on function worker_bootstrap(text) from public;
revoke all on function worker_insert_photo(text, uuid, text, text, text, text, int, timestamptz) from public;
revoke all on function worker_list_photos(text, uuid) from public;
grant execute on function worker_bootstrap(text) to anon, authenticated;
grant execute on function worker_insert_photo(text, uuid, text, text, text, text, int, timestamptz) to anon, authenticated;
grant execute on function worker_list_photos(text, uuid) to anon, authenticated;
```

- [ ] **Step 4: Run test, verify pass**

Run: `npm test -- worker-rpcs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0004_worker_rpcs.sql test/db/worker-rpcs.test.ts
git commit -m "feat: worker token RPCs (bootstrap/insert_photo/list_photos)"
```

---

## Task 3: 관리자 인증 — session 헬퍼 + persistSession + Login + AuthGate

**Files:**
- Modify: `src/lib/supabase.ts`
- Create: `src/auth/session.ts`
- Create: `src/auth/Login.tsx`
- Create: `src/auth/AuthGate.tsx`
- Test: `test/auth/auth-gate.test.tsx`

**Interfaces:**
- Produces: `interface AuthDeps { getSession(): Promise<Session | null>; signIn(email, password): Promise<void>; signOut(): Promise<void>; onAuthChange(cb: (signedIn: boolean) => void): () => void }`; `defaultAuthDeps`; `<Login deps>`; `<AuthGate deps>{children}</AuthGate>`.

- [ ] **Step 1: Write failing test**

`test/auth/auth-gate.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthGate } from '../../src/auth/AuthGate';
import type { AuthDeps } from '../../src/auth/session';

function deps(over: Partial<AuthDeps> = {}): AuthDeps {
  return {
    getSession: async () => null,
    signIn: async () => {},
    signOut: async () => {},
    onAuthChange: () => () => {},
    ...over,
  };
}

test('shows the login form when there is no session', async () => {
  render(<AuthGate deps={deps()}><div>SECRET</div></AuthGate>);
  expect(await screen.findByLabelText(/이메일/)).toBeInTheDocument();
  expect(screen.queryByText('SECRET')).not.toBeInTheDocument();
});

test('renders children when a session exists', async () => {
  render(<AuthGate deps={deps({ getSession: async () => ({ user: { id: 'u1' } } as any) })}><div>SECRET</div></AuthGate>);
  expect(await screen.findByText('SECRET')).toBeInTheDocument();
});

test('shows an error when sign-in fails', async () => {
  const d = deps({ signIn: async () => { throw new Error('bad'); } });
  render(<AuthGate deps={d}><div>SECRET</div></AuthGate>);
  fireEvent.change(await screen.findByLabelText(/이메일/), { target: { value: 'a@b.c' } });
  fireEvent.change(screen.getByLabelText(/비밀번호/), { target: { value: 'x' } });
  fireEvent.click(screen.getByRole('button', { name: /로그인/ }));
  expect(await screen.findByText(/로그인 실패/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npm test -- auth-gate`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

Modify `src/lib/supabase.ts` — change the auth option to persist the session:
```ts
export const supabase = createClient(url, key, {
  auth: { persistSession: true },
});
```

`src/auth/session.ts`:
```ts
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthDeps {
  getSession(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  onAuthChange(cb: (signedIn: boolean) => void): () => void;
}

export const defaultAuthDeps: AuthDeps = {
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  },
  async signOut() {
    await supabase.auth.signOut();
  },
  onAuthChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(!!session));
    return () => data.subscription.unsubscribe();
  },
};
```

`src/auth/Login.tsx`:
```tsx
import { useState } from 'react';
import type { AuthDeps } from './session';

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

  const field = { display: 'block', width: '100%', marginTop: 4, marginBottom: 12, padding: 8 } as const;
  return (
    <main style={{ minHeight: '100vh', background: '#D7DEE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Pretendard, sans-serif' }}>
      <form onSubmit={submit} style={{ background: '#fff', borderRadius: 14, padding: 28, width: 320 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: 18, marginBottom: 16 }}>CARGO<span style={{ color: '#FF6A00' }}>LINK</span></div>
        <label>이메일<input type="email" style={field} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>비밀번호<input type="password" style={field} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <button type="submit" disabled={busy} style={{ width: '100%', padding: 10, borderRadius: 10, border: 0, background: '#FF6A00', color: '#fff', fontWeight: 600, opacity: busy ? 0.6 : 1 }}>로그인</button>
      </form>
    </main>
  );
}
```

`src/auth/AuthGate.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { defaultAuthDeps, type AuthDeps } from './session';
import { Login } from './Login';

export function AuthGate({ children, deps = defaultAuthDeps }: { children: React.ReactNode; deps?: AuthDeps }) {
  const [state, setState] = useState<'loading' | 'in' | 'out'>('loading');
  useEffect(() => {
    deps.getSession().then((s) => setState(s ? 'in' : 'out'));
    return deps.onAuthChange((signedIn) => setState(signedIn ? 'in' : 'out'));
  }, [deps]);

  if (state === 'loading') return <main style={{ minHeight: '100vh', background: '#D7DEE5' }} />;
  if (state === 'out') return <Login deps={deps} />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npm test -- auth-gate`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts src/auth/session.ts src/auth/Login.tsx src/auth/AuthGate.tsx test/auth/auth-gate.test.tsx
git commit -m "feat: admin auth — session helper, persistSession, Login, AuthGate"
```

---

## Task 4: WorkerClient (RPC + 인메모리) + 팩토리 + insert 가드

**Files:**
- Create: `src/worker/workerClient.ts`
- Modify: `src/admin/repoFactory.ts`
- Modify: `src/admin/supabaseRepo.ts`
- Test: `test/worker/worker-client.test.ts`

**Interfaces:**
- Consumes: `WorkOrder`,`WorkTypeTemplate`,`Container`,`Photo` (domain); `NewPhoto`,`AdminRepo` (`../admin/repo`); mappers + `parseTemplate`; `supabase`.
- Produces: `interface WorkerBundle { order: WorkOrder; template: WorkTypeTemplate; containers: Container[] }`; `interface WorkerClient { bootstrap(token): Promise<WorkerBundle | null>; insertPhoto(token, p: NewPhoto): Promise<void>; listPhotos(token, containerId): Promise<Photo[]> }`; `createSupabaseWorkerClient(rpc?)`; `createInMemoryWorkerClient(repo)`; `getWorkerClient()` (factory).

- [ ] **Step 1: Write failing test**

`test/worker/worker-client.test.ts`:
```ts
import { createInMemoryWorkerClient, createSupabaseWorkerClient } from '../../src/worker/workerClient';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('in-memory client bootstraps the demo token and round-trips a photo', async () => {
  const repo = createInMemoryAdminRepo();
  const client = createInMemoryWorkerClient(repo);
  const b = await client.bootstrap('demotoken123');
  expect(b).not.toBeNull();
  expect(b!.template.route).toBe('TCR');
  const containerId = b!.containers[0].id;
  await client.insertPhoto('demotoken123', {
    containerId, slotKey: 'seal', displayPath: 'd.webp', thumbPath: 't.webp',
    fileHash: 'h', byteSize: 10, capturedAt: '2026-07-02T00:00:00Z',
  });
  const photos = await client.listPhotos('demotoken123', containerId);
  expect(photos.map((p) => p.slotKey)).toEqual(['seal']);
});

test('in-memory client returns null for an unknown token', async () => {
  const client = createInMemoryWorkerClient(createInMemoryAdminRepo());
  expect(await client.bootstrap('nope')).toBeNull();
});

test('supabase client maps worker_bootstrap jsonb via a fake rpc', async () => {
  const rpc = async (name: string) => {
    if (name === 'worker_bootstrap') {
      return { data: {
        order: { id: 'wo1', customer_id: 'c1', template_id: 't1', work_date: null, status: 'sent', assignee_name: null, assignee_contact: null, shipper_label: null },
        template: { id: 't1', name: 'T', carrier: 'FESCO', route: 'TSR', anchor_type: 'container_no', min_count: 8, warning_text: null, rules: {}, required_photos: [] },
        containers: [{ id: 'k1', work_order_id: 'wo1', container_no: 'ABCD1234567', seal_no: null, worker_memo: null }],
      }, error: null };
    }
    return { data: null, error: null };
  };
  const client = createSupabaseWorkerClient(rpc as any);
  const b = await client.bootstrap('GOODTOK');
  expect(b!.order.id).toBe('wo1');
  expect(b!.template.route).toBe('TSR');
  expect(b!.containers[0].containerNo).toBe('ABCD1234567');
});

test('supabase client throws on rpc error', async () => {
  const rpc = async () => ({ data: null, error: { message: 'denied' } });
  const client = createSupabaseWorkerClient(rpc as any);
  await expect(client.bootstrap('x')).rejects.toThrow('denied');
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npm test -- worker-client`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the client**

`src/worker/workerClient.ts`:
```ts
import type { Container, Photo, WorkOrder, WorkTypeTemplate } from '../domain/types';
import type { AdminRepo, NewPhoto } from '../admin/repo';
import { parseTemplate, type RawTemplateRow } from '../domain/template';
import { rowToContainer, rowToPhoto, rowToWorkOrder } from '../admin/supabaseMappers';
import { supabase } from '../lib/supabase';

export interface WorkerBundle { order: WorkOrder; template: WorkTypeTemplate; containers: Container[] }

export interface WorkerClient {
  bootstrap(token: string): Promise<WorkerBundle | null>;
  insertPhoto(token: string, p: NewPhoto): Promise<void>;
  listPhotos(token: string, containerId: string): Promise<Photo[]>;
}

type RpcFn = (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

export function createSupabaseWorkerClient(rpc: RpcFn = (n, p) => supabase.rpc(n, p)): WorkerClient {
  return {
    async bootstrap(token) {
      const { data, error } = await rpc('worker_bootstrap', { p_token: token });
      if (error) throw new Error(error.message);
      if (!data) return null;
      const d = data as { order: Record<string, unknown>; template: Record<string, unknown>; containers: Record<string, unknown>[] };
      return {
        order: rowToWorkOrder(d.order),
        template: parseTemplate(d.template as unknown as RawTemplateRow),
        containers: (d.containers ?? []).map(rowToContainer),
      };
    },
    async insertPhoto(token, p) {
      const { error } = await rpc('worker_insert_photo', {
        p_token: token, p_container_id: p.containerId, p_slot_key: p.slotKey,
        p_display_path: p.displayPath, p_thumb_path: p.thumbPath, p_file_hash: p.fileHash,
        p_byte_size: p.byteSize, p_captured_at: p.capturedAt,
      });
      if (error) throw new Error(error.message);
    },
    async listPhotos(token, containerId) {
      const { data, error } = await rpc('worker_list_photos', { p_token: token, p_container_id: containerId });
      if (error) throw new Error(error.message);
      return ((data ?? []) as Record<string, unknown>[]).map(rowToPhoto);
    },
  };
}

export function createInMemoryWorkerClient(repo: AdminRepo): WorkerClient {
  return {
    async bootstrap(token) {
      const r = await repo.getByWorkerToken(token);
      return r ? { order: r.order, template: r.template, containers: r.containers } : null;
    },
    async insertPhoto(_token, p) { await repo.insertPhoto(p); },
    async listPhotos(_token, containerId) { return repo.listPhotos(containerId); },
  };
}
```

- [ ] **Step 4: Add `getWorkerClient()` to the factory**

In `src/admin/repoFactory.ts`, add imports and the worker factory (keep the existing `getAdminRepo`):
```ts
import type { WorkerClient } from '../worker/workerClient';
import { createInMemoryWorkerClient, createSupabaseWorkerClient } from '../worker/workerClient';
```
```ts
let cachedWorker: WorkerClient | null = null;
export function getWorkerClient(): WorkerClient {
  if (!cachedWorker) {
    cachedWorker = isSupabaseConfigured(import.meta.env.VITE_SUPABASE_URL as string | undefined)
      ? createSupabaseWorkerClient()
      : createInMemoryWorkerClient(getAdminRepo());
  }
  return cachedWorker;
}
```

- [ ] **Step 5: Add the insert guard to `supabaseRepo.ts`**

In `createWorkOrder`, guard the read-back (RLS-on could return no row):
```ts
      const [orderRow] = await db.insert('work_orders', {
        customer_id: input.customerId, template_id: input.templateId, work_date: input.workDate,
        status: 'sent', assignee_name: input.assigneeName, assignee_contact: input.assigneeContact,
      });
      if (!orderRow) throw new Error('work_order insert returned no row (check RLS select policy)');
      const order = rowToWorkOrder(orderRow);
```

- [ ] **Step 6: Run tests, verify pass**

Run: `npm test -- worker-client supabase-repo repo-factory`
Expected: PASS (new worker-client tests + existing repo/factory tests still green).

- [ ] **Step 7: Commit**

```bash
git add src/worker/workerClient.ts src/admin/repoFactory.ts src/admin/supabaseRepo.ts test/worker/worker-client.test.ts
git commit -m "feat: WorkerClient (RPC + in-memory) + getWorkerClient factory + insert guard"
```

---

## Task 5: 배선 — WorkerCapture→WorkerClient, /admin 게이트, 전체 스위트/build

**Files:**
- Modify: `src/worker/WorkerCapture.tsx`
- Modify: `src/admin/AdminConsole.tsx`
- Modify: `src/routes.tsx`
- Modify: `test/admin/routes.test.tsx` (admin route now gated — legitimate behavior change)

**Interfaces:**
- Consumes: `getWorkerClient` (`../admin/repoFactory`), `AuthGate` (`../auth/AuthGate`), `defaultAuthDeps` (`../auth/session`).

**Notes:** WorkerCapture는 `AdminRepo` 대신 `WorkerClient`를 쓰고 모든 호출에 `token`을 넘긴다. `/admin`은 `AuthGate`로 감싼다. `console.test.tsx`/`board`/`create`/`worker-capture.test.tsx`는 컴포넌트 직접 렌더라 불변; `routes.test.tsx`의 `/admin` 케이스만 로그인 폼을 기대하도록 갱신.

- [ ] **Step 1: Rewrite `WorkerCapture.tsx` to use WorkerClient**

Full file:
```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { WorkerClient } from './workerClient';
import { getWorkerClient } from '../admin/repoFactory';
import type { Container, WorkTypeTemplate } from '../domain/types';
import { checklistStatus } from '../domain/checklist';
import { makeVariants } from '../lib/image';
import { sha256Hex } from '../lib/hash';
import { supabase } from '../lib/supabase';
import { uploadSlotPhoto } from './uploadPhoto';

export function WorkerCapture({ client = getWorkerClient() }: { client?: WorkerClient } = {}) {
  const { token } = useParams();
  const [state, setState] = useState<{ template: WorkTypeTemplate; container: Container } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [captured, setCaptured] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client.bootstrap(token ?? '').then((r) => {
      if (!r || r.containers.length === 0) { setNotFound(true); return; }
      setState({ template: r.template, container: r.containers[0] });
    }).catch(() => setNotFound(true));
  }, [client, token]);

  async function refresh(containerId: string) {
    const photos = await client.listPhotos(token ?? '', containerId);
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
        insertPhoto: (p) => client.insertPhoto(token ?? '', p),
        now: () => new Date().toISOString(),
      });
      await refresh(state!.container.id);
    } catch {
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

- [ ] **Step 2: Add logout to `AdminConsole.tsx`**

Add the import and a logout button in the header. Add to imports:
```ts
import { defaultAuthDeps } from '../auth/session';
```
In the header `<div>` that holds the "새 작업" button, add a logout button beside it (wrap the two buttons in a flex span if needed):
```tsx
        <span style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setCreating((v) => !v)} style={{ background: '#FF6A00', color: '#fff', border: 0, borderRadius: 10, padding: '8px 14px', fontWeight: 600 }}>새 작업</button>
          <button onClick={() => defaultAuthDeps.signOut()} style={{ background: 'transparent', color: '#5A6B7D', border: '1px solid rgba(90,107,125,0.3)', borderRadius: 10, padding: '8px 14px' }}>로그아웃</button>
        </span>
```
(Replace the existing single `새 작업` button element with this span.)

- [ ] **Step 3: Gate `/admin` in `routes.tsx`**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { AdminConsole } from './admin/AdminConsole';
import { AuthGate } from './auth/AuthGate';
import { Placeholder } from './admin/Placeholder';
import { WorkerCapture } from './worker/WorkerCapture';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<AuthGate><AdminConsole /></AuthGate>} />
      <Route path="/spike" element={<App />} />
      <Route path="/c/:token" element={<WorkerCapture />} />
      <Route path="/v/:token" element={<Placeholder title="증빙 갤러리" />} />
      <Route path="*" element={<Placeholder title="페이지 없음" />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Update `routes.test.tsx` for the gated admin route**

Replace the first test (`renders the admin console at /admin`) with:
```tsx
test('gates /admin behind the login form when unauthenticated', async () => {
  render(<MemoryRouter initialEntries={['/admin']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByLabelText(/이메일/)).toBeInTheDocument();
});
```
Leave the other three tests (`/spike`, `/v/:token`, `/c/:token`) unchanged.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — all tests, including the updated routes test and unchanged console/worker-capture tests (worker-capture uses the in-memory WorkerClient via the factory in the test env → `demotoken123` resolves).

- [ ] **Step 6: Typecheck + build**

Run: `npm run build`
Expected: `tsc -b` clean, vite build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/worker/WorkerCapture.tsx src/admin/AdminConsole.tsx src/routes.tsx test/admin/routes.test.tsx
git commit -m "feat: wire WorkerCapture to WorkerClient + gate /admin behind AuthGate"
```

---

## Manual Verification (라이브 — 자동 스위트 밖)

RLS/역할 강제와 Auth는 pglite로 못 잡으므로 사용자 프로젝트에서 확인한다:

1. **마이그레이션 적용:** SQL Editor에 0003·0004·0005 실행(또는 `supabase db push`). 대시보드에서 이메일 공개가입 끄고 직원 계정 생성.
2. **anon 잠금 확인:** anon 키로 `GET /rest/v1/work_orders` → 이제 `[]`(RLS로 빈 결과) 또는 권한 오류; 이전처럼 데이터가 나오면 안 됨.
3. **로그인 게이트:** 배포 `/admin` → 로그인 폼 → 직원 계정으로 로그인 → 콘솔 표시. 작업 생성 → `work_orders` 행(+`created_by`가 로그인 유저).
4. **작업자 RPC 경로:** `/c/{token}` (무로그인) → 체크리스트 렌더(= `worker_bootstrap`) → 촬영 → Storage + `photos` 행(= `worker_insert_photo`), 완료 표시(= `worker_list_photos`). 잘못된/revoked 토큰 → "잘못된 링크".

## 후속(이 플랜 밖)

- per-token Storage 서명 업로드/열람(현재 anon-insert + authenticated-read). Plan C.2(검토·발행)·Plan E(수신자 갤러리, viewer RPC + 서명 URL). 오프라인 드레인. 감사 로그 기록.

## Self-Review

- **Spec coverage:** RLS 잠금(0003)·워커 RPC(0004)·storage read(0005)·Auth(session/Login/AuthGate/persistSession)·WorkerClient 전환·/admin 게이트·insert 가드 — 설계의 모든 항목이 태스크로 매핑됨. 공개가입 끄기/계정생성/마이그레이션 적용은 사용자 수동(명시).
- **Placeholder scan:** 모든 스텝에 실제 SQL/TS/테스트/명령. TBD 없음.
- **Type/이름 일관성:** RPC 이름·파라미터(`p_token` 등)가 0004 ↔ workerClient ↔ 테스트에서 일치. `WorkerClient`/`WorkerBundle`/`AuthDeps` 단일 정의 재사용. `NewPhoto`(camel)·mappers 재사용. `getWorkerClient`는 `getAdminRepo`와 같은 `isSupabaseConfigured` 게이트 → 테스트=인메모리.
- **회귀:** 컴포넌트 직접 렌더 테스트 불변; `routes.test`의 `/admin`만 게이트 반영(정당). worker-capture는 팩토리 in-memory WorkerClient로 `demotoken123` 유지.
- **Live-only(명시):** RLS 역할 강제, `auth.uid()`, storage read, 실제 로그인 — 라이브 검증 체크리스트로 커버.
