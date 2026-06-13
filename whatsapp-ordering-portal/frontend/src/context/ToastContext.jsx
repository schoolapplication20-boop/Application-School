import { createContext, useState, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import ToastContainer from '../components/common/ToastContainer';

export const ToastContext = createContext(null);

const TOAST_DURATION_MS = 4000;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => removeToast(id), TOAST_DURATION_MS);
    return id;
  }, [removeToast]);

  const value = useMemo(() => ({
    success: (message) => addToast(message, 'success'),
    error: (message) => addToast(message, 'error'),
    warning: (message) => addToast(message, 'warning'),
    info: (message) => addToast(message, 'info'),
  }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
