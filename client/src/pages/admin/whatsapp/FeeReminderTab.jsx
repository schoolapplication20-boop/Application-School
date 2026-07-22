import React, { useEffect, useState } from 'react';
import { whatsappAPI } from '../../../services/api';
import { parseVariableLabels } from './constants';

const inputStyle = { padding: '8px 12px', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none' };

export default function FeeReminderTab({ templates, students, showToast, onSent }) {
  const [targetType, setTargetType] = useState('FEE_DUE');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [variables, setVariables] = useState({});
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedTemplate = templates.find(t => String(t.id) === String(templateId));
  const variableLabels = selectedTemplate ? parseVariableLabels(selectedTemplate.variableLabels) : [];

  useEffect(() => {
    if (!templateId && templates.length > 0) setTemplateId(String(templates[0].id));
  }, [templates, templateId]);

  useEffect(() => {
    setPreviewLoading(true);
    const params = { targetType };
    if (targetType === 'STUDENTS') params.studentIds = selectedStudentIds;
    whatsappAPI.previewRecipients(params)
      .then(res => setPreview(res.data?.data ?? null))
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false));
  }, [targetType, selectedStudentIds]);

  const toggleStudent = (id) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (!templateId) { showToast('Select a template first', 'error'); return; }
    if (targetType === 'STUDENTS' && selectedStudentIds.length === 0) {
      showToast('Select at least one student', 'error');
      return;
    }
    setSending(true);
    try {
      const res = await whatsappAPI.sendFeeReminder({
        targetType,
        studentIds: targetType === 'STUDENTS' ? selectedStudentIds : undefined,
        templateId: Number(templateId),
        variables,
        idempotencyKey: `feereminder-${Date.now()}`,
      });
      if (res.data?.success) {
        showToast(res.data?.message || 'Fee reminder queued', 'success');
        setSelectedStudentIds([]);
        onSent?.();
      } else {
        showToast(res.data?.message || 'Failed to send fee reminder', 'error');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to send fee reminder', 'error');
    } finally {
      setSending(false);
    }
  };

  if (templates.length === 0) {
    return (
      <div className="data-table-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8, color: 'var(--border-strong)' }}>description</span>
        No approved Fee Reminder templates yet. Add one under the Templates tab (must be marked APPROVED).
      </div>
    );
  }

  return (
    <div className="data-table-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 10 }}>Send To</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { value: 'FEE_DUE', label: 'All students with pending fees', icon: 'payments' },
            { value: 'STUDENTS', label: 'Selected students', icon: 'person_search' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setTargetType(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10,
                border: targetType === opt.value ? '2px solid #25D366' : '1.5px solid var(--border)',
                background: targetType === opt.value ? '#f0fdf4' : 'var(--surface)',
                color: targetType === opt.value ? '#166534' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
              <span className="material-icons" style={{ fontSize: 16 }}>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {targetType === 'STUDENTS' && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>
            Select students ({selectedStudentIds.length} selected)
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            {students.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={selectedStudentIds.includes(s.id)} onChange={() => toggleStudent(s.id)} />
                <span style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{s.className || ''}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>Template</div>
        <select value={templateId} onChange={e => setTemplateId(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {variableLabels.length > 0 && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>
            Shared Values (per-recipient student name is filled automatically)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {variableLabels.filter(l => !['name', 'student_name', 'parent_name'].includes(l)).map(label => (
              <div key={label}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
                <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                  value={variables[label] || ''}
                  onChange={e => setVariables(v => ({ ...v, [label]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'var(--surface-alt)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
        {previewLoading ? 'Calculating recipients…' : (
          <>
            <strong>{preview?.totalCount ?? 0}</strong> recipient(s) will receive this message.
            {preview?.sample?.length > 0 && (
              <span> e.g. {preview.sample.slice(0, 3).map(s => s.name).join(', ')}{preview.totalCount > 3 ? ', …' : ''}</span>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSend} disabled={sending || !preview?.totalCount}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none', cursor: (sending || !preview?.totalCount) ? 'not-allowed' : 'pointer',
            background: '#25D366', color: '#fff', fontSize: 14, fontWeight: 700,
            opacity: (sending || !preview?.totalCount) ? 0.6 : 1,
          }}>
          {sending ? 'Sending…' : 'Send Fee Reminder'}
        </button>
      </div>
    </div>
  );
}
