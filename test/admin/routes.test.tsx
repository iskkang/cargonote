import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../src/routes';

test('renders the admin console at /admin', () => {
  render(<MemoryRouter initialEntries={['/admin']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: /관리자 콘솔/ })).toBeInTheDocument();
});

test('renders the capture spike at /spike', async () => {
  render(<MemoryRouter initialEntries={['/spike']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: /캡처 스파이크/ })).toBeInTheDocument();
});

test('renders a placeholder for a worker capture link', () => {
  render(<MemoryRouter initialEntries={['/c/abc123']}><AppRoutes /></MemoryRouter>);
  expect(screen.getByText(/준비 중/)).toBeInTheDocument();
});
