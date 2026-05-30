'use client';

import { GoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';

export function GoogleButton({ redirectTo = '/' }: { redirectTo?: string }) {
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const enabled = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!enabled) return null;

  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={async (cred) => {
          if (!cred.credential) return;
          try {
            await loginWithGoogle(cred.credential);
            toast('Signed in with Google', 'success');
            router.push(redirectTo);
          } catch {
            toast('Google sign-in failed', 'error');
          }
        }}
        onError={() => toast('Google sign-in failed', 'error')}
        width="320"
        text="continue_with"
        shape="rectangular"
      />
    </div>
  );
}
