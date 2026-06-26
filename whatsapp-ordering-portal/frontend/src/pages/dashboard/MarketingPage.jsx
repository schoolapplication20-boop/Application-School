import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const TAB_COUPONS   = 'coupons';
const TAB_BROADCAST = 'broadcast';

function CouponsTab() {
  const [coupons, setCoupons]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({ code: '', discountType: 'percentage', discountValue: '', minOrderAmount: '', maxUses: '', expiresAt: '' });
  const [errors, setErrors]         = useState({});
  const [toast, setToast]           = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/coupons');
      setCoupons(res.data.data || []);
    } catch { setCoupons([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const validate = () => {
    const e = {};
    if (!form.code.trim())            e.code = 'Required';
    if (!form.discountValue)          e.discountValue = 'Required';
    if (parseFloat(form.discountValue) <= 0) e.discountValue = 'Must be > 0';
    if (form.discountType === 'percentage' && parseFloat(form.discountValue) > 100)
      e.discountValue = 'Max 100%';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.post('/coupons', { ...form, discountValue: parseFloat(form.discountValue), minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : 0, maxUses: form.maxUses ? parseInt(form.maxUses) : null });
      setToast('Coupon created!');
      setShowForm(false);
      setForm({ code: '', discountType: 'percentage', discountValue: '', minOrderAmount: '', maxUses: '', expiresAt: '' });
      load();
    } catch (err) {
      setToast(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const toggleActive = async (coupon) => {
    try {
      await api.patch(`/coupons/${coupon.couponId}`, { isActive: !coupon.isActive });
      load();
    } catch {}
  };

  const deleteCoupon = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    try { await api.delete(`/coupons/${id}`); load(); } catch {}
  };

  const genCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const code  = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setForm((f) => ({ ...f, code }));
  };

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}
      <div className="section-header">
        <h2 className="section-title">Coupons & Promo Codes</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Create Coupon</button>
      </div>

      {showForm && (
        <div className="card form-card">
          <h3 className="form-card-title">New Coupon</h3>
          <div className="form-grid">
            <div className="field">
              <label className="label">Code</label>
              <div className="input-group">
                <input className="input" placeholder="SAVE20" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
                <button className="btn btn-outline" type="button" onClick={genCode}>Generate</button>
              </div>
              {errors.code && <p className="field-error">{errors.code}</p>}
            </div>

            <div className="field">
              <label className="label">Discount Type</label>
              <select className="input" value={form.discountType} onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>

            <div className="field">
              <label className="label">Discount Value</label>
              <input className="input" type="number" min="0" placeholder={form.discountType === 'percentage' ? '20' : '50'} value={form.discountValue} onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))} />
              {errors.discountValue && <p className="field-error">{errors.discountValue}</p>}
            </div>

            <div className="field">
              <label className="label">Min Order Amount</label>
              <input className="input" type="number" min="0" placeholder="Optional" value={form.minOrderAmount} onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))} />
            </div>

            <div className="field">
              <label className="label">Max Uses</label>
              <input className="input" type="number" min="1" placeholder="Unlimited" value={form.maxUses} onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))} />
            </div>

            <div className="field">
              <label className="label">Expires At</label>
              <input className="input" type="datetime-local" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Create Coupon'}</button>
          </div>
        </div>
      )}

      {loading ? <div className="page-loader">Loading…</div> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Code</th><th>Discount</th><th>Min Order</th><th>Uses</th><th>Expires</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr><td colSpan={7} className="table-empty">No coupons yet. Create your first one!</td></tr>
              ) : coupons.map((c) => (
                <tr key={c.couponId}>
                  <td><code className="coupon-code">{c.code}</code></td>
                  <td>{c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}</td>
                  <td>{c.minOrderAmount ? `₹${c.minOrderAmount}` : '—'}</td>
                  <td>{c.usedCount || 0}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                  <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}</td>
                  <td>
                    <button className={`badge ${c.isActive ? 'badge-success' : 'badge-neutral'}`} style={{ cursor: 'pointer' }} onClick={() => toggleActive(c)}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <button className="btn btn-danger btn-xs" onClick={() => deleteCoupon(c.couponId)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BroadcastTab() {
  const [message, setMessage]   = useState('');
  const [audience, setAudience] = useState('all');
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [count, setCount]       = useState(null);
  const [error, setError]       = useState('');

  const preview = message.trim();

  const handleSend = async () => {
    if (!preview) { setError('Message cannot be empty'); return; }
    if (!window.confirm(`Send this message to ${audience === 'all' ? 'all' : 'selected'} customers?`)) return;
    setSending(true);
    setError('');
    try {
      const res = await api.post('/broadcasts', { message: preview, audience });
      setCount(res.data.data?.sent || 0);
      setSent(true);
      setMessage('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  if (sent) return (
    <div className="broadcast-success">
      <div className="broadcast-success-icon">✅</div>
      <h3>Broadcast Sent!</h3>
      <p>Your message was delivered to <strong>{count}</strong> customers.</p>
      <button className="btn btn-primary" onClick={() => setSent(false)}>Send Another</button>
    </div>
  );

  return (
    <div className="broadcast-compose">
      <div className="section-header">
        <h2 className="section-title">Broadcast Message</h2>
      </div>

      <div className="broadcast-grid">
        <div className="broadcast-form">
          <div className="field">
            <label className="label">Audience</label>
            <select className="input" value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="all">All Customers</option>
              <option value="active">Active Customers (ordered in last 30 days)</option>
              <option value="inactive">Inactive Customers (no order in 30+ days)</option>
            </select>
          </div>

          <div className="field">
            <label className="label">Message</label>
            <textarea
              className="input"
              rows={6}
              placeholder="Hey {{name}}! 👋 We have a special offer just for you…"
              value={message}
              onChange={(e) => { setMessage(e.target.value); setError(''); }}
            />
            <p className="field-hint">{message.length}/1000 characters · Use {'{{name}}'} for customer name</p>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button className="btn btn-primary" onClick={handleSend} disabled={sending || !preview}>
            {sending ? 'Sending…' : '📢 Send Broadcast'}
          </button>
        </div>

        {/* Preview */}
        <div className="broadcast-preview">
          <div className="broadcast-preview-label">WhatsApp Preview</div>
          <div className="broadcast-phone">
            <div className="broadcast-wa-header">
              <div className="broadcast-wa-avatar">B</div>
              <span>Your Business</span>
            </div>
            <div className="broadcast-wa-body">
              {preview ? (
                <div className="broadcast-wa-bubble">{preview.replace('{{name}}', 'Rahul')}</div>
              ) : (
                <div className="broadcast-wa-placeholder">Your message will appear here…</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketingPage() {
  const [tab, setTab] = useState(TAB_COUPONS);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Marketing</h1>
          <p className="page-subtitle">Grow revenue with coupons, promotions, and broadcast campaigns.</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === TAB_COUPONS   ? 'active' : ''}`} onClick={() => setTab(TAB_COUPONS)}>🏷️ Coupons</button>
        <button className={`tab ${tab === TAB_BROADCAST ? 'active' : ''}`} onClick={() => setTab(TAB_BROADCAST)}>📢 Broadcasts</button>
      </div>

      {tab === TAB_COUPONS   && <CouponsTab />}
      {tab === TAB_BROADCAST && <BroadcastTab />}
    </div>
  );
}
