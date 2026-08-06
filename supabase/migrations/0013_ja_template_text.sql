-- テンプレートの表示テキストを日本語にする。
--
-- 0002 は既に適用済みなので触らない。表示文だけを上書きする。
-- key は現場の写真と紐づく識別子なので変えない — 変えると既存の写真が
-- どのスロットのものか分からなくなる。label と instruction だけを差し替える。

update work_type_templates set
  name = 'コンテナ・バンニング — TSR (FESCO)',
  carrier = 'FESCO',
  warning_text = '必須7枚 + CSC · すべての写真にコンテナ番号を写す。不足するとロシア鉄道で積載を拒否され、再マーキングまでの遅延と保管料・作業料が発生する。',
  required_photos = '[
    {"key":"empty","label":"空コンテナ","instruction":"番号が見えるように","required":true},
    {"key":"half","label":"半積み","instruction":"番号が見えるように","required":true},
    {"key":"full","label":"満載","instruction":"番号が見えるように","required":true},
    {"key":"shoring","label":"ショアリング・固縛後","instruction":"番号が見えるように、しっかり固定","required":true},
    {"key":"one_door","label":"片扉閉鎖","instruction":"番号全体が見えるように","required":true},
    {"key":"sealed","label":"封印完了(両扉)","instruction":"ボルトシール・右扉/左レバー","required":true},
    {"key":"seal","label":"シール接写","instruction":"シール番号が読み取れるように","required":true},
    {"key":"csc","label":"CSC プレート","instruction":"番号規則の例外","required":true}
  ]'::jsonb
where route = 'TSR';

update work_type_templates set
  name = 'コンテナ・バンニング — TCR (中国税関)',
  carrier = '中国税関',
  warning_text = '必須8枚 · 中国税関への提出が必須。満たさない場合は日本へ返送されることがある。',
  required_photos = '[
    {"key":"empty","label":"空コンテナ","instruction":"番号が見えるように","required":true},
    {"key":"half","label":"半積み","instruction":"番号が見えるように","required":true},
    {"key":"full","label":"満載","instruction":"番号が見えるように","required":true},
    {"key":"shoring","label":"ショアリング・固縛後","instruction":"番号が見えるように、しっかり固定","required":true},
    {"key":"one_door","label":"片扉閉鎖","instruction":"番号全体が見えるように","required":true},
    {"key":"sealed","label":"封印完了(両扉)","instruction":"シール封印","required":true},
    {"key":"seal","label":"シール接写","instruction":"シール番号が読み取れるように","required":true},
    {"key":"csc","label":"CSC プレート","instruction":"番号規則の例外","required":true}
  ]'::jsonb
where route = 'TCR';
