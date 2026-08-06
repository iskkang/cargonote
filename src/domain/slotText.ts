/**
 * 撮影スロットの表示文(日本語)。
 *
 * ■ なぜ保存された文字列を使わないのか
 * 写真とテンプレートには、撮影した時点の label / instruction が文字列として
 * 保存されている。テンプレートを日本語に直しても、それ以前に作られた作業と
 * 写真は韓国語の文字列を抱えたままである。実際、2026-08 の検品画面に
 * 「빈 컨테이너」「씰 근접」がそのまま出ていた。
 *
 * そこで表示は必ず key から引く。key は写真と紐づく識別子なので変わらない。
 * 見つからない key(将来テンプレートが増えた場合)だけ、保存された文字列に戻す。
 */
const TEXT: Record<string, { label: string; instruction: string }> = {
  empty: { label: '空コンテナ', instruction: '番号が見えるように' },
  half: { label: '半積み', instruction: '番号が見えるように' },
  full: { label: '満載', instruction: '番号が見えるように' },
  shoring: { label: 'ショアリング・固縛後', instruction: '番号が見えるように、しっかり固定' },
  one_door: { label: '片扉閉鎖', instruction: '番号全体が見えるように' },
  sealed: { label: '封印完了(両扉)', instruction: 'シール封印' },
  seal: { label: 'シール接写', instruction: 'シール番号が読み取れるように' },
  csc: { label: 'CSC プレート', instruction: '番号規則の例外' },
  damage: { label: '損傷', instruction: '損傷箇所が分かるように' },
};

/** key に対応する表示名。無ければ保存されていた文字列。 */
export function slotLabel(key: string | null | undefined, fallback = ''): string {
  return (key && TEXT[key]?.label) || fallback;
}

/** key に対応する撮影指示。無ければ保存されていた文字列。 */
export function slotInstruction(key: string | null | undefined, fallback = ''): string {
  return (key && TEXT[key]?.instruction) || fallback;
}
