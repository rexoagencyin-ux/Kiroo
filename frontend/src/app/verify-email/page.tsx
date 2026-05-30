import { Suspense } from 'react';
import { VerifyContent } from './verify-content';

export const metadata = { title: 'Verify Email' };

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center">Verifying…</div>}>
      <VerifyContent />
    </Suspense>
  );
}
