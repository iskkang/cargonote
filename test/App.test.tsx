import { render, screen } from '@testing-library/react';
import App from '../src/App';

test('shows capture controls and a queue status region', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /캡처 스파이크/ })).toBeInTheDocument();
  expect(await screen.findByLabelText(/사진 촬영/)).toBeInTheDocument();     // input capture control
  expect(await screen.findByTestId('queue-status')).toBeInTheDocument();
});
