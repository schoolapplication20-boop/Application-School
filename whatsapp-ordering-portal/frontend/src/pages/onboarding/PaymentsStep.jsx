import { useState } from 'react';
import api from '../../services/api';

const PAYMENT_METHODS = [
  { key: 'cash',          label: 'Cash',          icon: '💵', desc: 'Cash on delivery or pickup', always: true },
  { key: 'upi',           label: 'UPI',            icon: '📱', desc: 'Google Pay, PhonePe, BHIM', region: 'IN' },
  { key: 'card',          label: 'Card',           icon: '💳', desc: 'Credit & debit cards' },
  { key: 'stripe',        label: 'Stripe',         icon: '🔵', desc: 'Online card payments via Stripe', config: true },
  { key: 'paypal',        label: 'PayPal',         icon: '🅿️', desc: 'PayPal checkout', config: true },
  { key: 'razorpay',      label: 'Razorpay',       icon: '💜', desc: 'India payment gateway', config: true },
  { key: 'bank_transfer', label: 'Bank Transfer',  icon: '🏦', desc: 'Direct bank transfer' },
  { key: 'apple_pay',     label: 'Apple Pay',      icon: '🍎', desc: 'Apple Pay on iOS devices' },
  { key: 'google_pay',    label: 'Google Pay',     icon: '🔵', desc: 'Google Pay checkout' },
  { key: 'cash_app',      label: 'Cash App',       icon: '💸', desc: 'Cash App Pay', region: 'US' },
];

export default function PaymentsStep({ data, updateData, onNext, onBack }) {
  const [selected, setSelected]   = useState(data.paymentMethods || ['cash']);
  const [configs, setConfigs]     = useState(data.paymentConfigs || {});
  const [expanded, setExpanded]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const toggle = (key) => {
    if (key === 'cash') return; // always enabled
    setSelected((s) => s.includes(key) ? s.filter((k) => k !== key) : [...s, key]);
  };

  const setConfig = (gateway, field, value) =>
    setConfigs((c) => ({ ...c, [gateway]: { ...c[gateway], [field]: value } }));

  const handleNext = async () => {
    setSaving(true);
    setError('');
    try {
      await api.patch('/businesses/payments', { paymentMethods: selected, paymentConfigs: configs });
      updateData({ paymentMethods: selected, paymentConfigs: configs });
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
        <h2 className="onb-step-title">Payment Methods</h2>
        <p className="onb-step-desc">Choose how customers can pay. You can configure gateways and add API keys here.</p>
      </div>

      {error && <div className="onb-error">{error}</div>}

      <div className="onb-payment-grid">
        {PAYMENT_METHODS.map((pm) => {
          const isSelected = selected.includes(pm.key);
          const isExpanded = expanded === pm.key && pm.config;

          return (
            <div key={pm.key} className={`onb-payment-card ${isSelected ? 'selected' : ''} ${pm.always ? 'always' : ''}`}>
              <div className="onb-payment-row" onClick={() => toggle(pm.key)}>
                <span className="onb-payment-icon">{pm.icon}</span>
                <div className="onb-payment-info">
                  <span className="onb-payment-name">{pm.label}</span>
                  <span className="onb-payment-desc">{pm.desc}</span>
                </div>
                {pm.always ? (
                  <span className="onb-payment-always-badge">Always on</span>
                ) : (
                  <span className={`onb-payment-check ${isSelected ? 'checked' : ''}`}>
                    {isSelected ? '✓' : ''}
                  </span>
                )}
              </div>

              {isSelected && pm.config && (
                <div className="onb-payment-config-toggle">
                  <button type="button" className="onb-config-btn" onClick={() => setExpanded(isExpanded ? null : pm.key)}>
                    ⚙️ {isExpanded ? 'Hide' : 'Configure'} {pm.label}
                  </button>
                </div>
              )}

              {isExpanded && (
                <div className="onb-payment-config">
                  {pm.key === 'stripe' && (
                    <>
                      <input className="onb-input onb-input-sm" placeholder="Stripe Publishable Key (pk_…)" value={configs.stripe?.publicKey || ''} onChange={(e) => setConfig('stripe', 'publicKey', e.target.value)} />
                      <input className="onb-input onb-input-sm" type="password" placeholder="Stripe Secret Key (sk_…)" value={configs.stripe?.secretKey || ''} onChange={(e) => setConfig('stripe', 'secretKey', e.target.value)} />
                    </>
                  )}
                  {pm.key === 'paypal' && (
                    <>
                      <input className="onb-input onb-input-sm" placeholder="PayPal Client ID" value={configs.paypal?.clientId || ''} onChange={(e) => setConfig('paypal', 'clientId', e.target.value)} />
                      <input className="onb-input onb-input-sm" type="password" placeholder="PayPal Client Secret" value={configs.paypal?.clientSecret || ''} onChange={(e) => setConfig('paypal', 'clientSecret', e.target.value)} />
                    </>
                  )}
                  {pm.key === 'razorpay' && (
                    <>
                      <input className="onb-input onb-input-sm" placeholder="Razorpay Key ID" value={configs.razorpay?.keyId || ''} onChange={(e) => setConfig('razorpay', 'keyId', e.target.value)} />
                      <input className="onb-input onb-input-sm" type="password" placeholder="Razorpay Key Secret" value={configs.razorpay?.keySecret || ''} onChange={(e) => setConfig('razorpay', 'keySecret', e.target.value)} />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
