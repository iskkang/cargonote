import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { CustomerManager } from '../../src/admin/CustomerManager';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('lists seeded customers and adds a new one', async () => {
  const repo = createInMemoryAdminRepo();
  render(<CustomerManager repo={repo} />);
  expect(await screen.findByText(/青島パートナー/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/取引先名/), { target: { value: '新規物流' } });
  fireEvent.click(screen.getByRole('button', { name: /^追加$/ }));
  expect(await screen.findByText(/新規物流/)).toBeInTheDocument();
});

test('shows a blocking message when deleting a referenced customer', async () => {
  const repo = createInMemoryAdminRepo();
  const spy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  render(<CustomerManager repo={repo} />);
  await screen.findByText(/MTL ウラジオストク支店/);
  const row = screen.getByText(/MTL ウラジオストク支店/).closest('[data-testid="customer-row"]')!;
  fireEvent.click(row.querySelector('button:last-of-type') as HTMLButtonElement);
  expect(await screen.findByText(/削除できません/)).toBeInTheDocument();
  spy.mockRestore();
});
