import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewPanel } from '../../src/admin/ReviewPanel';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

const stubThumbs = async () => ({});
const stubSign = async () => ({});

test('shows container + checklist and publishes to a viewer link', async () => {
  const repo = createInMemoryAdminRepo();
  await repo.insertPhoto({ containerId: 'ctn-1', slotKey: 'seal', displayPath: 'd.webp', thumbPath: 't.webp', fileHash: 'h', byteSize: 1, capturedAt: '2026-07-02T01:00:00Z' });
  render(<ReviewPanel workOrderId="wo-2" repo={repo} onBack={() => {}} thumbUrls={stubThumbs} signViewer={stubSign} />);
  expect(await screen.findByText(/FBLU4204812/)).toBeInTheDocument();
  // 表示は key から引くので、保存された label ではなく slotText の訳語が出る。
  expect(screen.getByText(/シール接写/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /発行/ }));
  const link = await screen.findByTestId('viewer-link');
  expect(link.textContent).toMatch(/\/v\/[A-Za-z0-9]+/);
});

test('back button calls onBack', async () => {
  const repo = createInMemoryAdminRepo();
  let backed = false;
  render(<ReviewPanel workOrderId="wo-2" repo={repo} onBack={() => { backed = true; }} thumbUrls={stubThumbs} signViewer={stubSign} />);
  fireEvent.click(await screen.findByRole('button', { name: /作業状況/ }));
  expect(backed).toBe(true);
});
