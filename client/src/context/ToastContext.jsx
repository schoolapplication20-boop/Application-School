import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  // Toast.jsx auto-dismisses itself after 3s via its own onClose timer.
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </ToastContext.Provider>
  );
}

/** Returns a showToast(message, type) function backed by a single shared toast viewport. */
export const useToast = () => useContext(ToastContext);
