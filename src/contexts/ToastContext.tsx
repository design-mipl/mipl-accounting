import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // duration in ms, defaults to 5000
}

interface ToastContextState {
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextState | null>(null);

// Component for rendering an individual Toast notification
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const { id, type, title, message, duration = 5000 } = toast;
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(id);
    }, 200); // match fade-out animation length
  }, [id, onRemove]);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (elapsed >= duration) {
        clearInterval(interval);
        handleDismiss();
      }
    }, 10);

    return () => clearInterval(interval);
  }, [duration, handleDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-red-500 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-500 shrink-0" />,
  };

  const borders = {
    success: 'border-l-4 border-l-emerald-500 border-gray-100',
    error: 'border-l-4 border-l-red-500 border-gray-100',
    warning: 'border-l-4 border-l-amber-500 border-gray-100',
    info: 'border-l-4 border-l-indigo-500 border-gray-100',
  };

  const progressColors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-indigo-500',
  };

  return (
    <div
      className={clsx(
        "relative flex flex-col w-full max-w-sm bg-white rounded-xl shadow-lg border pointer-events-auto overflow-hidden transition-all duration-200 hover:scale-[1.01] hover:shadow-xl",
        borders[type],
        isExiting ? "animate-fade-out" : "animate-slide-in-right"
      )}
      role="alert"
    >
      <div className="flex items-start gap-3 p-4">
        {icons[type]}
        <div className="flex-1 min-w-0">
          {title ? (
            <h4 className="text-sm font-semibold text-gray-900 leading-snug">{title}</h4>
          ) : (
            <h4 className="text-sm font-semibold text-gray-900 leading-snug uppercase tracking-wider text-xs">
              {type === 'error' ? 'Validation Error' : type}
            </h4>
          )}
          <p className="text-xs text-gray-600 font-medium mt-0.5 break-words whitespace-pre-wrap leading-relaxed">
            {message}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Premium progress bar timer */}
      <div className="w-full bg-gray-50 h-[3px]">
        <div
          className={clsx("h-full transition-all ease-linear duration-10", progressColors[type])}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 5000) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    },
    []
  );

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast('success', message, title || 'Success');
  }, [showToast]);

  const showError = useCallback((message: string, title?: string) => {
    showToast('error', message, title || 'Validation Failed');
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string) => {
    showToast('warning', message, title || 'Warning');
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string) => {
    showToast('info', message, title || 'Information');
  }, [showToast]);

  const value = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container overlay */}
      <div className="fixed top-5 right-5 z-9999 flex flex-col gap-3 w-[360px] max-w-full pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
