# CargoLink — 거래처 CRUD + 콘솔 온보딩 설계

> **상태:** 승인됨 · **작성일:** 2026-07-02 · **대상:** 관리자 콘솔(Phase 1)
> **한 줄 정의:** 관리자가 로그인 후 막히지 않도록, 거래처를 앱 안에서 직접 추가·수정·삭제하고, "새 작업"에서 선택하며, 콘솔이 다음 행동을 안내한다.

---

## 1. 배경 & 문제

관리자가 로그인하면 관리자 콘솔(`/admin`)에 진입하지만, 첫 행동을 못 뗀다:

1. **거래처를 넣을 방법이 없다.** `customers` 테이블은 어떤 마이그레이션에서도 시드되지 않고, 앱 안에 거래처를 추가하는 UI도 없다(`AdminRepo`에 `listCustomers`만 존재). "새 작업" 폼의 거래처 드롭다운이 비어 막다른 길이 된다.
2. **데모 데이터 혼란.** 배포본이 Supabase 키 미설정으로 인메모리 fallback(`createInMemoryAdminRepo`)으로 도는 경우, "칭다오 파트너" 같은 하드코딩 데모 거래처가 보인다. 실제 거래처가 아니며 지울 방법이 없다.
3. **온보딩 부재.** 로그인 후 화면에 "이 앱을 어떻게 쓰는지"에 대한 안내가 없다(설명은 로그인 전 화면에만 있음).

## 2. 목표 / 비목표

**목표**
1. 관리자가 앱 안에서 거래처를 **추가·수정·삭제**한다. 필드: 거래처명·담당자·전화번호·이메일.
2. "새 작업" 메인 화면에서 등록된 거래처를 **선택**한다. 거래처가 없으면 등록으로 유도한다.
3. 인메모리 fallback에서도 데모 거래처를 실제로 삭제할 수 있다(양쪽 저장소 CRUD 구현).
4. 로그인 후 콘솔이 **다음 행동을 안내**한다(사용 방법 스트립 + 개선된 빈 상태).

**비목표**
- 거래처 소프트 삭제/복구, 거래처별 권한, 대량 가져오기(CSV).
- 담당자 다중(1거래처 N담당자). Phase 1은 거래처당 담당자 1명(단일 필드).
- 로그인 전 마케팅 화면 변경.

## 3. 데이터 모델 변경

**마이그레이션 `0008_customer_contact_fields.sql` (비파괴, 컬럼 추가만):**

```sql
alter table customers add column if not exists contact_name text;
alter table customers add column if not exists phone text;
alter table customers add column if not exists email text;
```

- 기존 `contact` / `notes` 컬럼은 **드롭하지 않는다**(비파괴). UI/도메인에서는 신규 4필드(name·contact_name·phone·email)만 사용한다.
- RLS는 기존 정책으로 충분: `auth_all_customers on customers for all to authenticated using (true) with check (true)` ([0003_rls.sql](../../../supabase/migrations/0003_rls.sql)) — authenticated 관리자에게 전체 CRUD 허용.

**도메인 타입 (`src/domain/types.ts`):**

```ts
export interface Customer {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  // 하위호환: 기존 필드 유지(미사용)
  contact: string | null;
  notes: string | null;
}
```

**매퍼 (`src/admin/supabaseMappers.ts`):** `rowToCustomer`가 `contact_name`/`phone`/`email`을 읽도록 확장.

## 4. 저장소 계층 (repo)

**`DbPort` (`src/admin/db.ts`)에 delete 추가:**

```ts
export interface DbPort {
  select(table: string, filter?: Filter): Promise<Row[]>;
  insert(table: string, values: Row | Row[]): Promise<Row[]>;
  update(table: string, match: Filter, values: Row): Promise<Row[]>;
  delete(table: string, match: Filter): Promise<void>; // 신규
}
```

Supabase 구현: `client.from(table).delete().eq(match.col, match.val)`; error 시 throw.

**`AdminRepo` (`src/admin/repo.ts`)에 3개 추가:**

```ts
createCustomer(input: NewCustomer): Promise<Customer>;
updateCustomer(id: string, input: NewCustomer): Promise<Customer>;
deleteCustomer(id: string): Promise<void>;

export interface NewCustomer {
  name: string; contactName: string | null; phone: string | null; email: string | null;
}
```

- **인메모리 구현:** `customers` 배열에 push/수정/필터. 하드코딩 데모 거래처(`cust-mtl`, `cust-cn`)는 배열에 남겨두되 `deleteCustomer`로 제거 가능. (기존 테스트가 시드 데이터에 의존하므로 초기 시드는 유지.)
- **Supabase 구현:** `db.insert` / `db.update` / `db.delete` 위임, snake_case 매핑.

**삭제 안전장치(차단 방식):** `work_orders.customer_id references customers(id)`에 ON DELETE 미지정 → 참조 중인 거래처 삭제 시 Postgres FK 오류 발생. 저장소는 오류를 그대로 던지고, UI가 이를 잡아 "이 거래처로 만든 작업이 있어 삭제할 수 없습니다"로 안내한다. 소프트 삭제는 하지 않는다.

## 5. UI — 거래처 관리

**`src/admin/CustomerManager.tsx` 신설:**
- 거래처 **목록**: 각 행에 거래처명·담당자·전화·이메일 표시, 우측에 [수정] [삭제] 버튼.
- **추가/수정 폼**: 4개 필드(거래처명 필수, 나머지 선택). 저장 시 `createCustomer`/`updateCustomer` 호출 후 목록 새로고침.
- **삭제**: 확인 후 `deleteCustomer` 호출. FK 오류 시 위 안내 문구를 인라인 표시.
- 빈 목록: `EmptyState`로 "등록된 거래처가 없습니다 — 아래에서 첫 거래처를 추가하세요".
- 기존 `ui/kit`(PageShell·Card·Button·Field·inputStyle·Badge·EmptyState)와 토큰(`C`, `FONT`)만 사용해 디자인 정합.

**`src/admin/AdminConsole.tsx` 변경:**
- 헤더에 **"거래처" 버튼** 추가(순서: 새 작업 · 거래처 · 로그아웃).
- 뷰 상태에 `'board' | 'customers'` 전환 추가(기존 `creating`/`selectedId`와 공존; 거래처 뷰 진입 시 다른 패널 닫음).

## 6. "새 작업" 연동

**`src/admin/CreateWorkOrder.tsx` 변경:**
- 거래처 드롭다운은 `listCustomers()` 유지.
- 거래처가 0개면 드롭다운 대신 안내: "먼저 거래처를 등록하세요" + [거래처 관리로 이동] 버튼(콘솔 뷰를 customers로 전환). 이때 작업 생성 버튼은 비활성.

## 7. 온보딩 / 빈 상태

- **사용 방법 스트립**(`AdminConsole` 상단, 접기 가능): 3단계 —
  ① 새 작업 생성 → 작업자 링크 전송 · ② 현장이 촬영·제출 · ③ 검수 후 발행 → 수신자 링크 공유.
- 빈 작업 보드 문구는 기존 유지("상단 '새 작업'으로 첫 작업 지시를 만드세요"), 단 거래처가 없으면 "먼저 거래처를 등록하세요"를 우선 노출.

## 8. 배포 전제 (코드 외 ops 단계)

데모 데이터를 제거하고 실제 운용하려면:
1. Supabase 프로젝트에 마이그레이션 `0001`~`0008` 적용.
2. Netlify 환경변수 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 설정 → `isSupabaseConfigured`가 true가 되어 Supabase 저장소로 전환(인메모리 데모 거래처 사라짐).
3. 재배포.

이 단계는 구현 완료 후 순서대로 안내한다(코드 변경 아님).

## 9. 테스트 전략

- **repo (인메모리·Supabase):** createCustomer/updateCustomer/deleteCustomer 각각 단위 테스트. Supabase는 `DbPort` 스텁으로 insert/update/delete 호출 검증.
- **DbPort delete:** Supabase 클라이언트 목으로 `.delete().eq()` 호출 검증.
- **CustomerManager (RTL):** 목록 렌더, 추가 폼 제출 → 목록 반영, 삭제 확인, FK 오류 시 안내 문구 표시.
- **CreateWorkOrder:** 거래처 0개일 때 안내/비활성, 1개 이상일 때 드롭다운 렌더.
- **AdminConsole:** "거래처" 버튼으로 CustomerManager 뷰 전환.
- **매퍼:** `rowToCustomer`가 신규 컬럼 매핑.
- 기존 테스트(작업 생성/검수/발행 흐름)는 인메모리 초기 시드 유지로 회귀 없음.

## 10. 영향 파일 요약

| 파일 | 변경 |
|---|---|
| `supabase/migrations/0008_customer_contact_fields.sql` | 신규(컬럼 추가) |
| `src/domain/types.ts` | `Customer`에 contactName·phone·email |
| `src/admin/supabaseMappers.ts` | `rowToCustomer` 확장 |
| `src/admin/db.ts` | `DbPort.delete` + Supabase 구현 |
| `src/admin/repo.ts` | `AdminRepo` CRUD 3종 + `NewCustomer` + 인메모리 구현 |
| `src/admin/supabaseRepo.ts` | CRUD 3종 Supabase 구현 |
| `src/admin/CustomerManager.tsx` | 신규 UI |
| `src/admin/AdminConsole.tsx` | 헤더 "거래처" 버튼 + 뷰 전환 + 사용 방법 스트립 |
| `src/admin/CreateWorkOrder.tsx` | 거래처 0개 안내/비활성 |
| `test/admin/*` | 위 항목 테스트 |
