import { Suspense } from 'react';
import { LoginForm } from './login-form';

export const metadata = { title: 'Login' };

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
