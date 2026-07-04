import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorkerCapture } from '../../src/worker/WorkerCapture';
import { createInMemoryAdminRepo } from '../../src/admin/repo';
import { createInMemoryWorkerClient } from '../../src/worker/workerClient';

test('multi-container order shows a tab per container and switches active', async () => {
  const repo = createInMemoryAdminRepo();
  const { workerToken } = await repo.createWorkOrder({
    customerId: 'cust-mtl', templateId: 'tpl-tsr',
    containerNos: ['TCLU1234567', 'MSKU7654321'], workDate: null, assigneeName: '', assigneeContact: '',
  });
  const client = createInMemoryWorkerClient(repo);
  render(
    <MemoryRouter initialEntries={[`/c/${workerToken}`]}>
      <Routes><Route path="/c/:token" element={<WorkerCapture client={client} />} /></Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByText(/컨테이너 2대/)).toBeInTheDocument();
  // both container plates appear (first is active + its tab; second only as a tab)
  expect(screen.getAllByText(/TCLU 123456/).length).toBeGreaterThan(0);
  const secondTab = screen.getByText(/MSKU 765432/);
  expect(secondTab).toBeInTheDocument();

  // switching to the second container makes it the active plate
  fireEvent.click(secondTab);
  expect(screen.getAllByText(/MSKU 765432/).length).toBeGreaterThan(1);
});
