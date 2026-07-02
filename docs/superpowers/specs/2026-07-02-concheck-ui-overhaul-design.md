# ConCheck UI 개편 설계

> **상태:** 승인됨 · **작성일:** 2026-07-02 · **대상:** 전 화면(관리자·작업자·수신자) + 브랜드
> **한 줄 정의:** CargoLink(오렌지) 임시 UI를 ConCheck(네이비/틸) 브랜드로 리스킨하고, 세 화면을 디자인 프로토타입 + CargoNote 공개뷰 수준으로 다듬는다.

---

## 1. 배경 & 문제

`public/`에 ConCheck 로고 세트(네이비 컨테이너 + 틸 체크마크)가 추가됐고, 브랜드가 CargoLink→ConCheck로 확정됐다. 현재 앱은:
- 전 화면 강조색이 **오렌지**(`C.orange`)라 ConCheck 네이비/틸과 충돌.
- 관리자 콘솔·작업자·수신자 화면이 기능은 되나 디자인 프로토타입(`design-reference/`)보다 단순.
- 수신자 갤러리가 단순 그리드라, 원형 제품 **CargoNote 공개뷰**(사진 카드+스텝 태그+상세 사이드바+선택 다운로드)의 완성도에 못 미침.

**레퍼런스:** ① 사내 디자인 프로토타입 `design-reference/` (레이아웃). ② CargoNote 공개 잡뷰 `view.cargonote.scs71.com/public/job/...` (수신자 갤러리 목표 형태). ③ 로고 `public/concheck_*.png`.

## 2. 목표 / 비목표

**목표**
1. 단일 토큰 소스에서 오렌지 → ConCheck 틸/네이비로 리브랜딩(전 화면 자동 전파).
2. 관리자 콘솔을 사이드바 + 링크 미리보기 레이아웃으로.
3. 작업자 촬영을 플레이트/정보 카드/번호 체크리스트 레이아웃으로.
4. 수신자 갤러리를 CargoNote 스타일 문서뷰어(카드+태그+사이드바+선택 다운로드)로.

**비목표 (이번 범위 밖 — Phase 2/인프라)**
- Booking No 입력·표시(스키마 필드 없음), 문서 첨부 기능, PDF 리포트, 링크별 동적 OG 카드(프리렌더/엣지), VIEW 아이콘크기 토글, 관리자 "리포트" 실제 기능(비활성 자리만).

## 3. 디자인 언어 / 리브랜딩 (기반)

**파일:** `src/ui/tokens.ts`, `src/styles.css`. 여기가 단일 소스라 화면 코드는 대부분 자동 반영.

**색 토큰(`C`) 변경:**
- 신규 teal 램프: `teal:'#01888F'`(주강조) · `tealStrong:'#016F75'`(hover) · `tealHeavy:'#015056'`(press) · `tealBright:'#16A9B0'`(다크 위 링크·밝은 악센트) · `tealTint:'#E2F1F2'`(badge/info 배경)
- `brandNavy:'#0B2247'`(로고 네이비 — 플레이트 좌측 강조선·브랜드 제목에 소량)
- 기존 `orange`/`orangeStrong`/`orangeHeavy` 키 **제거** → 위 teal 키로 이름 변경.
- `navy`/`page*`/`onDark*`/`text*`/`line`/`surfaceAlt`/상태색(positive/caution/negative) **유지**.
- `SH.primary` → `'0 8px 20px -8px rgba(1,136,143,.5)'`(teal 그림자).
- `styles.css`: `--orange` 제거, `:focus-visible` box-shadow → `rgba(1,136,143,.30)`.

**사용처 갱신(리네임 파급):** `C.orange*`를 참조하는 모든 파일 — `WorkerCapture.tsx`(플레이트 좌측 border, 촬영 버튼 배경/그림자), 기타 grep 결과 전부 teal로. (`Brand`는 이미 로고 이미지로 교체됨.)

## 4. 관리자 콘솔 (`src/admin/AdminConsole.tsx` + 신규 하위 컴포넌트)

**레이아웃:** 좌측 고정 사이드바 + 우측 콘텐츠 (반응형: 좁으면 사이드바 상단 접힘/축소).
- **사이드바:** ConCheck 로고(상단) · 네비 항목 `새 작업` · `작업 현황` · `거래처` · `리포트`(비활성, "준비중" 뱃지) · 하단 로그인 이메일(회색).
- **본문(뷰별):**
  - `새 작업` → `CreateWorkOrder` 폼 + **오른쪽 링크 미리보기 패널**(신규 `WorkOrderPreview`): 선택된 거래처·템플릿(route/carrier)·컨테이너 번호·필요 사진 수, 생성 후 작업자 링크. 폼 입력에 실시간 반영.
  - `작업 현황` → `WorkOrderBoard`(기존, 리스킨). 행 클릭 → `ReviewPanel`(기존).
  - `거래처` → `CustomerManager`(기존).
  - `리포트` → 비활성(클릭 불가) 또는 "준비중" placeholder.
- 뷰 상태: `'new' | 'board' | 'customers' | 'review'`. `ReviewPanel`은 board 하위(선택 시).
- 사이드바는 신규 `Sidebar`/`NavItem` 컴포넌트로 분리(kit 또는 admin 내부).

**분해:** AdminConsole이 커지므로 `AdminSidebar.tsx`(네비), `WorkOrderPreview.tsx`(링크 미리보기) 분리. AdminConsole은 셸+라우팅만.

## 5. 작업자 촬영 (`src/worker/WorkerCapture.tsx`)

프로토타입 폰 레이아웃으로 재구성(기능/데이터 경로는 유지):
- **헤더:** ConCheck 로고(다크 위 = 흰 칩) + 루트 브레드크럼.
- **플레이트 카드:** 컨테이너 번호를 크게, 로고 네이비 좌측 강조선 + teal 악센트. (체크디짓 분리 강조는 번호가 ISO 4+7 형식일 때만, 아니면 통짜 표시.)
- **정보 카드:** 거래처 · 담당 작업자 · 작업일 (아이콘 + 라벨 + 값 행). 장소·마감은 데이터 없어 생략.
- **필요 사진 체크리스트:** 각 행 번호(01,02…) + 라벨 + 지시문 + 우측 `촬영`(teal 버튼)/`완료`(positive badge). 슬롯별 file capture(기존 로직 유지).
- **경고/에러 카드**(기존, 리스킨), **진행률**(N/M), **제출 CTA**(teal, 전체폭).
- 데이터 경로(`getWorkerClient`/`uploadSlotPhoto`) 불변 — 시각/구조만.

## 6. 수신자 갤러리 — CargoNote 스타일 (`src/viewer/ViewerGallery.tsx`)

**레이아웃(반응형):** 데스크톱 = 좌 콘텐츠 그리드 + 우 사이드바; 모바일 = 사이드바 상단 스택.
- **헤더:** ConCheck 로고 + "증빙 리포트" + (선택)닫기. `거래처 · 루트` 서브타이틀.
- **사진 그리드(큰 카드):** 각 카드 = 썸네일(클릭 시 displayUrl 새 탭) + **다운로드 버튼**(우하단, 서명 displayUrl 다운로드) + **선택 체크박스**(좌상단) + 하단 **스텝/태그 라벨**(슬롯 label, 타임라인 점 스타일).
- **우측 상세 사이드바:** 컨테이너 No(제목) · 日付(발행일) · 거래처 · 루트 · 사진 N장 · **Documents**("첨부 없음" 빈 상태).
- **내보내기 바:** `전체 선택` 체크 + `선택 사진 다운로드`(선택된 서명 URL 순차 다운로드, 클라이언트).
- 여러 컨테이너면 컨테이너별 섹션(제목 = No + 사이드바 정보).

**데이터 추가:** `ViewerManifest`에 `date?: string`(발행일 ISO) 필드 추가 → `buildViewerManifest`가 채움(구버전 매니페스트는 `date` 없음 → "—" 폴백). 컨테이너별 사진 수는 파생. 다운로드는 각 `photo.displayUrl`(서명) 사용.

## 7. 아키텍처 / 분리 원칙

- 색·간격·그림자·폰트는 계속 `tokens.ts`/`kit.tsx` 단일 소스. 화면은 인라인 스타일 최소화, 반복 UI는 kit 컴포넌트 재사용/추가.
- 커지는 화면(AdminConsole, ViewerGallery)은 하위 컴포넌트로 분리해 파일당 단일 책임 유지.
- 데이터 경로(repo/client/manifest)는 시각 개편과 분리 — 로직 변경은 §6의 `date` 필드 추가 1건뿐.

## 8. 테스트 전략

- **토큰:** 오렌지 키 부재 + teal 키 존재 스모크(선택). 기존 kit 테스트 유지.
- **관리자:** 사이드바 네비로 뷰 전환(새 작업/작업 현황/거래처), 리포트 비활성. `WorkOrderPreview`가 입력 반영. 기존 console/create 테스트는 셀렉터 갱신하되 흐름 유지.
- **작업자:** 플레이트·정보 카드·번호 체크리스트 렌더, 촬영→완료 badge 전환(기존 로직 회귀 없음).
- **수신자:** 카드 그리드 렌더, 태그 라벨 표시, 선택 체크→다운로드 호출, 사이드바 상세(No·발행일·사진수), 빈 Documents. 매니페스트 `date` 매핑.
- 각 화면 RTL, 데이터 경로는 인메모리/스텁. tsc + build 회귀.

## 9. 구현 순서 (플랜 4개)

스펙 1개(본 문서) → 플랜 4개 순차:
1. **plan 0 리브랜딩** — tokens/styles + 사용처 리네임. 가장 작고 기반. (먼저)
2. **plan 1 관리자 콘솔** — 사이드바 + 링크 미리보기.
3. **plan 2 작업자 촬영** — 플레이트/정보/체크리스트.
4. **plan 3 수신자 갤러리** — CargoNote 스타일 + `date` 필드.

각 플랜은 독립 실행·테스트 가능. 사용자가 각 단계 실행본을 보고 프로토타입과 비교해 미세 조정.
