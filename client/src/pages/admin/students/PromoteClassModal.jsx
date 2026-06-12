export default function PromoteClassModal({
  promoteForm, setPromoteForm, promoting, classNames, availableClasses,
  onCancel, onConfirm,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: 480 }}>
        <div style={{ padding: '24px 28px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fffff0', border: '1.5px solid #d69e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-icons" style={{ fontSize: 22, color: '#b7791f' }}>upgrade</span>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Promote Class</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Move all students from one class to the next. Historical data (marks, fees, attendance) is preserved.</div>
            </div>
          </div>

          <div style={{ background: '#fffbeb', border: '1px solid #f6e05e', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#744210', marginBottom: 20, display: 'flex', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>info</span>
            <span>All students currently in the <strong>source</strong> class/section will be moved to the <strong>target</strong> class/section. This action cannot be undone.</span>
          </div>

          {/* From */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>From (Current Class)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Class *</label>
                <select
                  value={promoteForm.fromClass}
                  onChange={e => setPromoteForm(f => ({ ...f, fromClass: e.target.value, fromSection: '' }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none' }}
                >
                  <option value="">Select class</option>
                  {classNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Section</label>
                <select
                  value={promoteForm.fromSection}
                  onChange={e => setPromoteForm(f => ({ ...f, fromSection: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none' }}
                >
                  <option value="">All sections</option>
                  {availableClasses.filter(c => c.name === promoteForm.fromClass).map(c => (
                    <option key={c.section} value={c.section}>{c.section || '—'}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span className="material-icons" style={{ fontSize: 28, color: '#b7791f' }}>arrow_downward</span>
          </div>

          {/* To */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>To (Target Class)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Class *</label>
                <select
                  value={promoteForm.toClass}
                  onChange={e => setPromoteForm(f => ({ ...f, toClass: e.target.value, toSection: '' }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none' }}
                >
                  <option value="">Select class</option>
                  {classNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Section</label>
                <select
                  value={promoteForm.toSection}
                  onChange={e => setPromoteForm(f => ({ ...f, toSection: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none' }}
                >
                  <option value="">Same / no section</option>
                  {availableClasses.filter(c => c.name === promoteForm.toClass).map(c => (
                    <option key={c.section} value={c.section}>{c.section || '—'}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              disabled={promoting}
              style={{ padding: '9px 22px', border: '1.5px solid var(--border-strong)', borderRadius: 9, background: 'var(--surface)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={promoting || !promoteForm.fromClass || !promoteForm.toClass}
              style={{ padding: '9px 22px', background: '#d69e2e', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: (promoting || !promoteForm.fromClass || !promoteForm.toClass) ? 'not-allowed' : 'pointer', opacity: (promoting || !promoteForm.fromClass || !promoteForm.toClass) ? 0.65 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              {promoting ? (
                <><span className="material-icons" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>refresh</span> Promoting…</>
              ) : (
                <><span className="material-icons" style={{ fontSize: 16 }}>upgrade</span> Promote Students</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
