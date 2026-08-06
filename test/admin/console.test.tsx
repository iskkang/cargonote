import { render, screen, fireEvent } from '@testing-library/react';
import { AdminConsole } from '../../src/admin/AdminConsole';

test('defaults to the dashboard overview', async () => {
  render(<AdminConsole />);
  expect(await screen.findByRole('heading', { name: 'ダッシュボード' })).toBeInTheDocument();
  expect(screen.getByText(/要確認/)).toBeInTheDocument();
});

test('新規作業 nav shows the create form + link preview', async () => {
  render(<AdminConsole />);
  fireEvent.click(screen.getByRole('button', { name: /^新規作業$/ }));
  expect(await screen.findByRole('button', { name: /発行/ })).toBeInTheDocument();
  expect(screen.getByText(/作業者に渡されるリンクのプレビュー/)).toBeInTheDocument();
});

test('作業状況 nav shows the board', async () => {
  render(<AdminConsole />);
  fireEvent.click(screen.getByRole('button', { name: /作業状況/ }));
  expect(await screen.findByText(/MTL ウラジオストク支店/)).toBeInTheDocument();
});

test('取引先 nav switches to the customer manager view', async () => {
  render(<AdminConsole />);
  fireEvent.click(screen.getByRole('button', { name: /^取引先$/ }));
  expect(await screen.findByText(/青島パートナー/)).toBeInTheDocument();
});

test('レポート nav shows the published-reports list', async () => {
  render(<AdminConsole />);
  fireEvent.click(screen.getByRole('button', { name: /レポート/ }));
  expect(await screen.findByText(/発行されたレポートがありません/)).toBeInTheDocument(); // seed has none published
});
