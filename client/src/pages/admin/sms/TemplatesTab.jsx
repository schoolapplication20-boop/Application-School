import React, { useState } from 'react';
import { smsAPI } from '../../../services/api';
import { categoryLabel } from './constants';
import TemplateModal from './TemplateModal';

export default function TemplatesTab({ templates, loading, showToast, onChanged }) {
  const [modalTemplate, setModalTemplate] = useState(undefined); // undefined = closed, null = new, object = edit
  const [saving, setSaving] = useState(false);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      const res = modalTemplate
        ? await smsAPI.updateTemplate(modalTemplate.id, data)
        : await smsAPI.createTemplate(data);
      if (res.data?.success) {
        showToast(res.data?.message || (modalTemplate ? 'Template updated' : 'Template created'));
        setModalTemplate(undefined);
        onChanged();
      } else {
        showToast(res.data?.message || 'Failed to save template', 'error');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    try {
      const res = await smsAPI.deleteTemplate(template.id);
      if (res.data?.success) {
        showToast('Template deleted');
        onChanged();
      } else {
        showToast(res.data?.message || 'Failed to delete template', 'error');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to delete template', 'error');
    }
  };

  return (
    <div className="data-table-card">
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>SMS Templates</span>
        <button onClick={() => setModalTemplate(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <span className="material-icons" style={{ fontSize: 16 }}>add</span>
          New Template
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
          Loading…
        </div>
      ) : templates.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8, color: 'var(--border-strong)' }}>description</span>
          No templates yet. Create one to speed up composing messages.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {templates.map(t => (
            <div key={t.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{t.name}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: '#ebf8ff', color: '#2b6cb0' }}>{categoryLabel(t.category)}</span>
                  {!t.isActive && (
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: '#f7fafc', color: '#a0aec0' }}>Inactive</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{t.content}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => setModalTemplate(t)} title="Edit"
                  style={{ border: 'none', background: 'var(--surface-alt)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <span className="material-icons" style={{ fontSize: 16 }}>edit</span>
                </button>
                <button onClick={() => handleDelete(t)} title="Delete"
                  style={{ border: 'none', background: '#fff5f5', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#c53030' }}>
                  <span className="material-icons" style={{ fontSize: 16 }}>delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalTemplate !== undefined && (
        <TemplateModal template={modalTemplate} saving={saving} onClose={() => setModalTemplate(undefined)} onSave={handleSave} />
      )}
    </div>
  );
}
