import React, { useEffect, useState, useRef } from 'react';
import { abortServerRetry } from '../services/api';

const overlay = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  padding: 24,
  animation: 'swm-fade-in .2s ease',
};

const card = {
  background: '#ffffff',
  borderRadius: 20,
  padding: '36px 32px',
  maxWidth: 400,
  width: '100%',
  textAlign: 'center',
  boxShadow: '0 24px 64px rgba(0,0,0,.28)',
  animation: 'swm-slide-up .25s cubic-bezier(.4,0,.2,1)',
};

export default function ServerWakeModal() {
  const [visible,   setVisible]   = useState(false);
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef(null);

  useEffect(() => {
    const onSleeping = (e) => {
      const secs = e.detail?.retryIn ?? 5;
      setCountdown(secs);
      setVisible(true);

      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(timerRef.current); return 0; }
          return c - 1;
        });
      }, 1000);
    };

    const onAwake = () => {
      setVisible(false);
      clearInterval(timerRef.current);
    };

    window.addEventListener('server-sleeping', onSleeping);
    window.addEventListener('server-awake',    onAwake);
    return () => {
      window.removeEventListener('server-sleeping', onSleeping);
      window.removeEventListener('server-awake',    onAwake);
      clearInterval(timerRef.current);
    };
  }, []);

  const handleCancel = () => {
    abortServerRetry();
    setVisible(false);
    clearInterval(timerRef.current);
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes swm-fade-in  { from { opacity: 0; }                  to { opacity: 1; } }
        @keyframes swm-slide-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes swm-spin     { to   { transform: rotate(360deg); } }
        .swm-spinner {
          width: 48px; height: 48px;
          border: 4px solid #e2e8f0;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: swm-spin 0.9s linear infinite;
          margin: 0 auto 20px;
        }
        .swm-cancel-btn {
          margin-top: 20px;
          padding: 10px 28px;
          border: 2px solid #e2e8f0;
          border-radius: 50px;
          background: transparent;
          color: #64748b;
          font-size: .9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all .2s;
          font-family: inherit;
        }
        .swm-cancel-btn:hover {
          border-color: #ef4444;
          color: #ef4444;
          background: #fff1f2;
        }
      `}</style>

      <div style={overlay}>
        <div style={card}>
          <div className="swm-spinner" />

          <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
            Server is waking up…
          </h3>

          <p style={{ margin: '0 0 4px', fontSize: '.9rem', color: '#64748b', fontWeight: 600 }}>
            retrying in <span style={{ color: '#6366f1', fontWeight: 800 }}>{countdown}s</span>
          </p>

          <p style={{ margin: '14px 0 0', fontSize: '.82rem', color: '#94a3b8', lineHeight: 1.65 }}>
            The server was sleeping due to inactivity&nbsp;(Render free plan).
            Your credentials are fine — please wait.
          </p>

          <button className="swm-cancel-btn" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
