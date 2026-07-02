import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../src/routes';

test('gates /admin behind the login form when unauthenticated', async () => {
  render(<MemoryRouter initialEntries={['/admin']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByLabelText(/이메일/)).toBeInTheDocument();
});

test('renders the capture spike at /spike', async () => {
  render(<MemoryRouter initialEntries={['/spike']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: /캡처 스파이크/ })).toBeInTheDocument();
});

test('renders a placeholder for the viewer gallery link', () => {
  render(<MemoryRouter initialEntries={['/v/abc123']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByText(/준비 중/)).toBeInTheDocument();
});

test('renders WorkerCapture for a worker capture link (unknown token → 잘못된 링크)', async () => {
  render(<MemoryRouter initialEntries={['/c/abc123']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByText(/잘못된 링크/)).toBeInTheDocument();
});
