# ConCheck 멀티테넌시 아키텍처 플랜

> 목표: 단일 테넌트(MTL 내부용) → 여러 물류회사(조직)가 데이터·사용자·거래처를 격리한 채 쓰는 SaaS.
> 기준일 2026-07-04. 현재 상태: Supabase 단일 프로젝트, `RLS: authenticated using(true)`(로그인하면 전부 보임), anon은 SECURITY DEFINER RPC(worker/viewer)로만 접근.

---

## 0. 결론 요약

- **모델: 공유 DB + 행 단위 격리(`org_id` 컬럼 + RLS).** 스키마/DB-per-tenant는 이 규모에서 과함, Supabase와도 안 맞음.
- **모든 테넌트 테이블에 `org_id`를 비정규화**해서 넣는다(자식 테이블 포함) → RLS가 조인 없이 `is_member(org_id)` 하나로 끝남 = 단순·빠름.
- **anon RPC 경로(worker/viewer)는 토큰이 곧 스코프**라 org 필터가 필요 없다. 단, RPC가 INSERT하는 행(photos)에 부모로부터 `org_id`를 찍어줘야 한다.
- **워커 사진 업로드는 Edge Function(service role)으로 이전** — 스토리지 org 격리 + 기존 anon-RLS 취약점 동시 해결.

---

## 1. 테넌시 데이터 모델

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',       -- free | pro | ...
  created_at timestamptz not null default now()
);

create table memberships (
  org_id  uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id)     on delete cascade,
  role    text not null default 'member',   -- owner | admin | member
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index idx_membership_user on memberships(user_id);
```

멤버십 판정 헬퍼(정책에서 재사용, 인덱스 탐 → 빠름):

```sql
create or replace function is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships m
                 where m.org_id = p_org and m.user_id = auth.uid());
$$;
```

## 2. 모든 테넌트 테이블에 `org_id`

대상: `customers, work_type_templates, work_orders, containers, photos, share_links, publications, audit_logs`.

```sql
alter table customers add column org_id uuid references organizations(id) on delete cascade;
-- ...8개 테이블 동일...
-- (1) MTL 조직 생성 → (2) 기존 전체 행 org_id 백필 → (3) not null 전환
```

> **자식 테이블(containers/photos/share_links/publications/audit_logs)도 org_id를 직접 보유**한다. 부모 조인으로 유도할 수 있지만, 정책에서 조인을 없애 성능·단순성을 얻는다. 삽입 시 부모의 org_id를 그대로 복사.

## 3. RLS 재작성 (핵심)

`0003_rls.sql`의 `auth_all_*` 정책을 org 스코프로 교체:

```sql
drop policy auth_all_customers on customers;
create policy org_customers on customers for all to authenticated
  using (is_member(org_id)) with check (is_member(org_id));
-- work_orders, containers, photos, share_links, publications, audit_logs 동일

-- 템플릿만 예외: 전역 기본(org_id null)은 모두 읽기, 커스텀은 소속만
create policy tpl_read  on work_type_templates for select to authenticated
  using (org_id is null or is_member(org_id));
create policy tpl_write on work_type_templates for all to authenticated
  using (is_member(org_id)) with check (is_member(org_id));
```

## 4. anon RPC 경로 (worker/viewer) — org 격리 방식

- **토큰이 곧 테넌트 경계다.** `share_link.token` → 정확히 하나의 work_order → 하나의 org. 그래서 worker/viewer RPC는 org 필터가 불필요(교차 유출 불가).
- **단, `worker_insert_photo`가 INSERT하는 photos 행에 org_id를 찍어야 함** (RLS가 아니라 데이터 무결성 목적):

```sql
-- worker_insert_photo 내부, photos INSERT 시:
insert into photos (container_id, slot_key, ..., org_id)
values (p_container_id, ..., (
  select wo.org_id from containers c join work_orders wo on wo.id = c.work_order_id
  where c.id = p_container_id
));
```

- `viewer_bootstrap`은 읽기만 → 그대로. `publications.photo_manifest`도 org 무관(사전서명 URL).

## 5. 스토리지 격리

- 현재: `captures` 버킷, 경로 `{slot}-{hash}.webp`, **anon insert**(Phase1).
- **목표: 워커 업로드를 Edge Function으로 이전.** 함수가 토큰 검증 → **service_role로 업로드** → org 프리픽스 경로 `captures/{org_id}/{container_id}/{hash}.webp` → photos INSERT(org_id 포함).
  - 이점: (1) 스토리지 org 격리 (2) anon 쓰기 제거 = 이전에 겪은 anon-RLS 취약점 근본 해결 (3) 원본 보존·GPS·해시 등 무결성 강화를 서버 한 곳에 몰기 좋음.
- 뷰어 이미지는 발행 시 사전서명 URL → 변경 없음.

## 6. 클라이언트 변경

- **세션에 org 컨텍스트 추가**: 로그인 후 `memberships` 조회 → `currentOrgId`. 1개면 자동, 여러 개면 상단 **조직 스위처**.
- **삽입 시 org_id 명시**: `createWorkOrder`, `createCustomer`, (커스텀)`createTemplate` 입력에 `orgId` 추가. RLS `with check`가 "그 org의 멤버인지" 강제.
  - `DbPort.insert`가 임의 행을 넣으므로, org_id 누락 방지를 위해 **repo 레이어에서 currentOrgId를 주입**(한 곳에서).
- `getAdminRepo()`를 currentOrgId로 스코프. 워커/뷰어 클라이언트는 토큰 기반이라 변경 없음.

## 7. 온보딩 & 초대

- **가입 → 워크스페이스 생성**: 첫 로그인 시 멤버십이 없으면 "조직 만들기" → RPC로 원자적 생성:

```sql
create or replace function create_organization(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  insert into organizations(name) values (p_name) returning id into v_org;
  insert into memberships(org_id, user_id, role) values (v_org, auth.uid(), 'owner');
  return v_org;
end $$;
```

- **팀 초대**: owner가 이메일 초대 → `invitations(org_id,email,role,token)` → 상대가 가입/수락 시 membership 생성. (Supabase Auth 초대 메일 + 수락 페이지)
- (선택) **Custom Access Token Hook**로 org_id를 JWT 클레임에 넣으면 RLS가 서브쿼리 없이 `auth.jwt()->>'org_id'`로 더 빠름 — 성능 필요해질 때 도입.

## 8. 기존 MTL 데이터 마이그레이션

```sql
-- 0012 예시
with mtl as (insert into organizations(name) values ('MTL') returning id)
update customers set org_id = (select id from mtl) where org_id is null;
-- ...전 테이블 백필...
-- 기존 직원 user_id들 → memberships(role='owner'/'member')
```

## 9. 테스트

- 기존 pglite/Supabase-스텁 하네스에 **테넌트 격리 테스트** 추가: org A 사용자가 org B의 work_order/customer/photo를 **못 본다**(RLS 강제 + 서로 다른 auth.uid 2개).
- worker_insert_photo가 photos.org_id를 올바르게 찍는지.
- create_organization가 owner 멤버십을 만드는지.

## 10. 단계별 순서 & 공수(대략)

| 단계 | 내용 | 공수 |
|---|---|---|
| P0 | organizations/memberships, 전 테이블 org_id, 백필, is_member() | 1–2일 |
| P1 | RLS 전면 재작성 + 격리 테스트 | 1–2일 |
| P2 | worker_insert_photo org_id 스탬프 | 0.5일 |
| P3 | 클라이언트 org 컨텍스트 + 삽입 org_id 주입 + 스위처 | 2–3일 |
| P4 | 온보딩(create_organization) + 초대 | 3–5일 |
| P5 | 스토리지 Edge Function 업로드 + org 프리픽스 | 2–3일 |
| P6(별건) | plan 한도, Stripe 과금 | 1–2주 |

**멀티테넌트 v1(과금 제외): 대략 집중 2–3주.**

## 11. 확정 필요한 결정 3가지 (권장안 포함)

1. **한 사용자 = 한 조직 vs 여러 조직 소속?**
   권장: **스키마는 다대다(memberships) 지원, UX는 당분간 1조직 가정** + 스위처는 나중.
2. **워커 업로드: anon 유지(빠름) vs Edge Function 지금(깨끗·안전)?**
   권장: **Edge Function으로 지금 이전.** 스토리지 격리에 필수 + 기존 anon 취약점 해결.
3. **템플릿: 전역 기본 + 조직별 커스텀?**
   권장: **둘 다**(org_id null=전역 기본, 소속만 커스텀 추가).

## 12. 가장 큰 리스크 / 주의

- **삽입 경로에서 org_id 누락 → RLS `with check` 위반으로 조용히 실패.** repo 레이어 단일 지점에서 주입 + 격리 테스트로 방어.
- **RLS 서브쿼리 성능**: 지금 규모엔 무해, 커지면 JWT 클레임(§7)로 전환.
- **마이그레이션 되돌리기 어려움**: org_id not null 전환 전에 백필 검증 필수.
- 이 작업은 "코드 몇 줄"이 아니라 **데이터 모델·보안 경계 재설계**다. §11의 결정을 먼저 확정하고 P0→P1을 격리 테스트와 함께 진행할 것.
