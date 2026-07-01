# 캡처 스파이크 검증 (Plan A 게이트)

실행: `npm run dev -- --host` → 폰 브라우저로 접속(같은 네트워크) 또는 배포 후 HTTPS 접속.
※ getUserMedia·PWA는 **HTTPS(또는 localhost)** 에서만 동작 → 실기기 테스트는 HTTPS 프리뷰 필요(터널 또는 Vercel/Netlify 프리뷰 배포).
※ 실제 업로드까지 보려면 먼저 Supabase 프로젝트 생성 + `.env.local`에 URL/anon key 입력 + `captures` 버킷·익명 insert 정책(Task 2).

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
