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
