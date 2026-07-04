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
  expect(screen.getByText(/한 링크로 끝낸다/)).toBeInTheDocument();
  expect(screen.getByText(/작업자 · 현장/)).toBeInTheDocument();
  expect(screen.getByText(/관리자 · 사무실/)).toBeInTheDocument();
  expect(screen.getByText(/수신자 · 해외/)).toBeInTheDocument();
});

test('login button navigates to /admin', () => {
  renderLanding();
  fireEvent.click(screen.getAllByRole('button', { name: /관리자 로그인/ })[0]);
  expect(screen.getByText('ADMIN CONSOLE')).toBeInTheDocument();
});
