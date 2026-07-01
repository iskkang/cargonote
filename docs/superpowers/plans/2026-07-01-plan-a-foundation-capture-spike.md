# Plan A — 기반 + iOS 캡처 검증 스파이크 (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 무설치 웹 PWA로 카메라 연속 촬영 → 클라이언트 압축/썸네일 → IndexedDB 오프라인 큐 → Supabase Storage 자동 업로드(중복 방지)를 구현하고, **실기기(특히 iOS Safari)에서 신뢰도를 검증**한다.

**Architecture:** 단일 Vite + React + TS 앱. 브라우저 전용 부수효과(카메라·canvas 인코딩)는 얇은 UI 층에 두고, **순수·테스트 가능한 코어**(hash · 크기계산 · 큐 · 업로더 · 동기화 오케스트레이터)는 `src/lib/`에 의존성 주입 형태로 분리한다. 코어는 Plan D(작업자 캡처)에서 그대로 재사용한다. 온-디바이스 검증은 수동 체크리스트로 수행한다(스파이크의 목적).

**Tech Stack:** Vite 5 · React 18 · TypeScript 5 · vite-plugin-pwa · @supabase/supabase-js 2 · idb 8 · Vitest 2 · @testing-library/react · jsdom · fake-indexeddb.

## Global Constraints

- 메인 클라이언트는 **무설치 웹 PWA**. 앱 설치를 전제하지 않는다.
- 백엔드/스토리지는 **Supabase**. 클라이언트에는 anon key만(service role 금지).
- 증빙 필드: 사진마다 **SHA-256 해시 · captured_at(epoch ms) · GPS(가능 시)**.
- **egress 최소화**: 링크엔 원본 대신 display/thumbnail. 원본은 audit 보존.
- **오프라인**: IndexedDB 큐 → 복구 시 자동 업로드 → **해시 기반 중복 방지**.
- **OCR/AI 없음** (Plan A 범위 아님).
- 디자인 토큰은 `design-reference/project/_ds/.../tokens/` 값 사용 — 오렌지 `#FF6A00`, 네이비 `#0F1B26`, Pretendard + JetBrains Mono. (스파이크 UI는 최소 적용.)
- Node ≥ 20 (LTS), 패키지 매니저 npm.
- 이 스파이크는 **DB 스키마를 만들지 않는다.** 업로드는 단일 버킷 `captures/`에 `spike/{hash}.webp` 경로로. (전체 스키마는 Plan B.)
- **판정 게이트:** Task 9 검증에서 iOS Safari 오프라인 유실률/촬영 실패가 임계 초과면 → RN 앱 앞당김 재판단(스펙 §11).

---

## File Structure

```
cargonote/
  package.json                 # deps + scripts
  vite.config.ts               # Vite + PWA + vitest 설정
  tsconfig.json / tsconfig.node.json
  index.html
  .gitignore                   # node_modules, .env.local, dist
  .env.example / .env.local    # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
  src/
    main.tsx                   # React 진입
    App.tsx                    # 스파이크 UI 셸(캡처 + 큐 상태)
    styles.css                 # 디자인 토큰 최소 적용
    lib/
      supabase.ts              # Supabase 클라이언트
      hash.ts                  # sha256Hex(순수·테스트)
      image.ts                 # computeTargetSize(순수·테스트) + makeVariants(브라우저)
      captureQueue.ts          # IndexedDB 큐(테스트)
      uploader.ts              # Storage 업로드(테스트, 클라 주입)
      sync.ts                  # 큐 드레인 오케스트레이터(테스트)
      types.ts                 # 공용 타입
    components/
      CameraCapture.tsx        # input capture / getUserMedia 두 모드
      QueueStatus.tsx          # pending/uploaded 카운트
  test/
    setup.ts                   # jsdom + fake-indexeddb + jest-dom
    hash.test.ts
    image.test.ts
    captureQueue.test.ts
    uploader.test.ts
    sync.test.ts
    App.test.tsx
  spike/VALIDATION.md          # 온-디바이스 검증 체크리스트 + 결과 기록
```

---

### Task 1: 프로젝트 스캐폴드 + 테스트 하네스

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `test/setup.ts`, `test/App.test.tsx`

**Interfaces:**
- Produces: 실행 가능한 Vite 앱 + `npm test`(Vitest) 하네스. `App` 컴포넌트가 `<h1>CargoLink 캡처 스파이크</h1>` 렌더.

- [ ] **Step 1: `package.json` 작성**

```json
{
  "name": "cargolink",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "idb": "^8.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "fake-indexeddb": "^6.0.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.3",
    "vite-plugin-pwa": "^0.20.5",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: 설정 파일 작성**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext", "moduleResolution": "Bundler",
    "jsx": "react-jsx", "strict": true, "skipLibCheck": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"],
    "noUnusedLocals": true, "noEmit": true
  },
  "include": ["src", "test"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": { "composite": true, "module": "ESNext", "moduleResolution": "Bundler", "skipLibCheck": true },
  "include": ["vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'CargoLink 캡처', short_name: 'CargoLink',
        theme_color: '#0F1B26', background_color: '#0F1B26', display: 'standalone',
        icons: [],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    env: { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'test-anon-key' },
  },
});
```
*참고: 위 `test.env`의 더미 값이 있어야 `src/lib/supabase.ts`가 테스트 로드 시 `createClient`에서 던지지 않는다(Task 8 App 테스트 전제).*
```ts
// (vite.config.ts 끝)
```

`index.html`:
```html
<!doctype html>
<html lang="ko">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /><title>CargoLink 캡처</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

`.gitignore`:
```
node_modules
dist
.env.local
dev-dist
```

- [ ] **Step 3: 소스 + 테스트 셋업 작성**

`src/main.tsx`:
```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
```

`src/styles.css`:
```css
:root { --navy:#0F1B26; --orange:#FF6A00; --gray:#5A6B7D; }
body { margin:0; background:var(--navy); color:#E7ECF1; font-family: Pretendard, -apple-system, "Malgun Gothic", sans-serif; }
h1 { color:#fff; font-size:20px; }
```

`src/App.tsx`:
```tsx
export default function App() {
  return (
    <main style={{ padding: 16 }}>
      <h1>CargoLink 캡처 스파이크</h1>
    </main>
  );
}
```

`test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
```

- [ ] **Step 4: 스모크 테스트 작성 (실패 확인용)**

`test/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import App from '../src/App';

test('renders spike heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /캡처 스파이크/ })).toBeInTheDocument();
});
```

- [ ] **Step 5: 설치 + 테스트 실행 → 통과 확인**

Run: `npm install` then `npm test`
Expected: `App.test.tsx` PASS (1 passed).

- [ ] **Step 6: 커밋**

```bash
git init
git add -A
git commit -m "chore: scaffold vite+react+ts pwa with vitest harness"
```

---

### Task 2: Supabase 프로젝트 + 버킷 + 클라이언트

**Files:**
- Create: `src/lib/supabase.ts`, `.env.example`
- Manual: Supabase 프로젝트/버킷/정책

**Interfaces:**
- Produces: `export const supabase: SupabaseClient` (env 기반). 버킷 `captures` (익명 insert 허용 정책).

- [ ] **Step 1: Supabase 준비 (수동)**

1. supabase.com에서 프로젝트 생성.
2. Storage → 버킷 `captures` 생성 (Public off).
3. SQL Editor에서 스파이크용 익명 insert 정책 추가:
```sql
create policy "spike anon insert" on storage.objects
  for insert to anon
  with check ( bucket_id = 'captures' );
```
4. Project Settings → API에서 `Project URL`과 `anon public` 키 복사.

- [ ] **Step 2: env 파일 작성**

`.env.example`:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```
그리고 `.env.local`에 실제 값 입력(이미 `.gitignore`에 포함).

- [ ] **Step 3: 클라이언트 작성**

`src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
```

- [ ] **Step 4: 커밋**

```bash
git add .env.example src/lib/supabase.ts
git commit -m "feat: add supabase client and env template"
```

*참고: 이 파일은 라이브 연결이라 단위 테스트하지 않는다. 업로더(Task 6)는 주입된 목 클라이언트로 테스트한다.*

---

### Task 3: SHA-256 해시 유틸

**Files:**
- Create: `src/lib/hash.ts`, `test/hash.test.ts`

**Interfaces:**
- Produces: `export async function sha256Hex(data: ArrayBuffer | Blob): Promise<string>` — 64자 소문자 hex.

- [ ] **Step 1: 실패 테스트 작성**

`test/hash.test.ts`:
```ts
import { sha256Hex } from '../src/lib/hash';

test('hashes known ascii input', async () => {
  const bytes = new TextEncoder().encode('abc');
  const hex = await sha256Hex(bytes.buffer);
  expect(hex).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('hash of a Blob matches its bytes', async () => {
  const blob = new Blob([new Uint8Array([1, 2, 3])]);
  const a = await sha256Hex(blob);
  const b = await sha256Hex(new Uint8Array([1, 2, 3]).buffer);
  expect(a).toBe(b);
  expect(a).toHaveLength(64);
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/hash.test.ts`
Expected: FAIL — "Cannot find module '../src/lib/hash'".

- [ ] **Step 3: 구현**

`src/lib/hash.ts`:
```ts
export async function sha256Hex(data: ArrayBuffer | Blob): Promise<string> {
  const buf = data instanceof Blob ? await data.arrayBuffer() : data;
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/hash.test.ts`
Expected: PASS (2 passed).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/hash.ts test/hash.test.ts
git commit -m "feat: sha256Hex util for capture dedupe/evidence"
```

---

### Task 4: 이미지 크기 계산(순수) + variants(브라우저)

**Files:**
- Create: `src/lib/image.ts`, `test/image.test.ts`

**Interfaces:**
- Produces:
  - `export function computeTargetSize(srcW: number, srcH: number, maxDim: number): { width: number; height: number }` — 비율 유지, 업스케일 금지.
  - `export async function makeVariants(source: Blob): Promise<{ display: Blob; thumb: Blob }>` — 브라우저 canvas 인코딩(WebP). display 최대변 1600, thumb 최대변 320.

- [ ] **Step 1: 실패 테스트 작성 (순수 함수만)**

`test/image.test.ts`:
```ts
import { computeTargetSize } from '../src/lib/image';

test('scales down landscape to maxDim on the long edge', () => {
  expect(computeTargetSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
});

test('scales down portrait to maxDim on the long edge', () => {
  expect(computeTargetSize(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
});

test('never upscales when smaller than maxDim', () => {
  expect(computeTargetSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/image.test.ts`
Expected: FAIL — module/export not found.

- [ ] **Step 3: 구현**

`src/lib/image.ts`:
```ts
export function computeTargetSize(srcW: number, srcH: number, maxDim: number) {
  const longest = Math.max(srcW, srcH);
  const scale = longest > maxDim ? maxDim / longest : 1;
  return { width: Math.round(srcW * scale), height: Math.round(srcH * scale) };
}

async function encode(source: Blob, maxDim: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const { width, height } = computeTargetSize(bitmap.width, bitmap.height, maxDim);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/webp', quality),
  );
}

export async function makeVariants(source: Blob) {
  const display = await encode(source, 1600, 0.82);
  const thumb = await encode(source, 320, 0.7);
  return { display, thumb };
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/image.test.ts`
Expected: PASS (3 passed). `makeVariants`는 canvas/`createImageBitmap`이 필요해 jsdom에서 테스트하지 않고 Task 9 온-디바이스에서 검증한다(코드 주석으로 명시).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/image.ts test/image.test.ts
git commit -m "feat: image target-size math + webp variants (display/thumb)"
```

---

### Task 5: IndexedDB 캡처 큐

**Files:**
- Create: `src/lib/types.ts`, `src/lib/captureQueue.ts`, `test/captureQueue.test.ts`

**Interfaces:**
- Produces (`types.ts`):
```ts
export interface CaptureItem {
  id: string;            // hash 사용(= 멱등 키)
  hash: string;
  slotKey: string | null;
  blob: Blob;            // display 변형본 저장(원본은 Plan B에서)
  capturedAt: number;    // epoch ms
  gps: { lat: number; lng: number } | null;
  status: 'pending' | 'uploaded';
}
```
- Produces (`captureQueue.ts`):
  - `enqueue(item: CaptureItem): Promise<'added' | 'duplicate'>` — 같은 hash 존재 시 `duplicate`.
  - `pendingItems(): Promise<CaptureItem[]>`
  - `allItems(): Promise<CaptureItem[]>`
  - `markUploaded(id: string): Promise<void>`
  - `hasHash(hash: string): Promise<boolean>`

- [ ] **Step 1: 실패 테스트 작성**

`test/captureQueue.test.ts`:
```ts
import { beforeEach } from 'vitest';
import { deleteDB } from 'idb';
import { enqueue, pendingItems, markUploaded, hasHash, allItems } from '../src/lib/captureQueue';
import type { CaptureItem } from '../src/lib/types';

function item(hash: string): CaptureItem {
  return { id: hash, hash, slotKey: 'seal', blob: new Blob(['x']), capturedAt: 1, gps: null, status: 'pending' };
}

beforeEach(async () => { await deleteDB('cargolink-capture'); });

test('enqueue adds a pending item', async () => {
  expect(await enqueue(item('aaa'))).toBe('added');
  const pending = await pendingItems();
  expect(pending.map((i) => i.hash)).toEqual(['aaa']);
});

test('enqueue is idempotent by hash', async () => {
  await enqueue(item('aaa'));
  expect(await enqueue(item('aaa'))).toBe('duplicate');
  expect(await hasHash('aaa')).toBe(true);
  expect(await allItems()).toHaveLength(1);
});

test('markUploaded removes item from pending', async () => {
  await enqueue(item('bbb'));
  await markUploaded('bbb');
  expect(await pendingItems()).toHaveLength(0);
  expect((await allItems())[0].status).toBe('uploaded');
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/captureQueue.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

`src/lib/types.ts`: (위 Interfaces의 `CaptureItem` 그대로 작성.)

`src/lib/captureQueue.ts`:
```ts
import { openDB, type IDBPDatabase } from 'idb';
import type { CaptureItem } from './types';

const DB_NAME = 'cargolink-capture';
const STORE = 'captures';

function db(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) {
        const s = d.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('status', 'status');
      }
    },
  });
}

export async function enqueue(item: CaptureItem): Promise<'added' | 'duplicate'> {
  const d = await db();
  if (await d.get(STORE, item.id)) return 'duplicate';
  await d.put(STORE, item);
  return 'added';
}

export async function allItems(): Promise<CaptureItem[]> {
  return (await db()).getAll(STORE);
}

export async function pendingItems(): Promise<CaptureItem[]> {
  return (await db()).getAllFromIndex(STORE, 'status', 'pending');
}

export async function hasHash(hash: string): Promise<boolean> {
  return Boolean(await (await db()).get(STORE, hash));
}

export async function markUploaded(id: string): Promise<void> {
  const d = await db();
  const item = await d.get(STORE, id);
  if (item) await d.put(STORE, { ...item, status: 'uploaded' });
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/captureQueue.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/types.ts src/lib/captureQueue.ts test/captureQueue.test.ts
git commit -m "feat: indexeddb capture queue with hash dedupe"
```

---

### Task 6: 업로더 (Storage, 클라이언트 주입)

**Files:**
- Create: `src/lib/uploader.ts`, `test/uploader.test.ts`

**Interfaces:**
- Consumes: `CaptureItem` (Task 5).
- Produces:
```ts
export interface StorageLike {
  upload(path: string, body: Blob, opts: { contentType: string; upsert: boolean }): Promise<{ error: { message: string } | null }>;
}
export async function uploadCapture(item: CaptureItem, storage: StorageLike): Promise<string>; // 반환: 저장 경로
```
경로 규칙: `spike/{hash}.webp`, `upsert: true`(멱등).

- [ ] **Step 1: 실패 테스트 작성**

`test/uploader.test.ts`:
```ts
import { uploadCapture, type StorageLike } from '../src/lib/uploader';
import type { CaptureItem } from '../src/lib/types';

const item: CaptureItem = { id: 'h1', hash: 'h1', slotKey: null, blob: new Blob(['x']), capturedAt: 1, gps: null, status: 'pending' };

test('uploads to spike/{hash}.webp with upsert and returns path', async () => {
  const calls: any[] = [];
  const storage: StorageLike = { async upload(path, body, opts) { calls.push({ path, opts }); return { error: null }; } };
  const path = await uploadCapture(item, storage);
  expect(path).toBe('spike/h1.webp');
  expect(calls[0]).toEqual({ path: 'spike/h1.webp', opts: { contentType: 'image/webp', upsert: true } });
});

test('throws on storage error', async () => {
  const storage: StorageLike = { async upload() { return { error: { message: 'nope' } }; } };
  await expect(uploadCapture(item, storage)).rejects.toThrow('nope');
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/uploader.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

`src/lib/uploader.ts`:
```ts
import type { CaptureItem } from './types';

export interface StorageLike {
  upload(path: string, body: Blob, opts: { contentType: string; upsert: boolean }): Promise<{ error: { message: string } | null }>;
}

export async function uploadCapture(item: CaptureItem, storage: StorageLike): Promise<string> {
  const path = `spike/${item.hash}.webp`;
  const { error } = await storage.upload(path, item.blob, { contentType: 'image/webp', upsert: true });
  if (error) throw new Error(error.message);
  return path;
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/uploader.test.ts`
Expected: PASS (2 passed). 실제 연결은 `supabase.storage.from('captures')`가 `StorageLike`를 만족하며 Task 8에서 주입.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/uploader.ts test/uploader.test.ts
git commit -m "feat: idempotent storage uploader (injectable client)"
```

---

### Task 7: 동기화 오케스트레이터

**Files:**
- Create: `src/lib/sync.ts`, `test/sync.test.ts`

**Interfaces:**
- Consumes: `CaptureItem`, `StorageLike`.
- Produces:
```ts
export interface SyncDeps {
  pendingItems(): Promise<CaptureItem[]>;
  markUploaded(id: string): Promise<void>;
  uploadCapture(item: CaptureItem, storage: StorageLike): Promise<string>;
  storage: StorageLike;
}
export async function drainQueue(deps: SyncDeps): Promise<{ uploaded: number; failed: number }>;
```
각 pending 항목을 업로드 → 성공 시 markUploaded. 실패는 카운트만 하고 다음으로(다음 드레인에서 재시도).

- [ ] **Step 1: 실패 테스트 작성**

`test/sync.test.ts`:
```ts
import { drainQueue, type SyncDeps } from '../src/lib/sync';
import type { CaptureItem } from '../src/lib/types';

const mk = (h: string): CaptureItem => ({ id: h, hash: h, slotKey: null, blob: new Blob([h]), capturedAt: 1, gps: null, status: 'pending' });

test('uploads all pending and marks them uploaded', async () => {
  const marked: string[] = [];
  const deps: SyncDeps = {
    pendingItems: async () => [mk('a'), mk('b')],
    markUploaded: async (id) => { marked.push(id); },
    uploadCapture: async (i) => `spike/${i.hash}.webp`,
    storage: {} as any,
  };
  const res = await drainQueue(deps);
  expect(res).toEqual({ uploaded: 2, failed: 0 });
  expect(marked.sort()).toEqual(['a', 'b']);
});

test('a failing upload is counted and not marked; others still succeed', async () => {
  const marked: string[] = [];
  const deps: SyncDeps = {
    pendingItems: async () => [mk('a'), mk('bad'), mk('c')],
    markUploaded: async (id) => { marked.push(id); },
    uploadCapture: async (i) => { if (i.hash === 'bad') throw new Error('x'); return 'ok'; },
    storage: {} as any,
  };
  const res = await drainQueue(deps);
  expect(res).toEqual({ uploaded: 2, failed: 1 });
  expect(marked.sort()).toEqual(['a', 'c']);
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/sync.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

`src/lib/sync.ts`:
```ts
import type { CaptureItem } from './types';
import type { StorageLike } from './uploader';

export interface SyncDeps {
  pendingItems(): Promise<CaptureItem[]>;
  markUploaded(id: string): Promise<void>;
  uploadCapture(item: CaptureItem, storage: StorageLike): Promise<string>;
  storage: StorageLike;
}

export async function drainQueue(deps: SyncDeps): Promise<{ uploaded: number; failed: number }> {
  let uploaded = 0, failed = 0;
  for (const item of await deps.pendingItems()) {
    try {
      await deps.uploadCapture(item, deps.storage);
      await deps.markUploaded(item.id);
      uploaded++;
    } catch {
      failed++;
    }
  }
  return { uploaded, failed };
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run test/sync.test.ts`
Expected: PASS (2 passed).

- [ ] **Step 5: 커밋**

```bash
git add src/lib/sync.ts test/sync.test.ts
git commit -m "feat: drainQueue sync orchestrator with per-item failure isolation"
```

---

### Task 8: 캡처 UI + 배선 (두 캡처 모드)

**Files:**
- Create: `src/components/CameraCapture.tsx`, `src/components/QueueStatus.tsx`
- Modify: `src/App.tsx` (전체 교체)
- Test: `test/App.test.tsx` (전체 교체)

**Interfaces:**
- Consumes: hash · makeVariants · enqueue/pendingItems/allItems · uploadCapture · drainQueue · supabase.
- `CameraCapture` props: `{ mode: 'input' | 'stream'; onCapture: (photo: Blob) => void }`.

- [ ] **Step 1: 실패 테스트 갱신**

`test/App.test.tsx` (교체):
```tsx
import { render, screen } from '@testing-library/react';
import App from '../src/App';

test('shows capture controls and a queue status region', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /캡처 스파이크/ })).toBeInTheDocument();
  expect(screen.getByLabelText(/사진 촬영/)).toBeInTheDocument();     // input capture control
  expect(screen.getByTestId('queue-status')).toBeInTheDocument();
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run test/App.test.tsx`
Expected: FAIL — controls not found.

- [ ] **Step 3: 컴포넌트 구현**

`src/components/QueueStatus.tsx`:
```tsx
export function QueueStatus({ pending, uploaded, online }: { pending: number; uploaded: number; online: boolean }) {
  return (
    <div data-testid="queue-status" style={{ marginTop: 16, fontSize: 14, color: '#9FB2C2' }}>
      <span style={{ color: online ? '#15A34A' : '#E0A100' }}>{online ? '온라인' : '오프라인'}</span>
      {' · '}대기 {pending} · 업로드 {uploaded}
    </div>
  );
}
```

`src/components/CameraCapture.tsx`:
```tsx
import { useRef, useState } from 'react';

export function CameraCapture({ mode, onCapture }: { mode: 'input' | 'stream'; onCapture: (b: Blob) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);

  async function startStream() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); setStreaming(true); }
  }
  async function shootFromStream() {
    const v = videoRef.current!;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth; canvas.height = v.videoHeight;
    canvas.getContext('2d')!.drawImage(v, 0, 0);
    canvas.toBlob((b) => b && onCapture(b), 'image/jpeg', 0.95);
  }

  if (mode === 'input') {
    return (
      <label style={{ display: 'inline-block', background: '#FF6A00', color: '#fff', padding: '12px 18px', borderRadius: 10, fontWeight: 600 }}>
        사진 촬영
        <input ref={inputRef} type="file" accept="image/*" capture="environment" hidden multiple
          onChange={(e) => { Array.from(e.target.files ?? []).forEach(onCapture); e.target.value = ''; }} />
      </label>
    );
  }
  return (
    <div>
      <video ref={videoRef} playsInline style={{ width: '100%', maxWidth: 360, borderRadius: 12, background: '#000' }} />
      {!streaming
        ? <button aria-label="카메라 시작" onClick={startStream}>카메라 시작</button>
        : <button aria-label="사진 촬영" onClick={shootFromStream}>촬영</button>}
    </div>
  );
}
```

- [ ] **Step 4: App 배선 구현**

`src/App.tsx` (교체):
```tsx
import { useEffect, useState } from 'react';
import { CameraCapture } from './components/CameraCapture';
import { QueueStatus } from './components/QueueStatus';
import { sha256Hex } from './lib/hash';
import { makeVariants } from './lib/image';
import { enqueue, pendingItems, allItems, markUploaded } from './lib/captureQueue';
import { uploadCapture } from './lib/uploader';
import { drainQueue } from './lib/sync';
import { supabase } from './lib/supabase';
import type { CaptureItem } from './lib/types';

const storage = supabase.storage.from('captures');

async function getGps(): Promise<CaptureItem['gps']> {
  try {
    const pos = await new Promise<GeolocationPosition>((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 }));
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch { return null; }
}

export default function App() {
  const [mode, setMode] = useState<'input' | 'stream'>('input');
  const [pending, setPending] = useState(0);
  const [uploaded, setUploaded] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);

  async function refresh() {
    const all = await allItems();
    setPending(all.filter((i) => i.status === 'pending').length);
    setUploaded(all.filter((i) => i.status === 'uploaded').length);
  }
  async function sync() {
    await drainQueue({ pendingItems, markUploaded, uploadCapture, storage });
    await refresh();
  }
  async function onCapture(photo: Blob) {
    const { display } = await makeVariants(photo);
    const hash = await sha256Hex(display);
    await enqueue({ id: hash, hash, slotKey: null, blob: display, capturedAt: Date.now(), gps: await getGps(), status: 'pending' });
    await refresh();
    if (navigator.onLine) await sync();
  }

  useEffect(() => {
    refresh();
    const on = () => { setOnline(true); sync(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  return (
    <main style={{ padding: 16, maxWidth: 420, margin: '0 auto' }}>
      <h1>CargoLink 캡처 스파이크</h1>
      <div style={{ margin: '12px 0', display: 'flex', gap: 8 }}>
        <button aria-pressed={mode === 'input'} onClick={() => setMode('input')}>input capture</button>
        <button aria-pressed={mode === 'stream'} onClick={() => setMode('stream')}>getUserMedia</button>
      </div>
      <CameraCapture mode={mode} onCapture={onCapture} />
      <button onClick={sync} style={{ marginLeft: 8 }}>지금 업로드</button>
      <QueueStatus pending={pending} uploaded={uploaded} online={online} />
    </main>
  );
}
```

- [ ] **Step 5: 실행 → 통과 확인**

Run: `npx vitest run test/App.test.tsx`
Expected: PASS. (jsdom엔 카메라/geolocation이 없으므로 렌더만 검증. 실제 캡처는 Task 9.)

- [ ] **Step 6: 전체 테스트 + 빌드**

Run: `npm test` then `npm run build`
Expected: 모든 테스트 PASS, 빌드 성공.

- [ ] **Step 7: 커밋**

```bash
git add src/App.tsx src/components test/App.test.tsx
git commit -m "feat: wire capture->compress->hash->queue->sync UI (input + stream modes)"
```

---

### Task 9: 온-디바이스 검증 (스파이크의 목적)

**Files:**
- Create: `spike/VALIDATION.md`

**Interfaces:**
- Produces: iOS/Android 실기기 검증 결과 + **웹 PWA 캡처 채택 여부 판정**(스펙 §11 게이트).

- [ ] **Step 1: 검증 체크리스트 작성**

`spike/VALIDATION.md`:
```markdown
# 캡처 스파이크 검증 (Plan A 게이트)

실행: `npm run dev -- --host` → 폰 브라우저로 접속(같은 네트워크) 또는 배포 후 HTTPS 접속.
※ getUserMedia·PWA는 **HTTPS(또는 localhost)** 에서만 동작 → 실기기 테스트는 HTTPS 프리뷰 필요.

각 기기(iOS Safari 최소 2개 버전 · Android Chrome)에서 두 모드(input capture / getUserMedia)로:

- [ ] 연속 촬영 5장 — 모두 큐에 적재되는가
- [ ] 압축·표시본 화질 — 컨테이너 번호·씰 번호가 판독되는가
- [ ] GPS·촬영시각 기록되는가
- [ ] 기내(비행기)모드 ON에서 촬영 → 큐에 남는가
- [ ] 페이지 새로고침/탭 종료 후 재진입 — 큐가 살아있는가(IndexedDB 지속)
- [ ] 온라인 복구 시 자동 업로드되는가
- [ ] 같은 사진 재촬영/재시도 시 중복 업로드가 없는가(해시 멱등)
- [ ] 홈 화면 추가(PWA) 후 동일 동작하는가

## 판정 기준 (스펙 §11)
- 유실률(촬영했는데 큐 미적재 또는 복구 후 미업로드) 목표: **0%**.
- iOS getUserMedia가 불안정하면 → **input capture 모드를 기본**으로 채택(폴백).
- 두 모드 모두 iOS에서 유실·실패가 반복되면 → **RN 앱 Phase 2 앞당김** 재판단.

## 결과 (기록)
| 기기 / OS | 모드 | 연속촬영 | 오프라인 유지 | 자동업로드 | 중복없음 | 비고 |
|---|---|---|---|---|---|---|
| iPhone __ / iOS __ | input |  |  |  |  |  |
| iPhone __ / iOS __ | stream |  |  |  |  |  |
| Android __ / Chrome | input |  |  |  |  |  |

**결론:** (웹 PWA 캡처 채택 / input-only 채택 / RN 앞당김) — 근거 한 줄.
```

- [ ] **Step 2: HTTPS 프리뷰로 실기기 접속**

옵션 A(빠름): `npm run build && npm run preview -- --host` 후 터널(예: `npx localtunnel --port 4173` 또는 Vercel/Netlify 프리뷰 배포)로 HTTPS URL 확보 → 폰에서 접속.
옵션 B: Vercel에 프리뷰 배포(`vercel deploy`) 후 그 URL로 접속.

- [ ] **Step 3: 체크리스트 수행 + 결과 표 채우기**

각 기기에서 위 항목을 실제로 수행하고 `spike/VALIDATION.md` 결과 표를 채운다. Supabase Storage `captures/spike/`에 파일이 올라오는지 대시보드로 확인.

- [ ] **Step 4: 판정 + 커밋**

결론 한 줄을 적고 커밋:
```bash
git add spike/VALIDATION.md
git commit -m "docs: on-device capture validation results and go/no-go"
```

---

## Self-Review

**1. Spec coverage (Plan A 범위):**
- 무설치 웹 캡처 → Task 1·8. 오프라인 큐/자동업로드/중복방지 → Task 5·7·8·9. 압축+썸네일/표시본 → Task 4. 증빙(해시·시각·GPS) → Task 3·8. Supabase 스토리지/egress(원본 대신 display 업로드) → Task 2·6. iOS 검증 게이트 → Task 9. → 커버 확인.
- 범위 밖(의도적): DB 스키마·템플릿·관리자·갤러리·i18n = Plan B~E. 명시됨.

**2. Placeholder scan:** 모든 코드 스텝에 실제 코드/명령/기대 출력 포함. `spike/VALIDATION.md`의 빈 표는 "채워야 할 결과 기록"이지 계획 공백이 아님(수동 검증의 산출물).

**3. Type consistency:** `CaptureItem`(Task 5)이 Task 6·7·8에서 동일 필드로 사용. `StorageLike`가 Task 6에서 정의되고 Task 7·8에서 주입. `sha256Hex`/`makeVariants`/`computeTargetSize` 시그니처가 Task 8 배선과 일치. `supabase.storage.from('captures')`가 `StorageLike`(upload 시그니처) 만족.

---

## 알려진 한계 (의도적)
- canvas 인코딩·카메라·geolocation은 jsdom 미지원 → 순수 로직만 단위 테스트, 실동작은 Task 9 온-디바이스. (스파이크의 본질이 실기기 검증이므로 올바른 분담.)
- 스토리지 정책이 익명 insert 허용(스파이크 전용). Plan B에서 토큰 기반 접근으로 대체.
