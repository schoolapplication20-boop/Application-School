import { CredentialCard } from './shared';

export default function ViewCredentialsModal({ viewCredTarget, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: 420 }}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg,#6d28d9,#4c1d95)', color: '#fff' }}>
          <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 18 }}>key</span>
            Student Login Credentials
          </span>
          <button className="modal-close" onClick={onClose} style={{ color: '#fff', opacity: 0.8 }}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="modal-body" style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f5f3ff', border: '3px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <span className="material-icons" style={{ fontSize: 26, color: '#6d28d9' }}>school</span>
            </div>
            <h3 style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{viewCredTarget.studentName}</h3>
            <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: viewCredTarget.isActive ? '#f0fff4' : '#fff5f5', color: viewCredTarget.isActive ? '#38a169' : '#e53e3e', fontWeight: 700 }}>
              {viewCredTarget.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <CredentialCard label="Admission Number (Login ID)" value={viewCredTarget.email?.split('@')[0]} mono />
            {viewCredTarget.firstLogin && viewCredTarget.tempPassword ? (
              <CredentialCard label="Temporary Password" value={viewCredTarget.tempPassword} mono />
            ) : (
              <div style={{ background: 'var(--surface-alt)', border: '1.5px solid var(--border-strong)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Password</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-icons" style={{ fontSize: 15, color: '#38a169' }}>check_circle</span>
                  Student has already logged in and changed their password.
                </div>
              </div>
            )}
          </div>

          {viewCredTarget.firstLogin && (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fef3c7', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span className="material-icons" style={{ fontSize: 15, color: '#d69e2e', flexShrink: 0, marginTop: 1 }}>warning</span>
              <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                Student has <strong>not logged in yet</strong>. This temporary password will disappear after first login.
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose}
            style={{ padding: '10px 28px', background: '#6d28d9', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
