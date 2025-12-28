/**
 * StickerNest v2 - Toast Notification System
 * Provides toast notifications with context provider
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { SNIcon } from './SNIcon';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => string;
  error: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => string;
  warning: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => string;
  info: (message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'bottom-right',
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newToast: Toast = { ...toast, id, duration: toast.duration ?? 5000 };

    setToasts(prev => {
      const updated = [...prev, newToast];
      // Keep only the last maxToasts
      return updated.slice(-maxToasts);
    });

    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    return addToast({ type: 'success', message, ...options });
  }, [addToast]);

  const error = useCallback((message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    return addToast({ type: 'error', message, duration: 8000, ...options });
  }, [addToast]);

  const warning = useCallback((message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    return addToast({ type: 'warning', message, ...options });
  }, [addToast]);

  const info = useCallback((message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    return addToast({ type: 'info', message, ...options });
  }, [addToast]);

  const getPositionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: 16,
      pointerEvents: 'none',
    };

    switch (position) {
      case 'top-right':
        return { ...base, top: 0, right: 0 };
      case 'top-left':
        return { ...base, top: 0, left: 0 };
      case 'bottom-left':
        return { ...base, bottom: 0, left: 0 };
      case 'top-center':
        return { ...base, top: 0, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-center':
        return { ...base, bottom: 0, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-right':
      default:
        return { ...base, bottom: 0, right: 0 };
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <div style={getPositionStyles()}>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      timerRef.current = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onClose, 200);
      }, toast.duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toast.duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 200);
  };

  const getTypeStyles = (): { background: string; borderColor: string; iconColor: string; icon: string } => {
    switch (toast.type) {
      case 'success':
        return {
          background: 'rgba(34, 197, 94, 0.1)',
          borderColor: 'rgba(34, 197, 94, 0.3)',
          iconColor: '#4ade80',
          icon: 'check',
        };
      case 'error':
        return {
          background: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          iconColor: '#f87171',
          icon: 'warning',
        };
      case 'warning':
        return {
          background: 'rgba(251, 191, 36, 0.1)',
          borderColor: 'rgba(251, 191, 36, 0.3)',
          iconColor: '#fbbf24',
          icon: 'warning',
        };
      case 'info':
      default:
        return {
          background: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 0.3)',
          iconColor: '#60a5fa',
          icon: 'info',
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        background: typeStyles.background,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${typeStyles.borderColor}`,
        borderRadius: 12,
        minWidth: 300,
        maxWidth: 400,
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'auto',
        animation: isExiting ? 'toast-exit 0.2s ease-out forwards' : 'toast-enter 0.2s ease-out',
      }}
    >
      <style>
        {`
          @keyframes toast-enter {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes toast-exit {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(20px); }
          }
        `}
      </style>
      <div style={{ color: typeStyles.iconColor, marginTop: 2 }}>
        <SNIcon name={typeStyles.icon as any} size="sm" />
      </div>
      <div style={{ flex: 1 }}>
        {toast.title && (
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 2 }}>
            {toast.title}
          </div>
        )}
        <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>
          {toast.message}
        </div>
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            style={{
              marginTop: 8,
              padding: '4px 12px',
              background: 'rgba(139, 92, 246, 0.2)',
              border: 'none',
              borderRadius: 6,
              color: '#a78bfa',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={handleClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#64748b',
          cursor: 'pointer',
          padding: 4,
          marginTop: -2,
          marginRight: -4,
        }}
      >
        <SNIcon name="close" size="xs" />
      </button>
    </div>
  );
};

export default ToastProvider;
