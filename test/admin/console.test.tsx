import { render, screen, fireEvent } from '@testing-library/react';
import { AdminConsole } from '../../src/admin/AdminConsole';

test('console shows the board and reveals the create form', async () => {
  render(<AdminConsole />);
  expect(screen.getByRole('heading', { name: /관리자 콘솔/ })).toBeInTheDocument();
  expect(await screen.findByText(/MTL 지사/)).toBeInTheDocument();           // board loaded
  fireEvent.click(screen.getByRole('button', { name: /새 작업/ }));
  expect(await screen.findByRole('button', { name: /작업 생성/ })).toBeInTheDocument(); // form revealed
});

test('거래처 button switches to the customer manager view', async () => {
  render(<AdminConsole />);
  await screen.findByText(/MTL 지사/);
  fireEvent.click(screen.getByRole('button', { name: /^거래처$/ }));
  expect(await screen.findByRole('heading', { name: /거래처 관리/ })).toBeInTheDocument();
});

test('shows the usage guide strip', async () => {
  render(<AdminConsole />);
  expect(await screen.findByText(/사용 방법/)).toBeInTheDocument();
});
