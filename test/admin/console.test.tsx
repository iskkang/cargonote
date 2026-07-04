import { render, screen, fireEvent } from '@testing-library/react';
import { AdminConsole } from '../../src/admin/AdminConsole';

test('defaults to the dashboard overview', async () => {
  render(<AdminConsole />);
  expect(await screen.findByRole('heading', { name: '대시보드' })).toBeInTheDocument();
  expect(screen.getByText(/확인 필요/)).toBeInTheDocument();
});

test('새 작업 nav shows the create form + link preview', async () => {
  render(<AdminConsole />);
  fireEvent.click(screen.getByRole('button', { name: /^새 작업$/ }));
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

test('리포트 nav shows the published-reports list', async () => {
  render(<AdminConsole />);
  fireEvent.click(screen.getByRole('button', { name: /리포트/ }));
  expect(await screen.findByText(/발행된 리포트가 없습니다/)).toBeInTheDocument(); // seed has none published
});
