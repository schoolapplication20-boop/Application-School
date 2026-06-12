import React from 'react';

export default function AssignClassesModal({ assignTarget, classList, assignClasses, setAssignClasses, onClose, onSave }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-container" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">Assign Classes — {assignTarget.name}</span>
          <button className="modal-close" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        <div className="modal-body" style={{ padding: '20px 24px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
            Select the classes to assign to this teacher:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {classList.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No classes found. Please create classes first.</p>
            ) : classList.map(c => {
              const label = `${c.name}${c.section ? ` - ${c.section}` : ''}`;
              const active = assignClasses.includes(label);
              return (
                <button key={c.id} type="button"
                  onClick={() => setAssignClasses(prev => active ? prev.filter(x => x !== label) : [...prev, label])}
                  style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${active ? '#0de1e8' : 'var(--border-strong)'}`, background: active ? '#0de1e8' : 'var(--surface)', color: active ? '#fff' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
                  {label}
                </button>
              );
            })}
          </div>
          {assignClasses.length > 0 && (
            <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#276749' }}>
              <strong>Assigned:</strong> {assignClasses.join(', ')}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>Cancel</button>
          <button onClick={onSave}
            style={{ padding: '10px 20px', background: '#0de1e8', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>Save</button>
        </div>
      </div>
    </div>
  );
}
