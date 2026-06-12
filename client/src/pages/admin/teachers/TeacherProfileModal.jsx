import React from 'react';
import { subjectColor, getInitials } from './constants';

export default function TeacherProfileModal({ viewTeacher, classList, onClose, onEdit }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-container" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span className="modal-title">Teacher Profile</span>
          <button className="modal-close" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        <div className="modal-body" style={{ padding: '24px' }}>
          {/* Avatar */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg, ${subjectColor((viewTeacher.subject || '').split(',')[0].trim())}, #0eb5da)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, fontWeight: 700, margin: '0 auto 10px' }}>
              {getInitials(viewTeacher.name)}
            </div>
            <h3 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>{viewTeacher.name}</h3>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{viewTeacher.empId} {viewTeacher.subject ? `· ${viewTeacher.subject}` : ''}</div>
            <span className={`status-badge ${viewTeacher.status === 'Active' ? 'status-present' : viewTeacher.status === 'On Leave' ? 'status-pending' : 'status-absent'}`} style={{ marginTop: 6, display: 'inline-block' }}>
              {viewTeacher.status}
            </span>
          </div>

          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { icon: 'email',      label: 'Email',         value: viewTeacher.email },
              { icon: 'phone',      label: 'Mobile',        value: viewTeacher.mobile || '—' },
              { icon: 'school',     label: 'Qualification', value: viewTeacher.qualification || '—' },
              { icon: 'work',       label: 'Experience',    value: viewTeacher.experience || '—' },
              { icon: 'business',   label: 'Department',    value: viewTeacher.department || '—' },
              { icon: 'event',      label: 'Joining Date',  value: viewTeacher.joining || '—' },
              { icon: 'assignment_ind', label: 'Role', value: viewTeacher.teacherType === 'CLASS_TEACHER' ? 'Class Teacher' : viewTeacher.teacherType === 'BOTH' ? 'Class Teacher + Subject Teacher' : 'Subject Teacher' },
              { icon: 'class',      label: 'Classes',       value: (() => {
                const parts = [];
                const cls = classList.find(c => Number(c.id) === Number(viewTeacher.primaryClassId));
                if (cls) parts.push(`${cls.name}${cls.section ? ` - ${cls.section}` : ''}`);
                if (viewTeacher.classes) {
                  viewTeacher.classes.split(',').map(s => s.trim()).filter(Boolean).forEach(c => {
                    if (!parts.some(p => p.toLowerCase() === c.toLowerCase())) parts.push(c);
                  });
                }
                return parts.length ? parts.join(', ') : '—';
              })(), full: true },
              { icon: 'calendar_today', label: 'Added On',  value: viewTeacher.createdAt || '—' },
            ].map(row => (
              <div key={row.label} style={{ gridColumn: row.full ? '1/-1' : 'auto', display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--surface-alt)', borderRadius: 8 }}>
                <span className="material-icons" style={{ fontSize: 16, color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }}>{row.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{row.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, marginTop: 2, wordBreak: 'break-all' }}>{row.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose}
            style={{ padding: '10px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>Close</button>
          <button onClick={onEdit}
            style={{ padding: '10px 20px', background: '#0de1e8', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-icons" style={{ fontSize: 16 }}>edit</span>
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
