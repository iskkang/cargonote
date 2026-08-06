import { render, screen } from '@testing-library/react';
import { Badge, Button, Card, EmptyState, Field } from '../../src/ui/kit';

test('Badge renders its label', () => {
  render(<Badge tone="positive">完了</Badge>);
  expect(screen.getByText('完了')).toBeInTheDocument();
});

test('Button renders as a button with its label', () => {
  render(<Button>発行</Button>);
  expect(screen.getByRole('button', { name: '発行' })).toBeInTheDocument();
});

test('Card renders children', () => {
  render(<Card><span>内容</span></Card>);
  expect(screen.getByText('内容')).toBeInTheDocument();
});

test('Field associates its label with the input', () => {
  render(<Field label="メールアドレス"><input type="email" /></Field>);
  expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
});

test('EmptyState shows title and hint', () => {
  render(<EmptyState title="まだ作業がありません" hint="新規作業から始めてください" />);
  expect(screen.getByText('まだ作業がありません')).toBeInTheDocument();
  expect(screen.getByText('新規作業から始めてください')).toBeInTheDocument();
});
