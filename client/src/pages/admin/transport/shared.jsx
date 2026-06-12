import React from 'react';
import Button from '../../../components/Button';

// ─── Reusable table wrapper ───────────────────────────────────────────────────
export function TableCard({ children, onAdd, addLabel, addIcon, searchValue, onSearch, searchPlaceholder, filters = [] }) {
  return (
    <div className="data-table-card">
      <div className="search-filter-bar">
        {onSearch !== undefined && (
          <div className="search-input-wrapper">
            <span className="material-icons">search</span>
            <input type="text" className="search-input" placeholder={searchPlaceholder || 'Search…'}
              value={searchValue} onChange={e => onSearch(e.target.value)} />
          </div>
        )}
        {filters.map((f, i) => (
          <select key={i} className="filter-select" value={f.value} onChange={e => f.onChange(e.target.value)}>
            {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        {onAdd && (
          <Button variant="add" onClick={onAdd}>
            <span className="material-icons">{addIcon || 'add'}</span> {addLabel || 'Add'}
          </Button>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
export function Modal({ title, onClose, onSubmit, submitLabel = 'Save', size = '', children, submitDisabled = false }) {
  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className={`modal-dialog ${size}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body">{children}</div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={submitDisabled}
                style={submitDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>{submitLabel}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────
export function DeleteModal({ label, onCancel, onConfirm }) {
  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-sm">
        <div className="modal-content">
          <div className="modal-body text-center p-4">
            <span className="material-icons text-danger" style={{ fontSize: 48 }}>delete</span>
            <h5 className="mt-2">Delete {label}?</h5>
            <p className="text-muted small">This action cannot be undone.</p>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button variant="danger" onClick={onConfirm}>Delete</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function Paginator({ current, total, onChange }) {
  if (total <= 1) return null;
  return (
    <div className="pagination-bar">
      <div className="pagination-info">Page {current} of {total}</div>
      <div className="pagination-controls">
        <button className="page-btn" disabled={current === 1} onClick={() => onChange(current - 1)}>
          <span className="material-icons" style={{ fontSize: 16 }}>chevron_left</span>
        </button>
        {Array.from({ length: total }, (_, i) => i + 1).map(p => (
          <button key={p} className={`page-btn ${current === p ? 'active' : ''}`} onClick={() => onChange(p)}>{p}</button>
        ))}
        <button className="page-btn" disabled={current === total} onClick={() => onChange(current + 1)}>
          <span className="material-icons" style={{ fontSize: 16 }}>chevron_right</span>
        </button>
      </div>
    </div>
  );
}
