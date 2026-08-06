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
  expect(screen.getByText(/空コンテナ/)).toBeInTheDocument();          // a required slot label
  expect(screen.getByText(/返送/)).toBeInTheDocument();                 // TCR warning
});

test('the start-capture button opens the grouped checklist', async () => {
  renderAt('demotoken123');
  fireEvent.click(await screen.findByRole('button', { name: /撮影を開始/ }));
  expect(await screen.findByText(/撮影チェックリスト/)).toBeInTheDocument();
  expect(screen.getByText(/搬入/)).toBeInTheDocument();                 // phase group header
});

test('checklist → submit-check → submit shows the completion dialog', async () => {
  renderAt('demotoken123');
  fireEvent.click(await screen.findByRole('button', { name: /撮影を開始/ }));
  fireEvent.click(await screen.findByRole('button', { name: /提出前の確認/ }));
  fireEvent.click(await screen.findByRole('button', { name: /提出/ }));   // "このまま提出" (nothing captured)
  expect(await screen.findByText(/送信しました/)).toBeInTheDocument();
});

test('shows an error for an unknown token', async () => {
  renderAt('bad');
  expect(await screen.findByText(/リンクが正しくありません/)).toBeInTheDocument();
});
