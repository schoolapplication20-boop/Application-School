export default function OnboardStudentModal({
  onboardTarget, onboardEmail, setOnboardEmail, onboarding, onboardResult,
  onClose, onConfirm,
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {onboardResult ? (
          <div style={{ textAlign: 'center' }}>
            <span className="material-icons" style={{ fontSize: 50, color: '#38a169' }}>how_to_reg</span>
            <h3 style={{ marginTop: 12 }}>Account Created!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Login credentials for <strong>{onboardTarget.name}</strong>:</p>
            <div style={{ background: 'var(--surface-alt)', border: '1.5px solid var(--border-strong)', borderRadius: 8, padding: 12, textAlign: 'left', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Email: <strong>{onboardEmail}</strong></div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Temp Password: <strong style={{ fontFamily: 'monospace' }}>{onboardResult.studentTempPassword}</strong></div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>Student will change this password on first login. A welcome email has been sent.</p>
            <button onClick={onClose} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#276749', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fff4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-icons" style={{ color: '#276749', fontSize: 22 }}>person_add</span>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Create Account</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{onboardTarget.name}</div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Student Email Address</label>
              <input type="email" value={onboardEmail} onChange={e => setOnboardEmail(e.target.value)}
                placeholder="student@email.com" autoFocus
                style={{ width: '100%', border: '1.5px solid var(--border-strong)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>A welcome email with login credentials will be sent.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} disabled={onboarding} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={onConfirm} disabled={onboarding || !onboardEmail.trim()} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#276749', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: onboarding ? 0.7 : 1 }}>
                {onboarding ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
