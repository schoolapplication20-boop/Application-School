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

  useEffect(() => {
    api.get('/api/schools').then(r => setSchools(r.data?.data || [])).catch(() => {});
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

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Feature Control</h2>
      <p style={{ color: '#6b7280', marginBottom: '24px' }}>Enable or disable modules per school.</p>

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
