import React, { useState, useEffect } from 'react';
import { systemAPI } from '../services/api';
import './MaintenanceBanner.css';

const ICONS = { INFO: 'info', WARNING: 'warning', CRITICAL: 'error' };

const fmt = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return iso; }
};

const MaintenanceBanner = () => {
  const [notice,    setNotice]    = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    systemAPI.getActiveNotice()
      .then(res => setNotice(res.data?.data || null))
      .catch(() => {});
  }, []);

  if (!notice || dismissed) return null;

  const sev = (notice.severity || 'WARNING').toUpperCase();

  return (
    <div className={`maint-banner maint-banner--${sev.toLowerCase()}`}>
      <span className={`material-icons maint-banner__icon`}>{ICONS[sev] || 'warning'}</span>
      <div className="maint-banner__body">
        <span className="maint-banner__msg">{notice.message}</span>
        {notice.scheduledAt && (
          <span className="maint-banner__meta">
            Scheduled: <strong>{fmt(notice.scheduledAt)}</strong>
            {notice.durationMinutes ? ` · Duration: ~${notice.durationMinutes} min` : ''}
          </span>
        )}
      </div>
      <button
        className="maint-banner__close"
        onClick={() => setDismissed(true)}
        title="Dismiss"
      >
        <span className="material-icons">close</span>
      </button>
    </div>
  );
};

export default MaintenanceBanner;
