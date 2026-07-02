import { render, screen, fireEvent } from '@testing-library/react';
import { AuthGate } from '../../src/auth/AuthGate';
import type { AuthDeps } from '../../src/auth/session';

function deps(over: Partial<AuthDeps> = {}): AuthDeps {
  return {
    getSession: async () => null,
    signIn: async () => {},
    signOut: async () => {},
    onAuthChange: () => () => {},
    ...over,
  };
}

test('shows the login form when there is no session', async () => {
  render(<AuthGate deps={deps()}><div>SECRET</div></AuthGate>);
  expect(await screen.findByLabelText(/이메일/)).toBeInTheDocument();
  expect(screen.queryByText('SECRET')).not.toBeInTheDocument();
});

test('renders children when a session exists', async () => {
  render(<AuthGate deps={deps({ getSession: async () => ({ user: { id: 'u1' } } as any) })}><div>SECRET</div></AuthGate>);
  expect(await screen.findByText('SECRET')).toBeInTheDocument();
});

test('shows an error when sign-in fails', async () => {
  const d = deps({ signIn: async () => { throw new Error('bad'); } });
  render(<AuthGate deps={d}><div>SECRET</div></AuthGate>);
  fireEvent.change(await screen.findByLabelText(/이메일/), { target: { value: 'a@b.c' } });
  fireEvent.change(screen.getByLabelText(/비밀번호/), { target: { value: 'x' } });
  fireEvent.click(screen.getByRole('button', { name: /로그인/ }));
  expect(await screen.findByText(/로그인 실패/)).toBeInTheDocument();
});
