export type Lang = 'ko' | 'en' | 'zh' | 'ru';

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
  { code: 'ru', label: 'RU' },
];

export interface Role { tag: string; title: string; desc: string; points: string[] }
export interface Feature { k: string; v: string }
export interface Compare { head: string; sub: string; beforeLabel: string; before: string[]; afterLabel: string; after: string[] }
export interface Dict {
  login: string; kicker: string; h1a: string; h1b: string; lead: string;
  start: string; how: string; trust: string[];
  compare: Compare;
  rolesHead: string; rolesSub: string; roles: Role[];
  stepsHead: string; steps: string[];
  featuresHead: string; features: Feature[];
  ctaTitle: string; ctaSub: string; ctaBtn: string; footer: string;
  proofDone: string;
}

export const T: Record<Lang, Dict> = {
  ko: {
    login: '로그인 →', kicker: '컨테이너 작업 증빙 플랫폼',
    h1a: '컨테이너 작업 증빙,', h1b: '한 링크로 끝낸다',
    lead: '현장 촬영부터 검수·발행, 수신자 열람까지 — 설치도 로그인도 없이 하나의 링크로.',
    start: '무료로 시작', how: '작동 방식',
    trust: ['무설치 촬영', '실시간 검수', '증빙 고정', '다국어 열람'],
    compare: {
      head: '이메일로 주고받던 방식, 이렇게 바뀝니다', sub: '흩어진 첨부와 재촬영, 언어 장벽을 한 링크로 끝냅니다.',
      beforeLabel: '기존 방식',
      before: ['이메일마다 흩어진 사진 첨부', '어떤 컷이 빠졌는지 확인이 어려움', '해외 수신자는 언어 장벽', '원본 변조·버전 혼선'],
      afterLabel: 'ConCheck',
      after: ['링크 하나에 모든 사진 정리', '필수 컷 누락을 자동으로 표시', '도착지 언어로 바로 열람', '발행 시점 스냅샷으로 고정'],
    },
    rolesHead: '역할마다, 딱 맞는 화면', rolesSub: '현장·사무실·고객이 각자 필요한 것만 봅니다.',
    roles: [
      { tag: '작업자 · 현장', title: '설치 없이 사진만 찍는다', desc: '링크를 열면 촬영 화면. 앱·로그인 없이 안내 순서대로 찍어 전송.', points: ['무설치 링크 촬영', '단계별 촬영 안내', '데미지 별도 기록'] },
      { tag: '관리자 · 사무실', title: '상태를 한눈에 통제한다', desc: '작업 생성·링크 발급·검수·발행을 한 화면에서.', points: ['컨테이너별 검수', '완료율·누락·데미지', '발행본 고정'] },
      { tag: '수신자 · 해외', title: '로그인 없이 증빙을 본다', desc: '링크 하나로 사진과 증빙을 도착지 언어로 열람.', points: ['무로그인 갤러리', '다국어 리포트', '사진 일괄 다운로드'] },
    ],
    stepsHead: '작동 방식', steps: ['작업 생성', '링크·QR 발급', '현장 촬영', '사진 검수', '발행 · 열람'],
    featuresHead: '왜 ConCheck인가',
    features: [
      { k: '무설치', v: '링크로 바로 촬영 — 앱·로그인 불필요' },
      { k: '증빙 고정', v: '발행 시점 스냅샷으로 버전 고정' },
      { k: '다국어 열람', v: '수신 국가 언어로 리포트 확인' },
      { k: '데미지 증빙', v: '손상 화물을 현장에서 별도 촬영' },
    ],
    ctaTitle: '지금 첫 작업을 만들어 보세요', ctaSub: '계정으로 로그인하면 바로 시작할 수 있습니다.',
    ctaBtn: '관리자 로그인', footer: 'ConCheck — 컨테이너 작업 증빙 자동화', proofDone: '촬영 완료',
  },
  en: {
    login: 'Log in →', kicker: 'Container inspection proof platform',
    h1a: 'Container work proof,', h1b: 'done in one link',
    lead: 'From field capture to review, publishing and recipient viewing — in a single link, with no install or login.',
    start: 'Start free', how: 'How it works',
    trust: ['No install', 'Live review', 'Locked proof', 'Multi-language'],
    compare: {
      head: 'From email attachments to one link', sub: 'Scattered attachments, re-shoots and language barriers — gone.',
      beforeLabel: 'The old way',
      before: ['Photos scattered across emails', 'Hard to see which shot is missing', 'Overseas recipients hit a language barrier', 'Originals altered, versions confused'],
      afterLabel: 'ConCheck',
      after: ['Every photo organized in one link', 'Missing required shots flagged automatically', 'Viewed in the destination language', 'Fixed by a publish-time snapshot'],
    },
    rolesHead: 'The right screen for each role', rolesSub: 'Field, office and customer each see just what they need.',
    roles: [
      { tag: 'Worker · Field', title: 'Just take the photos', desc: 'Open the link and shoot in guided order — no app, no login.', points: ['Install-free capture', 'Step-by-step guidance', 'Separate damage records'] },
      { tag: 'Admin · Office', title: 'Control status at a glance', desc: 'Create jobs, issue links, review and publish in one place.', points: ['Per-container review', 'Completion · gaps · damage', 'Locked publication'] },
      { tag: 'Recipient · Overseas', title: 'View proof without login', desc: 'One link to see photos and proof in the destination language.', points: ['No-login gallery', 'Multi-language report', 'Bulk photo download'] },
    ],
    stepsHead: 'How it works', steps: ['Create job', 'Issue link · QR', 'Field capture', 'Review', 'Publish · View'],
    featuresHead: 'Why ConCheck',
    features: [
      { k: 'No install', v: 'Shoot straight from a link — no app or login' },
      { k: 'Locked proof', v: 'Version fixed by a publish-time snapshot' },
      { k: 'Multi-language', v: "Reports read in the recipient's language" },
      { k: 'Damage proof', v: 'Capture damaged cargo on site' },
    ],
    ctaTitle: 'Create your first job now', ctaSub: 'Log in with your account to get started.',
    ctaBtn: 'Admin login', footer: 'ConCheck — Container work proof automation', proofDone: 'All captured',
  },
  zh: {
    login: '登录 →', kicker: '集装箱作业存证平台',
    h1a: '集装箱作业存证，', h1b: '一条链接搞定',
    lead: '从现场拍摄到审核、发布与收件人查看 —— 一条链接，无需安装或登录。',
    start: '免费开始', how: '工作方式',
    trust: ['免安装', '实时审核', '存证锁定', '多语言'],
    compare: {
      head: '从邮件附件到一条链接', sub: '散落的附件、反复补拍与语言障碍，就此结束。',
      beforeLabel: '以往方式',
      before: ['照片散落在各封邮件', '难以发现缺失的照片', '海外收件人面临语言障碍', '原件易被更改、版本混乱'],
      afterLabel: 'ConCheck',
      after: ['所有照片集中在一条链接', '自动标记缺失的必拍项', '以目的地语言直接查看', '以发布时快照固定'],
    },
    rolesHead: '每个角色，专属界面', rolesSub: '现场、办公室与客户各看所需。',
    roles: [
      { tag: '作业员 · 现场', title: '只需拍照', desc: '打开链接即可按引导顺序拍摄 —— 无需应用、无需登录。', points: ['免安装拍摄', '分步拍摄引导', '单独记录破损'] },
      { tag: '管理员 · 办公室', title: '一目了然掌控状态', desc: '创建任务、发放链接、审核与发布，一个界面完成。', points: ['按集装箱审核', '完成率·缺失·破损', '发布锁定'] },
      { tag: '收件人 · 海外', title: '无需登录查看存证', desc: '一条链接，用目的地语言查看照片与存证。', points: ['免登录相册', '多语言报告', '批量下载照片'] },
    ],
    stepsHead: '工作方式', steps: ['创建任务', '发放链接·二维码', '现场拍摄', '照片审核', '发布 · 查看'],
    featuresHead: '为什么选择 ConCheck',
    features: [
      { k: '免安装', v: '通过链接直接拍摄 —— 无需应用或登录' },
      { k: '存证锁定', v: '以发布时快照固定版本' },
      { k: '多语言', v: '以收件人语言查看报告' },
      { k: '破损存证', v: '在现场单独拍摄破损货物' },
    ],
    ctaTitle: '立即创建第一个任务', ctaSub: '使用账户登录即可开始。',
    ctaBtn: '管理员登录', footer: 'ConCheck —— 集装箱作业存证自动化', proofDone: '拍摄完成',
  },
  ru: {
    login: 'Войти →', kicker: 'Платформа фотофиксации работ с контейнерами',
    h1a: 'Фотофиксация работ,', h1b: 'в одной ссылке',
    lead: 'От съёмки на месте до проверки, публикации и просмотра получателем — по одной ссылке, без установки и входа.',
    start: 'Начать бесплатно', how: 'Как это работает',
    trust: ['Без установки', 'Проверка онлайн', 'Фиксация данных', 'Много языков'],
    compare: {
      head: 'От вложений в почте — к одной ссылке', sub: 'Разбросанные вложения, пересъёмка и языковой барьер — в прошлом.',
      beforeLabel: 'Раньше',
      before: ['Фото разбросаны по письмам', 'Трудно увидеть, какого кадра не хватает', 'Языковой барьер для зарубежных получателей', 'Оригиналы меняются, версии путаются'],
      afterLabel: 'ConCheck',
      after: ['Все фото собраны в одной ссылке', 'Пропущенные обязательные кадры отмечаются автоматически', 'Просмотр на языке получателя', 'Зафиксировано снимком при публикации'],
    },
    rolesHead: 'Свой экран для каждой роли', rolesSub: 'Объект, офис и клиент видят только нужное.',
    roles: [
      { tag: 'Исполнитель · Объект', title: 'Просто сделайте фото', desc: 'Откройте ссылку и снимайте по подсказкам — без приложения и входа.', points: ['Съёмка без установки', 'Пошаговые подсказки', 'Отдельная фиксация повреждений'] },
      { tag: 'Администратор · Офис', title: 'Контроль статуса с одного взгляда', desc: 'Создание задач, выдача ссылок, проверка и публикация в одном окне.', points: ['Проверка по контейнерам', 'Готовность · пропуски · повреждения', 'Заблокированная публикация'] },
      { tag: 'Получатель · За рубежом', title: 'Просмотр без входа', desc: 'Одна ссылка — фото и подтверждение на языке получателя.', points: ['Галерея без входа', 'Отчёт на разных языках', 'Массовая загрузка фото'] },
    ],
    stepsHead: 'Как это работает', steps: ['Создать задачу', 'Выдать ссылку · QR', 'Съёмка на месте', 'Проверка фото', 'Публикация · Просмотр'],
    featuresHead: 'Почему ConCheck',
    features: [
      { k: 'Без установки', v: 'Съёмка прямо из ссылки — без приложения и входа' },
      { k: 'Фиксация', v: 'Версия закреплена снимком на момент публикации' },
      { k: 'Много языков', v: 'Отчёты на языке получателя' },
      { k: 'Повреждения', v: 'Съёмка повреждённого груза на месте' },
    ],
    ctaTitle: 'Создайте первую задачу сейчас', ctaSub: 'Войдите в аккаунт, чтобы начать.',
    ctaBtn: 'Вход для администратора', footer: 'ConCheck — автоматизация фотофиксации работ с контейнерами', proofDone: 'Съёмка завершена',
  },
};
