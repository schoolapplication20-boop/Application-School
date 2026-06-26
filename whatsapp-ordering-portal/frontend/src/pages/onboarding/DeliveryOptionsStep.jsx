import { useState } from 'react';
import api from '../../services/api';

const OPTIONS = [
  { key: 'pickup',   label: 'Pickup',        icon: '🏪', desc: 'Customers pick up from your location' },
  { key: 'delivery', label: 'Delivery',       icon: '🚚', desc: 'You deliver to customers' },
  { key: 'dine_in',  label: 'Dine In',        icon: '🍽️', desc: 'Table ordering via QR code' },
];

export default function DeliveryOptionsStep({ data, updateData, onNext, onBack }) {
  const [selected, setSelected]         = useState(data.deliveryOptions || ['pickup']);
  const [deliveryFee, setDeliveryFee]   = useState(data.deliveryFee || '');
  const [minOrder, setMinOrder]         = useState(data.minOrderAmount || '');
  const [freeAbove, setFreeAbove]       = useState(data.freeDeliveryAbove || '');
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  const toggle = (key) =>
    setSelected((s) => s.includes(key) ? s.filter((k) => k !== key) : [...s, key]);

  const handleNext = async () => {
    if (selected.length === 0) { setError('Select at least one option'); return; }
    setSaving(true);
    setError('');
    try {
      await api.patch('/businesses/delivery', {
        deliveryOptions: selected,
        deliveryFee: deliveryFee ? parseFloat(deliveryFee) : 0,
        minOrderAmount: minOrder ? parseFloat(minOrder) : 0,
        freeDeliveryAbove: freeAbove ? parseFloat(freeAbove) : null,
      });
      updateData({ deliveryOptions: selected, deliveryFee, minOrderAmount: minOrder, freeDeliveryAbove: freeAbove });
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
        <h2 className="onb-step-title">Delivery Options</h2>
        <p className="onb-step-desc">How will customers receive their orders? Select all that apply.</p>
      </div>

      {error && <div className="onb-error">{error}</div>}

      <div className="onb-option-cards">
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`onb-option-card ${selected.includes(opt.key) ? 'selected' : ''}`}
            onClick={() => toggle(opt.key)}
          >
            <span className="onb-option-icon">{opt.icon}</span>
            <span className="onb-option-label">{opt.label}</span>
            <span className="onb-option-desc">{opt.desc}</span>
            <span className="onb-option-check">{selected.includes(opt.key) ? '✓' : ''}</span>
          </button>
        ))}
      </div>

      {selected.includes('delivery') && (
        <div className="onb-delivery-config">
          <h3 className="onb-subsection-title">Delivery Settings</h3>
          <div className="onb-form-row">
            <div className="onb-field">
              <label className="onb-label">Delivery Fee</label>
              <input className="onb-input" type="number" min="0" step="0.01" placeholder="0.00" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} />
            </div>
            <div className="onb-field">
              <label className="onb-label">Minimum Order Amount</label>
              <input className="onb-input" type="number" min="0" step="0.01" placeholder="0.00" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
            </div>
            <div className="onb-field">
              <label className="onb-label">Free Delivery Above</label>
              <input className="onb-input" type="number" min="0" step="0.01" placeholder="Optional" value={freeAbove} onChange={(e) => setFreeAbove(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div className="onb-actions">
        <button className="btn btn-outline" onClick={onBack} disabled={saving}>← Back</button>
        <button className="btn btn-primary" onClick={handleNext} disabled={saving}>
          {saving ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </div>
  );
}
