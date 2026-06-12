import React from 'react';
import CredentialCard from './CredentialCard';
import { subjectColor, getInitials } from './constants';

export default function ViewCredentialsModal({ viewCredTarget, onClose, onResetPassword }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-container" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 18, color: '#7c3aed' }}>key</span>
            Login Credentials
          </span>
          <button className="modal-close" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {/* Teacher info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-alt)', borderRadius: 10, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${subjectColor((viewCredTarget.subject || '').split(',')[0].trim())}, #0eb5da)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
              {getInitials(viewCredTarget.name)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{viewCredTarget.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{viewCredTarget.subject} {viewCredTarget.department ? `· ${viewCredTarget.department}` : ''}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <CredentialCard label="Email (Login ID)" value={viewCredTarget.email} />
            <CredentialCard label="Password" value="Stored securely in database. Use Reset Password to set a new one." />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>Close</button>
          <button onClick={onResetPassword}
            style={{ padding: '10px 20px', background: '#ed8936', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-icons" style={{ fontSize: 16 }}>lock_reset</span>
            Reset Password
          </button>
        </div>
      </div>
    </div>
  );
}
