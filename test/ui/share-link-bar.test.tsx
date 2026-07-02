import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ShareLinkBar } from '../../src/ui/ShareLinkBar';

test('telegram link points to t.me share with the encoded url', () => {
  render(<ShareLinkBar url="https://x.test/c/TOK" title="촬영 요청" />);
  const tg = screen.getByTestId('share-telegram');
  expect(tg.getAttribute('href')).toContain('t.me/share/url');
  expect(tg.getAttribute('href')).toContain(encodeURIComponent('https://x.test/c/TOK'));
});

test('copy button writes the url to clipboard', () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  render(<ShareLinkBar url="https://x.test/c/TOK" />);
  fireEvent.click(screen.getByTestId('share-copy'));
  expect(writeText).toHaveBeenCalledWith('https://x.test/c/TOK');
});

test('wechat button toggles a QR code', () => {
  render(<ShareLinkBar url="https://x.test/c/TOK" />);
  expect(screen.queryByTestId('wechat-qr')).toBeNull();
  fireEvent.click(screen.getByTestId('share-wechat'));
  expect(screen.getByTestId('wechat-qr')).toBeInTheDocument();
});
