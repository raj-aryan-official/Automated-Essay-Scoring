import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

const ToastContext = React.createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);

      const duration = toast.duration ?? 4500;
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
      return id;
    },
    [removeToast]
  );

  const success = React.useCallback(
    (title: string, message?: string) => addToast({ title, message, variant: 'success' }),
    [addToast]
  );
  const error = React.useCallback(
    (title: string, message?: string) => addToast({ title, message, variant: 'error' }),
    [addToast]
  );
  const warning = React.useCallback(
    (title: string, message?: string) => addToast({ title, message, variant: 'warning' }),
    [addToast]
  );
  const info = React.useCallback(
    (title: string, message?: string) => addToast({ title, message, variant: 'info' }),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const VARIANT_ICONS = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
  info: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
};

const VARIANT_CONTAINERS = {
  success: 'border-emerald-500/30 bg-slate-900/95',
  error: 'border-rose-500/30 bg-slate-900/95',
  warning: 'border-amber-500/30 bg-slate-900/95',
  info: 'border-sky-500/30 bg-slate-900/95',
};

export const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto border rounded-xl p-3.5 shadow-2xl backdrop-blur-md flex items-start justify-between gap-3 animate-in slide-in-from-bottom-2 duration-200 ${VARIANT_CONTAINERS[toast.variant]}`}
        >
          <div className="flex items-start gap-2.5">
            {VARIANT_ICONS[toast.variant]}
            <div className="flex flex-col space-y-0.5 pr-2">
              <span className="text-xs font-semibold text-white tracking-tight">
                {toast.title}
              </span>
              {toast.message && (
                <span className="text-[11px] text-slate-400 leading-snug">
                  {toast.message}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss toast"
            className="text-slate-500 hover:text-slate-300 rounded p-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
