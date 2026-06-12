export default function BulkDeleteModal({ selectedIds, bulkDeleting, onCancel, onConfirm }) {
  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: 420 }}>
        <div className="modal-body" style={{ textAlign: 'center', padding: '32px 28px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff5f5', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-icons" style={{ fontSize: 32, color: '#e53e3e' }}>delete_sweep</span>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>
            Delete {selectedIds.size} Student{selectedIds.size !== 1 ? 's' : ''}?
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            You have selected <strong style={{ color: 'var(--text-primary)' }}>{selectedIds.size}</strong> student{selectedIds.size !== 1 ? 's' : ''} for deletion.
          </p>
          <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#c53030', marginBottom: 20, textAlign: 'left', display: 'flex', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>warning</span>
            <span>This will permanently delete all selected students and cannot be undone.</span>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={onCancel}
              disabled={bulkDeleting}
              style={{ padding: '9px 22px', border: '1.5px solid var(--border-strong)', borderRadius: 9, background: 'var(--surface)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={bulkDeleting}
              style={{ padding: '9px 22px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: bulkDeleting ? 'not-allowed' : 'pointer', opacity: bulkDeleting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              {bulkDeleting ? (
                <><span className="material-icons" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>refresh</span> Deleting…</>
              ) : (
                <>Delete {selectedIds.size} Student{selectedIds.size !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
