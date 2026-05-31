'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseAuth, ADMIN_EMAIL, friendlyAuthError } from '@/lib/firebase';
import type { User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; phone?: string }) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Map a Firebase user to the app's User shape. Admin is determined by email. */
function mapUser(fb: FirebaseUser, nameOverride?: string): User {
  const email = (fb.email ?? '').toLowerCase();
  return {
    id: fb.uid,
    name: nameOverride || fb.displayName || (fb.email ? fb.email.split('@')[0] : 'User'),
    email: fb.email ?? '',
    phone: fb.phoneNumber,
    avatar_url: fb.photoURL,
    role: email === ADMIN_EMAIL ? 'admin' : 'customer',
    provider: fb.providerData.some((p) => p.providerId === 'google.com') ? 'google' : 'email',
    is_verified: fb.emailVerified,
    created_at: fb.metadata.creationTime ?? new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (fb) => {
      setUser(fb ? mapUser(fb) : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const auth = getFirebaseAuth();
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const u = mapUser(cred.user);
      setUser(u);
      return u;
    } catch (e) {
      throw new Error(friendlyAuthError(e));
    }
  };

  const register = async (input: { name: string; email: string; password: string; phone?: string }) => {
    try {
      const auth = getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
      if (input.name) await updateProfile(cred.user, { displayName: input.name });
      const u = mapUser(cred.user, input.name);
      setUser(u);
      return u;
    } catch (e) {
      throw new Error(friendlyAuthError(e));
    }
  };

  const loginWithGoogle = async () => {
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      const u = mapUser(cred.user);
      setUser(u);
      return u;
    } catch (e) {
      throw new Error(friendlyAuthError(e));
    }
  };

  const logout = async () => {
    const auth = getFirebaseAuth();
    await signOut(auth);
    setUser(null);
  };

  const sendReset = async (email: string) => {
    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email.trim());
    } catch (e) {
      throw new Error(friendlyAuthError(e));
    }
  };

  const changePassword = async (newPassword: string) => {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) throw new Error('You are not signed in');
    try {
      await updatePassword(auth.currentUser, newPassword);
    } catch (e) {
      throw new Error(friendlyAuthError(e));
    }
  };

  const refreshUser = async () => {
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser(mapUser(auth.currentUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        sendReset,
        changePassword,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
