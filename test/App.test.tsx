import { render, screen } from '@testing-library/react';
import App from '../src/App';

test('renders spike heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /캡처 스파이크/ })).toBeInTheDocument();
});
