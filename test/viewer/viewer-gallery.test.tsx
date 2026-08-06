import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ViewerGallery } from '../../src/viewer/ViewerGallery';
import type { ViewerClient } from '../../src/viewer/viewerClient';

function client(manifest: any): ViewerClient { return { bootstrap: async () => manifest }; }

test('renders the published gallery for a valid token', async () => {
  const manifest = { route: 'TCR', customer: '青島パートナー', containers: [{ containerNo: 'ABCD1234567', photos: [{ slotKey: 'seal', label: 'シール接写', thumbUrl: 'https://s/t', displayUrl: 'https://s/d' }] }] };
  render(
    <MemoryRouter initialEntries={['/v/VTOK']}>
      <Routes><Route path="/v/:token" element={<ViewerGallery client={client(manifest)} />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/ABCD1234567/)).toBeInTheDocument();
  expect(screen.getAllByText(/青島パートナー/).length).toBeGreaterThan(0);
  expect(screen.getByAltText(/シール接写/)).toBeInTheDocument();
});

test('select-all enables the download button with a count', async () => {
  const manifest = { route: 'TCR', customer: '青島パートナー', date: '2026-07-02', containers: [{ containerNo: 'ABCD1234567', photos: [{ slotKey: 'seal', label: 'シール接写', thumbUrl: 'x', displayUrl: 'y' }] }] };
  render(
    <MemoryRouter initialEntries={['/v/VTOK']}>
      <Routes><Route path="/v/:token" element={<ViewerGallery client={client(manifest)} />} /></Routes>
    </MemoryRouter>,
  );
  const dl = await screen.findByRole('button', { name: /選択した写真をダウンロード/ });
  expect(dl).toBeDisabled();
  fireEvent.click(screen.getByLabelText('すべて選択'));
  expect(screen.getByRole('button', { name: /選択した写真をダウンロード \(1\)/ })).toBeInTheDocument();
});

test('shows the integrity hash on a photo when present', async () => {
  const manifest = { route: 'TCR', customer: '青島パートナー', date: '2026-07-02', containers: [{ containerNo: 'ABCD1234567', photos: [{ slotKey: 'seal', label: 'シール接写', thumbUrl: 'x', displayUrl: 'y', hash: 'abcdef1234567890' }] }] };
  render(
    <MemoryRouter initialEntries={['/v/VTOK']}>
      <Routes><Route path="/v/:token" element={<ViewerGallery client={client(manifest)} />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/abcdef123456/)).toBeInTheDocument();
});

test('shows an error for an invalid token', async () => {
  render(
    <MemoryRouter initialEntries={['/v/bad']}>
      <Routes><Route path="/v/:token" element={<ViewerGallery client={client(null)} />} /></Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText(/リンクが正しくありません/)).toBeInTheDocument();
});
