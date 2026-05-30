'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email }, false);
      setSent(true);
    } catch {
      setSent(true); // do not reveal whether the email exists
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        {sent ? (
          <div className="text-center">
            <MailCheck className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-4 text-xl font-bold text-accent">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link. It expires in 30 minutes.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link href="/login">Back to login</Link>
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-accent">Forgot password?</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Send reset link
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
