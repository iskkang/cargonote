import { render, screen, fireEvent } from '@testing-library/react';
import { AdminConsole } from '../../src/admin/AdminConsole';

test('defaults to the new-work view with the create form + link preview', async () => {
  render(<AdminConsole />);
  expect(await screen.findByRole('button', { name: /발급하기/ })).toBeInTheDocument();
  expect(screen.getByText(/작업자에게 전달될 링크 미리보기/)).toBeInTheDocument();
});

test('작업 현황 nav shows the board', async () => {
  render(<AdminConsole />);
  fireEvent.click(screen.getByRole('button', { name: /작업 현황/ }));
  expect(await screen.findByText(/MTL 지사/)).toBeInTheDocument();
});

test('거래처 nav switches to the customer manager view', async () => {
  render(<AdminConsole />);
  fireEvent.click(screen.getByRole('button', { name: /^거래처$/ }));
  expect(await screen.findByText(/칭다오 파트너/)).toBeInTheDocument();
});

test('리포트 nav is disabled (준비중)', async () => {
  render(<AdminConsole />);
  expect(screen.getByRole('button', { name: /리포트/ })).toBeDisabled();
});
