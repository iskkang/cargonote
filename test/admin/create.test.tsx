import { render, screen, fireEvent } from '@testing-library/react';
import { CreateWorkOrder } from '../../src/admin/CreateWorkOrder';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('creates a work order and shows a worker capture link', async () => {
  const repo = createInMemoryAdminRepo();
  render(<CreateWorkOrder repo={repo} />);
  fireEvent.change(await screen.findByLabelText(/컨테이너 번호/), { target: { value: 'TCLU7654321' } });
  fireEvent.change(screen.getByLabelText(/담당자 이름/), { target: { value: '박현장' } });
  fireEvent.click(screen.getByRole('button', { name: /발급하기/}));
  const link = await screen.findByTestId('worker-link');
  expect(link.textContent).toMatch(/\/c\/[A-Za-z0-9]+/);
});

test('disables 발급 until a container number is entered', async () => {
  const repo = createInMemoryAdminRepo();
  render(<CreateWorkOrder repo={repo} />);
  const submit = await screen.findByRole('button', { name: /발급하기/});
  expect(submit).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/컨테이너 번호/), { target: { value: 'TCLU7654321' } });
  expect(submit).toBeEnabled();
});

test('guides to add a customer when none exist', async () => {
  const empty = { ...createInMemoryAdminRepo(), listCustomers: async () => [] };
  render(<CreateWorkOrder repo={empty} />);
  expect(await screen.findByText(/먼저 거래처를 등록하세요/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /발급하기/})).toBeDisabled();
});
