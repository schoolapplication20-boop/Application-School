import React, { useCallback, useEffect, useState } from 'react';
import { smsAPI } from '../../../services/api';
import { categoryLabel } from './constants';

export default function SettingsTab({ showToast }) {
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await smsAPI.getPreferences();
      setPreferences(res.data?.data ?? []);
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to load notification preferences', 'error');
      setPreferences([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to update preference', 'error');
      setPreferences(prev => prev.map(p => p.category === pref.category ? { ...p, smsEnabled: !newValue } : p));
    } finally {
      setSavingCategory(null);
    }
  };

  return (
    <div className="data-table-card">
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Notification Preferences</div>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
          Choose which categories of SMS notifications are enabled for your school. These toggles will control
          automated alerts (fee reminders, absence notices, etc.) once that feature is rolled out.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
          Loading…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {preferences.map(pref => (
            <div key={pref.category} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{categoryLabel(pref.category)}</span>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: savingCategory === pref.category ? 'not-allowed' : 'pointer' }}>
                <input type="checkbox" checked={pref.smsEnabled} onChange={() => handleToggle(pref)} disabled={savingCategory === pref.category}
                  style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: 24,
                  background: pref.smsEnabled ? '#4f46e5' : 'var(--border-strong)',
                  transition: 'background 0.2s',
                }} />
                <span style={{
                  position: 'absolute', top: 3, left: pref.smsEnabled ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
