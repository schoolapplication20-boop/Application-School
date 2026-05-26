import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutes of inactivity → logout
const WARN_BEFORE_MS  = 60 * 1000;       // show warning 1 minute before logout

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

export default function SessionTimeoutWarning() {
  const { logout, isAuthenticated } = useAuth();
  const lastActivityRef = useRef(Date.now());
  const [secondsLeft, setSecondsLeft] = useState(null); // null = no warning shown

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSecondsLeft(null); // dismiss warning on any activity
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setSecondsLeft(null);
      return;
    }

    // Listen for any user activity
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetActivity, { passive: true }));

    const tick = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
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
      clearInterval(tick);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetActivity));
    };
  }, [isAuthenticated, logout, resetActivity]);

  if (secondsLeft === null) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')} min`
    : `${secs} sec`;

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
        onClick={resetActivity}
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
