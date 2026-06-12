export default function DeleteStudentModal({ deleteTarget, onCancel, onConfirm }) {
  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: 420 }}>
        <div className="modal-body" style={{ textAlign: 'center', padding: '32px 28px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff5f5', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-icons" style={{ fontSize: 32, color: '#e53e3e' }}>person_remove</span>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>
            Are you sure you want to delete this student?
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 600 }}>
            {deleteTarget.name}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
            Roll No: {deleteTarget.rollNo || deleteTarget.rollNumber} &nbsp;·&nbsp;
            {deleteTarget.class || deleteTarget.className}
            {deleteTarget.section ? ` – ${deleteTarget.section}` : ''}
          </p>
          <div style={{ padding: '10px 14px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 8, fontSize: 12, color: '#c53030', marginBottom: 20, textAlign: 'left', display: 'flex', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>warning</span>
            <span>This action cannot be undone. If this is the only student in the class, the class will also be removed.</span>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={onCancel}
              style={{ padding: '9px 22px', border: '1.5px solid var(--border-strong)', borderRadius: 9, background: 'var(--surface)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{ padding: '9px 22px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
