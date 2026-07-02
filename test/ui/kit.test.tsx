import { render, screen } from '@testing-library/react';
import { Badge, Button, Card, EmptyState, Field } from '../../src/ui/kit';

test('Badge renders its label', () => {
  render(<Badge tone="positive">완료</Badge>);
  expect(screen.getByText('완료')).toBeInTheDocument();
});

test('Button renders as a button with its label', () => {
  render(<Button>발행</Button>);
  expect(screen.getByRole('button', { name: '발행' })).toBeInTheDocument();
});

test('Card renders children', () => {
  render(<Card><span>내용</span></Card>);
  expect(screen.getByText('내용')).toBeInTheDocument();
});

test('Field associates its label with the input', () => {
  render(<Field label="이메일"><input type="email" /></Field>);
  expect(screen.getByLabelText('이메일')).toBeInTheDocument();
});

test('EmptyState shows title and hint', () => {
  render(<EmptyState title="아직 작업이 없습니다" hint="새 작업으로 시작하세요" />);
  expect(screen.getByText('아직 작업이 없습니다')).toBeInTheDocument();
  expect(screen.getByText('새 작업으로 시작하세요')).toBeInTheDocument();
});
