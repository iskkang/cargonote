import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Landing } from '../../src/landing/Landing';

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<div>ADMIN CONSOLE</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

test('shows the product intro and the three roles', () => {
  renderLanding();
  expect(screen.getByText(/リンク一つで完結/)).toBeInTheDocument();
  expect(screen.getByText(/作業者 · 現場/)).toBeInTheDocument();
  expect(screen.getByText(/管理者 · 事務所/)).toBeInTheDocument();
  expect(screen.getByText(/受取側 · 荷主/)).toBeInTheDocument();
});

test('login button navigates to /admin', () => {
  renderLanding();
  fireEvent.click(screen.getAllByRole('button', { name: /管理者ログイン/ })[0]);
  expect(screen.getByText('ADMIN CONSOLE')).toBeInTheDocument();
});

test('shows product screens, a home logo, and a toggling FAQ', () => {
  renderLanding();
  expect(screen.getByText(/管理ダッシュボード/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'ホームへ' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /受取側にもログインが必要ですか/ }));
  expect(screen.getByText(/発行されたリンク一つで/)).toBeInTheDocument();
});
