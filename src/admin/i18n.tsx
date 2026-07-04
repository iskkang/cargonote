import { createContext, useContext, useState, type ReactNode } from 'react';

export type AdminLang = 'ko' | 'en' | 'zh' | 'ru';
export const ADMIN_LANGS: { code: AdminLang; label: string }[] = [
  { code: 'ko', label: '한국어' }, { code: 'en', label: 'EN' }, { code: 'zh', label: '中文' }, { code: 'ru', label: 'RU' },
];

const ko = {
  nav: { home: '대시보드', new: '새 작업', board: '작업 현황', customers: '거래처', reports: '리포트', load: '적재 계산' },
  load: { title: '적재 계산', sub: '화물 리스트로 20/40/40HQ 적재율과 필요 컨테이너 수를 추정합니다.', addRow: '＋ 화물 추가', name: '품명', qty: '수량', dimsCm: '치수 L·W·H (cm)', weight: '중량(kg)', stack: '적재', util: '가정 적재율', results: '적재 추정', totalCbm: '총 부피', totalWeight: '총 중량', totalQty: '총 수량', needed: '필요 컨테이너', fill: '적재율', bindVol: '부피 제약', bindWt: '중량 제약', maxUnits: '1대 최대', unit: '대', recommended: '추천', notFit: '치수 초과', freight: '운임(대당·선택)', empty: '화물을 추가하면 결과가 나옵니다.', disclaimer: '부피·중량 기반 추정치입니다. 실제 적재율은 화물 모양·스택 제약에 좌우됩니다.', remove: '삭제', view3d: '3D 적재도', rotate: '회전', packed: '적재', unplaced: '미적재', cap: '표시는 상위 일부만', upload: '엑셀·CSV 업로드', uploadHint: '열: 품명·수량·L·W·H·중량·적재(선택)', color: '색상', lay: '눕히기', maxLayers: '최대 단수', maxLayersHint: '0 = 무제한', cog: '무게중심', cogL: '길이', cogW: '폭', cogOk: '균형 양호', cogWarn: '편중 주의' },
  role: '사무실 관리자', signOut: '로그아웃', menu: '메뉴',
  titles: { home: '대시보드', new: '새 작업 만들기', board: '작업 현황', customers: '거래처 관리', reports: '리포트', review: '작업 검수', report: '증빙 리포트' },
  subs: {
    home: '오늘의 작업 현황을 한눈에.', new: '촬영 항목과 담당자를 정의하면 작업자에게 보낼 링크가 만들어집니다.',
    board: '컨테이너·작업일로 검색하고, 상태별로 검수하세요.', customers: '작업을 지시할 거래처를 추가·수정합니다.', reports: '발행된 증빙 리포트 목록입니다.',
  },
  newJob: '＋ 새 작업', loading: '로딩 중…',
  common: { cancel: '취소', save: '저장', edit: '수정', delete: '삭제', add: '추가', confirm: '확인', close: '닫기' },
  dash: {
    needCheck: '확인 필요', inProgress: '진행 중', done: '완료', damage: '데미지',
    recent: '최근 작업', viewAll: '전체 보기', empty: '아직 작업이 없습니다', emptyHint: '첫 작업을 만들어 링크를 발급하세요.',
    quickStart: '빠른 시작', quickSub: '촬영 항목과 담당자를 정하면 작업자 링크가 만들어집니다.', newJobFull: '＋ 새 작업 만들기', viewBoard: '작업 현황 보기', total: '전체 작업',
  },
  board: {
    search: '컨테이너 번호·고객사 검색', date: '작업일', clearDate: '날짜 해제',
    filters: { 전체: '전체', 대기: '대기', 확인필요: '확인필요', 진행중: '진행중', 완료: '완료', 데미지: '데미지' },
    col: { container: '컨테이너', customer: '고객사', type: '작업 유형', date: '작업일', assignee: '담당', progress: '진행', status: '상태' },
    status: { 대기: '대기', 진행중: '진행중', 확인필요: '확인필요', 완료: '완료', 데미지: '데미지' },
    noMatch: '조건에 맞는 작업이 없습니다.', hint: '컨테이너·고객사를 누르면 작업 검수 화면으로 이동합니다.',
    editName: '담당자 이름', editContact: '담당자 연락처', editDate: '작업일',
    empty: '아직 작업이 없습니다', emptyHint: "상단 '새 작업'으로 첫 작업 지시를 만드세요.",
    delTitle: '작업 삭제', delMsg: '이 작업과 사진·링크를 삭제할까요?', delPublished: '발행된 작업입니다. 삭제하면 수신자 링크와 사진도 함께 사라집니다. 삭제할까요?',
    deleted: '작업을 삭제했습니다.', saved: '저장했습니다.',
  },
  create: {
    customer: '거래처', type: '작업 유형', container: '컨테이너 번호', containerPh: 'TCLU1234567 (쉼표로 여러 개)',
    containerHint: '촬영할 컨테이너 번호를 1개 이상 입력하세요.', needPhotos: '필요 사진', unit: '장',
    workDate: '작업일', assigneeName: '담당자 이름', assigneeContact: '담당자 연락처', assigneeEmail: '담당자 이메일', submit: '링크·QR 발급하기',
    noCustomer: '먼저 거래처를 등록하세요.', manageCustomers: '거래처 관리로 이동',
    successTitle: '링크가 발급되었습니다', successSub: '작업자에게 카카오톡·문자로 보내거나 QR을 보여주세요.',
    containerNo: 'CONTAINER No.', scan: '현장에서 스캔', sendWorker: '작업자에게 링크 보내기', oneMore: '새 작업 하나 더', toBoard: '작업 현황으로 →', issued: '링크가 발급되었습니다.',
  },
  customer: {
    add: '거래처 추가', edit: '거래처 수정', name: '거래처명', contact: '담당자', phone: '전화번호', email: '이메일',
    empty: '등록된 거래처가 없습니다', emptyHint: '아래에서 첫 거래처를 추가하세요.', noContact: '연락처 없음',
    nameRequired: '거래처명을 입력하세요.', delTitle: '거래처 삭제', delMsg: (n: string) => `'${n}' 거래처를 삭제할까요?`,
    blocked: '이 거래처로 만든 작업이 있어 삭제할 수 없습니다.', added: '거래처를 추가했습니다.', updated: '거래처를 수정했습니다.', deleted: '거래처를 삭제했습니다.',
  },
  reports: { empty: '발행된 리포트가 없습니다', emptyHint: "작업 검수에서 '리포트 발행'을 하면 여기에 쌓입니다.", col: { container: '컨테이너', customer: '고객사', type: '작업 유형' }, open: '리포트 보기', done: '완료', damage: '데미지' },
  preview: { head: '작업자에게 전달될 링크 미리보기', type: '작업 유형', customer: '거래처', carrier: '캐리어', needPhotos: '필요 사진', unit: '장', hint: '작업자는 이 링크만 누르면 앱 설치 없이 바로 촬영을 시작합니다.', inspect: (r: string) => `${r} 적입 검수` },
  review: {
    back: '작업 현황', reviewBack: '검수 화면', summary: '검수 요약', rate: '완료율', captured: '촬영 완료', missing: '누락', damage: '데미지', unit: '장',
    publish: '리포트 발행', publishing: '발행 중…', viewReport: '발행된 리포트 보기', published: '리포트 발행 완료', pdf: 'PDF 다운로드',
    kicker: 'CONCHECK 증빙 리포트', verified: 'VERIFIED', verifiedSub: '촬영→검증', rateT: '완료율', photos: '사진', damageT: '데미지', seal: 'Seal No.',
    publishedBy: '발행', locked: '🔒 발행본 고정', shareViewer: '수신자에게 링크 보내기',
    revoke: '링크 회수', revokeTitle: '링크 회수', revokeMsg: '수신자 링크를 무효화합니다. 받은 사람은 더 이상 열람할 수 없습니다. 회수할까요?', revoked: '링크를 회수했습니다.',
    aiRun: '✨ AI 자동 검수', aiTitle: 'AI 자동 검수', aiRunning: 'AI 검수 중…', aiNumber: '번호', aiSeal: '씰', aiMatch: '일치', aiMismatch: '불일치', aiUnread: '판독 실패', aiDamage: '데미지', aiNoDamage: '없음', aiReshoot: '재촬영 필요', aiQualityOk: '품질 양호', aiUnit: '장', aiBlur: '흐림', aiIllegible: '판독 불가', aiSubject: '주제 불일치', aiFail: 'AI 분석 실패',
    notCaptured: '미촬영', captured2: '촬영됨', missing2: '누락', damageSec: (n: number) => `데미지 사진 · ${n}장`, image: '이미지',
    zoomAlt: '확대 이미지', loadErr: '불러오지 못했습니다. 네트워크를 확인하고 다시 시도하세요.', retry: '다시 시도',
  },
};

const en: typeof ko = {
  nav: { home: 'Dashboard', new: 'New job', board: 'Jobs', customers: 'Customers', reports: 'Reports', load: 'Load calc' },
  load: { title: 'Load calculator', sub: 'Estimate 20/40/40HQ fill and containers needed from a cargo list.', addRow: '＋ Add cargo', name: 'Item', qty: 'Qty', dimsCm: 'Size L·W·H (cm)', weight: 'Weight (kg)', stack: 'Stack', util: 'Assumed fill', results: 'Estimate', totalCbm: 'Total volume', totalWeight: 'Total weight', totalQty: 'Total qty', needed: 'Containers', fill: 'Fill', bindVol: 'volume-bound', bindWt: 'weight-bound', maxUnits: 'Max / unit', unit: '', recommended: 'Best', notFit: 'oversize', freight: 'Freight (per box, opt.)', empty: 'Add cargo to see results.', disclaimer: 'A volume/weight estimate. Real fill depends on cargo shape and stacking.', remove: 'Remove', view3d: '3D layout', rotate: 'Rotate', packed: 'Packed', unplaced: 'Left out', cap: 'showing a subset', upload: 'Excel·CSV upload', uploadHint: 'Columns: item·qty·L·W·H·weight·stack (opt.)', color: 'Color', lay: 'Tilt', maxLayers: 'Max layers', maxLayersHint: '0 = unlimited', cog: 'Center of gravity', cogL: 'Length', cogW: 'Width', cogOk: 'Balanced', cogWarn: 'Off-center' },
  role: 'Office admin', signOut: 'Sign out', menu: 'Menu',
  titles: { home: 'Dashboard', new: 'Create a job', board: 'Jobs', customers: 'Customers', reports: 'Reports', review: 'Job review', report: 'Proof report' },
  subs: {
    home: "Today's jobs at a glance.", new: 'Define required photos and the assignee to generate a worker link.',
    board: 'Search by container or date, review by status.', customers: 'Add and edit the customers you assign jobs to.', reports: 'List of published proof reports.',
  },
  newJob: '＋ New job', loading: 'Loading…',
  common: { cancel: 'Cancel', save: 'Save', edit: 'Edit', delete: 'Delete', add: 'Add', confirm: 'Confirm', close: 'Close' },
  dash: {
    needCheck: 'Needs check', inProgress: 'In progress', done: 'Done', damage: 'Damage',
    recent: 'Recent jobs', viewAll: 'View all', empty: 'No jobs yet', emptyHint: 'Create your first job and issue a link.',
    quickStart: 'Quick start', quickSub: 'Set the required photos and assignee to generate a worker link.', newJobFull: '＋ Create a job', viewBoard: 'View jobs', total: 'Total jobs',
  },
  board: {
    search: 'Search container no. / customer', date: 'Work date', clearDate: 'Clear date',
    filters: { 전체: 'All', 대기: 'Waiting', 확인필요: 'Needs check', 진행중: 'In progress', 완료: 'Done', 데미지: 'Damage' },
    col: { container: 'Container', customer: 'Customer', type: 'Type', date: 'Date', assignee: 'Assignee', progress: 'Progress', status: 'Status' },
    status: { 대기: 'Waiting', 진행중: 'In progress', 확인필요: 'Needs check', 완료: 'Done', 데미지: 'Damage' },
    noMatch: 'No jobs match the filters.', hint: 'Tap a container or customer to open the review screen.',
    editName: 'Assignee name', editContact: 'Assignee contact', editDate: 'Work date',
    empty: 'No jobs yet', emptyHint: "Use ‘New job’ above to create your first assignment.",
    delTitle: 'Delete job', delMsg: 'Delete this job with its photos and links?', delPublished: 'This job is published. Deleting it also removes the recipient link and photos. Delete anyway?',
    deleted: 'Job deleted.', saved: 'Saved.',
  },
  create: {
    customer: 'Customer', type: 'Job type', container: 'Container no.', containerPh: 'TCLU1234567 (comma-separated)',
    containerHint: 'Enter at least one container number to capture.', needPhotos: 'Required photos', unit: '',
    workDate: 'Work date', assigneeName: 'Assignee name', assigneeContact: 'Assignee contact', assigneeEmail: 'Assignee email', submit: 'Issue link & QR',
    noCustomer: 'Add a customer first.', manageCustomers: 'Go to customers',
    successTitle: 'Link issued', successSub: 'Send it to the worker via chat/SMS, or show the QR.',
    containerNo: 'CONTAINER No.', scan: 'Scan on site', sendWorker: 'Send the link to the worker', oneMore: 'New job', toBoard: 'To jobs →', issued: 'Link issued.',
  },
  customer: {
    add: 'Add customer', edit: 'Edit customer', name: 'Company name', contact: 'Contact', phone: 'Phone', email: 'Email',
    empty: 'No customers yet', emptyHint: 'Add your first customer below.', noContact: 'No contact',
    nameRequired: 'Enter a company name.', delTitle: 'Delete customer', delMsg: (n: string) => `Delete customer ‘${n}’?`,
    blocked: 'This customer has jobs and cannot be deleted.', added: 'Customer added.', updated: 'Customer updated.', deleted: 'Customer deleted.',
  },
  reports: { empty: 'No published reports yet', emptyHint: "Publishing a report from a job review adds it here.", col: { container: 'Container', customer: 'Customer', type: 'Type' }, open: 'Open report', done: 'Done', damage: 'Damage' },
  preview: { head: 'Preview of the worker link', type: 'Job type', customer: 'Customer', carrier: 'Carrier', needPhotos: 'Required photos', unit: '', hint: 'The worker just taps this link and starts shooting — no app install.', inspect: (r: string) => `${r} loading inspection` },
  review: {
    back: 'Jobs', reviewBack: 'Review', summary: 'Review summary', rate: 'Completion', captured: 'Captured', missing: 'Missing', damage: 'Damage', unit: '',
    publish: 'Publish report', publishing: 'Publishing…', viewReport: 'View published report', published: 'Report published', pdf: 'Download PDF',
    kicker: 'CONCHECK PROOF REPORT', verified: 'VERIFIED', verifiedSub: 'capture→verify', rateT: 'Completion', photos: 'Photos', damageT: 'Damage', seal: 'Seal No.',
    publishedBy: 'Published', locked: '🔒 Version locked', shareViewer: 'Send the link to the recipient',
    revoke: 'Revoke link', revokeTitle: 'Revoke link', revokeMsg: 'This invalidates the recipient link — they can no longer view it. Revoke?', revoked: 'Link revoked.',
    aiRun: '✨ AI review', aiTitle: 'AI review', aiRunning: 'AI reviewing…', aiNumber: 'No.', aiSeal: 'Seal', aiMatch: 'match', aiMismatch: 'mismatch', aiUnread: 'unreadable', aiDamage: 'Damage', aiNoDamage: 'none', aiReshoot: 'Reshoot', aiQualityOk: 'Good', aiUnit: '', aiBlur: 'blurry', aiIllegible: 'illegible', aiSubject: 'wrong subject', aiFail: 'AI analysis failed',
    notCaptured: 'No photo', captured2: 'Captured', missing2: 'Missing', damageSec: (n: number) => `Damage photos · ${n}`, image: 'Image',
    zoomAlt: 'Enlarged image', loadErr: 'Failed to load. Check your network and retry.', retry: 'Retry',
  },
};

const zh: typeof ko = {
  nav: { home: '仪表盘', new: '新建任务', board: '任务列表', customers: '客户', reports: '报告', load: '装箱计算' },
  load: { title: '装箱计算', sub: '根据货物清单估算 20/40/40HQ 的装载率与所需箱数。', addRow: '＋ 添加货物', name: '品名', qty: '数量', dimsCm: '尺寸 L·W·H (cm)', weight: '重量(kg)', stack: '可堆叠', util: '假设装载率', results: '装箱估算', totalCbm: '总体积', totalWeight: '总重量', totalQty: '总数量', needed: '所需箱数', fill: '装载率', bindVol: '体积受限', bindWt: '重量受限', maxUnits: '单箱最多', unit: '箱', recommended: '推荐', notFit: '尺寸超限', freight: '运费(每箱·可选)', empty: '添加货物后显示结果。', disclaimer: '基于体积与重量的估算值。实际装载率取决于货物形状与堆叠。', remove: '删除', view3d: '3D 装箱图', rotate: '旋转', packed: '已装', unplaced: '未装', cap: '仅显示部分', upload: '上传 Excel·CSV', uploadHint: '列：品名·数量·L·W·H·重量·可堆叠(可选)', color: '颜色', lay: '平放', maxLayers: '最大层数', maxLayersHint: '0 = 不限', cog: '重心', cogL: '长度', cogW: '宽度', cogOk: '平衡良好', cogWarn: '重心偏移' },
  role: '办公室管理员', signOut: '退出登录', menu: '菜单',
  titles: { home: '仪表盘', new: '新建任务', board: '任务列表', customers: '客户管理', reports: '报告', review: '任务审核', report: '存证报告' },
  subs: {
    home: '一览今日任务状态。', new: '定义必拍项与负责人，即可生成作业员链接。',
    board: '按集装箱或日期搜索，按状态审核。', customers: '添加与编辑派单客户。', reports: '已发布的存证报告列表。',
  },
  newJob: '＋ 新建任务', loading: '加载中…',
  common: { cancel: '取消', save: '保存', edit: '编辑', delete: '删除', add: '添加', confirm: '确定', close: '关闭' },
  dash: {
    needCheck: '待确认', inProgress: '进行中', done: '完成', damage: '破损',
    recent: '最近任务', viewAll: '查看全部', empty: '暂无任务', emptyHint: '创建第一个任务并发放链接。',
    quickStart: '快速开始', quickSub: '设定必拍项与负责人即可生成作业员链接。', newJobFull: '＋ 新建任务', viewBoard: '查看任务', total: '任务总数',
  },
  board: {
    search: '搜索集装箱号 / 客户', date: '作业日期', clearDate: '清除日期',
    filters: { 전체: '全部', 대기: '待处理', 확인필요: '待确认', 진행중: '进行中', 완료: '完成', 데미지: '破损' },
    col: { container: '集装箱', customer: '客户', type: '类型', date: '日期', assignee: '负责人', progress: '进度', status: '状态' },
    status: { 대기: '待处理', 진행중: '进行中', 확인필요: '待确认', 완료: '完成', 데미지: '破损' },
    noMatch: '没有符合条件的任务。', hint: '点击集装箱或客户可进入审核界面。',
    editName: '负责人姓名', editContact: '负责人联系方式', editDate: '作业日期',
    empty: '暂无任务', emptyHint: '使用上方“新建任务”创建第一个任务。',
    delTitle: '删除任务', delMsg: '删除此任务及其照片和链接？', delPublished: '该任务已发布。删除后收件人链接与照片也会一并消失。仍要删除吗？',
    deleted: '任务已删除。', saved: '已保存。',
  },
  create: {
    customer: '客户', type: '任务类型', container: '集装箱号', containerPh: 'TCLU1234567（逗号分隔多个）',
    containerHint: '请输入至少一个要拍摄的集装箱号。', needPhotos: '必拍照片', unit: '张',
    workDate: '作业日期', assigneeName: '负责人姓名', assigneeContact: '负责人联系方式', assigneeEmail: '负责人邮箱', submit: '生成链接·二维码',
    noCustomer: '请先登记客户。', manageCustomers: '前往客户管理',
    successTitle: '链接已生成', successSub: '通过聊天/短信发送给作业员，或出示二维码。',
    containerNo: 'CONTAINER No.', scan: '现场扫码', sendWorker: '把链接发给作业员', oneMore: '再建一个', toBoard: '前往任务 →', issued: '链接已生成。',
  },
  customer: {
    add: '添加客户', edit: '编辑客户', name: '客户名称', contact: '联系人', phone: '电话', email: '邮箱',
    empty: '暂无客户', emptyHint: '在下方添加第一个客户。', noContact: '无联系方式',
    nameRequired: '请输入客户名称。', delTitle: '删除客户', delMsg: (n: string) => `删除客户“${n}”？`,
    blocked: '该客户已有任务，无法删除。', added: '客户已添加。', updated: '客户已更新。', deleted: '客户已删除。',
  },
  reports: { empty: '暂无已发布报告', emptyHint: '在任务审核中“发布报告”后会显示在此。', col: { container: '集装箱', customer: '客户', type: '类型' }, open: '查看报告', done: '完成', damage: '破损' },
  preview: { head: '作业员链接预览', type: '任务类型', customer: '客户', carrier: '承运人', needPhotos: '必拍照片', unit: '张', hint: '作业员点开此链接即可开始拍摄，无需安装应用。', inspect: (r: string) => `${r} 装箱检查` },
  review: {
    back: '任务列表', reviewBack: '审核界面', summary: '审核摘要', rate: '完成率', captured: '已拍摄', missing: '缺失', damage: '破损', unit: '张',
    publish: '发布报告', publishing: '发布中…', viewReport: '查看已发布报告', published: '报告已发布', pdf: '下载 PDF',
    kicker: 'CONCHECK 存证报告', verified: 'VERIFIED', verifiedSub: '拍摄→验证', rateT: '完成率', photos: '照片', damageT: '破损', seal: '铅封号',
    publishedBy: '发布', locked: '🔒 版本锁定', shareViewer: '把链接发给收件人',
    revoke: '回收链接', revokeTitle: '回收链接', revokeMsg: '将使收件人链接失效，对方将无法再查看。确定回收吗？', revoked: '链接已回收。',
    aiRun: '✨ AI 自动检查', aiTitle: 'AI 自动检查', aiRunning: 'AI 检查中…', aiNumber: '号码', aiSeal: '铅封', aiMatch: '一致', aiMismatch: '不一致', aiUnread: '无法识别', aiDamage: '破损', aiNoDamage: '无', aiReshoot: '需重拍', aiQualityOk: '质量良好', aiUnit: '张', aiBlur: '模糊', aiIllegible: '无法辨认', aiSubject: '主题不符', aiFail: 'AI 分析失败',
    notCaptured: '未拍摄', captured2: '已拍摄', missing2: '缺失', damageSec: (n: number) => `破损照片 · ${n}`, image: '图片',
    zoomAlt: '放大图片', loadErr: '加载失败。请检查网络后重试。', retry: '重试',
  },
};

const ru: typeof ko = {
  nav: { home: 'Панель', new: 'Новая задача', board: 'Задачи', customers: 'Клиенты', reports: 'Отчёты', load: 'Загрузка' },
  load: { title: 'Калькулятор загрузки', sub: 'Оценка заполнения 20/40/40HQ и числа контейнеров по списку груза.', addRow: '＋ Добавить груз', name: 'Наим.', qty: 'Кол-во', dimsCm: 'Размер Д·Ш·В (см)', weight: 'Вес (кг)', stack: 'Штаб.', util: 'Заполнение', results: 'Оценка', totalCbm: 'Объём', totalWeight: 'Вес', totalQty: 'Всего', needed: 'Контейнеров', fill: 'Заполнение', bindVol: 'по объёму', bindWt: 'по весу', maxUnits: 'Макс/шт', unit: '', recommended: 'Лучший', notFit: 'не влезает', freight: 'Фрахт (за конт., опц.)', empty: 'Добавьте груз, чтобы увидеть результат.', disclaimer: 'Оценка по объёму и весу. Реальное заполнение зависит от формы груза и штабелирования.', remove: 'Удалить', view3d: '3D-схема', rotate: 'Повернуть', packed: 'Уложено', unplaced: 'Не влезло', cap: 'показана часть', upload: 'Загрузить Excel·CSV', uploadHint: 'Столбцы: наим.·кол-во·Д·Ш·В·вес·штаб. (опц.)', color: 'Цвет', lay: 'Класть', maxLayers: 'Макс. ярусов', maxLayersHint: '0 = без огр.', cog: 'Центр тяжести', cogL: 'Длина', cogW: 'Ширина', cogOk: 'Сбалансировано', cogWarn: 'Смещён' },
  role: 'Офис-администратор', signOut: 'Выйти', menu: 'Меню',
  titles: { home: 'Панель', new: 'Создать задачу', board: 'Задачи', customers: 'Клиенты', reports: 'Отчёты', review: 'Проверка задачи', report: 'Отчёт-подтверждение' },
  subs: {
    home: 'Задачи на сегодня — с одного взгляда.', new: 'Задайте обязательные фото и исполнителя, чтобы создать ссылку.',
    board: 'Поиск по контейнеру или дате, проверка по статусу.', customers: 'Добавляйте и редактируйте клиентов для задач.', reports: 'Список опубликованных отчётов.',
  },
  newJob: '＋ Задача', loading: 'Загрузка…',
  common: { cancel: 'Отмена', save: 'Сохранить', edit: 'Изменить', delete: 'Удалить', add: 'Добавить', confirm: 'ОК', close: 'Закрыть' },
  dash: {
    needCheck: 'Нужна проверка', inProgress: 'В работе', done: 'Готово', damage: 'Повреждение',
    recent: 'Недавние задачи', viewAll: 'Все', empty: 'Пока нет задач', emptyHint: 'Создайте первую задачу и выдайте ссылку.',
    quickStart: 'Быстрый старт', quickSub: 'Задайте фото и исполнителя, чтобы создать ссылку.', newJobFull: '＋ Создать задачу', viewBoard: 'К задачам', total: 'Всего задач',
  },
  board: {
    search: 'Поиск: № контейнера / клиент', date: 'Дата работ', clearDate: 'Сбросить дату',
    filters: { 전체: 'Все', 대기: 'Ожидание', 확인필요: 'Нужна проверка', 진행중: 'В работе', 완료: 'Готово', 데미지: 'Повреждение' },
    col: { container: 'Контейнер', customer: 'Клиент', type: 'Тип', date: 'Дата', assignee: 'Исполнитель', progress: 'Прогресс', status: 'Статус' },
    status: { 대기: 'Ожидание', 진행중: 'В работе', 확인필요: 'Нужна проверка', 완료: 'Готово', 데미지: 'Повреждение' },
    noMatch: 'Нет задач по фильтрам.', hint: 'Нажмите контейнер или клиента, чтобы открыть проверку.',
    editName: 'Имя исполнителя', editContact: 'Контакт исполнителя', editDate: 'Дата работ',
    empty: 'Пока нет задач', emptyHint: 'Нажмите «Новая задача» выше, чтобы создать первую.',
    delTitle: 'Удалить задачу', delMsg: 'Удалить задачу вместе с фото и ссылками?', delPublished: 'Задача опубликована. Удаление уберёт и ссылку получателя, и фото. Всё равно удалить?',
    deleted: 'Задача удалена.', saved: 'Сохранено.',
  },
  create: {
    customer: 'Клиент', type: 'Тип задачи', container: '№ контейнера', containerPh: 'TCLU1234567 (через запятую)',
    containerHint: 'Введите хотя бы один номер контейнера.', needPhotos: 'Обязательные фото', unit: '',
    workDate: 'Дата работ', assigneeName: 'Имя исполнителя', assigneeContact: 'Контакт исполнителя', assigneeEmail: 'Email исполнителя', submit: 'Создать ссылку и QR',
    noCustomer: 'Сначала добавьте клиента.', manageCustomers: 'К клиентам',
    successTitle: 'Ссылка создана', successSub: 'Отправьте исполнителю в чат/SMS или покажите QR.',
    containerNo: 'CONTAINER No.', scan: 'Скан на объекте', sendWorker: 'Отправить ссылку исполнителю', oneMore: 'Ещё задача', toBoard: 'К задачам →', issued: 'Ссылка создана.',
  },
  customer: {
    add: 'Добавить клиента', edit: 'Изменить клиента', name: 'Название', contact: 'Контактное лицо', phone: 'Телефон', email: 'Email',
    empty: 'Клиентов пока нет', emptyHint: 'Добавьте первого клиента ниже.', noContact: 'Нет контакта',
    nameRequired: 'Введите название.', delTitle: 'Удалить клиента', delMsg: (n: string) => `Удалить клиента «${n}»?`,
    blocked: 'У клиента есть задачи — удаление невозможно.', added: 'Клиент добавлен.', updated: 'Клиент обновлён.', deleted: 'Клиент удалён.',
  },
  reports: { empty: 'Опубликованных отчётов пока нет', emptyHint: 'Публикация отчёта из проверки добавит его сюда.', col: { container: 'Контейнер', customer: 'Клиент', type: 'Тип' }, open: 'Открыть отчёт', done: 'Готово', damage: 'Повреждение' },
  preview: { head: 'Предпросмотр ссылки исполнителя', type: 'Тип задачи', customer: 'Клиент', carrier: 'Перевозчик', needPhotos: 'Обязательные фото', unit: '', hint: 'Исполнитель просто открывает ссылку и снимает — без установки приложения.', inspect: (r: string) => `${r} — контроль загрузки` },
  review: {
    back: 'Задачи', reviewBack: 'Проверка', summary: 'Итоги проверки', rate: 'Готовность', captured: 'Снято', missing: 'Не хватает', damage: 'Повреждение', unit: '',
    publish: 'Опубликовать', publishing: 'Публикация…', viewReport: 'Открыть отчёт', published: 'Отчёт опубликован', pdf: 'Скачать PDF',
    kicker: 'CONCHECK ОТЧЁТ', verified: 'VERIFIED', verifiedSub: 'съёмка→проверка', rateT: 'Готовность', photos: 'Фото', damageT: 'Повреждение', seal: 'Пломба №',
    publishedBy: 'Опубликовано', locked: '🔒 Версия зафиксирована', shareViewer: 'Отправить ссылку получателю',
    revoke: 'Отозвать ссылку', revokeTitle: 'Отозвать ссылку', revokeMsg: 'Ссылка получателя станет недействительной — просмотр будет недоступен. Отозвать?', revoked: 'Ссылка отозвана.',
    aiRun: '✨ AI-проверка', aiTitle: 'AI-проверка', aiRunning: 'AI проверяет…', aiNumber: '№', aiSeal: 'Пломба', aiMatch: 'совпадает', aiMismatch: 'не совпадает', aiUnread: 'не распознано', aiDamage: 'Повреждение', aiNoDamage: 'нет', aiReshoot: 'Переснять', aiQualityOk: 'Норма', aiUnit: '', aiBlur: 'размыто', aiIllegible: 'нечитаемо', aiSubject: 'не тот кадр', aiFail: 'Ошибка AI-анализа',
    notCaptured: 'Нет фото', captured2: 'Снято', missing2: 'Не хватает', damageSec: (n: number) => `Фото повреждений · ${n}`, image: 'Фото',
    zoomAlt: 'Увеличенное фото', loadErr: 'Не удалось загрузить. Проверьте сеть и повторите.', retry: 'Повторить',
  },
};

export type AdminDict = typeof ko;
const AT: Record<AdminLang, AdminDict> = { ko, en, zh, ru };

const LangCtx = createContext<{ lang: AdminLang; setLang: (l: AdminLang) => void }>({ lang: 'ko', setLang: () => {} });

export function AdminLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AdminLang>(() => {
    try { return (localStorage.getItem('cc.adminLang') as AdminLang) || 'ko'; } catch { return 'ko'; }
  });
  const setLang = (l: AdminLang) => { setLangState(l); try { localStorage.setItem('cc.adminLang', l); } catch { /* ignore */ } };
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);
export const useT = (): AdminDict => AT[useContext(LangCtx).lang];
