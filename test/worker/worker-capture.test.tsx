import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorkerCapture } from '../../src/worker/WorkerCapture';

function renderAt(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/c/${token}`]}>
      <Routes><Route path="/c/:token" element={<WorkerCapture />} /></Routes>
    </MemoryRouter>,
  );
}

test('intro step shows container plate, a required slot, and the warning', async () => {
  renderAt('demotoken123');
  expect(await screen.findByText(/FBLU 420481/)).toBeInTheDocument();  // plate (ISO check digit split)
  expect(screen.getByText(/빈 컨테이너/)).toBeInTheDocument();          // a required slot label
  expect(screen.getByText(/반송/)).toBeInTheDocument();                 // TCR warning
});

test('촬영 시작 opens the grouped checklist', async () => {
  renderAt('demotoken123');
  fireEvent.click(await screen.findByRole('button', { name: /촬영 시작/ }));
  expect(await screen.findByText(/촬영 체크리스트/)).toBeInTheDocument();
  expect(screen.getByText(/반입/)).toBeInTheDocument();                 // phase group header
});

test('checklist → submit-check → 제출 shows the completion dialog', async () => {
  renderAt('demotoken123');
  fireEvent.click(await screen.findByRole('button', { name: /촬영 시작/ }));
  fireEvent.click(await screen.findByRole('button', { name: /제출 확인/ }));
  fireEvent.click(await screen.findByRole('button', { name: /제출/ }));   // "이대로 제출" (nothing captured)
  expect(await screen.findByText(/전송되었습니다/)).toBeInTheDocument();
});

test('shows an error for an unknown token', async () => {
  renderAt('bad');
  expect(await screen.findByText(/잘못된 링크/)).toBeInTheDocument();
});
