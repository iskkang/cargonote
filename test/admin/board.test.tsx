import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { WorkOrderBoard } from '../../src/admin/WorkOrderBoard';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('lists seeded work orders with customer, photo count, and derived status', async () => {
  render(<WorkOrderBoard repo={createInMemoryAdminRepo()} />);
  expect(await screen.findByText(/MTL ウラジオストク支店/)).toBeInTheDocument();
  expect(screen.getAllByText(/待機/).length).toBeGreaterThan(0);   // no photos captured yet
  expect(screen.getAllByText(/0\/8/).length).toBeGreaterThan(0);   // capture progress column
});

test('shows a row per seeded order', async () => {
  render(<WorkOrderBoard repo={createInMemoryAdminRepo()} />);
  const rows = await screen.findAllByTestId('wo-row');
  expect(rows.length).toBe(2);
});

test('削除 removes a row after confirm', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  render(<WorkOrderBoard repo={createInMemoryAdminRepo()} />);
  await screen.findAllByTestId('wo-row');
  fireEvent.click(screen.getAllByRole('button', { name: /削除/ })[0]);
  await waitFor(() => expect(screen.getAllByTestId('wo-row').length).toBe(1));
});

test('修正 saves and persists the new assignee', async () => {
  render(<WorkOrderBoard repo={createInMemoryAdminRepo()} />);
  await screen.findAllByTestId('wo-row');
  fireEvent.click(screen.getAllByRole('button', { name: /修正/ })[0]);
  fireEvent.change(await screen.findByLabelText(/担当者名/), { target: { value: '佐藤' } });
  fireEvent.click(screen.getByRole('button', { name: /保存/ }));
  await waitFor(() => expect(screen.queryByLabelText(/担当者名/)).toBeNull());
  fireEvent.click(screen.getAllByRole('button', { name: /修正/ })[0]);
  expect((await screen.findByLabelText(/担当者名/) as HTMLInputElement).value).toBe('佐藤');
});
