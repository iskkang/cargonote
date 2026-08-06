import { createContext, useContext, type ReactNode } from 'react';

// 日本市場向けに日本語のみを扱う。ko/en/zh/ru は廃止した。
// 型の形は残す — 将来また複数言語に戻すときの差し込み口を明示しておく。
export type AdminLang = 'ja';
export const ADMIN_LANGS: { code: AdminLang; label: string }[] = [{ code: 'ja', label: '日本語' }];

const ja = {
  nav: { home: 'ダッシュボード', new: '新規作業', board: '作業状況', customers: '取引先', reports: 'レポート', load: '積付計算' },
  load: { title: '積付計算', sub: '貨物リストから 20/40/40HQ の積載率と必要コンテナ本数を試算します。', addRow: '＋ 貨物を追加', name: '品名', qty: '数量', dimsCm: '寸法 L・W・H (cm)', weight: '重量(kg)', stack: '積み重ね', util: '想定積載率', results: '積付の試算', totalCbm: '総容積', totalWeight: '総重量', totalQty: '総数量', needed: '必要コンテナ', fill: '積載率', bindVol: '容積で決まる', bindWt: '重量で決まる', maxUnits: '1本あたり最大', unit: '本', recommended: '推奨', notFit: '寸法超過', freight: '運賃(1本あたり・任意)', empty: '貨物を追加すると結果が出ます。', disclaimer: '容積と重量にもとづく試算です。実際の積載率は貨物の形状や積み重ねの制約に左右されます。', remove: '削除', view3d: '3D 積付図', rotate: '回転', packed: '積付済み', unplaced: '未積付', cap: '表示は上位のみ', upload: 'Excel・CSV を取り込む', uploadHint: '列: 品名・数量・L・W・H・重量・積み重ね(任意)', color: '色', lay: '横倒し', maxLayers: '最大段数', maxLayersHint: '0 = 無制限', cog: '重心', cogL: '長さ方向', cogW: '幅方向', cogOk: 'バランス良好', cogWarn: '偏りに注意', createJob: 'この積付で作業を作成', maxW: '上に載る重量', maxH: '積み上げ高さ', maxWHint: 'この貨物の上に載せられる最大重量(kg)。空欄で無制限', maxHHint: 'この貨物の上にさらに積める高さ(cm)。空欄で無制限', gap: '積付の余裕', gapHint: 'エアバッグ・合板など貨物間の隙間(cm)。各貨物の縦横に反映', free: '余裕', axisH: '高さ' },
  role: '事務所管理者', signOut: 'ログアウト', menu: 'メニュー',
  titles: { home: 'ダッシュボード', new: '新規作業の作成', board: '作業状況', customers: '取引先の管理', reports: 'レポート', review: '作業の検品', report: '作業証跡レポート' },
  subs: {
    home: '本日の作業状況をひと目で。', new: '撮影項目と担当者を決めると、作業者へ送るリンクが作られます。',
    board: 'コンテナ番号・作業日で検索し、状態ごとに検品します。', customers: '作業を指示する取引先を追加・修正します。', reports: '発行済みの作業証跡レポートの一覧です。',
  },
  newJob: '＋ 新規作業', loading: '読み込み中…',
  common: { cancel: 'キャンセル', save: '保存', edit: '修正', delete: '削除', add: '追加', confirm: '確認', close: '閉じる' },
  dash: {
    needCheck: '要確認', inProgress: '進行中', done: '完了', damage: '損傷',
    recent: '最近の作業', viewAll: 'すべて見る', empty: 'まだ作業がありません', emptyHint: '最初の作業を作ってリンクを発行してください。',
    quickStart: 'はじめに', quickSub: '撮影項目と担当者を決めると、作業者リンクが作られます。', newJobFull: '＋ 新規作業を作成', viewBoard: '作業状況を見る', total: '全作業',
  },
  board: {
    search: 'コンテナ番号・取引先で検索', date: '作業日', clearDate: '日付を解除',
    // キーは状態の内部値なので変更しない。値だけ日本語にする。
    filters: { 전체: 'すべて', 대기: '待機', 확인필요: '要確認', 진행중: '進行中', 완료: '完了', 데미지: '損傷' },
    col: { container: 'コンテナ', customer: '取引先', type: '作業種別', date: '作業日', assignee: '担当', progress: '進捗', status: '状態' },
    status: { 대기: '待機', 진행중: '進行中', 확인필요: '要確認', 완료: '完了', 데미지: '損傷' },
    noMatch: '条件に合う作業がありません。', hint: 'コンテナ・取引先を押すと検品画面へ移動します。',
    editName: '担当者名', editContact: '担当者の連絡先', editDate: '作業日',
    empty: 'まだ作業がありません', emptyHint: '上の「新規作業」から最初の作業指示を作ってください。',
    plan: '計画', delTitle: '作業の削除', delMsg: 'この作業と写真・リンクを削除しますか。', delPublished: '発行済みの作業です。削除すると受取側のリンクと写真も併せて消えます。削除しますか。',
    deleted: '作業を削除しました。', saved: '保存しました。',
  },
  create: {
    customer: '取引先', type: '作業種別', container: 'コンテナ番号', containerPh: 'TCLU1234567 (カンマ区切りで複数)',
    plan: '積付計画から引き継ぎ', planClear: '消す', planHint: '仮番号は実際のコンテナ番号に置き換えてください。',
    containerHint: '撮影するコンテナ番号を1つ以上入力してください。', needPhotos: '必要な写真', unit: '枚',
    workDate: '作業日', assigneeName: '担当者名', assigneeContact: '担当者の連絡先', assigneeEmail: '担当者のメールアドレス', submit: 'リンク・QR を発行',
    noCustomer: '先に取引先を登録してください。', manageCustomers: '取引先の管理へ',
    successTitle: 'リンクを発行しました', successSub: '作業者へ SMS などで送るか、QR を見せてください。',
    containerNo: 'CONTAINER No.', scan: '現場でスキャン', sendWorker: '作業者にリンクを送る', oneMore: 'もう一件作成', toBoard: '作業状況へ →', issued: 'リンクを発行しました。',
  },
  customer: {
    add: '取引先を追加', edit: '取引先を修正', name: '取引先名', contact: '担当者', phone: '電話番号', email: 'メールアドレス',
    empty: '登録された取引先がありません', emptyHint: '下から最初の取引先を追加してください。', noContact: '連絡先なし',
    nameRequired: '取引先名を入力してください。', delTitle: '取引先の削除', delMsg: (n: string) => `「${n}」を削除しますか。`,
    blocked: 'この取引先で作成した作業があるため削除できません。', added: '取引先を追加しました。', updated: '取引先を修正しました。', deleted: '取引先を削除しました。',
  },
  reports: { empty: '発行されたレポートがありません', emptyHint: '作業の検品で「レポート発行」を行うと、ここに溜まります。', col: { container: 'コンテナ', customer: '取引先', type: '作業種別' }, open: 'レポートを見る', done: '完了', damage: '損傷' },
  preview: { head: '作業者に渡されるリンクのプレビュー', type: '作業種別', customer: '取引先', carrier: '船社', needPhotos: '必要な写真', unit: '枚', hint: '作業者はこのリンクを押すだけで、アプリを入れずに撮影を始められます。', inspect: (r: string) => `${r} バンニング検品` },
  review: {
    back: '作業状況', reviewBack: '検品画面', summary: '検品サマリー', rate: '完了率', captured: '撮影完了', missing: '不足', damage: '損傷', unit: '枚',
    publish: 'レポート発行', publishing: '発行中…', viewReport: '発行したレポートを見る', published: 'レポートを発行しました', pdf: 'PDF ダウンロード',
    kicker: 'CONCHECK 作業証跡レポート', verified: 'VERIFIED', verifiedSub: '撮影→検証', rateT: '完了率', photos: '写真', damageT: '損傷', seal: 'Seal No.',
    publishedBy: '発行', locked: '🔒 発行版を固定', shareViewer: '受取側にリンクを送る',
    revoke: 'リンクを無効化', revokeTitle: 'リンクの無効化', revokeMsg: '受取側のリンクを無効にします。受け取った方は以後閲覧できません。無効にしますか。', revoked: 'リンクを無効にしました。',
    aiRun: '✨ AI 自動検品', aiTitle: 'AI 自動検品', aiRunning: 'AI 検品中…', aiNumber: '番号', aiSeal: 'シール', aiMatch: '一致', aiMismatch: '不一致', aiUnread: '判読できず', aiDamage: '損傷', aiNoDamage: 'なし', aiReshoot: '再撮影が必要', aiQualityOk: '品質良好', aiUnit: '枚', aiBlur: 'ぶれ', aiIllegible: '判読不可', aiSubject: '被写体が違う', aiFail: 'AI 解析に失敗しました',
    notCaptured: '未撮影', captured2: '撮影済み', missing2: '不足', damageSec: (n: number) => `損傷写真 · ${n}枚`, image: '画像',
    zoomAlt: '拡大画像', loadErr: '読み込めませんでした。通信を確認してもう一度お試しください。', retry: '再試行',
  },
};

export type AdminDict = typeof ja;
const AT: Record<AdminLang, AdminDict> = { ja };

// 言語は 'ja' 固定。切り替えは廃止したので setLang は何もしない。
// Provider と useLang を残すのは、呼び出し側の形を変えずに済ませるため。
const LangCtx = createContext<{ lang: AdminLang; setLang: (l: AdminLang) => void }>({ lang: 'ja', setLang: () => {} });

export function AdminLangProvider({ children }: { children: ReactNode }) {
  return <LangCtx.Provider value={{ lang: 'ja', setLang: () => {} }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);
export const useT = (): AdminDict => AT[useContext(LangCtx).lang];
