'use client';

import { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { getFirebaseAuth, friendlyAuthError } from '@/lib/firebase';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const { user, changePassword, refreshUser } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ newPassword: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const auth = getFirebaseAuth();
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name });
        await refreshUser();
      }
      toast('Profile updated', 'success');
    } catch (err) {
      toast(friendlyAuthError(err), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.newPassword.length < 6) return toast('New password must be at least 6 characters', 'error');
    if (pw.newPassword !== pw.confirm) return toast('Passwords do not match', 'error');
    setSavingPw(true);
    try {
      await changePassword(pw.newPassword);
      toast('Password changed', 'success');
      setPw({ newPassword: '', confirm: '' });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not change password', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-accent">Account Settings</h1>

      <Card>
        <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Email</Label><Input value={user?.email ?? ''} disabled /></div>
            <div className="sm:col-span-2"><Button type="submit" loading={savingProfile}>Save changes</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submitPassword} className="grid gap-4 sm:grid-cols-2">
            <div><Label>New password</Label><Input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
            <div><Label>Confirm new password</Label><Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
            <div className="sm:col-span-2"><Button type="submit" loading={savingPw}>Update password</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
