import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../src/routes';

test('gates /admin behind the login form when unauthenticated', async () => {
  render(<MemoryRouter initialEntries={['/admin']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByLabelText(/メールアドレス/)).toBeInTheDocument();
});

test('renders the capture spike at /spike', async () => {
  render(<MemoryRouter initialEntries={['/spike']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: /キャプチャ スパイク/ })).toBeInTheDocument();
});

test('renders the viewer gallery route (invalid token → リンクが正しくありません)', async () => {
  render(<MemoryRouter initialEntries={['/v/abc123']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByText(/リンクが正しくありません/)).toBeInTheDocument();
});

test('renders WorkerCapture for a worker capture link (unknown token → リンクが正しくありません)', async () => {
  render(<MemoryRouter initialEntries={['/c/abc123']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByText(/リンクが正しくありません/)).toBeInTheDocument();
});
