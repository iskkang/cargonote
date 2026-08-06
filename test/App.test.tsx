import { render, screen } from '@testing-library/react';
import App from '../src/App';

test('shows capture controls and a queue status region', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /キャプチャ スパイク/ })).toBeInTheDocument();
  expect(await screen.findByLabelText(/写真を撮影/)).toBeInTheDocument();     // input capture control
  expect(await screen.findByTestId('queue-status')).toBeInTheDocument();
});
