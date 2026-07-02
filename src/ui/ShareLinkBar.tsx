import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { C, FONT } from './tokens';

/** Icon share row for a token link — Telegram / KakaoTalk / WeChat(QR) / copy. No external keys. */
export function ShareLinkBar({ url, title = '적입 검수 촬영 링크', testId }: { url: string; title?: string; testId?: string }) {
  const [qrOpen, setQrOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const tgHref = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  async function copy() {
    try { await navigator.clipboard?.writeText(url); setNote('링크가 복사됐습니다.'); }
    catch { setNote('복사 실패 — 링크를 길게 눌러 복사하세요.'); }
  }
  async function kakao() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) { try { await nav.share({ title, url }); } catch { /* cancelled */ } }
    else { await copy(); setNote('링크 복사됨 — 카카오톡에 붙여넣어 보내세요.'); }
  }

  return (
    <div data-testid="share-bar">
      <div style={sx.row}>
        <a data-testid="share-telegram" href={tgHref} target="_blank" rel="noreferrer" title="텔레그램으로 공유" style={{ ...sx.btn, background: '#229ED9' }}>
          <PaperPlane />
        </a>
        <button data-testid="share-kakao" type="button" onClick={kakao} title="카카오톡으로 공유" style={{ ...sx.btn, background: '#FEE500' }}>
          <Bubble color="#3C1E1E" />
        </button>
        <button data-testid="share-wechat" type="button" onClick={() => setQrOpen((v) => !v)} title="위챗 QR 코드" style={{ ...sx.btn, background: '#07C160' }}>
          <Bubble color="#fff" />
        </button>
        <button data-testid="share-copy" type="button" onClick={copy} title="링크 복사" style={{ ...sx.btn, background: C.surfaceAlt, border: `1px solid ${C.line}` }}>
          <LinkIcon />
        </button>
        <code data-testid={testId} style={sx.url}>{url}</code>
      </div>

      {qrOpen && (
        <div data-testid="wechat-qr" style={sx.qrCard}>
          <QRCodeSVG value={url} size={132} bgColor="#ffffff" fgColor={C.navy} />
          <div style={sx.qrHint}>위챗에서 스캔해 링크를 여세요</div>
        </div>
      )}
      {note && <div style={sx.note}>{note}</div>}
    </div>
  );
}

function PaperPlane() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" /></svg>;
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
