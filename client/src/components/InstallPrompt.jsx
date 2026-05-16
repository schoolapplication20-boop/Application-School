import React, { useEffect, useState } from 'react';

const DISMISSED_KEY = 'myskoolz_install_dismissed';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    if (isIOS()) {
      setShowIOS(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroid(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted' || outcome === 'dismissed') {
      dismiss();
    }
  };

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setShowAndroid(false);
    setShowIOS(false);
    setDeferredPrompt(null);
  };

  if (!showAndroid && !showIOS) return null;

  return (
    <div style={styles.banner}>
      <div style={styles.left}>
        <div style={styles.iconWrap}>
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 28, height: 28 }}>
            <path d="M8 39 Q14 33 20 33 Q26 33 32 39" fill="white" fillOpacity="0.6"/>
            <circle cx="20" cy="26" r="9" fill="white" fillOpacity="0.92"/>
            <path d="M7 17 L20 11 L33 17 L20 23 Z" fill="white"/>
            <line x1="33" y1="17" x2="33" y2="25" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.72"/>
            <circle cx="33" cy="26.5" r="2" fill="white" opacity="0.72"/>
          </svg>
        </div>
        <div>
          <div style={styles.title}>Install My-Skoolz</div>
          {showIOS ? (
            <div style={styles.sub}>
              Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong>
            </div>
          ) : (
            <div style={styles.sub}>Add to your home screen for quick access</div>
          )}
        </div>
      </div>
      <div style={styles.actions}>
        {showAndroid && (
          <button style={styles.installBtn} onClick={handleInstall}>Install</button>
        )}
        <button style={styles.dismissBtn} onClick={dismiss}>✕</button>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    position: 'fixed',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 32px)',
    maxWidth: 480,
    background: 'linear-gradient(135deg, #1e3a8a, #312e81)',
    color: '#fff',
    borderRadius: 16,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,.35)',
    zIndex: 9999,
    fontFamily: "'Poppins', system-ui, sans-serif",
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(37,99,235,.4)',
  },
  title: {
    fontWeight: 700,
    fontSize: 14,
    lineHeight: 1.3,
  },
  sub: {
    fontSize: 12,
    opacity: 0.75,
    marginTop: 2,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  installBtn: {
    padding: '8px 18px',
    background: 'rgba(255,255,255,.15)',
    border: '1px solid rgba(255,255,255,.3)',
    borderRadius: 8,
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
    backdropFilter: 'blur(8px)',
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,.6)',
    fontSize: 16,
    cursor: 'pointer',
    padding: '4px 6px',
    lineHeight: 1,
  },
};
