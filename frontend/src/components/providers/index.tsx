'use client';

import { ToastProvider } from './toast-provider';
import { AuthProvider } from './auth-provider';
import { CartProvider } from './cart-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>{children}</CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
