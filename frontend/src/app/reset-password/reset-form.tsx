'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast('Password must be at least 8 characters', 'error');
    if (password !== confirm) return toast('Passwords do not match', 'error');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password }, false);
      toast('Password reset! Please log in.', 'success');
      router.push('/login');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Reset failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Invalid or missing reset token.</p>
          <Button asChild className="mt-4">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-accent">Set a new password</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="pw">New password</Label>
            <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <div>
            <Label htmlFor="cpw">Confirm password</Label>
            <Input id="cpw" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Reset password
          </Button>
        </form>
      </div>
    </div>
  );
}
