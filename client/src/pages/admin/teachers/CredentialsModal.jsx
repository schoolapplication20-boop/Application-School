import React from 'react';
import CredentialCard from './CredentialCard';

export default function CredentialsModal({ newCredential, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: 480 }}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #276749, #38a169)', borderRadius: '16px 16px 0 0' }}>
          <span className="modal-title" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 20 }}>verified</span>
            Credentials Generated
          </span>
          <button className="modal-close" onClick={onClose}
            style={{ color: '#fff', opacity: 0.8 }}>
            <span className="material-icons">close</span>
          </button>
        </div>
        <div className="modal-body" style={{ padding: '24px' }}>

          {/* Success banner */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fff4', border: '3px solid #9ae6b4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <span className="material-icons" style={{ fontSize: 32, color: '#38a169' }}>check_circle</span>
            </div>
            <h3 style={{ margin: '0 0 4px', fontWeight: 800, color: 'var(--text-primary)', fontSize: 17 }}>
              Teacher added successfully!
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Login credentials have been generated for <strong>{newCredential.name}</strong>.
              Share these securely with the teacher.
            </p>
          </div>

          {/* Credential cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <CredentialCard label="Login Email (Username)" value={newCredential.email} />
            <CredentialCard label="Password" value={newCredential.password} mono />
          </div>

          {/* Warning */}
          <div style={{ background: '#fffbeb', border: '1.5px solid #fef3c7', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span className="material-icons" style={{ fontSize: 16, color: '#d69e2e', flexShrink: 0, marginTop: 1 }}>warning</span>
            <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
              This password is shown only once here. Store it securely or share it directly with the teacher. The teacher can reset it later from their profile.
            </p>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose}
            style={{ padding: '10px 28px', background: '#0de1e8', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
