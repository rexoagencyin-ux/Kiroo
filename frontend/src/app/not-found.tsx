import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-2 text-xl font-bold text-accent">Page not found</h1>
      <p className="mt-1 text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Button asChild className="mt-6">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
