import { useState } from 'react';

export default function DeleteStudentModal({ deleteTarget, submitting, isSuperAdmin, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: 440 }}>
        <div className="modal-body" style={{ textAlign: 'center', padding: '32px 28px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff5f5', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-icons" style={{ fontSize: 32, color: '#e53e3e' }}>person_remove</span>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>
            {isSuperAdmin ? 'Delete Student' : 'Request Deletion of Student'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 600 }}>
            {deleteTarget.name}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            Roll No: {deleteTarget.rollNo || deleteTarget.rollNumber} &nbsp;·&nbsp;
            {deleteTarget.class || deleteTarget.className}
            {deleteTarget.section ? ` – ${deleteTarget.section}` : ''}
          </p>
          <div style={{ padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 12, color: '#9a3412', marginBottom: 16, textAlign: 'left', display: 'flex', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>info</span>
            <span>
              {isSuperAdmin
                ? 'The student will be deactivated immediately and their login disabled. This is recorded in the audit trail.'
                : 'This sends a deletion request to the Super Admin for approval. The student will not be removed until it is approved.'}
            </span>
          </div>
          <div style={{ textAlign: 'left', marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
              Reason for Deletion *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="State the reason this student should be deleted…"
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={onCancel}
              disabled={submitting}
              style={{ padding: '9px 22px', border: '1.5px solid var(--border-strong)', borderRadius: 9, background: 'var(--surface)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={() => onConfirm(trimmed)}
              disabled={submitting || !trimmed}
              style={{
                padding: '9px 22px', background: (submitting || !trimmed) ? '#a0aec0' : '#e53e3e', color: '#fff', border: 'none',
                borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: (submitting || !trimmed) ? 'not-allowed' : 'pointer',
              }}>
              {submitting ? 'Submitting…' : isSuperAdmin ? 'Delete Student' : 'Submit for Approval'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
