import { CredentialCard } from './shared';

export default function CredentialsModal({ newCredential, onClose, showToast }) {
  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: 480 }}>

        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg,#0de1e8,#5aa832)', color: '#fff' }}>
          <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 18 }}>key</span>
            Login Credentials Generated
          </span>
          <button className="modal-close" onClick={onClose} style={{ color: '#fff', opacity: 0.8 }}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="modal-body" style={{ padding: '24px', maxHeight: '72vh', overflowY: 'auto' }}>

          {/* Success banner */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#f0fff4', border: '3px solid #9ae6b4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <span className="material-icons" style={{ fontSize: 30, color: '#38a169' }}>check_circle</span>
            </div>
            <h3 style={{ margin: '0 0 4px', fontWeight: 800, color: 'var(--text-primary)', fontSize: 16 }}>
              Student Added Successfully!
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              {newCredential.studentPassword
                ? <>Credentials have been generated for <strong>{newCredential.studentName}</strong>. Share them securely.</>
                : <>Student record created for <strong>{newCredential.studentName}</strong>. No email provided — use the <strong>person_add</strong> icon to create a login account later.</>}
            </p>
          </div>

          {/* ── Student Credentials ── */}
          {newCredential.studentPassword && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: '#ebf8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-icons" style={{ fontSize: 15, color: '#3182ce' }}>school</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student Login</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <CredentialCard label="Admission Number (Login ID)" value={newCredential.studentUsername} mono />
                <CredentialCard label="Password" value={newCredential.studentPassword} mono />
              </div>
            </div>
          )}

          {/* Copy All */}
          <button
            onClick={() => {
              const text = `Student Login\nAdmission Number: ${newCredential.studentUsername}\nPassword: ${newCredential.studentPassword}`;
              navigator.clipboard.writeText(text);
              showToast('Credentials copied to clipboard');
            }}
            style={{ width: '100%', padding: '9px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface-alt)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-secondary)', marginBottom: 14 }}>
            <span className="material-icons" style={{ fontSize: 16 }}>content_copy</span>
            Copy All Credentials
          </button>

          {/* Warning */}
          <div style={{ background: '#fffbeb', border: '1.5px solid #fef3c7', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span className="material-icons" style={{ fontSize: 16, color: '#d69e2e', flexShrink: 0, marginTop: 1 }}>warning</span>
            <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
              These passwords are shown <strong>only once</strong>. Passwords are stored securely (bcrypt hashed). Share directly with the student — they can reset after first login.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose}
            style={{ padding: '10px 32px', background: '#0de1e8', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
