# Plan D — 작업자 캡처 PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 작업자가 무설치 링크 `/c/{token}`을 열면 → 그 작업의 **템플릿 가이드 촬영**(필수 사진 슬롯·촬영지시·누락 경고)을 보고 → 슬롯별로 찍고 → 완료를 제출한다. 프로토타입 H1(다크) 히어로 화면. 캡처는 Plan A 코어를 슬롯별로 재사용하고, 토큰→작업은 repo가 해결한다.

**Architecture:** `/c/:token` 라우트 → `WorkerCapture`. 토큰은 `AdminRepo.getByWorkerToken`으로 해결(인메모리; Supabase 연결 시 `ShareLink` 영속). 슬롯 캡처는 주입식 `captureToSlot`(Plan A `makeVariants`/`sha256Hex`/`enqueue` 재사용, `CaptureItem`에 `containerId`/`workOrderId` 선택 필드 추가). 체크리스트 상태는 `checklistStatus`(순수)가 큐의 촬영 슬롯키로 계산. 업로드는 Plan A와 동일(placeholder-Supabase → 큐 잔류; 실 업로드는 연결 때). 제출은 데모(로컬 "제출됨").

**Tech Stack:** React 18 · react-router 6 · TypeScript · Vitest + @testing-library/react · Plan A `src/lib`(capture core) · Plan B `src/domain`(types) · Plan C `src/admin`(repo).

## Global Constraints

- **템플릿이 먼저다.** 슬롯·촬영지시·누락은 작업의 템플릿(TSR/TCR)에서 온다(`WorkTypeTemplate.requiredPhotos`). 작업자는 태그를 안 고르고, 슬롯을 골라 찍는다(가이드 촬영).
- `/c/{token}` = Plan C가 발급한 작업자 링크와 동일 형식. 토큰은 `getByWorkerToken(token)`으로 `{order, template, containers}` 해결. 없으면 "잘못된 링크".
- 캡처 = Plan A 코어 재사용: display 변형본을 해시·큐잉(egress·증빙). `CaptureItem`에 `containerId`/`workOrderId` **선택 필드 추가**(Plan A 코드 무영향).
- **디자인 = 프로토타입 H1 다크**: 배경 `#0F1B26`, 오렌지 `#FF6A00` 강조, 컨테이너 번호 = JetBrains Mono 라이선스플레이트, 완료=성공색 `#15A34A`.
- **범위 밖(Supabase 연결):** 실 업로드 경로(컨테이너 구조)·토큰접근 강제·제출→사무실 알림. **범위 밖(후속):** 복수 컨테이너 탭(데모는 단일 컨테이너), AI 태깅.
- 브라우저 전용(카메라·canvas)은 실기기 검증. 순수/주입 로직만 유닛 테스트. Node ≥20, npm.

## File Structure

```
cargonote/
  src/
    lib/types.ts                 # (수정) CaptureItem에 containerId?/workOrderId? 추가
    domain/checklist.ts          # checklistStatus (순수)
    admin/repo.ts                # (수정) getByWorkerToken + 토큰 영속 + 데모 시드
    worker/
      capture.ts                 # captureToSlot / capturedSlotKeys (주입식)
      WorkerCapture.tsx          # /c/:token 화면(다크, 체크리스트, 슬롯 촬영, 제출)
    routes.tsx                   # (수정) /c/:token -> WorkerCapture
  test/
    domain/checklist.test.ts
    admin/repo-token.test.ts
    worker/capture.test.ts
    worker/worker-capture.test.tsx
```

---

### Task 1: 체크리스트 도메인 헬퍼

**Files:**
- Create: `src/domain/checklist.ts`, `test/domain/checklist.test.ts`

**Interfaces:**
- `export interface ChecklistStatus { satisfied: string[]; missing: RequiredPhotoSlot[]; complete: boolean; }`
- `export function checklistStatus(capturedSlotKeys: string[], template: WorkTypeTemplate): ChecklistStatus` — 필수 슬롯 기준으로 촬영/누락 계산.

- [ ] **Step 1: 실패 테스트 작성**

`test/domain/checklist.test.ts`:
```ts
import { checklistStatus } from '../../src/domain/checklist';
import type { WorkTypeTemplate } from '../../src/domain/types';

const tpl: WorkTypeTemplate = {
  id: 't', name: 'TCR', carrier: '중국세관', route: 'TCR', anchorType: 'container_no',
  minCount: 3, warningText: '반송', rules: {},
  requiredPhotos: [
    { key: 'empty', label: '빈 컨테이너', instruction: '번호 보이게', required: true },
    { key: 'seal', label: '씰', instruction: '판독', required: true },
    { key: 'csc', label: 'CSC', instruction: '예외', required: true },
    { key: 'extra', label: '기타', instruction: '', required: false },
  ],
};

test('reports missing required slots and incompleteness', () => {
  const s = checklistStatus(['empty'], tpl);
  expect(s.satisfied).toEqual(['empty']);
  expect(s.missing.map((m) => m.key)).toEqual(['seal', 'csc']);
  expect(s.complete).toBe(false);
});

test('complete when all required slots captured (optional ignored)', () => {
  const s = checklistStatus(['empty', 'seal', 'csc'], tpl);
  expect(s.complete).toBe(true);
  expect(s.missing).toEqual([]);
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/domain/checklist.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`src/domain/checklist.ts`:
```ts
import type { RequiredPhotoSlot, WorkTypeTemplate } from './types';

export interface ChecklistStatus {
  satisfied: string[];
  missing: RequiredPhotoSlot[];
  complete: boolean;
}

export function checklistStatus(capturedSlotKeys: string[], template: WorkTypeTemplate): ChecklistStatus {
  const captured = new Set(capturedSlotKeys);
  const required = template.requiredPhotos.filter((s) => s.required);
  const missing = required.filter((s) => !captured.has(s.key));
  const satisfied = required.filter((s) => captured.has(s.key)).map((s) => s.key);
  return { satisfied, missing, complete: missing.length === 0 };
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/domain/checklist.test.ts`
Expected: PASS (2 passed). `npm run build` 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/domain/checklist.ts test/domain/checklist.test.ts
git commit -m "feat: checklistStatus (required-slot satisfied/missing/complete)"
```

---

### Task 2: repo 토큰 해결 + 데모 시드

**Files:**
- Modify: `src/admin/repo.ts`
- Create: `test/admin/repo-token.test.ts`

**Interfaces:**
- `AdminRepo`에 추가: `getByWorkerToken(token: string): Promise<{ order: WorkOrder; template: WorkTypeTemplate; containers: Container[] } | null>`.
- InMemory: `createWorkOrder`가 토큰을 `tokens` 맵에 저장; 데모 작업(wo-2, TCR)에 고정 토큰 `demotoken123` + 컨테이너 `FBLU4204812` 시드.

- [ ] **Step 1: 실패 테스트 작성**

`test/admin/repo-token.test.ts`:
```ts
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('resolves the seeded demo worker token to order + template + containers', async () => {
  const repo = createInMemoryAdminRepo();
  const r = await repo.getByWorkerToken('demotoken123');
  expect(r).not.toBeNull();
  expect(r!.template.route).toBe('TCR');
  expect(r!.containers.map((c) => c.containerNo)).toContain('FBLU4204812');
});

test('returns null for an unknown token', async () => {
  const repo = createInMemoryAdminRepo();
  expect(await repo.getByWorkerToken('nope')).toBeNull();
});

test('a token returned by createWorkOrder resolves back to that order', async () => {
  const repo = createInMemoryAdminRepo();
  const [cust] = await repo.listCustomers();
  const [tpl] = await repo.listTemplates();
  const { order, workerToken } = await repo.createWorkOrder({
    customerId: cust.id, templateId: tpl.id, containerNos: ['ABCD1234567'],
    workDate: null, assigneeName: 'A', assigneeContact: 'B',
  });
  const r = await repo.getByWorkerToken(workerToken);
  expect(r!.order.id).toBe(order.id);
  expect(r!.containers.map((c) => c.containerNo)).toEqual(['ABCD1234567']);
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/admin/repo-token.test.ts`
Expected: FAIL — `getByWorkerToken` 없음.

- [ ] **Step 3: 구현 (repo.ts 수정)**

`src/admin/repo.ts` 변경점:
1. import에 `Container` 추가: `import type { Container, Customer, WorkOrder, WorkTypeTemplate } from '../domain/types';`
2. `AdminRepo` 인터페이스에 메서드 추가:
```ts
  getByWorkerToken(token: string): Promise<{ order: WorkOrder; template: WorkTypeTemplate; containers: Container[] } | null>;
```
3. `createInMemoryAdminRepo` 내부: `orders` 아래에 컨테이너 시드 + 토큰 맵 추가하고 `getByWorkerToken` 구현. 아래를 반영:
```ts
  const containers: Container[] = [
    { id: 'ctn-1', workOrderId: 'wo-2', containerNo: 'FBLU4204812', sealNo: null, workerMemo: null },
  ];
  const tokens = new Map<string, string>([['demotoken123', 'wo-2']]);
  let seq = orders.length;
  return {
    async listCustomers() { return [...customers]; },
    async listTemplates() { return [...templates]; },
    async listWorkOrders() { return [...orders]; },
    async getByWorkerToken(token) {
      const orderId = tokens.get(token);
      const order = orders.find((o) => o.id === orderId);
      if (!order) return null;
      const template = templates.find((t) => t.id === order.templateId)!;
      return { order, template, containers: containers.filter((c) => c.workOrderId === order.id) };
    },
    async createWorkOrder(input) {
      const order: WorkOrder = {
        id: `wo-${++seq}`, customerId: input.customerId, templateId: input.templateId,
        workDate: input.workDate, status: 'sent', assigneeName: input.assigneeName,
        assigneeContact: input.assigneeContact, shipperLabel: null,
      };
      orders.push(order);
      input.containerNos.forEach((no, i) =>
        containers.push({ id: `ctn-${order.id}-${i}`, workOrderId: order.id, containerNo: no, sealNo: null, workerMemo: null }));
      const workerToken = randomToken();
      tokens.set(workerToken, order.id);
      return { order, workerToken };
    },
  };
```
(기존 `listCustomers/listTemplates/listWorkOrders/createWorkOrder` 본문은 위로 통합; 로직 동일 + 컨테이너/토큰 반영.)

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/admin/repo-token.test.ts test/admin/repo.test.ts`
Expected: PASS (기존 repo 테스트 3 + 신규 3 = 6). 전체 `npm test` green. build 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/admin/repo.ts test/admin/repo-token.test.ts
git commit -m "feat: getByWorkerToken + token/container persistence (demo seed)"
```

---

### Task 3: 슬롯 캡처 로직 (주입식)

**Files:**
- Modify: `src/lib/types.ts` (CaptureItem에 선택 필드)
- Create: `src/worker/capture.ts`, `test/worker/capture.test.ts`

**Interfaces:**
- `CaptureItem`에 추가(선택): `containerId?: string | null; workOrderId?: string | null;`
- `capture.ts`:
```ts
export interface CaptureToSlotDeps {
  makeVariants(b: Blob): Promise<{ display: Blob }>;
  sha256Hex(b: Blob): Promise<string>;
  enqueue(item: CaptureItem): Promise<'added' | 'duplicate'>;
}
export async function captureToSlot(photo: Blob, ctx: { slotKey: string; containerId: string; workOrderId: string }, deps: CaptureToSlotDeps): Promise<'added' | 'duplicate'>;
export function capturedSlotKeys(items: CaptureItem[], containerId: string): string[]; // 순수
```

- [ ] **Step 1: 실패 테스트 작성**

`test/worker/capture.test.ts`:
```ts
import { captureToSlot, capturedSlotKeys } from '../../src/worker/capture';
import type { CaptureItem } from '../../src/lib/types';

test('captureToSlot enqueues a display-variant item tagged with slot + container', async () => {
  let enq: CaptureItem | null = null;
  const res = await captureToSlot(new Blob(['x']), { slotKey: 'seal', containerId: 'ctn-1', workOrderId: 'wo-2' }, {
    makeVariants: async () => ({ display: new Blob(['d']) }),
    sha256Hex: async () => 'hash1',
    enqueue: async (item) => { enq = item; return 'added'; },
  });
  expect(res).toBe('added');
  expect(enq!.slotKey).toBe('seal');
  expect(enq!.containerId).toBe('ctn-1');
  expect(enq!.workOrderId).toBe('wo-2');
  expect(enq!.hash).toBe('hash1');
});

test('capturedSlotKeys returns slot keys for a container only', () => {
  const items = [
    { id: '1', hash: '1', slotKey: 'empty', containerId: 'ctn-1', workOrderId: 'wo-2', blob: new Blob(), capturedAt: 1, gps: null, status: 'pending' },
    { id: '2', hash: '2', slotKey: 'seal', containerId: 'ctn-2', workOrderId: 'wo-2', blob: new Blob(), capturedAt: 1, gps: null, status: 'pending' },
  ] as CaptureItem[];
  expect(capturedSlotKeys(items, 'ctn-1')).toEqual(['empty']);
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/worker/capture.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`src/lib/types.ts` — `CaptureItem` 인터페이스에 두 줄 추가(다른 필드 유지):
```ts
  containerId?: string | null;
  workOrderId?: string | null;
```

`src/worker/capture.ts`:
```ts
import type { CaptureItem } from '../lib/types';

export interface CaptureToSlotDeps {
  makeVariants(b: Blob): Promise<{ display: Blob }>;
  sha256Hex(b: Blob): Promise<string>;
  enqueue(item: CaptureItem): Promise<'added' | 'duplicate'>;
}

export async function captureToSlot(
  photo: Blob,
  ctx: { slotKey: string; containerId: string; workOrderId: string },
  deps: CaptureToSlotDeps,
): Promise<'added' | 'duplicate'> {
  const { display } = await deps.makeVariants(photo);
  const hash = await deps.sha256Hex(display);
  return deps.enqueue({
    id: hash, hash, slotKey: ctx.slotKey, containerId: ctx.containerId, workOrderId: ctx.workOrderId,
    blob: display, capturedAt: Date.now(), gps: null, status: 'pending',
  });
}

export function capturedSlotKeys(items: CaptureItem[], containerId: string): string[] {
  return items
    .filter((i) => i.containerId === containerId && typeof i.slotKey === 'string')
    .map((i) => i.slotKey as string);
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/worker/capture.test.ts`
Expected: PASS (2 passed). 전체 `npm test` green(기존 Plan A 캡처 테스트 포함 무영향). build 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/types.ts src/worker/capture.ts test/worker/capture.test.ts
git commit -m "feat: captureToSlot + capturedSlotKeys (slot/container-tagged capture)"
```

---

### Task 4: WorkerCapture 화면 + 라우트

**Files:**
- Create: `src/worker/WorkerCapture.tsx`, `test/worker/worker-capture.test.tsx`
- Modify: `src/routes.tsx` (`/c/:token` → `WorkerCapture`)

**Interfaces:**
- `WorkerCapture` props: `{ repo?: AdminRepo }`(기본 = 모듈 상수 인메모리). `useParams().token` 해결 → 다크 UI: 컨테이너 플레이트(JetBrains Mono) · 경고문 · 체크리스트(슬롯 라벨·지시·촬영/누락 표시, 미촬영 슬롯에 촬영 버튼) · 진행률 · 제출.

- [ ] **Step 1: 실패 테스트 작성**

`test/worker/worker-capture.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorkerCapture } from '../../src/worker/WorkerCapture';

test('resolves the demo token and shows the container + template checklist', async () => {
  render(
    <MemoryRouter initialEntries={['/c/demotoken123']}>
      <Routes><Route path="/c/:token" element={<WorkerCapture />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/FBLU4204812/)).toBeInTheDocument();     // container plate
  expect(await screen.findByText(/빈 컨테이너/)).toBeInTheDocument();       // a required slot label
  expect(await screen.findByText(/반송/)).toBeInTheDocument();             // TCR warning
});

test('shows an error for an unknown token', async () => {
  render(
    <MemoryRouter initialEntries={['/c/bad']}>
      <Routes><Route path="/c/:token" element={<WorkerCapture />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/잘못된 링크/)).toBeInTheDocument();
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/worker/worker-capture.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`src/worker/WorkerCapture.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { AdminRepo } from '../admin/repo';
import { createInMemoryAdminRepo } from '../admin/repo';
import type { Container, WorkTypeTemplate } from '../domain/types';
import { checklistStatus } from '../domain/checklist';
import { makeVariants } from '../lib/image';
import { sha256Hex } from '../lib/hash';
import { enqueue, allItems } from '../lib/captureQueue';
import { captureToSlot, capturedSlotKeys } from './capture';

const defaultRepo = createInMemoryAdminRepo();

export function WorkerCapture({ repo = defaultRepo }: { repo?: AdminRepo }) {
  const { token } = useParams();
  const [state, setState] = useState<{ template: WorkTypeTemplate; container: Container; workOrderId: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [captured, setCaptured] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    repo.getByWorkerToken(token ?? '').then((r) => {
      if (!r || r.containers.length === 0) { setNotFound(true); return; }
      setState({ template: r.template, container: r.containers[0], workOrderId: r.order.id });
    });
  }, [repo, token]);

  async function refresh(containerId: string) {
    setCaptured(capturedSlotKeys(await allItems(), containerId));
  }
  useEffect(() => { if (state) refresh(state.container.id); }, [state]);

  if (notFound) return <main style={sx.page}><p style={{ color: '#E0A100' }}>잘못된 링크입니다.</p></main>;
  if (!state) return <main style={sx.page} />;

  const status = checklistStatus(captured, state.template);

  async function shoot(slotKey: string, photo: Blob) {
    await captureToSlot(photo, { slotKey, containerId: state!.container.id, workOrderId: state!.workOrderId }, { makeVariants, sha256Hex, enqueue });
    await refresh(state!.container.id);
  }

  return (
    <main style={sx.page}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#9FB2C2' }}>거래처 링크 · {state.template.route}</div>
      <div style={sx.plate}>{state.container.containerNo}</div>
      {state.template.warningText && <div style={sx.warn}>{state.template.warningText}</div>}
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

`src/routes.tsx` — `/c/:token` 라우트 교체:
```tsx
import { WorkerCapture } from './worker/WorkerCapture';
// ...
<Route path="/c/:token" element={<WorkerCapture />} />
```
(기존 `import { Placeholder }`는 `/v/:token`·`*`에서 계속 사용하므로 유지.)

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/worker/worker-capture.test.tsx`
Expected: PASS (2 passed). 전체 `npm test` green, PRISTINE(비동기 findBy). `npm run build` 성공.

- [ ] **Step 5: 커밋**

```bash
git add src/worker/WorkerCapture.tsx test/worker/worker-capture.test.tsx src/routes.tsx
git commit -m "feat: worker capture screen at /c/:token (template guided capture, dark)"
```

---

## Self-Review

**1. Spec coverage:** 템플릿 가이드 촬영(슬롯·지시·누락) → Task 1(체크리스트)+4(화면). 토큰→작업 해결 → Task 2. 슬롯별 캡처(코어 재사용) → Task 3. 라우트 연결 → Task 4. **범위 밖:** 복수 컨테이너 탭(데모 단일), 실 업로드 경로·제출 알림·토큰접근(Supabase 연결), AI.

**2. Placeholder scan:** 실제 코드/명령/기대결과. `makeVariants`(브라우저)는 Task 3에서 주입으로 테스트, 실동작은 실기기.

**3. Type consistency:** `CaptureItem` 확장 필드(선택)는 Plan A 코드 무영향. `getByWorkerToken` 반환형이 Task 4에서 소비. `checklistStatus`가 `WorkTypeTemplate.requiredPhotos` 소비. `/c/:token` 라우트 param이 `useParams().token`과 일치. 캡처는 Plan A `makeVariants/sha256Hex/enqueue/allItems` 재사용(시그니처 일치).

**4. Ambiguity:** 데모는 단일 컨테이너(`containers[0]`); 복수는 후속 탭. 제출은 로컬 데모(`submitted` 상태); 실 제출은 Supabase. 업로드는 Plan A 큐/sync가 배경 처리(placeholder 실패 → 잔류).

## 알려진 한계 (의도적)
- 인메모리 repo·로컬 큐라 새로고침 시 초기화(데모). 실 영속·업로드·제출 알림은 Supabase 연결.
- 복수 컨테이너·AI 태깅·정밀 프로토타입 재현은 후속.
