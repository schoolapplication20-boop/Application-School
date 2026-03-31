import React, { useEffect } from 'react';

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: { bg: '#f0fff4', border: '#9ae6b4', color: '#276749', icon: 'check_circle' },
    error: { bg: '#fff5f5', border: '#feb2b2', color: '#c53030', icon: 'error' },
    warning: { bg: '#fffaf0', border: '#fbd38d', color: '#c05621', icon: 'warning' },
    info: { bg: '#ebf8ff', border: '#90cdf4', color: '#2b6cb0', icon: 'info' },
  };

  const style = colors[type] || colors.success;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 20px',
      background: style.bg,
      border: `1px solid ${style.border}`,
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      minWidth: '280px',
      maxWidth: '400px',
      animation: 'slideInRight 0.3s ease',
    }}>
      <span className="material-icons" style={{ color: style.color, fontSize: '22px', flexShrink: 0 }}>
        {style.icon}
      </span>
      <span style={{ flex: 1, fontSize: '14px', color: style.color, fontWeight: 500, lineHeight: 1.4 }}>
        {message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: style.color, padding: '0', display: 'flex', alignItems: 'center',
          opacity: 0.7, flexShrink: 0,
        }}
      >
        <span className="material-icons" style={{ fontSize: '18px' }}>close</span>
      </button>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Toast;
