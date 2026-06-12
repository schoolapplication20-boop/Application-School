import React from 'react';
import { formatTime } from '../../../services/timetableService';

export default function DeleteConfirmModal({ deleteTarget, deleting, onCancel, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-container" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ textAlign: 'center', padding: '32px 28px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff5f5', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-icons" style={{ fontSize: 32, color: '#e53e3e' }}>delete_outline</span>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>Delete Entry?</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
            <strong>{deleteTarget.teacherName}</strong> — {deleteTarget.subject} ({deleteTarget.classSection})
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 24px' }}>
            {deleteTarget.day} · {formatTime(deleteTarget.startTime)} – {formatTime(deleteTarget.endTime)}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={onCancel} disabled={deleting} style={{ padding: '9px 22px', border: '1.5px solid var(--border-strong)', borderRadius: 9, background: 'var(--surface)', fontWeight: 600, fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer' }}>Cancel</button>
            <button onClick={onConfirm} disabled={deleting} style={{ padding: '9px 22px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              {deleting ? (
                <><span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Deleting…</>
              ) : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
