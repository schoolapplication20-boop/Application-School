import { useState } from 'react';

export default function BulkDeleteModal({ selectedIds, bulkDeleting, isSuperAdmin, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: 440 }}>
        <div className="modal-body" style={{ textAlign: 'center', padding: '32px 28px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff5f5', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-icons" style={{ fontSize: 32, color: '#e53e3e' }}>delete_sweep</span>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>
            {isSuperAdmin ? 'Delete' : 'Request Deletion of'} {selectedIds.size} Student{selectedIds.size !== 1 ? 's' : ''}?
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            You have selected <strong style={{ color: 'var(--text-primary)' }}>{selectedIds.size}</strong> student{selectedIds.size !== 1 ? 's' : ''} for deletion.
          </p>
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#9a3412', marginBottom: 16, textAlign: 'left', display: 'flex', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>info</span>
            <span>
              {isSuperAdmin
                ? 'Selected students will be deactivated immediately and their logins disabled.'
                : 'Each student will get a deletion request sent to the Super Admin for approval — none will be removed until approved.'}
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
              placeholder="State the reason these students should be deleted…"
              style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={onCancel}
              disabled={bulkDeleting}
              style={{ padding: '9px 22px', border: '1.5px solid var(--border-strong)', borderRadius: 9, background: 'var(--surface)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={() => onConfirm(trimmed)}
              disabled={bulkDeleting || !trimmed}
              style={{ padding: '9px 22px', background: (bulkDeleting || !trimmed) ? '#a0aec0' : '#e53e3e', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: (bulkDeleting || !trimmed) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {bulkDeleting ? (
                <><span className="material-icons" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>refresh</span> Submitting…</>
              ) : (
                <>{isSuperAdmin ? 'Delete' : 'Submit'} {selectedIds.size} Student{selectedIds.size !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
