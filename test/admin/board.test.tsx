import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { WorkOrderBoard } from '../../src/admin/WorkOrderBoard';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('lists seeded work orders with customer, photo count, and derived status', async () => {
  render(<WorkOrderBoard repo={createInMemoryAdminRepo()} />);
  expect(await screen.findByText(/MTL 지사/)).toBeInTheDocument();
  expect(screen.getAllByText(/생성됨/).length).toBeGreaterThan(0); // no photos captured yet
  expect(screen.getAllByText(/0\/8/).length).toBeGreaterThan(0);   // capture progress column
});

test('shows a row per seeded order', async () => {
  render(<WorkOrderBoard repo={createInMemoryAdminRepo()} />);
  const rows = await screen.findAllByTestId('wo-row');
  expect(rows.length).toBe(2);
});

test('삭제 removes a row after confirm', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  render(<WorkOrderBoard repo={createInMemoryAdminRepo()} />);
  await screen.findAllByTestId('wo-row');
  fireEvent.click(screen.getAllByRole('button', { name: /삭제/ })[0]);
  await waitFor(() => expect(screen.getAllByTestId('wo-row').length).toBe(1));
});

test('수정 saves and persists the new assignee', async () => {
  render(<WorkOrderBoard repo={createInMemoryAdminRepo()} />);
  await screen.findAllByTestId('wo-row');
  fireEvent.click(screen.getAllByRole('button', { name: /수정/ })[0]);
  fireEvent.change(await screen.findByLabelText(/담당자 이름/), { target: { value: '변경담당' } });
  fireEvent.click(screen.getByRole('button', { name: /저장/ }));
  await waitFor(() => expect(screen.queryByLabelText(/담당자 이름/)).toBeNull());
  fireEvent.click(screen.getAllByRole('button', { name: /수정/ })[0]);
  expect((await screen.findByLabelText(/담당자 이름/) as HTMLInputElement).value).toBe('변경담당');
});
