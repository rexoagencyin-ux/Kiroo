import { Suspense } from 'react';
import { RegisterForm } from './register-form';

export const metadata = { title: 'Create Account' };

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center">Loading…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
