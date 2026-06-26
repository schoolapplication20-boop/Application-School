import { useState } from 'react';
import api from '../../services/api';

export default function TaxesStep({ data, updateData, onNext, onBack }) {
  const [taxEnabled, setTaxEnabled]   = useState(data.taxEnabled ?? false);
  const [taxName, setTaxName]         = useState(data.taxName || 'GST');
  const [taxRate, setTaxRate]         = useState(data.taxRate || '');
  const [taxInclusive, setInclusive]  = useState(data.taxInclusive ?? false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const handleNext = async () => {
    if (taxEnabled && (!taxRate || parseFloat(taxRate) <= 0)) {
      setError('Please enter a valid tax rate');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.patch('/businesses/tax', {
        taxEnabled,
        taxName: taxEnabled ? taxName : null,
        taxRate: taxEnabled ? parseFloat(taxRate) : 0,
        taxInclusive: taxEnabled ? taxInclusive : false,
      });
      updateData({ taxEnabled, taxName, taxRate, taxInclusive });
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
        <h2 className="onb-step-title">Taxes</h2>
        <p className="onb-step-desc">Configure how tax is applied to orders. You can change this later in Settings.</p>
      </div>

      {error && <div className="onb-error">{error}</div>}

      <div className="onb-toggle-section">
        <label className="onb-toggle-wrap">
          <input type="checkbox" className="onb-toggle-input" checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} />
          <span className="onb-toggle-track" />
          <div>
            <span className="onb-toggle-label">Enable Tax</span>
            <span className="onb-toggle-sublabel">Apply tax to customer orders</span>
          </div>
        </label>
      </div>

      {taxEnabled && (
        <div className="onb-tax-config">
          <div className="onb-form-row">
            <div className="onb-field">
              <label className="onb-label">Tax Name</label>
              <input className="onb-input" placeholder="e.g. GST, VAT, Sales Tax" value={taxName} onChange={(e) => setTaxName(e.target.value)} />
            </div>
            <div className="onb-field">
              <label className="onb-label">Tax Rate (%)</label>
              <input className="onb-input" type="number" min="0" max="100" step="0.01" placeholder="e.g. 18" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
          </div>

          <div className="onb-radio-group">
            <p className="onb-radio-heading">How is tax applied?</p>
            <label className="onb-radio-label">
              <input type="radio" name="taxType" checked={!taxInclusive} onChange={() => setInclusive(false)} />
              <div>
                <strong>Tax exclusive</strong>
                <span>Tax is added on top of product prices (recommended)</span>
              </div>
            </label>
            <label className="onb-radio-label">
              <input type="radio" name="taxType" checked={taxInclusive} onChange={() => setInclusive(true)} />
              <div>
                <strong>Tax inclusive</strong>
                <span>Product prices already include tax</span>
              </div>
            </label>
          </div>

          {taxRate && (
            <div className="onb-tax-preview">
              <p>Preview: A ₹100 item would show as <strong>₹{taxInclusive ? '100' : (100 + (100 * parseFloat(taxRate || 0) / 100)).toFixed(2)}</strong> at checkout</p>
            </div>
          )}
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
