import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { C, FONT } from './tokens';

/**
 * トークンリンクの共有列 — LINE / メール / QR / コピー。外部キーは不要。
 *
 * 送信手段は日本の現場に合わせている。以前は Telegram・カカオトーク・WeChat を
 * 並べていたが、日本の倉庫で作業者に送る手段としては使われない。
 * LINE と メール、そして現場でそのまま見せる QR に絞る。
 */
export function ShareLinkBar({ url, title = 'バンニング検品 撮影リンク', testId }: { url: string; title?: string; testId?: string }) {
  const [qrOpen, setQrOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // LINE の共有スキーム。本文に URL を含めて送る。
  const lineHref = `https://line.me/R/msg/text/?${encodeURIComponent(`${title}\n${url}`)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;

  async function copy() {
    try { await navigator.clipboard?.writeText(url); setNote('リンクをコピーしました。'); }
    catch { setNote('コピーできませんでした — リンクを長押ししてコピーしてください。'); }
  }

  return (
    <div data-testid="share-bar">
      <div style={sx.row}>
        <a data-testid="share-line" href={lineHref} target="_blank" rel="noreferrer" title="LINE で送る" style={{ ...sx.btn, background: '#06C755' }}>
          <Bubble color="#fff" />
        </a>
        <a data-testid="share-mail" href={mailHref} title="メールで送る" style={{ ...sx.btn, background: '#5A6B7D' }}>
          <MailIcon />
        </a>
        <button data-testid="share-qr" type="button" onClick={() => setQrOpen((v) => !v)} title="QR コードを表示" style={{ ...sx.btn, background: C.navy }}>
          <QrIcon />
        </button>
        <button data-testid="share-copy" type="button" onClick={copy} title="リンクをコピー" style={{ ...sx.btn, background: C.surfaceAlt, border: `1px solid ${C.line}` }}>
          <LinkIcon />
        </button>
        <code data-testid={testId} style={sx.url}>{url}</code>
      </div>

      {qrOpen && (
        <div data-testid="share-qr-code" style={sx.qrCard}>
          <QRCodeSVG value={url} size={132} bgColor="#ffffff" fgColor={C.navy} />
          <div style={sx.qrHint}>現場でこの QR を読み取ってください</div>
        </div>
      )}
      {note && <div style={sx.note}>{note}</div>}
    </div>
  );
}

function MailIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M3 6.5l9 6.5 9-6.5" /></svg>;
}
function QrIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff"><path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm9-2h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5zm9-2h3v3h-3v-3zm5 0h2v2h-2v-2zm-5 5h3v2h-3v-2zm5 0h2v2h-2v-2z" /></svg>;
}
function Bubble({ color }: { color: string }) {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill={color}><path d="M12 3C6.5 3 2 6.6 2 11c0 2.5 1.5 4.7 3.8 6.1L5 21l4.3-2.2c.9.2 1.8.3 2.7.3 5.5 0 10-3.6 10-8s-4.5-8-10-8z" /></svg>;
}
function LinkIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1" /><path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" /></svg>;
}

const sx = {
  row: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginTop: 6 } as const,
  btn: { width: 36, height: 36, borderRadius: 999, border: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textDecoration: 'none' } as const,
  url: { fontFamily: FONT.sans, fontSize: 12, color: C.text, wordBreak: 'break-all' as const, marginLeft: 4 } as const,
  qrCard: { marginTop: 12, display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8, padding: 14, background: C.white, border: `1px solid ${C.line}`, borderRadius: 12 } as const,
  qrHint: { fontFamily: FONT.sans, fontSize: 12, color: C.text } as const,
  note: { fontFamily: FONT.sans, fontSize: 12, color: C.teal, marginTop: 8 } as const,
};
