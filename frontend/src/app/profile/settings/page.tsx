'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User } from '@/lib/types';

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.patch<{ user: User }>('/auth/profile', { name: profile.name, phone: profile.phone });
      setUser(res.user);
      toast('Profile updated', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Update failed', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.newPassword.length < 8) return toast('New password must be at least 8 characters', 'error');
    if (pw.newPassword !== pw.confirm) return toast('Passwords do not match', 'error');
    setSavingPw(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast('Password changed', 'success');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not change password', 'error');
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
            <div><Label>Full name</Label><Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Email</Label><Input value={user?.email ?? ''} disabled /></div>
            <div className="sm:col-span-2"><Button type="submit" loading={savingProfile}>Save changes</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Current password</Label><Input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></div>
            <div><Label>New password</Label><Input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
            <div><Label>Confirm new password</Label><Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
            <div className="sm:col-span-2"><Button type="submit" loading={savingPw}>Update password</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
