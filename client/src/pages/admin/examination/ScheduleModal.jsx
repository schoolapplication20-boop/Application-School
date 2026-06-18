import React from 'react';
import Button from '../../../components/Button';
import { EXAM_TYPES, examTypeLabel, today, newSubjectRow } from './constants';

export default function ScheduleModal({
  editSched, schedForm, setSchedForm, schedErrors,
  subjectRows, setSubjectRows, rowErrors, bulkProgress,
  saving, dbClasses, dbSections, onClose, onSave,
}) {
  return (
    <div className="exam-modal-overlay" onClick={e => e.target === e.currentTarget && !saving && onClose()}>
      <div className="exam-modal" style={{ maxWidth: 860, width: '95vw' }}>
        <div className="exam-modal-header">
          <h2>
            <span className="material-icons">calendar_month</span>
            {editSched ? 'Edit Exam Schedule' : 'Create Timetable — Bulk Schedule'}
          </h2>
          <button className="exam-modal-close" onClick={() => !saving && onClose()}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="exam-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>

          {/* ── Section 1: Common Details ── */}
          <div style={{ background: '#f0f7ff', borderRadius: 10, padding: '16px 18px', marginBottom: 20, border: '1px solid #bee3f8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14, fontSize: 13, fontWeight: 700, color: '#2b6cb0' }}>
              <span className="material-icons" style={{ fontSize: 17 }}>info</span>
              Common Details — apply to all subjects below
            </div>
            <div className="exam-form-grid">
              <div className="exam-form-group span-2">
                <label>Exam / Timetable Name *</label>
                <input
                  placeholder="e.g. Mid Term Examination 2026"
                  value={schedForm.examName}
                  onChange={e => setSchedForm(f => ({ ...f, examName: e.target.value }))}
                  style={{ borderColor: schedErrors.examName ? '#fc8181' : undefined }}
                />
                {schedErrors.examName && <span style={{ color: '#c53030', fontSize: 11 }}>{schedErrors.examName}</span>}
              </div>
              <div className="exam-form-group">
                <label>Exam Type</label>
                <select value={schedForm.examType} onChange={e => setSchedForm(f => ({ ...f, examType: e.target.value }))}>
                  {EXAM_TYPES.map(t => <option key={t} value={t}>{examTypeLabel[t]}</option>)}
                </select>
              </div>
              <div className="exam-form-group">
                <label>Class *</label>
                <select
                  value={schedForm.className}
                  onChange={e => setSchedForm(f => ({ ...f, className: e.target.value }))}
                  style={{ borderColor: schedErrors.className ? '#fc8181' : undefined }}
                >
                  <option value="">Select Class</option>
                  {dbClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
                {schedErrors.className && <span style={{ color: '#c53030', fontSize: 11 }}>{schedErrors.className}</span>}
              </div>
              <div className="exam-form-group">
                <label>Section</label>
                <select value={schedForm.section} onChange={e => setSchedForm(f => ({ ...f, section: e.target.value }))}>
                  <option value="">All Sections</option>
                  {dbSections.map(s => <option key={s} value={s}>Section {s}</option>)}
                </select>
              </div>
              {editSched && (
                <div className="exam-form-group">
                  <label>Status</label>
                  <select value={schedForm.status} onChange={e => setSchedForm(f => ({ ...f, status: e.target.value }))}>
                    {['SCHEDULED','ONGOING','COMPLETED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div className="exam-form-group span-2">
                <label>Instructions / Notes</label>
                <textarea
                  placeholder="e.g. Bring your admit card. No electronic devices allowed."
                  maxLength={2000}
                  value={schedForm.instructions}
                  onChange={e => setSchedForm(f => ({ ...f, instructions: e.target.value }))}
                  style={{ minHeight: 56 }}
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Subject Rows ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: '#276749' }}>
                <span className="material-icons" style={{ fontSize: 17 }}>menu_book</span>
                {editSched ? 'Subject Details' : `Subject Schedule (${subjectRows.length} subject${subjectRows.length !== 1 ? 's' : ''})`}
              </div>
              {!editSched && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Apply date to all:</label>
                  <input type="date" defaultValue={today()}
                    onChange={e => setSubjectRows(rows => rows.map(r => ({ ...r, examDate: e.target.value })))}
                    style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid var(--border-strong)', fontSize: 12 }} />
                  <button
                    type="button"
                    onClick={() => setSubjectRows(r => [...r, newSubjectRow()])}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#276749', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    <span className="material-icons" style={{ fontSize: 15 }}>add</span>Add Subject
                  </button>
                </div>
              )}
            </div>

            {/* Table — wrapped in a horizontal scroll container so it never overflows the modal on mobile */}
            <div className="exam-subject-table-scroll">
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.3fr 90px 90px 1.1fr 74px 32px', gap: 0, minWidth: 560, background: 'var(--border)', borderRadius: '8px 8px 0 0', border: '1px solid var(--border-strong)', borderBottom: 'none', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <div>Subject *</div><div>Exam Date *</div><div>Start</div><div>End</div><div>Hall / Room *</div><div style={{ textAlign: 'center' }}>Marks</div><div></div>
            </div>

            {/* Rows */}
            <div style={{ border: '1px solid var(--border-strong)', borderRadius: '0 0 8px 8px', overflow: 'hidden', minWidth: 560 }}>
              {subjectRows.map((row, idx) => {
                const re = rowErrors[row._id] || {};
                const cs = (err) => ({ width: '100%', padding: '7px 9px', borderRadius: 6, border: `1px solid ${err ? '#fc8181' : 'var(--border-strong)'}`, fontSize: 12, outline: 'none', background: 'var(--surface)', boxSizing: 'border-box' });
                return (
                  <div key={row._id} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.3fr 90px 90px 1.1fr 74px 32px', gap: 0, padding: '8px 10px', borderBottom: idx < subjectRows.length - 1 ? '1px solid var(--border)' : 'none', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)', alignItems: 'start' }}>
                    {/* Subject */}
                    <div style={{ paddingRight: 6 }}>
                      <input
                        type="text"
                        placeholder="e.g. Mathematics"
                        value={row.subject}
                        onChange={e => setSubjectRows(rows => rows.map(r => r._id === row._id ? { ...r, subject: e.target.value } : r))}
                        style={cs(re.subject)}
                      />
                      {re.subject && <div style={{ color: '#c53030', fontSize: 10, marginTop: 2 }}>{re.subject}</div>}
                    </div>
                    {/* Date */}
                    <div style={{ paddingRight: 6 }}>
                      <input type="date" value={row.examDate} onChange={e => setSubjectRows(rows => rows.map(r => r._id === row._id ? { ...r, examDate: e.target.value } : r))} style={cs(re.examDate)} />
                      {re.examDate && <div style={{ color: '#c53030', fontSize: 10, marginTop: 2 }}>{re.examDate}</div>}
                    </div>
                    {/* Start */}
                    <div style={{ paddingRight: 6 }}>
                      <input type="time" value={row.startTime} onChange={e => setSubjectRows(rows => rows.map(r => r._id === row._id ? { ...r, startTime: e.target.value } : r))} style={cs(re.startTime)} />
                    </div>
                    {/* End */}
                    <div style={{ paddingRight: 6 }}>
                      <input type="time" value={row.endTime} onChange={e => setSubjectRows(rows => rows.map(r => r._id === row._id ? { ...r, endTime: e.target.value } : r))} style={cs(re.endTime)} />
                      {re.endTime && <div style={{ color: '#c53030', fontSize: 10, marginTop: 2 }}>{re.endTime}</div>}
                    </div>
                    {/* Hall */}
                    <div style={{ paddingRight: 6 }}>
                      <input type="text" value={row.hallNumber} placeholder="e.g. Hall A" onChange={e => setSubjectRows(rows => rows.map(r => r._id === row._id ? { ...r, hallNumber: e.target.value } : r))} style={cs(re.hallNumber)} />
                      {re.hallNumber && <div style={{ color: '#c53030', fontSize: 10, marginTop: 2 }}>{re.hallNumber}</div>}
                    </div>
                    {/* Max Marks */}
                    <div style={{ paddingRight: 6 }}>
                      <input type="number" value={row.maxMarks} min={1} max={1000} onChange={e => setSubjectRows(rows => rows.map(r => r._id === row._id ? { ...r, maxMarks: e.target.value } : r))} style={{ ...cs(re.maxMarks), textAlign: 'center' }} />
                    </div>
                    {/* Remove */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {!editSched && subjectRows.length > 1 && (
                        <button type="button" onClick={() => setSubjectRows(rows => rows.filter(r => r._id !== row._id))}
                          style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#c53030', padding: 0 }}>
                          <span className="material-icons" style={{ fontSize: 15 }}>remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            </div>{/* end .exam-subject-table-scroll */}

            {/* Add more — bottom dashed button */}
            {!editSched && (
              <button type="button" onClick={() => setSubjectRows(r => [...r, newSubjectRow()])}
                style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, border: '2px dashed #bee3f8', background: '#f0f9ff', color: '#2b6cb0', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span className="material-icons" style={{ fontSize: 17 }}>add_circle_outline</span>
                Add Another Subject
              </button>
            )}

            {/* Progress bar */}
            {bulkProgress && (
              <div style={{ marginTop: 14, background: '#f0f9ff', borderRadius: 8, padding: '10px 14px', border: '1px solid #bee3f8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#2b6cb0', marginBottom: 6 }}>
                  <span>Saving schedules…</span>
                  <span>{bulkProgress.done} / {bulkProgress.total}</span>
                </div>
                <div style={{ background: '#bee3f8', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#3182ce', borderRadius: 99, width: `${(bulkProgress.done / bulkProgress.total) * 100}%`, transition: 'width 0.3s' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="exam-modal-footer" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {!editSched && `${subjectRows.length} subject${subjectRows.length !== 1 ? 's' : ''} will be saved as separate entries`}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="exam-secondary" onClick={() => !saving && onClose()} disabled={saving}>Cancel</Button>
            <Button variant="exam-primary" onClick={onSave} disabled={saving}>
              {saving
                ? (bulkProgress ? `Saving ${bulkProgress.done}/${bulkProgress.total}…` : 'Saving…')
                : editSched ? 'Update Schedule' : `Save ${subjectRows.length} Schedule${subjectRows.length > 1 ? 's' : ''}`
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
