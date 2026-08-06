import { render, screen, fireEvent } from '@testing-library/react';
import { CreateWorkOrder } from '../../src/admin/CreateWorkOrder';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('creates a work order and shows a worker capture link', async () => {
  const repo = createInMemoryAdminRepo();
  render(<CreateWorkOrder repo={repo} />);
  fireEvent.change(await screen.findByLabelText(/コンテナ番号/), { target: { value: 'TCLU7654321' } });
  fireEvent.change(screen.getByLabelText(/担当者名/), { target: { value: '高橋' } });
  fireEvent.click(screen.getByRole('button', { name: /発行/}));
  const link = await screen.findByTestId('worker-link');
  expect(link.textContent).toMatch(/\/c\/[A-Za-z0-9]+/);
});

test('disables the issue button until a container number is entered', async () => {
  const repo = createInMemoryAdminRepo();
  render(<CreateWorkOrder repo={repo} />);
  const submit = await screen.findByRole('button', { name: /発行/});
  expect(submit).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/コンテナ番号/), { target: { value: 'TCLU7654321' } });
  expect(submit).toBeEnabled();
});

test('a load plan seeds one container slot per planned container', async () => {
  const repo = createInMemoryAdminRepo();
  const plan = { containerLabel: "40' HQ", containerCount: 2, fills: [79, 24], cargoKinds: 3, cargoQty: 60, totalCbm: 90.5, totalWeight: 12000 };
  render(<CreateWorkOrder repo={repo} plan={plan} />);
  const input = await screen.findByLabelText(/コンテナ番号/) as HTMLInputElement;
  expect(input.value).toBe("40' HQ #1, 40' HQ #2");
  expect(screen.getByText(/積付計画から引き継ぎ/)).toBeInTheDocument();
});

test('guides to add a customer when none exist', async () => {
  const empty = { ...createInMemoryAdminRepo(), listCustomers: async () => [] };
  render(<CreateWorkOrder repo={empty} />);
  expect(await screen.findByText(/先に取引先を登録してください/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /発行/})).toBeDisabled();
});
