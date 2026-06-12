import React from 'react';
import { labelStyle, inputStyle } from './constants';
import { generateRandomPassword } from '../../../utils/passwordGenerator';

export default function ResetPasswordModal({ resetTarget, resetPwd, setResetPwd, onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-container" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 18, color: '#ed8936' }}>lock_reset</span>
            Reset Password
          </span>
          <button className="modal-close" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
            Resetting password for <strong style={{ color: 'var(--text-primary)' }}>{resetTarget.name}</strong>.
            A new password has been auto-generated. You can edit it before confirming.
          </p>

          <label style={labelStyle}>New Password</label>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input
              type="text"
              style={{ ...inputStyle(!resetPwd.trim()), paddingRight: 44 }}
              value={resetPwd}
              onChange={e => setResetPwd(e.target.value)}
              placeholder="New password"
            />
            <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
              <button type="button" onClick={() => setResetPwd(generateRandomPassword())}
                title="Re-generate password"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
                <span className="material-icons" style={{ fontSize: 18 }}>refresh</span>
              </button>
            </div>
          </div>

          <div style={{ background: '#fff8f0', border: '1.5px solid #fbd38d', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#92400e', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <span className="material-icons" style={{ fontSize: 15, color: '#ed8936', flexShrink: 0 }}>info</span>
            Share the new password securely with the teacher. They will log in with it immediately.
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={!resetPwd.trim()}
            style={{ padding: '10px 20px', background: '#ed8936', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', opacity: resetPwd.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-icons" style={{ fontSize: 16 }}>lock_reset</span>
            Confirm Reset
          </button>
        </div>
      </div>
    </div>
  );
}
