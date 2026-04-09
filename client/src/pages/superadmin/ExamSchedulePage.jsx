import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { examinationAPI, adminAPI } from '../../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const EXAM_TYPES = ['ANNUAL', 'HALFYEARLY', 'QUARTERLY', 'MIDTERM', 'UNIT_TEST'];
const EXAM_TYPE_LABEL = { ANNUAL: 'Annual', HALFYEARLY: 'Half Yearly', QUARTERLY: 'Quarterly', MIDTERM: 'Mid Term', UNIT_TEST: 'Unit Test' };
const SUBJECTS = [
  'Mathematics','Science','English','Hindi','Social Studies',
  'Physics','Chemistry','Biology','History','Geography',
  'Computer Science','Physical Education','Art','Music',
  'Sanskrit','Economics','Accountancy','Business Studies',
];
const STATUS_OPTS = ['SCHEDULED','ONGOING','COMPLETED','CANCELLED'];
const STATUS_STYLE = {
  SCHEDULED: { bg: '#ebf8ff', color: '#2b6cb0', label: 'Scheduled'  },
  ONGOING:   { bg: '#fffaf0', color: '#c05621', label: 'Ongoing'    },
  COMPLETED: { bg: '#f0fff4', color: '#276749', label: 'Completed'  },
  CANCELLED: { bg: '#fff5f5', color: '#c53030', label: 'Cancelled'  },
};

const today    = () => new Date().toISOString().split('T')[0];
const fmtDate  = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime  = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`;
};

const newSubjectRow = () => ({
  _id: Math.random().toString(36).slice(2),
  subject: '', examDate: today(), startTime: '09:00', endTime: '12:00', hallNumber: '', maxMarks: 100,
});

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const isErr = toast.type === 'error';
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 10,
      background: isErr ? '#fff5f5' : '#f0fff4',
      border: `1px solid ${isErr ? '#feb2b2' : '#9ae6b4'}`,
      color: isErr ? '#c53030' : '#276749',
      borderRadius: 12, padding: '12px 20px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)', fontSize: 14, fontWeight: 600,
    }}>
      <span className="material-icons" style={{ fontSize: 20 }}>{isErr ? 'error' : 'check_circle'}</span>
      {toast.message}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span className="material-icons" style={{ color: '#c53030', fontSize: 28 }}>warning</span>
          <h4 style={{ margin: 0, fontSize: 16, color: '#1a202c' }}>Confirm Delete</h4>
        </div>
        <p style={{ color: '#718096', fontSize: 14, margin: '0 0 20px' }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#4a5568', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#c53030', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Input helpers ────────────────────────────────────────────────────────────
const cellStyle = (err) => ({
  width: '100%', padding: '7px 10px', borderRadius: 7,
  border: `1px solid ${err ? '#fc8181' : '#e2e8f0'}`,
  fontSize: 12, outline: 'none', boxSizing: 'border-box', background: '#fff',
});

// ─── Bulk Schedule Modal ──────────────────────────────────────────────────────
function ScheduleModal({ initial, onClose, onSaved, dbClasses = [], dbSections = [] }) {
  const isEdit = !!initial?.id;

  // Common fields
  const [common, setCommon] = useState({
    examName:    isEdit ? (initial.examName || '')    : '',
    examType:    isEdit ? (initial.examType || 'MIDTERM') : 'MIDTERM',
    className:   isEdit ? (initial.className || '')   : '',
    section:     isEdit ? (initial.section || '')     : '',
    status:      isEdit ? (initial.status || 'SCHEDULED') : 'SCHEDULED',
    instructions:isEdit ? (initial.instructions || '') : '',
  });

  // Subject rows (edit = single pre-filled row; add = one empty row to start)
  const [rows, setRows] = useState(
    isEdit
      ? [{ _id: 'edit', subject: initial.subject || '', examDate: initial.examDate || today(), startTime: initial.startTime || '09:00', endTime: initial.endTime || '12:00', hallNumber: initial.hallNumber || '', maxMarks: initial.maxMarks || 100 }]
      : [newSubjectRow()]
  );

  const [commonErrors, setCommonErrors] = useState({});
  const [rowErrors,    setRowErrors]    = useState({});   // { _id: { field: msg } }
  const [saving,  setSaving]  = useState(false);
  const [progress,setProgress]= useState(null); // { done, total } during bulk save

  const setC = (k, v) => setCommon(c => ({ ...c, [k]: v }));

  // ── Row helpers ──────────────────────────────────────────────────────────────
  const addRow = () => setRows(r => [...r, newSubjectRow()]);
  const removeRow = (id) => setRows(r => r.filter(x => x._id !== id));
  const updateRow = (id, k, v) => setRows(r => r.map(x => x._id === id ? { ...x, [k]: v } : x));

  // Apply a common date or time to all rows at once
  const applyToAll = (field, value) => setRows(r => r.map(x => ({ ...x, [field]: value })));

  // ── Validate ─────────────────────────────────────────────────────────────────
  const validate = () => {
    const ce = {};
    if (!common.examName.trim()) ce.examName = 'Required';
    if (!common.className)       ce.className = 'Required';
    setCommonErrors(ce);

    const re = {};
    rows.forEach(row => {
      const e = {};
      if (!row.subject)          e.subject    = 'Required';
      if (!row.examDate)         e.examDate   = 'Required';
      if (!row.startTime)        e.startTime  = 'Required';
      if (!row.endTime)          e.endTime    = 'Required';
      if (row.startTime && row.endTime && row.endTime <= row.startTime) e.endTime = 'Must be after start';
      if (!row.hallNumber.trim())e.hallNumber = 'Required';
      if (!row.maxMarks || isNaN(row.maxMarks) || +row.maxMarks < 1) e.maxMarks = 'Invalid';
      if (Object.keys(e).length) re[row._id] = e;
    });
    // Check duplicate subjects
    const seen = new Set();
    rows.forEach(row => {
      if (row.subject) {
        if (seen.has(row.subject)) {
          re[row._id] = { ...(re[row._id] || {}), subject: 'Duplicate subject' };
        }
        seen.add(row.subject);
      }
    });
    setRowErrors(re);
    return Object.keys(ce).length === 0 && Object.keys(re).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);

    if (isEdit) {
      // Single update
      try {
        const row = rows[0];
        await examinationAPI.updateSchedule(initial.id, {
          ...common, subject: row.subject, examDate: row.examDate,
          startTime: row.startTime, endTime: row.endTime,
          hallNumber: row.hallNumber, maxMarks: Number(row.maxMarks),
        });
        onSaved('Exam schedule updated successfully');
      } catch (err) {
        onSaved(null, err?.response?.data?.message || 'Failed to update schedule');
      }
    } else {
      // Bulk create — one API call per subject row
      let succeeded = 0;
      let failed = 0;
      setProgress({ done: 0, total: rows.length });

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          await examinationAPI.createSchedule({
            ...common,
            subject:    row.subject,
            examDate:   row.examDate,
            startTime:  row.startTime,
            endTime:    row.endTime,
            hallNumber: row.hallNumber,
            maxMarks:   Number(row.maxMarks),
          });
          succeeded++;
        } catch {
          failed++;
        }
        setProgress({ done: i + 1, total: rows.length });
      }

      if (failed === 0) {
        onSaved(`${succeeded} exam schedule${succeeded > 1 ? 's' : ''} created successfully`);
      } else {
        onSaved(null, `${succeeded} created, ${failed} failed. Check and retry.`);
      }
    }
    setSaving(false);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#718096', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' };
  const inputStyle = (err) => ({ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${err ? '#fc8181' : '#e2e8f0'}`, fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 8000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 860, maxHeight: '93vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

        {/* ── Modal Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #f0f4f8', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ebf8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-icons" style={{ color: '#3182ce', fontSize: 22 }}>{isEdit ? 'edit_calendar' : 'calendar_month'}</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1a202c' }}>
                {isEdit ? 'Edit Exam Schedule' : 'Create Exam Schedule'}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#a0aec0' }}>
                {isEdit ? 'Update the schedule details below' : 'Fill common details, then add subjects with individual dates & halls'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#718096' }}>
            <span className="material-icons" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Section 1: Common Fields ── */}
          <div style={{ background: '#f8faff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e8f0fe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span className="material-icons" style={{ color: '#3182ce', fontSize: 18 }}>info</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#2b6cb0' }}>Common Details (apply to all subjects)</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              {/* Exam Name — full width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Exam Name *</label>
                <input value={common.examName} onChange={e => setC('examName', e.target.value)}
                  placeholder="e.g., Mid Term Examination 2026"
                  style={inputStyle(commonErrors.examName)} />
                {commonErrors.examName && <div style={{ color: '#c53030', fontSize: 11, marginTop: 3 }}>{commonErrors.examName}</div>}
              </div>

              {/* Exam Type */}
              <div>
                <label style={labelStyle}>Exam Type</label>
                <select value={common.examType} onChange={e => setC('examType', e.target.value)} style={inputStyle()}>
                  {EXAM_TYPES.map(t => <option key={t} value={t}>{EXAM_TYPE_LABEL[t]}</option>)}
                </select>
              </div>

              {/* Class */}
              <div>
                <label style={labelStyle}>Class *</label>
                <select value={common.className} onChange={e => setC('className', e.target.value)} style={inputStyle(commonErrors.className)}>
                  <option value="">Select Class</option>
                  {dbClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
                {commonErrors.className && <div style={{ color: '#c53030', fontSize: 11, marginTop: 3 }}>{commonErrors.className}</div>}
              </div>

              {/* Section */}
              <div>
                <label style={labelStyle}>Section</label>
                <select value={common.section} onChange={e => setC('section', e.target.value)} style={inputStyle()}>
                  <option value="">All Sections</option>
                  {dbSections.map(s => <option key={s} value={s}>Section {s}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <label style={labelStyle}>Status</label>
                <select value={common.status} onChange={e => setC('status', e.target.value)} style={inputStyle()}>
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_STYLE[s]?.label}</option>)}
                </select>
              </div>

              {/* Instructions */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Instructions / Notes</label>
                <textarea value={common.instructions} onChange={e => setC('instructions', e.target.value)} rows={2}
                  placeholder="e.g., Bring admit card. No electronic devices allowed."
                  style={{ ...inputStyle(), resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
            </div>
          </div>

          {/* ── Section 2: Subject Rows ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-icons" style={{ color: '#276749', fontSize: 18 }}>menu_book</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#276749' }}>
                  Subject Schedule{!isEdit && ` (${rows.length} subject${rows.length !== 1 ? 's' : ''})`}
                </span>
              </div>
              {!isEdit && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {/* Apply-to-all helpers */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#a0aec0', fontWeight: 600 }}>Apply date to all:</span>
                    <input type="date" defaultValue={today()}
                      onChange={e => applyToAll('examDate', e.target.value)}
                      style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  </div>
                  <button type="button" onClick={addRow}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#276749', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    <span className="material-icons" style={{ fontSize: 16 }}>add</span>Add Subject
                  </button>
                </div>
              )}
            </div>

            {/* Table header */}
            <div style={{ background: '#f0f4f8', borderRadius: '10px 10px 0 0', border: '1px solid #e2e8f0', borderBottom: 'none' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 100px 100px 1.1fr 80px 36px', gap: 0, padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <div>Subject</div>
                <div>Exam Date</div>
                <div>Start Time</div>
                <div>End Time</div>
                <div>Hall / Room</div>
                <div style={{ textAlign: 'center' }}>Max Marks</div>
                <div></div>
              </div>
            </div>

            {/* Rows */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
              {rows.map((row, idx) => {
                const re = rowErrors[row._id] || {};
                const rowBg = idx % 2 === 0 ? '#fff' : '#fafbff';
                return (
                  <div key={row._id} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 100px 100px 1.1fr 80px 36px', gap: 0, padding: '8px 12px', borderBottom: idx < rows.length - 1 ? '1px solid #f0f4f8' : 'none', background: rowBg, alignItems: 'start' }}>

                    {/* Subject */}
                    <div style={{ paddingRight: 8 }}>
                      <select value={row.subject} onChange={e => updateRow(row._id, 'subject', e.target.value)}
                        style={cellStyle(re.subject)}>
                        <option value="">— Subject —</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {re.subject && <div style={{ color: '#c53030', fontSize: 10, marginTop: 2 }}>{re.subject}</div>}
                    </div>

                    {/* Exam Date */}
                    <div style={{ paddingRight: 8 }}>
                      <input type="date" value={row.examDate} onChange={e => updateRow(row._id, 'examDate', e.target.value)}
                        style={cellStyle(re.examDate)} />
                      {re.examDate && <div style={{ color: '#c53030', fontSize: 10, marginTop: 2 }}>{re.examDate}</div>}
                    </div>

                    {/* Start Time */}
                    <div style={{ paddingRight: 8 }}>
                      <input type="time" value={row.startTime} onChange={e => updateRow(row._id, 'startTime', e.target.value)}
                        style={cellStyle(re.startTime)} />
                      {re.startTime && <div style={{ color: '#c53030', fontSize: 10, marginTop: 2 }}>{re.startTime}</div>}
                    </div>

                    {/* End Time */}
                    <div style={{ paddingRight: 8 }}>
                      <input type="time" value={row.endTime} onChange={e => updateRow(row._id, 'endTime', e.target.value)}
                        style={cellStyle(re.endTime)} />
                      {re.endTime && <div style={{ color: '#c53030', fontSize: 10, marginTop: 2 }}>{re.endTime}</div>}
                    </div>

                    {/* Hall */}
                    <div style={{ paddingRight: 8 }}>
                      <input type="text" value={row.hallNumber} onChange={e => updateRow(row._id, 'hallNumber', e.target.value)}
                        placeholder="e.g., Hall A" style={cellStyle(re.hallNumber)} />
                      {re.hallNumber && <div style={{ color: '#c53030', fontSize: 10, marginTop: 2 }}>{re.hallNumber}</div>}
                    </div>

                    {/* Max Marks */}
                    <div style={{ paddingRight: 8 }}>
                      <input type="number" value={row.maxMarks} min={1} max={1000}
                        onChange={e => updateRow(row._id, 'maxMarks', e.target.value)}
                        style={{ ...cellStyle(re.maxMarks), textAlign: 'center' }} />
                      {re.maxMarks && <div style={{ color: '#c53030', fontSize: 10, marginTop: 2 }}>{re.maxMarks}</div>}
                    </div>

                    {/* Remove */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {!isEdit && rows.length > 1 && (
                        <button type="button" onClick={() => removeRow(row._id)}
                          style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#c53030' }}>
                          <span className="material-icons" style={{ fontSize: 16 }}>remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add more subjects button (bottom) */}
            {!isEdit && (
              <button type="button" onClick={addRow}
                style={{ marginTop: 10, width: '100%', padding: '9px', borderRadius: 9, border: '2px dashed #bee3f8', background: '#f0f9ff', color: '#2b6cb0', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span className="material-icons" style={{ fontSize: 18 }}>add_circle_outline</span>
                Add Another Subject
              </button>
            )}
          </div>

          {/* Progress bar during bulk save */}
          {saving && progress && (
            <div style={{ background: '#f0f9ff', borderRadius: 10, padding: '12px 16px', border: '1px solid #bee3f8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#2b6cb0', marginBottom: 6 }}>
                <span>Saving schedules…</span>
                <span>{progress.done} / {progress.total}</span>
              </div>
              <div style={{ background: '#bee3f8', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#3182ce', borderRadius: 99, width: `${(progress.done / progress.total) * 100}%`, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}
        </form>

        {/* ── Footer ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid #f0f4f8', flexShrink: 0, background: '#fafbff', borderRadius: '0 0 18px 18px' }}>
          <div style={{ fontSize: 12, color: '#a0aec0' }}>
            {!isEdit && <><span className="material-icons" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>info</span>{rows.length} subject{rows.length !== 1 ? 's' : ''} will be saved as separate schedule entries</>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '9px 22px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#4a5568', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              Cancel
            </button>
            <button type="submit" form="" disabled={saving} onClick={handleSubmit}
              style={{ padding: '9px 24px', borderRadius: 9, border: 'none', background: saving ? '#90cdf4' : 'linear-gradient(135deg,#3182ce,#2b6cb0)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving
                ? <><span className="material-icons" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>refresh</span>Saving…</>
                : <><span className="material-icons" style={{ fontSize: 16 }}>save</span>{isEdit ? 'Update Schedule' : `Save ${rows.length} Schedule${rows.length > 1 ? 's' : ''}`}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ExamSchedulePage() {
  const [schedules,   setSchedules]    = useState([]);
  const [loading,     setLoading]      = useState(true);
  const [toast,       setToast]        = useState(null);
  const [showModal,   setShowModal]    = useState(false);
  const [editItem,    setEditItem]     = useState(null);
  const [deleteTarget,setDeleteTarget] = useState(null);

  // DB-fetched classes
  const [classrooms,  setClassrooms]   = useState([]); // raw list from /api/admin/classes
  const dbClasses  = [...new Set(classrooms.map(c => c.name))].sort((a, b) => Number(a) - Number(b));
  const dbSections = [...new Set(classrooms.map(c => c.section).filter(Boolean))].sort();

  const [search,       setSearch]       = useState('');
  const [filterClass,  setFilterClass]  = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await examinationAPI.getSchedules({});
      const data = res.data?.data ?? res.data ?? [];
      setSchedules(Array.isArray(data) ? data : []);
    } catch {
      setSchedules([]);
    }
    setLoading(false);
  }, []);

  // Fetch classrooms from DB once on mount
  useEffect(() => {
    adminAPI.getClasses()
      .then(res => {
        const data = res.data?.data ?? res.data ?? [];
        setClassrooms(Array.isArray(data) ? data : []);
      })
      .catch(() => setClassrooms([]));
  }, []);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const filtered = schedules.filter(s => {
    const q = search.toLowerCase();
    return (
      (!q || s.examName?.toLowerCase().includes(q) || s.subject?.toLowerCase().includes(q) || s.className?.includes(q)) &&
      (!filterClass  || s.className === filterClass) &&
      (!filterType   || s.examType  === filterType)  &&
      (!filterStatus || s.status    === filterStatus)
    );
  });

  const stats = {
    total:     schedules.length,
    scheduled: schedules.filter(s => s.status === 'SCHEDULED').length,
    ongoing:   schedules.filter(s => s.status === 'ONGOING').length,
    completed: schedules.filter(s => s.status === 'COMPLETED').length,
  };

  const openAdd   = () => { setEditItem(null); setShowModal(true); };
  const openEdit  = (item) => { setEditItem(item); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditItem(null); };

  const handleSaved = async (successMsg, errMsg) => {
    if (errMsg) { showToast(errMsg, 'error'); return; }
    closeModal();
    showToast(successMsg);
    await loadSchedules();
  };

  const handleDelete = async () => {
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await examinationAPI.deleteSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      showToast('Exam schedule deleted');
    } catch {
      showToast('Failed to delete schedule', 'error');
    }
  };

  return (
    <Layout>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .es-row:hover { background: #f0f7ff !important; }
        .es-action-btn { background: none; border: none; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s; }
        .es-action-btn:hover { background: #e2e8f0; }
        .es-action-btn .material-icons { font-size: 18px; }
        .es-input { padding: 8px 12px; border-radius: 9px; border: 1px solid #e2e8f0; font-size: 13px; outline: none; background: #fff; }
        .es-input:focus { border-color: #3182ce; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a202c', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-icons" style={{ color: '#76C442', fontSize: 28 }}>event_note</span>
            Exam Schedule
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#718096' }}>Create timetables for all subjects at once — manage, edit and delete exam schedules</p>
        </div>
        <button onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3182ce,#2b6cb0)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 8px rgba(49,130,206,0.3)' }}>
          <span className="material-icons" style={{ fontSize: 18 }}>add</span>
          Create Exam Schedule
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Exams',  value: stats.total,     color: '#3182ce', icon: 'event_note'    },
          { label: 'Scheduled',    value: stats.scheduled,  color: '#6b46c1', icon: 'schedule'      },
          { label: 'Ongoing',      value: stats.ongoing,    color: '#c05621', icon: 'hourglass_top'  },
          { label: 'Completed',    value: stats.completed,  color: '#276749', icon: 'task_alt'      },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: c.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-icons" style={{ color: c.color, fontSize: 22 }}>{c.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#2d3748', lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span className="material-icons" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0', fontSize: 18 }}>search</span>
            <input className="es-input" style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box' }}
              placeholder="Search exam name, subject or class…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="es-input" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {dbClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
          </select>
          <select className="es-input" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {EXAM_TYPES.map(t => <option key={t} value={t}>{EXAM_TYPE_LABEL[t]}</option>)}
          </select>
          <select className="es-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_STYLE[s]?.label}</option>)}
          </select>
          {(search || filterClass || filterType || filterStatus) && (
            <button onClick={() => { setSearch(''); setFilterClass(''); setFilterType(''); setFilterStatus(''); }}
              style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#718096', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-icons" style={{ fontSize: 14 }}>clear</span>Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 40, animation: 'spin 1s linear infinite', display: 'block', marginBottom: 12 }}>refresh</span>
            Loading exam schedules…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <span className="material-icons" style={{ fontSize: 52, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>event_note</span>
            <h3 style={{ margin: '0 0 6px', color: '#4a5568', fontSize: 16 }}>{schedules.length === 0 ? 'No exam schedules yet' : 'No results found'}</h3>
            <p style={{ margin: 0, color: '#a0aec0', fontSize: 13 }}>{schedules.length === 0 ? 'Click "Create Exam Schedule" to get started.' : 'Try adjusting your search or filters.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8faff', borderBottom: '2px solid #e8f0fe' }}>
                  {['Exam Name','Class','Subject','Exam Date','Timing','Hall / Room','Max Marks','Type','Status','Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const st = STATUS_STYLE[s.status] || STATUS_STYLE.SCHEDULED;
                  return (
                    <tr key={s.id} className="es-row" style={{ borderBottom: '1px solid #f0f4f8', background: i % 2 === 0 ? '#fff' : '#fafbff' }}>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#2d3748' }}>{s.examName}</div>
                        {s.instructions && <div style={{ fontSize: 11, color: '#a0aec0', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.instructions}</div>}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#3182ce' }}>Class {s.className}</div>
                        {s.section && <div style={{ fontSize: 11, color: '#a0aec0' }}>Section {s.section}</div>}
                      </td>
                      <td style={{ padding: '13px 16px', fontWeight: 600, color: '#2d3748' }}>{s.subject}</td>
                      <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span className="material-icons" style={{ fontSize: 14, color: '#a0aec0' }}>calendar_today</span>
                          <span style={{ fontWeight: 600, color: '#2d3748' }}>{fmtDate(s.examDate)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px', whiteSpace: 'nowrap', color: '#4a5568' }}>
                        {fmtTime(s.startTime)} – {fmtTime(s.endTime)}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ background: '#faf5ff', color: '#6b46c1', padding: '3px 10px', borderRadius: 10, fontWeight: 600, fontSize: 12 }}>{s.hallNumber || '—'}</span>
                      </td>
                      <td style={{ padding: '13px 16px', fontWeight: 700, color: '#2d3748', textAlign: 'center' }}>{s.maxMarks}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ background: '#ebf8ff', color: '#2b6cb0', padding: '3px 10px', borderRadius: 10, fontWeight: 600, fontSize: 11 }}>{EXAM_TYPE_LABEL[s.examType] || s.examType}</span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ background: st.bg, color: st.color, padding: '4px 12px', borderRadius: 12, fontWeight: 700, fontSize: 11 }}>{st.label}</span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="es-action-btn" onClick={() => openEdit(s)} title="Edit" style={{ color: '#3182ce' }}>
                            <span className="material-icons">edit</span>
                          </button>
                          <button className="es-action-btn" onClick={() => setDeleteTarget(s)} title="Delete" style={{ color: '#c53030' }}>
                            <span className="material-icons">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #f0f4f8', color: '#a0aec0', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span>Showing {filtered.length} of {schedules.length} schedules</span>
          </div>
        )}
      </div>

      {showModal && <ScheduleModal initial={editItem} onClose={closeModal} onSaved={handleSaved} dbClasses={dbClasses} dbSections={dbSections} />}
      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.examName}" — ${deleteTarget.subject} (Class ${deleteTarget.className})? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </Layout>
  );
}
