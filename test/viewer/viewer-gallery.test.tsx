import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ViewerGallery } from '../../src/viewer/ViewerGallery';
import type { ViewerClient } from '../../src/viewer/viewerClient';

function client(manifest: any): ViewerClient { return { bootstrap: async () => manifest }; }

test('renders the published gallery for a valid token', async () => {
  const manifest = { route: 'TCR', customer: '칭다오 파트너', containers: [{ containerNo: 'ABCD1234567', photos: [{ slotKey: 'seal', label: '씰 근접', thumbUrl: 'https://s/t', displayUrl: 'https://s/d' }] }] };
  render(
    <MemoryRouter initialEntries={['/v/VTOK']}>
      <Routes><Route path="/v/:token" element={<ViewerGallery client={client(manifest)} />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/ABCD1234567/)).toBeInTheDocument();
  expect(screen.getByText(/칭다오 파트너/)).toBeInTheDocument();
  expect(screen.getByAltText(/씰 근접/)).toBeInTheDocument();
});

test('shows an error for an invalid token', async () => {
  render(
    <MemoryRouter initialEntries={['/v/bad']}>
      <Routes><Route path="/v/:token" element={<ViewerGallery client={client(null)} />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/잘못된 링크/)).toBeInTheDocument();
});
