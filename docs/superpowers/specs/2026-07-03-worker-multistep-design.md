# 작업자 촬영 다단계 개편 (AI 제외) 설계

> **상태:** 승인됨 · **작성일:** 2026-07-03 · **대상:** 작업자 촬영 화면(`/c/:token`)
> **한 줄 정의:** 현재 단일 워커 화면을 3단계(작업 지시서 → 그룹별 촬영 체크리스트 → 제출 전 누락 확인)로 재구성한다. **AI 자동분류는 제외**(Phase 2, 유료 전환 시).

## 1. 배경
프로토타입은 AI 자동분류를 포함한 5단계 흐름이지만, AI는 설계 스펙상 Phase 2 비목표이고 미검증 상태에서 인프라·비용 부담이 크다. AI를 빼고, AI 없이도 가치 있는 UX 개선(인트로·그룹핑·진행바·제출 전 누락 확인)만 채택한다. 가이드 촬영(슬롯 탭→촬영)은 유지.

## 2. 3단계 흐름 (한 컴포넌트, `step` 상태)
- **intro(작업 지시서):** 컨테이너 플레이트 카드 + 정보 카드(담당 작업자·작업일; 장소·마감은 데이터 없어 생략) + 경고문 + 필요 사진 그룹 미리보기 + **"촬영 시작"** → capture
- **capture(촬영 체크리스트):** 상단 진행바(satisfied/total) + 그룹별(반입·적입·봉인·기타) 슬롯 목록. 각 슬롯: 미촬영=`촬영`(파일 캡처), 촬영됨=`완료` 배지 + `다시`. 하단 **"제출 확인"** → submit
- **submit(제출 전 확인):** 누락 있으면 경고 + 누락 슬롯 목록 + `빠진 항목 촬영하기`(→capture) / `이대로 제출`; 완료면 완료 표시 + `제출`. 제출 시 **"전송되었습니다!" 모달**(기존 재사용, window.close 폴백 포함)

## 3. 그룹핑 — DB 변경 없이 클라이언트 매핑
캐리어 규격 템플릿(TSR/TCR)은 건드리지 않는다. 신규 순수 모듈 `src/domain/photoPhase.ts`:
- `slotPhase(key)` → `'반입' | '적입' | '봉인' | '기타'` (매핑: empty→반입; half/full/shoring→적입; one_door/sealed/seal/csc→봉인; 미지정→기타)
- `groupByPhase(slots)` → 단계 순서(반입→적입→봉인→기타)로 그룹 배열
- 마이그레이션 불필요, 배포된 템플릿에 즉시 적용. 후속: 정식화 시 `phase`를 템플릿 데이터로 이전.

## 4. 불변
`worker_bootstrap`/`WorkerClient`/`uploadSlotPhoto`(upsert:false) 경로 그대로. 데이터·업로드 로직 변경 없음.

## 5. 컴포넌트/파일
- Create: `src/domain/photoPhase.ts` (+ `test/domain/photo-phase.test.ts`)
- Modify: `src/worker/WorkerCapture.tsx` (3단계 재구성, 진행바·그룹 렌더·누락 확인)
- Modify: `test/worker/worker-capture.test.tsx` (단계 이동 반영; 컨테이너·슬롯 라벨·경고·전송 모달 유지)

## 6. 범위 밖 (확정)
AI 자동분류 · "촬영 확인" 단계 · AI % · 자동확정/자동태그 배지 · 장소/마감 데이터 · 템플릿 phase 컬럼. 전부 제외.

## 7. 테스트
- photoPhase: slotPhase 매핑, groupByPhase 순서/그룹 (순수 단위)
- WorkerCapture(RTL): intro 렌더(플레이트·슬롯 라벨·경고), 촬영 시작→capture 진행바·그룹, 제출 확인→submit 누락/완료, 이대로 제출→전송 모달. 잘못된 토큰→"잘못된 링크".
