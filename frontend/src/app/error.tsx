'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-xl font-bold text-accent">Something went wrong</h1>
      <p className="mt-1 text-muted-foreground">An unexpected error occurred. Please try again.</p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
