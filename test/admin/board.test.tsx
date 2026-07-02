import { render, screen } from '@testing-library/react';
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
