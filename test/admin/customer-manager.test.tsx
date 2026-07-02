import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { CustomerManager } from '../../src/admin/CustomerManager';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('lists seeded customers and adds a new one', async () => {
  const repo = createInMemoryAdminRepo();
  render(<CustomerManager repo={repo} />);
  expect(await screen.findByText(/칭다오 파트너/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/거래처명/), { target: { value: '신규물류' } });
  fireEvent.click(screen.getByRole('button', { name: /^추가$/ }));
  expect(await screen.findByText(/신규물류/)).toBeInTheDocument();
});

test('shows a blocking message when deleting a referenced customer', async () => {
  const repo = createInMemoryAdminRepo();
  const spy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  render(<CustomerManager repo={repo} />);
  await screen.findByText(/MTL 지사/);
  const row = screen.getByText(/MTL 지사/).closest('[data-testid="customer-row"]')!;
  fireEvent.click(row.querySelector('button:last-of-type') as HTMLButtonElement);
  expect(await screen.findByText(/작업이 있어 삭제할 수 없습니다/)).toBeInTheDocument();
  spy.mockRestore();
});
