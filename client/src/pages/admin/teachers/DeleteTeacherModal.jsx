import React from 'react';

export default function DeleteTeacherModal({ deleting, onCancel, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal-container" style={{ maxWidth: 380 }}>
        <div className="modal-body" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff5f5', border: '3px solid #fc8181', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span className="material-icons" style={{ fontSize: 32, color: '#e53e3e' }}>person_off</span>
          </div>
          <h3 style={{ margin: '0 0 8px', fontWeight: 800, color: 'var(--text-primary)' }}>Remove Teacher?</h3>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-secondary)' }}>
            This will permanently remove the teacher record <strong>and their login credentials</strong>.
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#e53e3e' }}>This action cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button onClick={onCancel} disabled={deleting}
            style={{ padding: '10px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            style={{ padding: '10px 20px', background: '#e53e3e', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1, fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
            {deleting ? (
              <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Deleting…</>
            ) : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
