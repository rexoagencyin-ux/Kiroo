'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

export function VerifyContent() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    api
      .get(`/auth/verify-email?token=${token}`, false)
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
      {status === 'ok' && (
        <>
          <CheckCircle2 className="h-14 w-14 text-primary" />
          <h1 className="mt-4 text-xl font-bold text-accent">Email verified!</h1>
          <p className="mt-1 text-muted-foreground">Your account is now fully active.</p>
          <Button asChild className="mt-6">
            <Link href="/">Start shopping</Link>
          </Button>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="h-14 w-14 text-destructive" />
          <h1 className="mt-4 text-xl font-bold text-accent">Verification failed</h1>
          <p className="mt-1 text-muted-foreground">The link may be invalid or expired.</p>
          <Button asChild className="mt-6" variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </>
      )}
    </div>
  );
}
