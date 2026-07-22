import { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

const FEATURE_KEYS = [
  { key: 'students',       label: 'Student Management',  tier: 'BASIC' },
  { key: 'attendance',     label: 'Attendance',          tier: 'BASIC' },
  { key: 'fees',           label: 'Fee Management',      tier: 'BASIC' },
  { key: 'announcements',  label: 'Announcements',       tier: 'BASIC' },
  { key: 'examination',    label: 'Examination & Marks', tier: 'STANDARD' },
  { key: 'report_cards',   label: 'Report Cards',        tier: 'STANDARD' },
  { key: 'timetable',      label: 'Timetable',           tier: 'STANDARD' },
  { key: 'diary',          label: 'Class Diary',         tier: 'STANDARD' },
  { key: 'leave',          label: 'Leave Management',    tier: 'STANDARD' },
  { key: 'salaries',       label: 'Salary Management',   tier: 'STANDARD' },
  { key: 'messages',       label: 'Messaging',           tier: 'STANDARD' },
  { key: 'sms',            label: 'SMS Campaigns',       tier: 'STANDARD' },
  { key: 'transport',      label: 'Transport',           tier: 'PREMIUM' },
  { key: 'online_exams',   label: 'Online Exams',        tier: 'PREMIUM' },
  { key: 'whatsapp',       label: 'WhatsApp Broadcast',  tier: 'PREMIUM' },
  { key: 'ai_assistant',   label: 'AI Assistant',        tier: 'PREMIUM' },
  { key: 'bulk_import',    label: 'Bulk Import',         tier: 'PREMIUM' },
  { key: 'parent_portal',  label: 'Parent Portal',       tier: 'PREMIUM' },
];

const TIER_COLORS = { BASIC: '#16a34a', STANDARD: '#2563eb', PREMIUM: '#7c3aed' };

export default function FeatureControlDashboard() {
  const { showToast } = useToast();
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null);

  // WhatsApp: platform-wide kill switch
  const [whatsappGlobalEnabled, setWhatsappGlobalEnabled] = useState(true);
  const [whatsappGlobalSaving, setWhatsappGlobalSaving] = useState(false);

  // WhatsApp: per-school quota/usage
  const [whatsappUsage, setWhatsappUsage] = useState(null);
  const [quotaInput, setQuotaInput] = useState('');
  const [quotaSaving, setQuotaSaving] = useState(false);

  useEffect(() => {
    api.get('/api/schools').then(r => setSchools(r.data?.data || [])).catch(() => {});
    api.get('/api/owner/whatsapp/module-status')
      .then(r => setWhatsappGlobalEnabled(!!r.data?.data?.enabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedSchool) return;
    setLoading(true);
    api.get(`/api/superadmin/schools/${selectedSchool.id}/features`)
      .then(r => {
        const map = {};
        (r.data?.data || []).forEach(f => {
          map[f.id?.featureKey || f.featureKey] = f.enabled;
        });
        setFeatures(map);
      })
      .catch(() => showToast('Failed to load features', 'error'))
      .finally(() => setLoading(false));

    api.get(`/api/owner/schools/${selectedSchool.id}/fee-summary`)
      .then(r => {
        const d = r.data?.data || {};
        setWhatsappUsage({
          quota: d.whatsappMonthlyQuota ?? null,
          sentThisMonth: d.whatsappSentThisMonth ?? 0,
          breached: !!d.whatsappQuotaBreached,
        });
        setQuotaInput(d.whatsappMonthlyQuota != null ? String(d.whatsappMonthlyQuota) : '');
      })
      .catch(() => setWhatsappUsage(null));
  }, [selectedSchool]);

  const toggle = async (key) => {
    if (!selectedSchool) return;
    const newVal = !features[key];
    setSaving(key);
    try {
      await api.put(`/api/superadmin/schools/${selectedSchool.id}/features/${key}`, { enabled: newVal });
      setFeatures(prev => ({ ...prev, [key]: newVal }));
      showToast(`${key} ${newVal ? 'enabled' : 'disabled'}`, 'success');
    } catch {
      showToast('Failed to update feature', 'error');
    } finally {
      setSaving(null);
    }
  };

  const toggleWhatsappGlobal = async () => {
    const newVal = !whatsappGlobalEnabled;
    setWhatsappGlobalSaving(true);
    try {
      await api.patch('/api/owner/whatsapp/module-status', { enabled: newVal });
      setWhatsappGlobalEnabled(newVal);
      showToast(`WhatsApp ${newVal ? 'enabled' : 'disabled'} platform-wide`, 'success');
    } catch {
      showToast('Failed to update WhatsApp module status', 'error');
    } finally {
      setWhatsappGlobalSaving(false);
    }
  };

  const saveQuota = async () => {
    if (!selectedSchool) return;
    setQuotaSaving(true);
    try {
      const quota = quotaInput.trim() === '' ? null : Number(quotaInput);
      await api.patch(`/api/owner/schools/${selectedSchool.id}/whatsapp-quota`, { whatsappMonthlyQuota: quota });
      setWhatsappUsage(prev => prev ? { ...prev, quota } : prev);
      showToast('WhatsApp quota updated', 'success');
    } catch {
      showToast('Failed to update WhatsApp quota', 'error');
    } finally {
      setQuotaSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Feature Control</h2>
      <p style={{ color: '#6b7280', marginBottom: '24px' }}>Enable or disable modules per school.</p>

      {/* WhatsApp platform-wide kill switch */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px',
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>WhatsApp — Platform-Wide Switch</div>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
            Master switch for the entire WhatsApp module, across all schools. Per-school access below still applies on top of this.
          </p>
        </div>
        <button
          onClick={toggleWhatsappGlobal}
          disabled={whatsappGlobalSaving}
          style={{
            padding: '6px 18px', borderRadius: '20px', border: 'none',
            cursor: whatsappGlobalSaving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.8rem',
            background: whatsappGlobalEnabled ? '#dcfce7' : '#fee2e2',
            color: whatsappGlobalEnabled ? '#16a34a' : '#dc2626',
            opacity: whatsappGlobalSaving ? 0.7 : 1, flexShrink: 0,
          }}
        >
          {whatsappGlobalSaving ? '...' : whatsappGlobalEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>Select School</label>
        <select
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', minWidth: '320px' }}
          value={selectedSchool?.id || ''}
          onChange={e => setSelectedSchool(schools.find(s => String(s.id) === e.target.value) || null)}
        >
          <option value="">-- Select a school --</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {selectedSchool && (
        <div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
            <strong>{selectedSchool.name}</strong> — Plan: {selectedSchool.subscriptionPlan || 'BASIC'}
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8 }}>WhatsApp Monthly Quota</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="number"
                min="1"
                placeholder="No limit"
                value={quotaInput}
                onChange={e => setQuotaInput(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', width: 140 }}
              />
              <button
                onClick={saveQuota}
                disabled={quotaSaving}
                style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: quotaSaving ? 'not-allowed' : 'pointer', opacity: quotaSaving ? 0.7 : 1 }}
              >
                {quotaSaving ? 'Saving…' : 'Save Quota'}
              </button>
              {whatsappUsage && (
                <span style={{ fontSize: '0.8rem', color: whatsappUsage.breached ? '#dc2626' : '#6b7280', fontWeight: whatsappUsage.breached ? 700 : 400 }}>
                  {whatsappUsage.sentThisMonth} sent this month{whatsappUsage.quota != null ? ` / ${whatsappUsage.quota} quota` : ''}
                  {whatsappUsage.breached ? ' — quota exceeded' : ''}
                </span>
              )}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
              Report-only — sending is never blocked when a school exceeds its quota.
            </p>
          </div>

          {loading ? <p>Loading features...</p> : (
            ['BASIC', 'STANDARD', 'PREMIUM'].map(tier => (
              <div key={tier} style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: TIER_COLORS[tier], textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  {tier} TIER
                </h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {FEATURE_KEYS.filter(f => f.tier === tier).map(f => (
                    <div
                      key={f.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{f.label}</span>
                      <button
                        onClick={() => toggle(f.key)}
                        disabled={saving === f.key}
                        style={{
                          padding: '4px 16px',
                          borderRadius: '20px',
                          border: 'none',
                          cursor: saving === f.key ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          background: features[f.key] ? '#dcfce7' : '#fee2e2',
                          color: features[f.key] ? '#16a34a' : '#dc2626',
                          opacity: saving === f.key ? 0.7 : 1,
                        }}
                      >
                        {saving === f.key ? '...' : features[f.key] ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
