import { useState, useEffect, useCallback } from 'react';
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
import { adminAPI } from '../../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_COLOR = {
  Monday: '#4361ee', Tuesday: '#38b2ac', Wednesday: '#805ad5',
  Thursday: '#ed8936', Friday: '#e53e3e', Saturday: '#76C442',
};

// Deterministic color from subject name — ensures consistent color for any free-text subject
const PALETTE = [
  '#4361ee','#38b2ac','#805ad5','#e53e3e','#ed8936','#009688',
  '#d69e2e','#e91e63','#667eea','#48bb78','#ed64a6','#dd6b20','#76C442','#2b6cb0',
];
const subjectColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

const EMPTY_FORM = {
  teacherId: '', classSection: '', subject: '',
  days: [], startTime: '', endTime: '',
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
  const [classes, setClasses]     = useState([]);   // loaded from DB
  const [loading, setLoading]     = useState(true);


  // Modals
  const [showForm, setShowForm]         = useState(false);
  const [editId, setEditId]             = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form state
  const [form, setForm]     = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [tt, tc, cls] = await Promise.all([
        fetchTimetable(),
        fetchTeachers(),
        adminAPI.getClasses(),
      ]);
      setEntries(tt);
      setTeachers(tc.filter(t => t.status !== 'Inactive'));
      // Build "name-section" strings from DB; fall back gracefully if section absent
      const raw = cls?.data?.data ?? cls?.data ?? cls ?? [];
      const formatted = raw
        .filter(c => c.isActive !== false)
        .map(c => c.section ? `${c.name}-${c.section}` : c.name)
        .sort();
      setClasses([...new Set(formatted)]);  // deduplicate
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Sorted view ─────────────────────────────────────────────────────────────
  const filtered = [...entries].sort((a, b) => {
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
      days:         [entry.day],          // edit always has exactly one day
      startTime:    entry.startTime,
      endTime:      entry.endTime,
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

  const toggleDay = (day) => {
    setForm(prev => {
      const next = prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day];
      return { ...prev, days: next };
    });
    setErrors(prev => ({ ...prev, days: '' }));
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.teacherId)              e.teacherId    = 'Select a teacher';
    if (!form.classSection)           e.classSection = 'Select a class';
    if (!form.subject.trim())         e.subject      = 'Enter a subject';
    if (form.days.length === 0)       e.days         = 'Select at least one day';
    if (!form.startTime)              e.startTime    = 'Enter start time';
    if (!form.endTime)                e.endTime      = 'Enter end time';
    if (form.startTime && form.endTime && form.startTime >= form.endTime)
      e.endTime = 'End time must be after start time';
    return e;
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const teacher = teachers.find(
      t => String(t.id) === form.teacherId || String(t.userId) === form.teacherId,
    );
    const subjectTrimmed = form.subject.trim();

    // When editing, only one day is allowed; take first (always length 1)
    const daysToSave = editId ? [form.days[0]] : form.days;

    // Overlap check across all selected days
    for (const day of daysToSave) {
      const candidate = {
        teacherId:    Number(form.teacherId),
        classSection: form.classSection,
        subject:      subjectTrimmed,
        day,
        startTime:    form.startTime,
        endTime:      form.endTime,
        teacherName:  teacher?.name || '',
      };
      const conflict = checkOverlap(candidate, entries, editId);
      if (conflict) {
        setErrors({
          startTime: `${day}: Overlaps with ${conflict.subject} (${conflict.classSection}) ${formatTime(conflict.startTime)}–${formatTime(conflict.endTime)}`,
        });
        return;
      }
    }

    setSaving(true);
    try {
      if (editId) {
        const candidate = {
          teacherId:    Number(form.teacherId),
          classSection: form.classSection,
          subject:      subjectTrimmed,
          day:          daysToSave[0],
          startTime:    form.startTime,
          endTime:      form.endTime,
          teacherName:  teacher?.name || '',
        };
        const updated = await updateTimetableEntry(editId, candidate);
        setEntries(prev => prev.map(en => en.id === editId ? updated : en));
        showToast('Timetable entry updated');
      } else {
        // Create one entry per selected day
        const created = await Promise.all(
          daysToSave.map(day => createTimetableEntry({
            teacherId:    Number(form.teacherId),
            classSection: form.classSection,
            subject:      subjectTrimmed,
            day,
            startTime:    form.startTime,
            endTime:      form.endTime,
            teacherName:  teacher?.name || '',
          })),
        );
        setEntries(prev => [...prev, ...created]);
        showToast(
          daysToSave.length > 1
            ? `${daysToSave.length} entries added (${daysToSave.join(', ')})`
            : 'Timetable entry added',
        );
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

  // ── Teacher options ───────────────────────────────────────────────────────────
  const teacherOptions = teachers.map(t => ({
    value: String(t.userId || t.id),
    label: t.name,
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
          Add Schedule
        </button>
      </div>

      {/* Schedule List */}
      <div className="data-table-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 40 }}>hourglass_empty</span>
            <p style={{ marginTop: 8 }}>Loading schedules...</p>
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '70px 20px' }}>
            <span className="material-icons" style={{ fontSize: 56, color: '#e2e8f0' }}>schedule</span>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#4a5568', marginTop: 12 }}>No schedules yet</div>
            <div style={{ fontSize: 13, color: '#a0aec0', marginTop: 4, marginBottom: 20 }}>
              Click "Add Schedule" to assign a timetable to a teacher
            </div>
            <button onClick={openAdd} style={{ padding: '10px 24px', background: '#76C442', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
              Add Schedule
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Teacher</th>
                  <th>Class / Section</th>
                  <th>Subject</th>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, idx) => {
                  const sColor = subjectColor(entry.subject);
                  const dColor = DAY_COLOR[entry.day] || '#4a5568';
                  return (
                    <tr key={entry.id}>
                      <td style={{ color: '#a0aec0', fontSize: 12 }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#76C44220', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#76C442', flexShrink: 0 }}>
                            {(entry.teacherName || '?').slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{entry.teacherName || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#76C44220', color: '#276749' }}>
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
                      <td style={{ fontSize: 13, color: '#4a5568', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="action-btn action-btn-edit" title="Edit" onClick={() => openEdit(entry)}>
                            <span className="material-icons">edit</span>
                          </button>
                          <button className="action-btn action-btn-delete" title="Delete" onClick={() => setDeleteTarget(entry)}>
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
      </div>

      {/* ─── Add / Edit Modal ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-container" style={{ width: 540, maxHeight: '90vh', overflowY: 'auto' }}
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
                  onChange={e => set('teacherId', e.target.value)}
                  style={inputStyle(!!errors.teacherId)}
                >
                  <option value="">Select Teacher</option>
                  {teacherOptions.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>

              <Col2>
                {/* Class / Section — from DB */}
                <Field label="Class / Section *" error={errors.classSection}>
                  <select
                    value={form.classSection}
                    onChange={e => set('classSection', e.target.value)}
                    style={inputStyle(!!errors.classSection)}
                  >
                    <option value="">Select Class</option>
                    {classes.length === 0 ? (
                      <option disabled>No classes added yet</option>
                    ) : (
                      classes.map(c => <option key={c} value={c}>{c}</option>)
                    )}
                  </select>
                </Field>

                {/* Subject — free-text input */}
                <Field label="Subject *" error={errors.subject}>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics, Physics"
                    value={form.subject}
                    onChange={e => set('subject', e.target.value)}
                    style={inputStyle(!!errors.subject)}
                    autoComplete="off"
                  />
                </Field>
              </Col2>

              {/* Days — checkboxes (multi-select for new, single for edit) */}
              <Field label={editId ? 'Day *' : 'Days * (select one or more)'} error={errors.days}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  padding: '12px',
                  border: `1.5px solid ${errors.days ? '#e53e3e' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  background: '#fafbfc',
                }}>
                  {DAYS.map(day => {
                    const checked = form.days.includes(day);
                    const color   = DAY_COLOR[day];
                    return (
                      <label
                        key={day}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: `1.5px solid ${checked ? color : '#e2e8f0'}`,
                          background: checked ? color + '15' : '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDay(day)}
                          style={{ accentColor: color, width: 15, height: 15, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '12px', fontWeight: checked ? 700 : 500, color: checked ? color : '#4a5568' }}>
                          {day}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {!editId && form.days.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#76C442', fontWeight: 600 }}>
                    {form.days.length} day{form.days.length > 1 ? 's' : ''} selected — will create {form.days.length} entr{form.days.length > 1 ? 'ies' : 'y'}
                  </div>
                )}
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

              {/* Overlap warning */}
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
                {saving ? 'Saving...' : (editId ? 'Update Entry' : `Add ${form.days.length > 1 ? `${form.days.length} Entries` : 'Entry'}`)}
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
