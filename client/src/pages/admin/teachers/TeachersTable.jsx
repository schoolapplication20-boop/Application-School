import React from 'react';
import Button from '../../../components/Button';
import { SkeletonTable } from '../../../components/SkeletonLoader';
import { subjectColor, getInitials } from './constants';

export default function TeachersTable({
  loading, teachers, filtered, search, setSearch, filterSubject, setFilterSubject,
  filterStatus, setFilterStatus, classList, isSuperAdmin,
  onView, onViewCred, onAssign, onEdit, onResetPassword, onDelete, onAddFirst,
}) {
  return (
    <div className="data-table-card">
      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <span className="material-icons">search</span>
          <input className="search-input" placeholder="Search by name, email, subject, ID…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {[...new Set(teachers.flatMap(t =>
            (t.subject || '').split(',').map(s => s.trim()).filter(Boolean)
          ))].sort().map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Status</option>
          <option>Active</option>
          <option>On Leave</option>
          <option>Inactive</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <SkeletonTable rows={8} cols={9} />
        ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Teacher</th>
              <th>Emp ID</th>
              <th>Subject / Dept</th>
              <th>Classes</th>
              <th>Assigned Classes</th>
              <th>Experience</th>
              <th>Joining</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <span className="material-icons" style={{ fontSize: 56, color: '#c7d2fe', display: 'block', marginBottom: 12 }}>
                    {teachers.length === 0 ? 'people' : 'search_off'}
                  </span>
                  <h3 style={{ color: 'var(--text-primary)', fontWeight: 700, margin: '0 0 6px' }}>
                    {teachers.length === 0 ? 'No teachers yet' : 'No teachers match your search'}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px', fontSize: 14 }}>
                    {teachers.length === 0
                      ? 'Add your first teacher to get started.'
                      : 'Try adjusting your search or subject filter.'}
                  </p>
                  {teachers.length === 0 && (
                    <Button onClick={onAddFirst} style={{ borderRadius: 8 }}>
                      + Add First Teacher
                    </Button>
                  )}
                </div>
              </td></tr>
            ) : filtered.map(t => {
              const firstSubject = (t.subject || '').split(',')[0].trim();
              const color = subjectColor(firstSubject);
              return (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {getInitials(t.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{t.empId || '—'}</td>
                  <td>
                    <div>
                      {t.subject && (
                        <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: color + '18', color, display: 'inline-block', marginBottom: t.department ? 3 : 0 }}>
                          {t.subject}
                        </span>
                      )}
                      {t.department && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.department}</div>}
                    </div>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      background: t.teacherType === 'CLASS_TEACHER' ? '#0de1e818' : t.teacherType === 'BOTH' ? '#3182ce18' : 'var(--border-strong)',
                      color: t.teacherType === 'CLASS_TEACHER' ? '#276749' : t.teacherType === 'BOTH' ? '#2b6cb0' : 'var(--text-secondary)',
                    }}>
                      {t.teacherType === 'CLASS_TEACHER' ? 'Class Teacher' : t.teacherType === 'BOTH' ? 'Class Teacher + Subject Teacher' : 'Subject Teacher'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {/* Primary class (class teacher assignment) */}
                      {(t.primaryClassName || (t.primaryClassId && classList.length > 0)) && (() => {
                        const label = t.primaryClassName
                          || (() => { const cls = classList.find(c => Number(c.id) === Number(t.primaryClassId)); return cls ? `${cls.name}${cls.section ? ` - ${cls.section}` : ''}` : null; })();
                        return label ? (
                          <span style={{ fontSize: 11, background: '#f0fff4', color: '#276749', fontWeight: 700, padding: '2px 8px', borderRadius: 10, display: 'inline-block' }}>
                            {label}
                          </span>
                        ) : null;
                      })()}
                      {/* Subject classes */}
                      {t.classes && t.classes.split(',').map(s => s.trim()).filter(Boolean).map((cls, i) => (
                        <span key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{cls}</span>
                      ))}
                      {!t.primaryClassId && !t.primaryClassName && !t.classes && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.experience || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.joining || '—'}</td>
                  <td>
                    <span className={`status-badge ${t.status === 'Active' ? 'status-present' : t.status === 'On Leave' ? 'status-pending' : 'status-absent'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <Button variant="view" title="View Details" onClick={() => onView(t)} />
                      {isSuperAdmin && (
                        <button className="action-btn" style={{ color: '#7c3aed', background: '#7c3aed12' }} title="View Login Credentials" onClick={() => onViewCred(t)}>
                          <span className="material-icons">key</span>
                        </button>
                      )}
                      <button className="action-btn" style={{ color: '#38b2ac', background: '#e6fffa' }} title="Assign Classes"
                        onClick={() => onAssign(t)}>
                        <span className="material-icons">assignment</span>
                      </button>
                      <Button variant="edit" onClick={() => onEdit(t)} />
                      {isSuperAdmin && (
                        <button className="action-btn" style={{ color: '#ed8936', background: '#fef3c720' }} title="Reset Password" onClick={() => onResetPassword(t)}>
                          <span className="material-icons">lock_reset</span>
                        </button>
                      )}
                      <Button variant="delete" onClick={() => onDelete(t.id)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}
