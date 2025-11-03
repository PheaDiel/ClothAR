// src/context/ToastContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View } from 'react-native';
import { Toast, ToastType } from '../components/Toast';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number, action?: { label: string; onPress: () => void }) => void;
  showSuccess: (message: string, duration?: number, action?: { label: string; onPress: () => void }) => void;
  showError: (message: string, duration?: number, action?: { label: string; onPress: () => void }) => void;
  showInfo: (message: string, duration?: number, action?: { label: string; onPress: () => void }) => void;
  showWarning: (message: string, duration?: number, action?: { label: string; onPress: () => void }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((
    message: string,
    type: ToastType,
    duration?: number,
    action?: { label: string; onPress: () => void }
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const toast: ToastMessage = {
      id,
      message,
      type,
      duration,
      action,
    };

    setToasts(prev => [...prev, toast]);

    // Auto remove after duration + animation time
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, (duration || 4000) + 500);
  }, []);

  const showSuccess = useCallback((message: string, duration?: number, action?: { label: string; onPress: () => void }) => {
    showToast(message, 'success', duration, action);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number, action?: { label: string; onPress: () => void }) => {
    showToast(message, 'error', duration, action);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number, action?: { label: string; onPress: () => void }) => {
    showToast(message, 'info', duration, action);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number, action?: { label: string; onPress: () => void }) => {
    showToast(message, 'warning', duration, action);
  }, [showToast]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onDismiss={() => dismissToast(toast.id)}
            action={toast.action}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
};