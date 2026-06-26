import { useState } from 'react';
import api from '../../services/api';

const THEMES = [
  { key: 'green',    name: 'Forest Green',  primary: '#25d366', secondary: '#128c7e', bg: '#f0fdf4' },
  { key: 'blue',     name: 'Ocean Blue',    primary: '#3b82f6', secondary: '#1d4ed8', bg: '#eff6ff' },
  { key: 'orange',   name: 'Sunset Orange', primary: '#f97316', secondary: '#ea580c', bg: '#fff7ed' },
  { key: 'purple',   name: 'Royal Purple',  primary: '#8b5cf6', secondary: '#7c3aed', bg: '#f5f3ff' },
  { key: 'red',      name: 'Crimson Red',   primary: '#ef4444', secondary: '#dc2626', bg: '#fef2f2' },
  { key: 'teal',     name: 'Deep Teal',     primary: '#14b8a6', secondary: '#0f766e', bg: '#f0fdfa' },
  { key: 'pink',     name: 'Rose Pink',     primary: '#ec4899', secondary: '#db2777', bg: '#fdf2f8' },
  { key: 'dark',     name: 'Midnight Dark', primary: '#6366f1', secondary: '#4f46e5', bg: '#0f172a' },
];

export default function ThemeStep({ data, updateData, onNext, onBack }) {
  const [selected, setSelected] = useState(data.theme || 'green');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const theme = THEMES.find((t) => t.key === selected) || THEMES[0];

  const handleNext = async () => {
    setSaving(true);
    setError('');
    try {
      await api.patch('/businesses/theme', { theme: selected, primaryColor: theme.primary, secondaryColor: theme.secondary });
      updateData({ theme: selected, primaryColor: theme.primary, secondaryColor: theme.secondary });
      onNext();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onb-step">
      <div className="onb-step-header">
        <h2 className="onb-step-title">Choose Your Theme</h2>
        <p className="onb-step-desc">Pick a colour theme for your customer ordering menu. It reflects your brand personality.</p>
      </div>

      {error && <div className="onb-error">{error}</div>}

      <div className="onb-theme-grid">
        {THEMES.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`onb-theme-card ${selected === t.key ? 'selected' : ''}`}
            onClick={() => setSelected(t.key)}
            style={{ '--theme-primary': t.primary, '--theme-secondary': t.secondary, '--theme-bg': t.bg }}
          >
            <div className="onb-theme-preview" style={{ background: t.bg }}>
              <div className="onb-theme-header" style={{ background: t.primary }}>
                <div className="onb-theme-dot" />
                <div className="onb-theme-dot" style={{ background: 'rgba(255,255,255,0.5)' }} />
              </div>
              <div className="onb-theme-body">
                <div className="onb-theme-item" style={{ background: `${t.primary}20` }}>
                  <div className="onb-theme-item-dot" style={{ background: t.primary }} />
                  <div className="onb-theme-item-line" />
                </div>
                <div className="onb-theme-item" style={{ background: `${t.primary}20` }}>
                  <div className="onb-theme-item-dot" style={{ background: t.primary }} />
                  <div className="onb-theme-item-line" />
                </div>
              </div>
              <div className="onb-theme-btn" style={{ background: t.primary }} />
            </div>
            <div className="onb-theme-info">
              <div className="onb-theme-swatch" style={{ background: t.primary }} />
              <span className="onb-theme-name">{t.name}</span>
              {selected === t.key && <span className="onb-theme-check">✓</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Live preview */}
      <div className="onb-theme-live-preview" style={{ '--preview-primary': theme.primary, '--preview-bg': theme.bg }}>
        <div className="onb-preview-label">Preview</div>
        <div className="onb-preview-menu" style={{ background: theme.bg }}>
          <div className="onb-preview-menu-header" style={{ background: theme.primary }}>
            <div className="onb-preview-business">🍕 Your Business</div>
          </div>
          <div className="onb-preview-menu-body">
            {['Margherita Pizza', 'Pepperoni', 'BBQ Chicken'].map((item) => (
              <div key={item} className="onb-preview-item">
                <span>{item}</span>
                <span className="onb-preview-price" style={{ color: theme.primary }}>₹250</span>
                <button className="onb-preview-add" style={{ background: theme.primary }}>+</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="onb-actions">
        <button className="btn btn-outline" onClick={onBack} disabled={saving}>← Back</button>
        <button className="btn btn-primary" onClick={handleNext} disabled={saving}>
          {saving ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
