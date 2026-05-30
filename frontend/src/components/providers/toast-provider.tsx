'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => remove(id), 3500);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-xs flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-2 rounded-lg border bg-white p-3 shadow-lg animate-in slide-in-from-bottom-2',
              t.type === 'success' && 'border-primary/30',
              t.type === 'error' && 'border-destructive/30'
            )}
            role="alert"
          >
            {t.type === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
            {t.type === 'error' && <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />}
            {t.type === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" />}
            <p className="flex-1 text-sm text-accent">{t.message}</p>
            <button onClick={() => remove(t.id)} aria-label="Dismiss">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
