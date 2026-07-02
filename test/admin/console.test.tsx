import { render, screen, fireEvent } from '@testing-library/react';
import { AdminConsole } from '../../src/admin/AdminConsole';

test('console shows the board and reveals the create form', async () => {
  render(<AdminConsole />);
  expect(screen.getByRole('heading', { name: /관리자 콘솔/ })).toBeInTheDocument();
  expect(await screen.findByText(/MTL 지사/)).toBeInTheDocument();           // board loaded
  fireEvent.click(screen.getByRole('button', { name: /새 작업/ }));
  expect(await screen.findByRole('button', { name: /작업 생성/ })).toBeInTheDocument(); // form revealed
});
