import { Suspense } from 'react';
import { ResetForm } from './reset-form';

export const metadata = { title: 'Reset Password' };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center">Loading…</div>}>
      <ResetForm />
    </Suspense>
  );
}
