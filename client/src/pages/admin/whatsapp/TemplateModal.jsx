import React, { useState } from 'react';
import { WHATSAPP_CATEGORIES, APPROVAL_STATUS_META } from './constants';

const labelStyle = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' };

export default function TemplateModal({ template, saving, onClose, onSave }) {
  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState(template?.category || 'GENERAL');
  const [metaTemplateName, setMetaTemplateName] = useState(template?.metaTemplateName || '');
  const [metaLanguageCode, setMetaLanguageCode] = useState(template?.metaLanguageCode || 'en');
  const [variableLabels, setVariableLabels] = useState(
    (() => { try { return (JSON.parse(template?.variableLabels || '[]') || []).join(', '); } catch { return ''; } })()
  );
  const [hasUrlButton, setHasUrlButton] = useState(!!template?.hasUrlButton);
  const [contentPreview, setContentPreview] = useState(template?.contentPreview || '');
  const [approvalStatus, setApprovalStatus] = useState(template?.approvalStatus || 'PENDING');
  const [isActive, setIsActive] = useState(template ? !!template.isActive : true);

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (!metaTemplateName.trim()) return;
    const labels = variableLabels.split(',').map(s => s.trim()).filter(Boolean);
    onSave({
      name: name.trim(),
      category,
      metaTemplateName: metaTemplateName.trim(),
      metaLanguageCode: metaLanguageCode.trim() || 'en',
      variableLabels: labels,
      hasUrlButton,
      contentPreview: contentPreview.trim() || null,
      approvalStatus,
      isActive,
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 600, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{template ? 'Edit Template' : 'New Template'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-secondary)' }}>✕</button>
        </div>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1e40af', marginBottom: 16 }}>
          This must match a message template you've already created and had approved in your Meta Business Manager —
          this form doesn't create the template on Meta, it just records the approved name so we can send it.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Internal Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="e.g. Fee Reminder (English)" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                {WHATSAPP_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                Active
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Meta Template Name *</label>
              <input value={metaTemplateName} onChange={e => setMetaTemplateName(e.target.value)} placeholder="e.g. fee_reminder_v1" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Language Code</label>
              <input value={metaLanguageCode} onChange={e => setMetaLanguageCode(e.target.value)} placeholder="en" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Variable Order (comma-separated)</label>
            <input value={variableLabels} onChange={e => setVariableLabels(e.target.value)}
              placeholder="parent_name, student_name, amount, due_date" style={inputStyle} />
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              Must match the order of {'{{1}}'}, {'{{2}}'}, ... placeholders in your approved Meta template body.
            </p>
          </div>

          <div>
            <label style={labelStyle}>Preview Text (optional)</label>
            <textarea value={contentPreview} onChange={e => setContentPreview(e.target.value)} rows={3}
              placeholder="Dear {{1}}, your fee of {{3}} is due on {{4}}. — for your reference only, not sent to Meta"
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Approval Status</label>
              <select value={approvalStatus} onChange={e => setApprovalStatus(e.target.value)} style={inputStyle}>
                {Object.entries(APPROVAL_STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
            </div>
            {category === 'RECEIPT_LINK' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', paddingBottom: 10 }}>
                <input type="checkbox" checked={hasUrlButton} onChange={e => setHasUrlButton(e.target.checked)} />
                Has URL button
              </label>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
            <button onClick={onClose}
              style={{ padding: '10px 20px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#25D366', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : template ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
