// 日本市場向けに日本語のみを扱う。ko/en/zh/ru は廃止した。
// Lang 型と LANGS を残してあるのは、言語切り替えの呼び出し側を一度に
// 書き換えずに済ませるためではなく、将来また複数言語に戻すときの
// 差し込み口を明示しておくためである。今は 'ja' しか存在しない。
export type Lang = 'ja';

export const LANGS: { code: Lang; label: string }[] = [{ code: 'ja', label: '日本語' }];

interface Strings {
  report: string; selectAll: string; download: string; wechatHint: string;
  date: string; customer: string; route: string; photos: string; unit: string;
  documents: string; noDocs: string; invalid: string;
}

export const T: Record<Lang, Strings> = {
  ja: {
    report: '作業証跡レポート',
    selectAll: 'すべて選択',
    download: '選択した写真をダウンロード',
    // 日本の現場は WeChat を使わない。共有リンクをそのまま開く案内に置き換える。
    wechatHint: 'リンクをそのまま開いてご覧いただけます',
    date: '作業日',
    customer: '取引先',
    route: '航路',
    photos: '写真',
    unit: '枚',
    documents: '書類',
    noDocs: '添付なし',
    invalid: 'リンクが正しくありません。',
  },
};

// 必須撮影スロットの表示名(TSR/TCR テンプレートに対応)+ 損傷。
export const SLOT_LABELS: Record<string, Partial<Record<Lang, string>>> = {
  empty: { ja: '空コンテナ' },
  half: { ja: '半積み' },
  full: { ja: '満載' },
  shoring: { ja: 'ショアリング・固縛後' },
  one_door: { ja: '片扉閉鎖' },
  sealed: { ja: '封印完了' },
  seal: { ja: 'シール接写' },
  csc: { ja: 'CSC プレート' },
  damage: { ja: '損傷' },
};

/** 訳語があればそれを、無ければマニフェストに保存された表示名をそのまま返す。 */
export function photoLabel(slotKey: string | null, fallback: string, lang: Lang): string {
  const t = slotKey ? SLOT_LABELS[slotKey]?.[lang] : undefined;
  return t ?? fallback;
}
