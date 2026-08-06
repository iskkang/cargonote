// 日本市場向けに日本語のみを扱う。ko/en/zh/ru は廃止した。
// 将来また複数言語に戻すときのために型の形は残す。今は 'ja' しか存在しない。
export type Lang = 'ja';

export const LANGS: { code: Lang; label: string }[] = [{ code: 'ja', label: '日本語' }];

export interface Role { tag: string; title: string; desc: string; points: string[] }
export interface Feature { k: string; v: string }
export interface Compare { head: string; sub: string; beforeLabel: string; before: string[]; afterLabel: string; after: string[] }
export interface Qa { q: string; a: string }
export interface Dict {
  login: string; kicker: string; h1a: string; h1b: string; lead: string;
  start: string; how: string; trust: string[];
  compare: Compare;
  rolesHead: string; rolesSub: string; roles: Role[];
  stepsHead: string; steps: string[];
  featuresHead: string; features: Feature[];
  shotsHead: string; shotsSub: string; shots: string[];
  faqHead: string; faqSub: string; faq: Qa[];
  ctaTitle: string; ctaSub: string; ctaBtn: string; footer: string;
  proofDone: string; home: string;
}

export const T: Record<Lang, Dict> = {
  ja: {
    login: 'ログイン →', kicker: 'コンテナ作業の証跡プラットフォーム',
    h1a: 'コンテナ作業の証跡を、', h1b: 'リンク一つで完結',
    lead: '現場の撮影から検品・発行、受取側の閲覧まで — インストールもログインも要らず、リンク一つで。',
    start: '無料で始める', how: '使い方',
    trust: ['インストール不要', 'その場で検品', '証跡を固定', '受取側は登録不要'],
    compare: {
      head: 'メールでやり取りしていたものが、こう変わります',
      sub: '散らばった添付、撮り直し、確認の往復をリンク一つにまとめます。',
      beforeLabel: 'これまで',
      before: [
        'メールごとに散らばる写真の添付',
        'どのカットが足りないのか分からない',
        '受取側は添付を一枚ずつ開いて確認',
        '原本の差し替え・版の取り違え',
      ],
      afterLabel: 'ConCheck',
      after: [
        'リンク一つにすべての写真が整理される',
        '必須カットの不足を自動で表示',
        '受取側はリンクを開くだけで一覧',
        '発行時点のスナップショットで固定',
      ],
    },
    rolesHead: '役割ごとに、必要な画面だけ', rolesSub: '現場・事務所・お客様が、それぞれ必要なものだけを見ます。',
    roles: [
      {
        tag: '作業者 · 現場', title: 'インストールせず、撮るだけ',
        desc: 'リンクを開けば撮影画面。アプリもログインも要らず、案内の順に撮って送るだけ。',
        points: ['インストール不要の撮影', '手順ごとの撮影ガイド', '損傷は別途記録'],
      },
      {
        tag: '管理者 · 事務所', title: '進み具合をひと目で把握',
        desc: '作業の作成・リンク発行・検品・発行を一つの画面で。',
        points: ['コンテナごとの検品', '完了率・不足・損傷', '発行版を固定'],
      },
      {
        tag: '受取側 · 荷主', title: 'ログインなしで証跡を確認',
        desc: 'リンク一つで写真と証跡をそのまま閲覧。',
        points: ['ログイン不要のギャラリー', '証跡レポート', '写真の一括ダウンロード'],
      },
    ],
    stepsHead: '使い方', steps: ['作業を作成', 'リンク・QR を発行', '現場で撮影', '写真を検品', '発行 · 閲覧'],
    featuresHead: 'ConCheck を選ぶ理由',
    features: [
      { k: 'インストール不要', v: 'リンクからすぐ撮影 — アプリもログインも不要' },
      { k: '証跡の固定', v: '発行時点のスナップショットで版を固定' },
      { k: '受取側は登録不要', v: 'リンクを開くだけでレポートを確認' },
      { k: '損傷の証跡', v: '損傷貨物を現場で別途撮影' },
    ],
    shotsHead: '実際の画面', shotsSub: '管理者・現場・受取側、それぞれに合った画面。',
    shots: ['管理ダッシュボード', '現場写真の検品', '受取側の証跡ギャラリー'],
    faqHead: 'よくあるご質問', faqSub: '導入前によくいただくご質問です。',
    faq: [
      {
        q: 'アプリのインストールは必要ですか。',
        a: 'いりません。作業者は SMS で受け取ったリンクを開くと、そのまま撮影画面が表示されます。受取側もリンクだけで閲覧できます。インストールもログインも不要です。',
      },
      {
        q: '受取側にもログインが必要ですか。',
        a: '不要です。発行されたリンク一つで写真と証跡をそのまま確認できます。リンクは事務所側でいつでも無効にできます。',
      },
      {
        q: '写真が原本のままであることは、どう担保されますか。',
        a: '発行時点の写真と情報をスナップショットとして固定し、各写真に撮影時刻とハッシュを併せて記録します。発行後はその版がそのまま保たれます。',
      },
      {
        q: '対応言語を教えてください。',
        a: '日本語でご利用いただけます。受取側のギャラリーとこの紹介ページを含め、画面はすべて日本語です。',
      },
      {
        q: '損傷貨物はどう扱いますか。',
        a: '作業者が撮影中に損傷貨物を別途撮って送ることができ、管理画面とレポートに損傷として区別して表示されます。',
      },
    ],
    home: 'ホームへ',
    ctaTitle: '最初の作業を作ってみてください', ctaSub: 'アカウントでログインすると、すぐに始められます。',
    ctaBtn: '管理者ログイン', footer: 'ConCheck — コンテナ作業の証跡を自動化', proofDone: '撮影完了',
  },
};
