import React, { useState } from 'react';
import { SMS_CATEGORIES, extractVariables, countSegments } from './constants';

const labelStyle = { fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' };

export default function TemplateModal({ template, saving, onClose, onSave }) {
  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState(template?.category || 'GENERAL');
  const [content, setContent] = useState(template?.content || '');
  const [isActive, setIsActive] = useState(template ? !!template.isActive : true);

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (!content.trim()) return;
    onSave({ name: name.trim(), category, content: content.trim(), isActive });
  };

  const variables = extractVariables(content);
  const segments = countSegments(content);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 560, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{template ? 'Edit Template' : 'New Template'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-secondary)' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="e.g. Fee Reminder" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                {SMS_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                Active
              </label>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Content *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={5}
              placeholder="Dear {{name}}, your fee of {{amount}} is due on {{dueDate}}."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
              {content.length} character{content.length === 1 ? '' : 's'} · {segments} SMS segment{segments === 1 ? '' : 's'}
              {variables.length > 0 && ` · Variables: ${variables.map(v => `{{${v}}}`).join(', ')}`}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
            <button onClick={onClose}
              style={{ padding: '10px 20px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#4f46e5', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : template ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
