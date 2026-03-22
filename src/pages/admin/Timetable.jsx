import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import {
  fetchTimetable,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  checkOverlap,
  formatTime,
} from '../../services/timetableService';
import { fetchTeachers } from '../../services/teacherService';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CLASSES = [
  '6-A','6-B','7-A','7-B','8-A','8-B',
  '9-A','9-B','10-A','10-B','11-A','11-B','12-A','12-B',
];

const SUBJECTS = [
  'Mathematics','Science','English','Social Studies','Hindi',
  'Computer Science','Biology','Chemistry','Physics',
  'Accountancy','Economics','Commerce','Physical Education','Art',
];

const SUBJECT_COLOR = {
  Mathematics: '#4361ee', Science: '#38b2ac', English: '#805ad5',
  'Social Studies': '#e53e3e', Hindi: '#ed8936', 'Computer Science': '#009688',
  Biology: '#d69e2e', Chemistry: '#e91e63', Physics: '#667eea',
  Accountancy: '#48bb78', Economics: '#ed64a6', Commerce: '#f6ad55',
  'Physical Education': '#76C442', Art: '#dd6b20',
};

const DAY_COLOR = {
  Monday: '#4361ee', Tuesday: '#38b2ac', Wednesday: '#805ad5',
  Thursday: '#ed8936', Friday: '#e53e3e', Saturday: '#76C442',
};

const EMPTY_FORM = {
  teacherId: '', classSection: '', subject: '',
  day: '', startTime: '', endTime: '', room: '',
};

// ─── Style helpers ─────────────────────────────────────────────────────────────

const inputStyle = (hasErr) => ({
  width: '100%', padding: '9px 12px', fontSize: '13px',
  border: `1.5px solid ${hasErr ? '#e53e3e' : '#e2e8f0'}`, borderRadius: '8px',
  outline: 'none', background: '#fff', fontFamily: 'Poppins, sans-serif',
  boxSizing: 'border-box',
});

const labelStyle = { fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '4px', display: 'block' };
const errStyle   = { fontSize: '11px', color: '#e53e3e', marginTop: '3px' };

const Field = ({ label, error, children }) => (
  <div style={{ marginBottom: '14px' }}>
    <label style={labelStyle}>{label}</label>
    {children}
    {error && <div style={errStyle}>{error}</div>}
  </div>
);

const Col2 = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
    {children}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Timetable() {
  const [entries, setEntries]     = useState([]);
  const [teachers, setTeachers]   = useState([]);
  const [loading, setLoading]     = useState(true);

  // Filters
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterDay, setFilterDay]         = useState('');

  // Modals
  const [showForm, setShowForm]         = useState(false);
  const [editId, setEditId]             = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form state
  const [form, setForm]   = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([fetchTimetable(), fetchTeachers()]).then(([tt, tc]) => {
      setEntries(tt);
      setTeachers(tc.filter(t => t.status !== 'Inactive'));
      setLoading(false);
    });
  }, []);

  // ── Filtered view ───────────────────────────────────────────────────────────
  const filtered = entries.filter(e => {
    if (filterTeacher && String(e.teacherId) !== filterTeacher) return false;
    if (filterDay     && e.day !== filterDay) return false;
    return true;
  }).sort((a, b) => {
    const dA = DAYS.indexOf(a.day), dB = DAYS.indexOf(b.day);
    if (dA !== dB) return dA - dB;
    return a.startTime.localeCompare(b.startTime);
  });

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (entry) => {
    setForm({
      teacherId:    String(entry.teacherId),
      classSection: entry.classSection,
      subject:      entry.subject,
      day:          entry.day,
      startTime:    entry.startTime,
      endTime:      entry.endTime,
      room:         entry.room || '',
    });
    setErrors({});
    setEditId(entry.id);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditId(null); };

  const set = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.teacherId)    e.teacherId    = 'Select a teacher';
    if (!form.classSection) e.classSection = 'Select a class';
    if (!form.subject)      e.subject      = 'Select a subject';
    if (!form.day)          e.day          = 'Select a day';
    if (!form.startTime)    e.startTime    = 'Enter start time';
    if (!form.endTime)      e.endTime      = 'Enter end time';
    if (form.startTime && form.endTime && form.startTime >= form.endTime)
      e.endTime = 'End time must be after start time';
    return e;
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const teacher = teachers.find(t => String(t.id) === form.teacherId || String(t.userId) === form.teacherId);

    const candidate = {
      teacherId:    Number(form.teacherId),
      classSection: form.classSection,
      subject:      form.subject,
      day:          form.day,
      startTime:    form.startTime,
      endTime:      form.endTime,
      room:         form.room.trim(),
      teacherName:  teacher?.name || '',
    };

    // Overlap check
    const conflict = checkOverlap(candidate, entries, editId);
    if (conflict) {
      setErrors({ startTime: `Overlaps with ${conflict.subject} (${conflict.classSection}) ${formatTime(conflict.startTime)}–${formatTime(conflict.endTime)}` });
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        const updated = await updateTimetableEntry(editId, candidate);
        setEntries(prev => prev.map(e => e.id === editId ? updated : e));
        showToast('Timetable entry updated');
      } else {
        const newEntry = await createTimetableEntry(candidate);
        setEntries(prev => [...prev, newEntry]);
        showToast('Timetable entry added');
      }
      closeForm();
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const confirmDelete = () => {
    deleteTimetableEntry(deleteTarget.id);
    setEntries(prev => prev.filter(e => e.id !== deleteTarget.id));
    setDeleteTarget(null);
    showToast('Entry deleted');
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const totalPeriods  = entries.length;
  const activeTeachers = [...new Set(entries.map(e => e.teacherId))].length;
  const classesCovered = [...new Set(entries.map(e => e.classSection))].length;
  const todayDay = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
  const todayCount = entries.filter(e => e.day === todayDay).length;

  // ── Teacher options for dropdowns ─────────────────────────────────────────────
  // Timetable entries use teacherId which may be the auth id (userId) OR the profile id.
  // We resolve by checking both t.userId (auth record id) and t.id (profile id).
  const teacherOptions = teachers.map(t => ({
    value: String(t.userId || t.id),
    label: t.name,
    subject: t.subject,
  }));

  return (
    <Layout pageTitle="Timetable Management">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Timetable Management</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#718096' }}>Assign class schedules and time slots to teachers</p>
        </div>
        <button
          onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#76C442', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
        >
          <span className="material-icons" style={{ fontSize: 18 }}>add</span>
          Add Entry
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Periods',    value: totalPeriods,    icon: 'event_note',     color: '#4361ee' },
          { label: 'Teachers Assigned',value: activeTeachers,  icon: 'person',         color: '#76C442' },
          { label: 'Classes Covered',  value: classesCovered,  icon: 'class',          color: '#805ad5' },
          { label: "Today's Periods",  value: todayCount,      icon: 'today',          color: '#ed8936' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-icons" style={{ color: s.color, fontSize: 24 }}>{s.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1a202c', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#718096', marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="material-icons" style={{ color: '#a0aec0', fontSize: 20 }}>filter_list</span>
        <select
          value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
          style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}
        >
          <option value="">All Teachers</option>
          {teacherOptions.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={filterDay} onChange={e => setFilterDay(e.target.value)}
          style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}
        >
          <option value="">All Days</option>
          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {(filterTeacher || filterDay) && (
          <button
            onClick={() => { setFilterTeacher(''); setFilterDay(''); }}
            style={{ padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, background: '#f7fafc', cursor: 'pointer', color: '#4a5568' }}
          >
            Clear Filters
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#a0aec0' }}>
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 40 }}>hourglass_empty</span>
            <p style={{ marginTop: 8 }}>Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '70px 20px' }}>
            <span className="material-icons" style={{ fontSize: 56, color: '#e2e8f0' }}>schedule</span>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#4a5568', marginTop: 12 }}>No timetable entries found</div>
            <div style={{ fontSize: 13, color: '#a0aec0', marginTop: 4, marginBottom: 20 }}>
              {filterTeacher || filterDay ? 'Try changing your filters' : 'Start by adding a timetable entry'}
            </div>
            {!filterTeacher && !filterDay && (
              <button onClick={openAdd} style={{ padding: '10px 24px', background: '#76C442', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                Add First Entry
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Teacher', 'Class / Section', 'Subject', 'Day', 'Time Slot', 'Room', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '13px 16px', textAlign: 'left', fontWeight: 700, color: '#4a5568', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => {
                  const sColor = SUBJECT_COLOR[entry.subject] || '#718096';
                  const dColor = DAY_COLOR[entry.day] || '#4a5568';
                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid #f0f4f8', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#76C44220', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#276749' }}>
                            {(entry.teacherName || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#2d3748' }}>{entry.teacherName || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '4px 10px', background: '#e8f4fd', color: '#2c5282', borderRadius: 20, fontWeight: 700, fontSize: 12 }}>
                          {entry.classSection}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '4px 10px', background: sColor + '18', color: sColor, borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          {entry.subject}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '4px 12px', background: dColor + '15', color: dColor, borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                          {entry.day}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="material-icons" style={{ fontSize: 14, color: '#a0aec0' }}>schedule</span>
                          <span style={{ fontWeight: 600, color: '#2d3748' }}>
                            {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#718096' }}>
                        {entry.room || <span style={{ color: '#cbd5e0' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(entry)} title="Edit"
                            style={{ width: 32, height: 32, border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-icons" style={{ fontSize: 16, color: '#4361ee' }}>edit</span>
                          </button>
                          <button onClick={() => setDeleteTarget(entry)} title="Delete"
                            style={{ width: 32, height: 32, border: '1.5px solid #ffe5e5', borderRadius: 8, background: '#fff5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-icons" style={{ fontSize: 16, color: '#e53e3e' }}>delete</span>
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
      </div>

      {/* ─── Add / Edit Modal ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-container" style={{ width: 520, maxHeight: '90vh', overflowY: 'auto' }}
               onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editId ? 'Edit Timetable Entry' : 'Add Timetable Entry'}</h3>
              <button className="modal-close" onClick={closeForm}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">

              {/* Teacher */}
              <Field label="Teacher *" error={errors.teacherId}>
                <select
                  value={form.teacherId}
                  onChange={e => {
                    const t = teacherOptions.find(o => o.value === e.target.value);
                    set('teacherId', e.target.value);
                    if (t?.subject && !form.subject) set('subject', t.subject);
                  }}
                  style={inputStyle(!!errors.teacherId)}
                >
                  <option value="">Select Teacher</option>
                  {teacherOptions.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>

              <Col2>
                {/* Class / Section */}
                <Field label="Class / Section *" error={errors.classSection}>
                  <select value={form.classSection} onChange={e => set('classSection', e.target.value)} style={inputStyle(!!errors.classSection)}>
                    <option value="">Select Class</option>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>

                {/* Subject */}
                <Field label="Subject *" error={errors.subject}>
                  <select value={form.subject} onChange={e => set('subject', e.target.value)} style={inputStyle(!!errors.subject)}>
                    <option value="">Select Subject</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </Col2>

              {/* Day */}
              <Field label="Day *" error={errors.day}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {DAYS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => set('day', d)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `1.5px solid ${form.day === d ? DAY_COLOR[d] : '#e2e8f0'}`,
                        background: form.day === d ? DAY_COLOR[d] + '18' : '#fff',
                        color: form.day === d ? DAY_COLOR[d] : '#4a5568',
                        transition: 'all 0.15s',
                      }}
                    >
                      {d.slice(0, 3)}
                    </button>
                  ))}
                </div>
                {errors.day && <div style={errStyle}>{errors.day}</div>}
              </Field>

              <Col2>
                {/* Start Time */}
                <Field label="Start Time *" error={errors.startTime}>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => set('startTime', e.target.value)}
                    style={inputStyle(!!errors.startTime)}
                  />
                </Field>

                {/* End Time */}
                <Field label="End Time *" error={errors.endTime}>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => set('endTime', e.target.value)}
                    style={inputStyle(!!errors.endTime)}
                  />
                </Field>
              </Col2>

              {/* Room (optional) */}
              <Field label="Room / Lab (optional)">
                <input
                  type="text"
                  placeholder="e.g. R-101, Lab-2"
                  value={form.room}
                  onChange={e => set('room', e.target.value)}
                  style={inputStyle(false)}
                />
              </Field>

              {/* Overlap warning area */}
              {errors.startTime && errors.startTime.includes('Overlaps') && (
                <div style={{ padding: '10px 14px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8, fontSize: 12, color: '#c53030', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span className="material-icons" style={{ fontSize: 16, flexShrink: 0 }}>warning</span>
                  {errors.startTime}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={closeForm} style={{ padding: '9px 20px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '9px 24px', background: saving ? '#a0aec0' : '#76C442', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Saving...' : (editId ? 'Update Entry' : 'Add Entry')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirm Modal ──────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-container" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 28px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff5f5', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-icons" style={{ fontSize: 32, color: '#e53e3e' }}>delete_outline</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>Delete Entry?</h3>
              <p style={{ fontSize: 13, color: '#718096', margin: '0 0 8px' }}>
                <strong>{deleteTarget.teacherName}</strong> — {deleteTarget.subject} ({deleteTarget.classSection})
              </p>
              <p style={{ fontSize: 12, color: '#a0aec0', margin: '0 0 24px' }}>
                {deleteTarget.day} · {formatTime(deleteTarget.startTime)} – {formatTime(deleteTarget.endTime)}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setDeleteTarget(null)}
                  style={{ padding: '9px 22px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={confirmDelete}
                  style={{ padding: '9px 22px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
