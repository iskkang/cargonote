import { render, screen, fireEvent } from '@testing-library/react';
import { ReviewPanel } from '../../src/admin/ReviewPanel';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

const stubThumbs = async () => ({});

test('shows container + checklist and publishes to a viewer link', async () => {
  const repo = createInMemoryAdminRepo();
  await repo.insertPhoto({ containerId: 'ctn-1', slotKey: 'seal', displayPath: 'd.webp', thumbPath: 't.webp', fileHash: 'h', byteSize: 1, capturedAt: '2026-07-02T01:00:00Z' });
  render(<ReviewPanel workOrderId="wo-2" repo={repo} onBack={() => {}} thumbUrls={stubThumbs} />);

  expect(await screen.findByText(/FBLU4204812/)).toBeInTheDocument();     // container plate
  expect(screen.getByText(/씰 번호/)).toBeInTheDocument();                // a required slot label (TCR)
  fireEvent.click(screen.getByRole('button', { name: /발행/ }));
  const link = await screen.findByTestId('viewer-link');
  expect(link.textContent).toMatch(/\/v\/[A-Za-z0-9]+/);
});

test('back button calls onBack', async () => {
  const repo = createInMemoryAdminRepo();
  let backed = false;
  render(<ReviewPanel workOrderId="wo-2" repo={repo} onBack={() => { backed = true; }} thumbUrls={stubThumbs} />);
  fireEvent.click(await screen.findByRole('button', { name: /뒤로/ }));
  expect(backed).toBe(true);
});
