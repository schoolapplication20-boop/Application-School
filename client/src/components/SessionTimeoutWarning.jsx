import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const WARNING_BEFORE_MS = 5 * 60 * 1000; // warn 5 min before expiry
const CHECK_INTERVAL_MS = 30 * 1000;      // check every 30 s

function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export default function SessionTimeoutWarning() {
  const { token, logout, isAuthenticated } = useAuth();
  const [visible, setVisible]  = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const check = useCallback(() => {
    if (!token) { setVisible(false); return; }
    const expiry = getTokenExpiry(token);
    if (!expiry) return;
    const remaining = expiry - Date.now();
    if (remaining <= 0) {
      logout();
      return;
    }
    if (remaining <= WARNING_BEFORE_MS) {
      setTimeLeft(Math.ceil(remaining / 60000));
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [token, logout]);

  useEffect(() => {
    if (!isAuthenticated) { setVisible(false); return; }
    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, check]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#1e293b', color: '#fff', borderRadius: 12,
      padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 9999,
      fontFamily: 'Poppins, sans-serif', fontSize: 14, minWidth: 320,
    }}>
      <span className="material-icons" style={{ color: '#fbbf24', fontSize: 22 }}>timer</span>
      <span style={{ flex: 1 }}>
        Your session expires in <strong>{timeLeft} min{timeLeft !== 1 ? 's' : ''}</strong>.
      </span>
      <button
        onClick={logout}
        style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
          color: '#fff', borderRadius: 6, padding: '4px 12px',
          cursor: 'pointer', fontSize: 12, fontWeight: 600,
        }}
      >
        Logout
      </button>
      <button
        onClick={() => setVisible(false)}
        style={{
          background: 'transparent', border: 'none', color: '#94a3b8',
          cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
