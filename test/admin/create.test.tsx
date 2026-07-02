import { render, screen, fireEvent } from '@testing-library/react';
import { CreateWorkOrder } from '../../src/admin/CreateWorkOrder';
import { createInMemoryAdminRepo } from '../../src/admin/repo';

test('creates a work order and shows a worker capture link', async () => {
  const repo = createInMemoryAdminRepo();
  render(<CreateWorkOrder repo={repo} />);
  fireEvent.change(await screen.findByLabelText(/컨테이너 번호/), { target: { value: 'TCLU7654321' } });
  fireEvent.change(screen.getByLabelText(/담당자 이름/), { target: { value: '박현장' } });
  fireEvent.click(screen.getByRole('button', { name: /작업 생성/ }));
  const link = await screen.findByTestId('worker-link');
  expect(link.textContent).toMatch(/\/c\/[A-Za-z0-9]+/);
});
