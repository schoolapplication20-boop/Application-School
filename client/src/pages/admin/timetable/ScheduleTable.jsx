import React from 'react';
import Button from '../../../components/Button';
import { formatTime } from '../../../services/timetableService';
import { DAY_COLOR, subjectColor } from './constants';

export default function ScheduleTable({ loading, entries, groupedByTeacher, expandedTeachers, onToggleTeacher, onEdit, onDelete, onBulkAssign, onAddSchedule }) {
  return (
    <div className="data-table-card">
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <span className="material-icons" style={{ fontSize: 40 }}>hourglass_empty</span>
          <p style={{ marginTop: 8 }}>Loading schedules...</p>
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '70px 20px' }}>
          <span className="material-icons" style={{ fontSize: 56, color: 'var(--border-strong)' }}>schedule</span>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 12 }}>No schedules yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, marginBottom: 20 }}>
            Use "Add Schedule" or "Bulk Assign" to create timetable entries
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={onBulkAssign} style={{ padding: '10px 24px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
              Bulk Assign
            </button>
            <button onClick={onAddSchedule} style={{ padding: '10px 24px', background: '#0de1e8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
              Add Schedule
            </button>
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Teacher</th>
                <th>Classes</th>
                <th>Subjects</th>
                <th>Total Periods</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupedByTeacher.map((group, idx) => {
                const isExpanded = expandedTeachers.has(group.teacherId);
                const uniqueClasses = [...new Set(group.rows.map(r => r.classSection))];
                const uniqueSubjects = [...new Set(group.rows.map(r => r.subject))];
                return (
                  <React.Fragment key={`group-${group.teacherId}`}>
                    {/* Summary row per teacher */}
                    <tr style={{ background: isExpanded ? '#f0fdf4' : undefined }}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0de1e820', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#0de1e8', flexShrink: 0 }}>
                            {(group.teacherName || '?').slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{group.teacherName || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {uniqueClasses.map(cls => (
                            <span key={cls} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#0de1e820', color: '#276749' }}>{cls}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {uniqueSubjects.map(sub => {
                            const sColor = subjectColor(sub);
                            return (
                              <span key={sub} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sColor + '20', color: sColor }}>{sub}</span>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {group.rows.length} period{group.rows.length !== 1 ? 's' : ''}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button
                            title={isExpanded ? 'Hide schedule' : 'View schedule'}
                            onClick={() => onToggleTeacher(group.teacherId)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', background: isExpanded ? '#0de1e820' : '#4361ee15', cursor: 'pointer' }}
                          >
                            <span className="material-icons" style={{ fontSize: 18, color: isExpanded ? '#0de1e8' : '#4361ee' }}>
                              {isExpanded ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail rows */}
                    {isExpanded && group.rows.map((entry, eIdx) => {
                      const sColor = subjectColor(entry.subject);
                      const dColor = DAY_COLOR[entry.day] || '#4a5568';
                      return (
                        <tr key={entry.id} style={{ background: '#fafffe' }}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 11, paddingLeft: 32 }}>{eIdx + 1}</td>
                          <td style={{ paddingLeft: 32 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="material-icons" style={{ fontSize: 14, color: 'var(--text-muted)' }}>subdirectory_arrow_right</span>
                              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{entry.day} — {formatTime(entry.startTime)} – {formatTime(entry.endTime)}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#0de1e820', color: '#276749' }}>
                              {entry.classSection}
                            </span>
                          </td>
                          <td>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sColor + '20', color: sColor }}>
                              {entry.subject}
                            </span>
                          </td>
                          <td>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: dColor + '18', color: dColor }}>
                              {entry.day}
                            </span>
                          </td>
                          <td>
                            <div className="action-btns">
                              <Button variant="edit" onClick={() => onEdit(entry)} />
                              <Button variant="delete" onClick={() => onDelete(entry)} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
