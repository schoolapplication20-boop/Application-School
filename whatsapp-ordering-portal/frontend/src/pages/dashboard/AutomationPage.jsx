import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const TEMPLATE_TYPES = [
  { key: 'welcome',           label: '👋 Welcome',           desc: 'Sent when a new customer messages you' },
  { key: 'order_confirmation',label: '✅ Order Confirmation', desc: 'Sent when an order is confirmed' },
  { key: 'order_ready',       label: '🔔 Order Ready',       desc: 'Sent when order is ready for pickup' },
  { key: 'out_for_delivery',  label: '🚚 Out for Delivery',  desc: 'Sent when order is dispatched' },
  { key: 'order_delivered',   label: '🎉 Delivered',         desc: 'Sent when order is delivered' },
  { key: 'order_cancelled',   label: '❌ Cancelled',         desc: 'Sent when order is cancelled' },
  { key: 'away_message',      label: '🌙 Away Message',      desc: 'Sent outside business hours' },
  { key: 'payment_received',  label: '💳 Payment Received',  desc: 'Sent on payment confirmation' },
];

const VARIABLES = ['{{customer_name}}', '{{order_number}}', '{{order_total}}', '{{business_name}}', '{{order_items}}', '{{delivery_time}}'];

export default function AutomationPage() {
  const [templates, setTemplates] = useState({});
  const [loading, setLoading]     = useState(true);
  const [active, setActive]       = useState('welcome');
  const [editing, setEditing]     = useState('');
  const [enabled, setEnabled]     = useState({});
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/templates');
      const byType = {};
      const byEnabled = {};
      (res.data.data || []).forEach((t) => {
        byType[t.templateType]    = t.content;
        byEnabled[t.templateType] = t.isActive;
      });
      setTemplates(byType);
      setEnabled(byEnabled);
      setEditing(byType[active] || defaultTemplate(active));
    } catch {
      setEditing(defaultTemplate(active));
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setEditing(templates[active] || defaultTemplate(active));
  }, [active, templates]);

  const defaultTemplate = (type) => {
    const defaults = {
      welcome: 'Hi {{customer_name}}! 👋 Welcome to {{business_name}}.\n\nType *MENU* to browse our items or *HELP* for assistance.',
      order_confirmation: '✅ Order Confirmed!\n\nOrder #{{order_number}}\n{{order_items}}\nTotal: {{order_total}}\n\nWe\'ll notify you when it\'s ready!',
      order_ready: '🔔 Your order #{{order_number}} is ready!\n\nCome pick it up at your convenience.',
      out_for_delivery: '🚚 Your order #{{order_number}} is on the way!\n\nEstimated delivery: {{delivery_time}}',
      order_delivered: '🎉 Delivered! We hope you enjoy your order.\n\nRate your experience by replying ⭐ to 5️⃣',
      order_cancelled: '❌ Order #{{order_number}} has been cancelled.\n\nIf you have questions, reply to this message.',
      away_message: 'Hi! We\'re currently closed. 🌙\n\nOur hours: Mon-Fri 9am-10pm.\n\nWe\'ll respond as soon as we\'re back!',
      payment_received: '💳 Payment received for Order #{{order_number}}.\n\nAmount: {{order_total}}\n\nThank you!',
    };
    return defaults[type] || '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/templates', { templateType: active, content: editing, isActive: enabled[active] !== false });
      setTemplates((t) => ({ ...t, [active]: editing }));
      setToast('Template saved!');
    } catch {
      setToast('Failed to save');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const toggleEnabled = async (type) => {
    const next = !enabled[type];
    setEnabled((e) => ({ ...e, [type]: next }));
    try {
      await api.patch(`/templates/${type}/toggle`, { isActive: next });
    } catch {
      setEnabled((e) => ({ ...e, [type]: !next }));
    }
  };

  const insertVar = (v) => setEditing((e) => e + v);

  return (
    <div className="page-shell">
      {toast && <div className="toast toast-success">{toast}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">WhatsApp Automation</h1>
          <p className="page-subtitle">Configure automated messages sent at each stage of the order journey.</p>
        </div>
      </div>

      {loading ? <div className="page-loader">Loading templates…</div> : (
        <div className="automation-layout">
          {/* Template list */}
          <div className="automation-sidebar">
            {TEMPLATE_TYPES.map((t) => (
              <div
                key={t.key}
                className={`automation-template-item ${active === t.key ? 'active' : ''}`}
                onClick={() => setActive(t.key)}
              >
                <div className="automation-template-main">
                  <span className="automation-template-icon">{t.label.split(' ')[0]}</span>
                  <div>
                    <div className="automation-template-name">{t.label.split(' ').slice(1).join(' ')}</div>
                    <div className="automation-template-desc">{t.desc}</div>
                  </div>
                </div>
                <label className="toggle-sm" onClick={(e) => { e.stopPropagation(); toggleEnabled(t.key); }}>
                  <input type="checkbox" checked={enabled[t.key] !== false} onChange={() => {}} />
                  <span className="toggle-sm-track" />
                </label>
              </div>
            ))}
          </div>

          {/* Editor */}
          <div className="automation-editor card">
            <div className="automation-editor-header">
              <div>
                <h2 className="automation-editor-title">
                  {TEMPLATE_TYPES.find((t) => t.key === active)?.label}
                </h2>
                <p className="automation-editor-desc">
                  {TEMPLATE_TYPES.find((t) => t.key === active)?.desc}
                </p>
              </div>
              <div className="automation-editor-status">
                <span className={`badge ${enabled[active] !== false ? 'badge-success' : 'badge-neutral'}`}>
                  {enabled[active] !== false ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="field">
              <label className="label">Message Template</label>
              <textarea
                className="input automation-textarea"
                rows={10}
                value={editing}
                onChange={(e) => setEditing(e.target.value)}
              />
              <div className="field-hint">
                {editing.length} characters · WhatsApp supports *bold*, _italic_, ~strikethrough~
              </div>
            </div>

            {/* Variables */}
            <div className="automation-variables">
              <p className="label">Insert Variable:</p>
              <div className="var-chips">
                {VARIABLES.map((v) => (
                  <button key={v} type="button" className="var-chip" onClick={() => insertVar(v)}>{v}</button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="automation-preview">
              <p className="label">Preview</p>
              <div className="wa-preview-bubble">
                {editing.replace('{{customer_name}}', 'Rahul').replace('{{business_name}}', 'My Business').replace('{{order_number}}', '1042').replace('{{order_total}}', '₹450').replace('{{order_items}}', '• Chicken Biryani ×2').replace('{{delivery_time}}', '30 mins')}
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => setEditing(defaultTemplate(active))}>Reset to Default</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
