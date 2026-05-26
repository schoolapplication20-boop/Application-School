import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutes total
const WARN_BEFORE_MS  = 60 * 1000;       // show warning 1 minute before logout
const LS_KEY = 'ms_last_activity';       // shared across tabs via localStorage

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

export default function SessionTimeoutWarning() {
  const { logout, isAuthenticated } = useAuth();
  const tickRef = useRef(null);
  const [secondsLeft, setSecondsLeft] = useState(null);

  const stamp = useCallback(() => {
    localStorage.setItem(LS_KEY, String(Date.now()));
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setSecondsLeft(null);
      return;
    }

    // Initialise timestamp so a brand-new tab isn't immediately stale
    if (!localStorage.getItem(LS_KEY)) stamp();

    // User activity in THIS tab → update shared timestamp
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, stamp, { passive: true }));

    // Cross-tab sync: another tab updated the timestamp → dismiss warning here
    const onStorage = (e) => { if (e.key === LS_KEY) setSecondsLeft(null); };
    window.addEventListener('storage', onStorage);

    // Poll every second to drive the countdown
    tickRef.current = setInterval(() => {
      const last = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
      const idle = Date.now() - last;
      const remaining = IDLE_TIMEOUT_MS - idle;

      if (remaining <= 0) {
        logout();
      } else if (remaining <= WARN_BEFORE_MS) {
        setSecondsLeft(Math.ceil(remaining / 1000));
      } else {
        setSecondsLeft(null);
      }
    }, 1000);

    return () => {
      clearInterval(tickRef.current);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, stamp));
      window.removeEventListener('storage', onStorage);
    };
  }, [isAuthenticated, logout, stamp]);

  if (secondsLeft === null) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')} min` : `${secs} sec`;

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: '#1e293b', color: '#fff', borderRadius: 12,
      padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)', zIndex: 9999,
      fontFamily: 'Poppins, sans-serif', fontSize: 14, minWidth: 340,
    }}>
      <span className="material-icons" style={{ color: '#fbbf24', fontSize: 22 }}>timer</span>
      <span style={{ flex: 1 }}>
        Logging out due to inactivity in <strong>{timeStr}</strong>.
      </span>
      <button
        onClick={stamp}
        style={{
          background: '#3b82f6', border: 'none', color: '#fff',
          borderRadius: 6, padding: '5px 14px',
          cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
        }}
      >
        Stay Logged In
      </button>
      <button
        onClick={logout}
        style={{
          background: 'transparent', border: '1px solid rgba(255,255,255,0.25)',
          color: '#94a3b8', borderRadius: 6, padding: '5px 12px',
          cursor: 'pointer', fontSize: 12, fontWeight: 600,
        }}
      >
        Logout
      </button>
    </div>
  );
}
