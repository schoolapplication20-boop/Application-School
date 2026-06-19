import React, { useCallback, useEffect, useState } from 'react';
import { smsAPI } from '../../../services/api';
import { categoryLabel } from './constants';

const FIELD = {
  label: (l) => <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{l}</label>,
  input: (props) => (
    <input
      style={{
        width: '100%', boxSizing: 'border-box', padding: '8px 12px',
        border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13,
        color: 'var(--text-primary)', background: 'var(--bg-secondary)', outline: 'none',
      }}
      {...props}
    />
  ),
};

function StatusBadge({ configured }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 20, fontSize: 11.5, fontWeight: 700,
      background: configured ? '#dcfce7' : '#fef3c7',
      color: configured ? '#15803d' : '#b45309',
    }}>
      <span className="material-icons" style={{ fontSize: 13 }}>{configured ? 'check_circle' : 'warning'}</span>
      {configured ? 'Configured' : 'Not configured'}
    </span>
  );
}

export default function SettingsTab({ showToast }) {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ authKey: '', senderId: '', dltTeId: '', route: '4', countryCode: '91' });
  const [savingProvider, setSavingProvider] = useState(false);

  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [provRes, prefRes] = await Promise.all([
        smsAPI.getProviderSettings(),
        smsAPI.getPreferences(),
      ]);
      const s = provRes.data?.data ?? {};
      setSettings(s);
      setForm({
        authKey: s.authKeyMasked || '',
        senderId: s.senderId || '',
        dltTeId: s.dltTeId || '',
        route: s.route || '4',
        countryCode: s.countryCode || '91',
      });
      setPreferences(prefRes.data?.data ?? []);
    } catch {
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSaveProvider = async (e) => {
    e.preventDefault();
    setSavingProvider(true);
    try {
      const res = await smsAPI.updateProviderSettings({
        authKey: form.authKey,
        senderId: form.senderId,
        dltTeId: form.dltTeId,
        route: form.route,
        countryCode: form.countryCode,
      });
      if (res.data?.success) {
        const s = res.data?.data;
        if (!s) {
          showToast('Settings saved', 'success');
        } else {
          setSettings(s);
          setForm(f => ({ ...f, authKey: s.authKeyMasked || '' }));
          showToast(s.configured ? 'SMS provider configured successfully' : 'Settings saved (add Auth Key + Sender ID to activate)', 'success');
        }
      } else {
        showToast(res.data?.message || 'Failed to save settings', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setSavingProvider(false);
    }
  };

  const handleToggle = async (pref) => {
    const newValue = !pref.smsEnabled;
    setSavingCategory(pref.category);
    setPreferences(prev => prev.map(p => p.category === pref.category ? { ...p, smsEnabled: newValue } : p));
    try {
      const res = await smsAPI.updatePreference(pref.category, newValue);
      if (!res.data?.success) {
        showToast(res.data?.message || 'Failed to update preference', 'error');
        setPreferences(prev => prev.map(p => p.category === pref.category ? { ...p, smsEnabled: !newValue } : p));
      }
    } catch {
      showToast('Failed to update preference', 'error');
      setPreferences(prev => prev.map(p => p.category === pref.category ? { ...p, smsEnabled: !newValue } : p));
    } finally {
      setSavingCategory(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── SMS Provider Configuration ── */}
      <div className="data-table-card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>SMS Provider (MSG91)</div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Enter your school's MSG91 credentials. Contact My-Skoolz support for help with DLT registration.
            </p>
          </div>
          {settings && <StatusBadge configured={settings.configured} />}
        </div>

        <form onSubmit={handleSaveProvider} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              {FIELD.label('MSG91 Auth Key *')}
              {FIELD.input({
                type: 'password',
                placeholder: 'Enter new auth key to update',
                value: form.authKey,
                onChange: e => setForm(f => ({ ...f, authKey: e.target.value })),
                autoComplete: 'new-password',
              })}
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                Found in MSG91 dashboard → API → Auth Key
              </p>
            </div>
            <div>
              {FIELD.label('Sender ID (DLT Registered) *')}
              {FIELD.input({
                placeholder: 'e.g. MYSKOL',
                value: form.senderId,
                onChange: e => setForm(f => ({ ...f, senderId: e.target.value.toUpperCase() })),
                maxLength: 11,
              })}
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                6–11 char alphanumeric, must match your DLT-registered header
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 }}>
            <div>
              {FIELD.label('DLT Template ID (optional)')}
              {FIELD.input({
                placeholder: 'Approved DLT template ID',
                value: form.dltTeId,
                onChange: e => setForm(f => ({ ...f, dltTeId: e.target.value })),
              })}
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                From TRAI DLT portal — required for promotional SMS, optional for transactional
              </p>
            </div>
            <div>
              {FIELD.label('Route')}
              {FIELD.input({
                placeholder: '4',
                value: form.route,
                onChange: e => setForm(f => ({ ...f, route: e.target.value })),
                maxLength: 2,
              })}
            </div>
            <div>
              {FIELD.label('Country Code')}
              {FIELD.input({
                placeholder: '91',
                value: form.countryCode,
                onChange: e => setForm(f => ({ ...f, countryCode: e.target.value })),
                maxLength: 4,
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={savingProvider}
              style={{
                padding: '9px 22px', borderRadius: 8, border: 'none', cursor: savingProvider ? 'not-allowed' : 'pointer',
                background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600,
                opacity: savingProvider ? 0.6 : 1,
              }}
            >
              {savingProvider ? 'Saving…' : 'Save Provider Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Notification Preferences ── */}
      <div className="data-table-card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Notification Preferences</div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Control which SMS categories are enabled. These will gate automated alerts once triggered.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {preferences.map(pref => (
            <div key={pref.category} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{categoryLabel(pref.category)}</span>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: savingCategory === pref.category ? 'not-allowed' : 'pointer' }}>
                <input type="checkbox" checked={pref.smsEnabled} onChange={() => handleToggle(pref)} disabled={savingCategory === pref.category}
                  style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', inset: 0, borderRadius: 24, background: pref.smsEnabled ? '#4f46e5' : 'var(--border-strong)', transition: 'background 0.2s' }} />
                <span style={{ position: 'absolute', top: 3, left: pref.smsEnabled ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
