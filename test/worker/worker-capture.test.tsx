import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorkerCapture } from '../../src/worker/WorkerCapture';

test('resolves the demo token and shows the container + template checklist', async () => {
  render(
    <MemoryRouter initialEntries={['/c/demotoken123']}>
      <Routes><Route path="/c/:token" element={<WorkerCapture />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/FBLU 420481/)).toBeInTheDocument();     // container plate (ISO check digit split out)
  expect(await screen.findByText(/빈 컨테이너/)).toBeInTheDocument();       // a required slot label
  expect(await screen.findByText(/반송/)).toBeInTheDocument();             // TCR warning
});

test('전송 shows a completion dialog', async () => {
  render(
    <MemoryRouter initialEntries={['/c/demotoken123']}>
      <Routes><Route path="/c/:token" element={<WorkerCapture />} /></Routes>
    </MemoryRouter>,
  );
  const submit = await screen.findByRole('button', { name: /전송/ });
  submit.click();
  expect(await screen.findByText(/전송되었습니다/)).toBeInTheDocument();
});

test('shows an error for an unknown token', async () => {
  render(
    <MemoryRouter initialEntries={['/c/bad']}>
      <Routes><Route path="/c/:token" element={<WorkerCapture />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/잘못된 링크/)).toBeInTheDocument();
});
