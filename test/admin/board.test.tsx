import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { WorkOrderBoard } from '../../src/admin/WorkOrderBoard';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('lists seeded work orders with customer and status', async () => {
  render(<WorkOrderBoard repo={createInMemoryAdminRepo()} />);
  expect(await screen.findByText(/MTL 지사/)).toBeInTheDocument();
  expect(await screen.findByText(/제출됨/)).toBeInTheDocument();
  expect(await screen.findByText(/전송됨/)).toBeInTheDocument();
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

test('수정 opens an edit form and saves', async () => {
  render(<WorkOrderBoard repo={createInMemoryAdminRepo()} />);
  await screen.findAllByTestId('wo-row');
  fireEvent.click(screen.getAllByRole('button', { name: /수정/ })[0]);
  const name = await screen.findByLabelText(/담당자 이름/);
  fireEvent.change(name, { target: { value: '변경담당' } });
  fireEvent.click(screen.getByRole('button', { name: /저장/ }));
  expect(await screen.findByText(/변경담당/)).toBeInTheDocument();
});
