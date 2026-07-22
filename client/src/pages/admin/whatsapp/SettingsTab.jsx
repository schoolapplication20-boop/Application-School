import React, { useCallback, useEffect, useState } from 'react';
import { whatsappAPI } from '../../../services/api';

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
  const [form, setForm] = useState({ phoneNumberId: '', accessToken: '', displayPhoneNumber: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await whatsappAPI.getSettings();
      const s = res.data?.data ?? {};
      setSettings(s);
      setForm({
        phoneNumberId: s.phoneNumberId || '',
        accessToken: s.accessTokenMasked || '',
        displayPhoneNumber: s.displayPhoneNumber || '',
      });
    } catch {
      showToast('Failed to load WhatsApp settings', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await whatsappAPI.saveSettings(form);
      if (res.data?.success) {
        const s = res.data?.data;
        setSettings(s);
        setForm(f => ({ ...f, accessToken: s?.accessTokenMasked || '' }));
        showToast(s?.configured ? 'WhatsApp configured successfully' : 'Settings saved (add both fields to activate)', 'success');
      } else {
        showToast(res.data?.message || 'Failed to save settings', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
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
      <div className="data-table-card">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Meta WhatsApp Cloud API</div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Each school connects its own WhatsApp Business number. Get your Phone Number ID and access token
              from your school's Meta Business Manager / WhatsApp Cloud API setup.
            </p>
          </div>
          {settings && <StatusBadge configured={settings.configured} />}
        </div>

        <form onSubmit={handleSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              {FIELD.label('Phone Number ID *')}
              {FIELD.input({
                placeholder: 'e.g. 123456789012345',
                value: form.phoneNumberId,
                onChange: e => setForm(f => ({ ...f, phoneNumberId: e.target.value })),
              })}
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                Meta Business Manager → WhatsApp → API Setup
              </p>
            </div>
            <div>
              {FIELD.label('Display Phone Number')}
              {FIELD.input({
                placeholder: 'e.g. +91 98765 43210',
                value: form.displayPhoneNumber,
                onChange: e => setForm(f => ({ ...f, displayPhoneNumber: e.target.value })),
              })}
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                Cosmetic only — shown here for your reference
              </p>
            </div>
          </div>

          <div>
            {FIELD.label('Access Token *')}
            {FIELD.input({
              type: 'password',
              placeholder: 'Enter new access token to update',
              value: form.accessToken,
              onChange: e => setForm(f => ({ ...f, accessToken: e.target.value })),
              autoComplete: 'new-password',
            })}
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              A permanent access token from a Meta System User (not a temporary 24h token)
            </p>
          </div>

          <div style={{ background: '#fffaf0', border: '1px solid #fbd38d', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e' }}>
            <strong>Note:</strong> Fee reminders, payment confirmations, and receipt links require Meta-approved
            message templates (see the Templates tab) — Meta does not allow free-text messages sent outside a
            customer-initiated conversation.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '9px 22px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: '#25D366', color: '#fff', fontSize: 13, fontWeight: 600,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
