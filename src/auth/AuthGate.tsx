import { useEffect, useState } from 'react';
import { defaultAuthDeps, type AuthDeps } from './session';
import { Login } from './Login';

export function AuthGate({ children, deps = defaultAuthDeps }: { children: React.ReactNode; deps?: AuthDeps }) {
  const [state, setState] = useState<'loading' | 'in' | 'out'>('loading');
  useEffect(() => {
    deps.getSession().then((s) => setState(s ? 'in' : 'out'));
    return deps.onAuthChange((signedIn) => setState(signedIn ? 'in' : 'out'));
  }, [deps]);

  if (state === 'loading') return <main style={{ minHeight: '100vh', background: '#D7DEE5' }} />;
  if (state === 'out') return <Login deps={deps} />;
  return <>{children}</>;
}
