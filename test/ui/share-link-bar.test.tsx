import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ShareLinkBar } from '../../src/ui/ShareLinkBar';

// 送信手段は日本の現場に合わせて LINE・メール・QR に絞っている。
// Telegram・カカオトーク・WeChat は日本の倉庫で使われないため外した。
test('LINE link carries the title and url in the message body', () => {
  render(<ShareLinkBar url="https://x.test/c/TOK" title="撮影のお願い" />);
  const href = screen.getByTestId('share-line').getAttribute('href') ?? '';
  expect(href).toContain('line.me/R/msg/text/');
  expect(decodeURIComponent(href)).toContain('https://x.test/c/TOK');
  expect(decodeURIComponent(href)).toContain('撮影のお願い');
});

test('mail link puts the url in the body', () => {
  render(<ShareLinkBar url="https://x.test/c/TOK" title="撮影のお願い" />);
  const href = screen.getByTestId('share-mail').getAttribute('href') ?? '';
  expect(href.startsWith('mailto:')).toBe(true);
  expect(decodeURIComponent(href)).toContain('https://x.test/c/TOK');
});

test('copy button writes the url to clipboard', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  render(<ShareLinkBar url="https://x.test/c/TOK" />);
  fireEvent.click(screen.getByTestId('share-copy'));
  expect(writeText).toHaveBeenCalledWith('https://x.test/c/TOK');
});

test('QR button toggles the code', () => {
  render(<ShareLinkBar url="https://x.test/c/TOK" />);
  expect(screen.queryByTestId('share-qr-code')).toBeNull();
  fireEvent.click(screen.getByTestId('share-qr'));
  expect(screen.getByTestId('share-qr-code')).toBeInTheDocument();
});
