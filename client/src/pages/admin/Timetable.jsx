import React, { useState, useEffect, useCallback } from 'react';
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
import { adminAPI, timetableAPI } from '../../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_COLOR = {
  Monday: '#4361ee', Tuesday: '#38b2ac', Wednesday: '#805ad5',
  Thursday: '#ed8936', Friday: '#e53e3e', Saturday: '#76C442',
};

const PALETTE = [
  '#4361ee','#38b2ac','#805ad5','#e53e3e','#ed8936','#009688',
  '#d69e2e','#e91e63','#667eea','#48bb78','#ed64a6','#dd6b20','#76C442','#2b6cb0',
];
const subjectColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

const PREDEFINED_PERIODS = [
  { label: 'Period 1', startTime: '08:00', endTime: '08:45' },
  { label: 'Period 2', startTime: '08:45', endTime: '09:30' },
  { label: 'Period 3', startTime: '09:45', endTime: '10:30' },
  { label: 'Period 4', startTime: '10:30', endTime: '11:15' },
  { label: 'Period 5', startTime: '11:30', endTime: '12:15' },
  { label: 'Period 6', startTime: '12:15', endTime: '13:00' },
  { label: 'Period 7', startTime: '13:45', endTime: '14:30' },
  { label: 'Period 8', startTime: '14:30', endTime: '15:15' },
];

const EMPTY_FORM = {
  teacherId: '', classSection: '', subject: '',
  days: [], startTime: '', endTime: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toMin = (t) => {
  if (!t || typeof t !== 'string') return 0;
  const [h, m] = t.split(':').map(Number);
  return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
};

/**
 * Returns a conflict description string or null.
 * Checks candidate against existing DB entries AND batch entries before it.
 */
const getEntryConflict = (candidate, existingEntries, batchEntries, idx) => {
  const ns = toMin(candidate.startTime);
  const ne = toMin(candidate.endTime);

  // Teacher overlap vs DB
  const teacherConflict = existingEntries.find(e =>
    String(e.teacherId) === String(candidate.teacherId) &&
    e.day === candidate.day &&
    ns < toMin(e.endTime) && ne > toMin(e.startTime)
  );
  if (teacherConflict)
    return `Teacher overlap: ${teacherConflict.subject} (${teacherConflict.classSection}) ${formatTime(teacherConflict.startTime)}–${formatTime(teacherConflict.endTime)}`;

  // Room overlap vs DB
  if (candidate.room) {
    const roomConflict = existingEntries.find(e =>
      e.room && e.room === candidate.room &&
      e.day === candidate.day &&
      ns < toMin(e.endTime) && ne > toMin(e.startTime)
    );
    if (roomConflict)
      return `Room ${candidate.room} already booked: ${roomConflict.subject} (${roomConflict.classSection})`;
  }

  // Teacher overlap within batch
  for (let i = 0; i < batchEntries.length; i++) {
    if (i === idx) continue;
    const other = batchEntries[i];
    if (String(other.teacherId) === String(candidate.teacherId) &&
        other.day === candidate.day &&
        ns < toMin(other.endTime) && ne > toMin(other.startTime)) {
      return `Batch teacher conflict: ${other.subject} (${other.classSection}) on ${other.day}`;
    }
    // Room overlap within batch
    if (candidate.room && other.room === candidate.room &&
        other.day === candidate.day &&
        ns < toMin(other.endTime) && ne > toMin(other.startTime)) {
      return `Batch room conflict: Room ${candidate.room} used by ${other.subject} (${other.classSection})`;
    }
  }

  return null;
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
  const [entries, setEntries]   = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses]   = useState([]);
  const [loading, setLoading]   = useState(true);

  // Modals
  const [showForm, setShowForm]         = useState(false);
  const [showBulk, setShowBulk]         = useState(false);
  const [editId, setEditId]             = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Expanded teachers in grouped view
  const [expandedTeachers, setExpandedTeachers] = useState(new Set());
  const toggleTeacher = (teacherId) => {
    setExpandedTeachers(prev => {
      const next = new Set(prev);
      if (next.has(teacherId)) next.delete(teacherId);
      else next.add(teacherId);
      return next;
    });
  };

  // Single-entry form state
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
      const raw = cls?.data?.data ?? cls?.data ?? cls ?? [];
      const formatted = raw
        .filter(c => c.isActive !== false)
        .map(c => c.section ? `${c.name}-${c.section}` : c.name)
        .sort();
      setClasses([...new Set(formatted)]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Grouped view by teacher ──────────────────────────────────────────────────
  const groupedByTeacher = (() => {
    const map = new Map();
    for (const entry of entries) {
      const key = String(entry.teacherId);
      if (!map.has(key)) map.set(key, { teacherId: key, teacherName: entry.teacherName, rows: [] });
      map.get(key).rows.push(entry);
    }
    // Sort each teacher's rows by day then time
    for (const group of map.values()) {
      group.rows.sort((a, b) => {
        const dA = DAYS.indexOf(a.day), dB = DAYS.indexOf(b.day);
        if (dA !== dB) return dA - dB;
        return a.startTime.localeCompare(b.startTime);
      });
    }
    return [...map.values()].sort((a, b) => (a.teacherName || '').localeCompare(b.teacherName || ''));
  })();

  // ── Single-entry form helpers ─────────────────────────────────────────────────
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
      days:         [entry.day],
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

  // ── Single-entry validation ───────────────────────────────────────────────────
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

  // ── Single-entry save ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const teacher = teachers.find(
      t => String(t.id) === form.teacherId || String(t.userId) === form.teacherId,
    );
    const subjectTrimmed = form.subject.trim();
    const daysToSave = editId ? [form.days[0]] : form.days;

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

  // ── Bulk save callback ────────────────────────────────────────────────────────
  const handleBulkSaved = (newEntries) => {
    setEntries(prev => [...prev, ...newEntries]);
    showToast(`${newEntries.length} entr${newEntries.length === 1 ? 'y' : 'ies'} added via Bulk Assign`);
  };

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
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowBulk(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            <span className="material-icons" style={{ fontSize: 18 }}>dashboard_customize</span>
            Bulk Assign
          </button>
          <button
            onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#76C442', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            <span className="material-icons" style={{ fontSize: 18 }}>add</span>
            Add Schedule
          </button>
        </div>
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
              Use "Add Schedule" or "Bulk Assign" to create timetable entries
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setShowBulk(true)} style={{ padding: '10px 24px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                Bulk Assign
              </button>
              <button onClick={openAdd} style={{ padding: '10px 24px', background: '#76C442', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
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
                        <td style={{ color: '#a0aec0', fontSize: 12 }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#76C44220', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#76C442', flexShrink: 0 }}>
                              {(group.teacherName || '?').slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{group.teacherName || '—'}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {uniqueClasses.map(cls => (
                              <span key={cls} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#76C44220', color: '#276749' }}>{cls}</span>
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
                        <td style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>
                          {group.rows.length} period{group.rows.length !== 1 ? 's' : ''}
                        </td>
                        <td>
                          <div className="action-btns">
                            <button
                              title={isExpanded ? 'Hide schedule' : 'View schedule'}
                              onClick={() => toggleTeacher(group.teacherId)}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', background: isExpanded ? '#76C44220' : '#4361ee15', cursor: 'pointer' }}
                            >
                              <span className="material-icons" style={{ fontSize: 18, color: isExpanded ? '#76C442' : '#4361ee' }}>
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
                            <td style={{ color: '#a0aec0', fontSize: 11, paddingLeft: 32 }}>{eIdx + 1}</td>
                            <td style={{ paddingLeft: 32 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="material-icons" style={{ fontSize: 14, color: '#a0aec0' }}>subdirectory_arrow_right</span>
                                <span style={{ fontSize: 12, color: '#718096' }}>{entry.day} — {formatTime(entry.startTime)} – {formatTime(entry.endTime)}</span>
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
                    </React.Fragment>
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
              <Field label="Teacher *" error={errors.teacherId}>
                <select value={form.teacherId} onChange={e => set('teacherId', e.target.value)} style={inputStyle(!!errors.teacherId)}>
                  <option value="">Select Teacher</option>
                  {teacherOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Col2>
                <Field label="Class / Section *" error={errors.classSection}>
                  <select value={form.classSection} onChange={e => set('classSection', e.target.value)} style={inputStyle(!!errors.classSection)}>
                    <option value="">Select Class</option>
                    {classes.length === 0
                      ? <option disabled>No classes added yet</option>
                      : classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Subject *" error={errors.subject}>
                  <input type="text" placeholder="e.g. Mathematics, Physics" value={form.subject}
                    onChange={e => set('subject', e.target.value)} style={inputStyle(!!errors.subject)} autoComplete="off" />
                </Field>
              </Col2>
              <Field label={editId ? 'Day *' : 'Days * (select one or more)'} error={errors.days}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', border: `1.5px solid ${errors.days ? '#e53e3e' : '#e2e8f0'}`, borderRadius: '8px', background: '#fafbfc' }}>
                  {DAYS.map(day => {
                    const checked = form.days.includes(day);
                    const color   = DAY_COLOR[day];
                    return (
                      <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', border: `1.5px solid ${checked ? color : '#e2e8f0'}`, background: checked ? color + '15' : '#fff', cursor: 'pointer', userSelect: 'none' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleDay(day)} style={{ accentColor: color, width: 15, height: 15, cursor: 'pointer' }} />
                        <span style={{ fontSize: '12px', fontWeight: checked ? 700 : 500, color: checked ? color : '#4a5568' }}>{day}</span>
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
                <Field label="Start Time *" error={errors.startTime}>
                  <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} style={inputStyle(!!errors.startTime)} />
                </Field>
                <Field label="End Time *" error={errors.endTime}>
                  <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} style={inputStyle(!!errors.endTime)} />
                </Field>
              </Col2>
              {errors.startTime && errors.startTime.includes('Overlaps') && (
                <div style={{ padding: '10px 14px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8, fontSize: 12, color: '#c53030', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span className="material-icons" style={{ fontSize: 16, flexShrink: 0 }}>warning</span>
                  {errors.startTime}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={closeForm} style={{ padding: '9px 20px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '9px 24px', background: saving ? '#a0aec0' : '#76C442', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : (editId ? 'Update Entry' : `Add ${form.days.length > 1 ? `${form.days.length} Entries` : 'Entry'}`)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bulk Assign Modal ─────────────────────────────────────────────────── */}
      {showBulk && (
        <BulkAssignModal
          teachers={teachers}
          classes={classes}
          entries={entries}
          onSave={handleBulkSaved}
          onClose={() => setShowBulk(false)}
        />
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
                <button onClick={() => setDeleteTarget(null)} style={{ padding: '9px 22px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={confirmDelete} style={{ padding: '9px 22px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ─── Bulk Assign Modal ─────────────────────────────────────────────────────────

function BulkAssignModal({ teachers, classes, entries, onSave, onClose }) {
  const [step, setStep]       = useState(1);
  const [teacherId, setTeacherId] = useState('');
  const [mode, setMode]       = useState('uniform'); // 'uniform' | 'custom'

  // ── Uniform mode ────────────────────────────────────────────────────────────
  const [selClasses, setSelClasses]   = useState([]);
  const [subject, setSubject]         = useState('');
  const [selDays, setSelDays]         = useState([]);
  const [timeMode, setTimeMode]       = useState('predefined'); // 'predefined' | 'custom'
  const [selPeriods, setSelPeriods]   = useState([]);
  const [customSlots, setCustomSlots] = useState([{ startTime: '', endTime: '' }]);
  const [room, setRoom]               = useState('');

  // ── Custom rows mode ─────────────────────────────────────────────────────────
  const [nextId, setNextId]         = useState(2);
  const [customRows, setCustomRows] = useState([
    { id: 1, classSection: '', day: '', subject: '', startTime: '', endTime: '', room: '' },
  ]);

  const [errors, setErrors]             = useState({});

  // ── Step 2 ───────────────────────────────────────────────────────────────────
  const [previewEntries, setPreviewEntries]   = useState([]);
  const [previewConflicts, setPreviewConflicts] = useState({});
  const [saving, setSaving]                   = useState(false);
  const [saveResult, setSaveResult]           = useState(null);

  const teacher = teachers.find(t => String(t.userId || t.id) === teacherId);

  // ── Uniform helpers ──────────────────────────────────────────────────────────
  const toggleClass  = (cls) => setSelClasses(p => p.includes(cls) ? p.filter(c => c !== cls) : [...p, cls]);
  const toggleSelDay = (day) => setSelDays(p => p.includes(day) ? p.filter(d => d !== day) : [...p, day]);
  const togglePeriod = (i)   => setSelPeriods(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i]);

  const updateSlot = (i, field, val) =>
    setCustomSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  const addSlot    = () => setCustomSlots(p => [...p, { startTime: '', endTime: '' }]);
  const removeSlot = (i) => setCustomSlots(p => p.filter((_, idx) => idx !== i));

  // ── Custom row helpers ───────────────────────────────────────────────────────
  const updateRow    = (id, field, val) => setCustomRows(p => p.map(r => r.id === id ? { ...r, [field]: val } : r));
  const addRow       = () => { setCustomRows(p => [...p, { id: nextId, classSection: '', day: '', subject: '', startTime: '', endTime: '', room: '' }]); setNextId(n => n + 1); };
  const removeRow    = (id) => setCustomRows(p => p.filter(r => r.id !== id));
  const duplicateRow = (id) => {
    const row = customRows.find(r => r.id === id);
    if (row) { setCustomRows(p => [...p, { ...row, id: nextId }]); setNextId(n => n + 1); }
  };

  const getTimeSlots = () =>
    timeMode === 'predefined'
      ? PREDEFINED_PERIODS.filter((_, i) => selPeriods.includes(i))
      : customSlots.filter(s => s.startTime && s.endTime);

  // ── Entry count for the hint label ──────────────────────────────────────────
  const entryCount = mode === 'uniform'
    ? selClasses.length * selDays.length * getTimeSlots().length
    : customRows.filter(r => r.classSection && r.day && r.subject && r.startTime && r.endTime).length;

  // ── Generate preview entries ─────────────────────────────────────────────────
  const generateEntries = () => {
    if (!teacher) return [];
    if (mode === 'uniform') {
      const slots = getTimeSlots();
      const result = [];
      selClasses.forEach(cls => {
        selDays.forEach(day => {
          slots.forEach(slot => {
            result.push({
              teacherId:    Number(teacherId),
              teacherName:  teacher.name,
              classSection: cls,
              subject:      subject.trim(),
              day,
              startTime:    slot.startTime,
              endTime:      slot.endTime,
              room:         room.trim() || null,
            });
          });
        });
      });
      return result;
    }
    return customRows
      .filter(r => r.classSection && r.day && r.subject && r.startTime && r.endTime)
      .map(r => ({
        teacherId:    Number(teacherId),
        teacherName:  teacher.name,
        classSection: r.classSection,
        subject:      r.subject.trim(),
        day:          r.day,
        startTime:    r.startTime,
        endTime:      r.endTime,
        room:         r.room?.trim() || null,
      }));
  };

  // ── Step 1 → Step 2 ──────────────────────────────────────────────────────────
  const handleNext = () => {
    const e = {};
    if (!teacherId) e.teacherId = 'Select a teacher';
    if (mode === 'uniform') {
      if (selClasses.length === 0) e.classes = 'Select at least one class';
      if (!subject.trim()) e.subject = 'Enter a subject';
      if (selDays.length === 0) e.days = 'Select at least one day';
      if (getTimeSlots().length === 0)
        e.timeSlots = timeMode === 'predefined' ? 'Select at least one period' : 'Add at least one valid time slot';
    } else {
      const valid = customRows.filter(r => r.classSection && r.day && r.subject && r.startTime && r.endTime);
      if (valid.length === 0) e.customRows = 'Add at least one complete row (all required fields)';
    }
    if (Object.keys(e).length) { setErrors(e); return; }

    const generated = generateEntries();
    const conflictMap = {};
    generated.forEach((entry, i) => {
      const c = getEntryConflict(entry, entries, generated, i);
      if (c) conflictMap[i] = c;
    });
    setPreviewEntries(generated);
    setPreviewConflicts(conflictMap);
    setStep(2);
  };

  // ── Save valid entries ───────────────────────────────────────────────────────
  const handleSave = async () => {
    const valid = previewEntries.filter((_, i) => !previewConflicts[i]);
    if (!valid.length) return;
    setSaving(true);
    try {
      const res = await timetableAPI.bulkCreate(valid);
      const saved = res.data?.data ?? [];
      onSave(saved);
      setSaveResult({ success: true, count: saved.length });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error   ||
        (err.response?.status === 404 ? 'Endpoint not found — please restart the backend server.' :
         err.response?.status === 403 ? 'Permission denied. Please log out and log in again.' :
         err.response?.status === 500 ? 'Server error — check the backend logs.' :
         err.message || 'Failed to save. Please try again.');
      setSaveResult({ success: false, message: msg });
    } finally {
      setSaving(false);
    }
  };

  const validCount    = previewEntries.filter((_, i) => !previewConflicts[i]).length;
  const conflictCount = Object.keys(previewConflicts).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{ width: step === 2 ? 900 : 720, maxHeight: '93vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-icons" style={{ fontSize: 20, color: '#4361ee' }}>dashboard_customize</span>
              {step === 1 ? 'Bulk Assign Timetable' : 'Preview Entries'}
            </h3>
            <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>
              Step {step} of 2 — {step === 1 ? 'Configure schedules to assign' : 'Review conflicts and save'}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><span className="material-icons">close</span></button>
        </div>

        {/* ══════════════ STEP 1: CONFIGURE ══════════════ */}
        {step === 1 && (
          <div className="modal-body">

            {/* Teacher + Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
              <Field label="Teacher *" error={errors.teacherId}>
                <select
                  value={teacherId}
                  onChange={e => { setTeacherId(e.target.value); setErrors(p => ({ ...p, teacherId: '' })); }}
                  style={inputStyle(!!errors.teacherId)}
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(t => (
                    <option key={t.userId || t.id} value={String(t.userId || t.id)}>{t.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Assignment Mode">
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { key: 'uniform', icon: 'grid_view',    label: 'Uniform' },
                    { key: 'custom',  icon: 'table_rows',   label: 'Custom Rows' },
                  ].map(m => (
                    <button
                      key={m.key}
                      onClick={() => { setMode(m.key); setErrors({}); }}
                      style={{
                        flex: 1, padding: '9px 0', border: `2px solid ${mode === m.key ? '#4361ee' : '#e2e8f0'}`,
                        borderRadius: 9, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                        background: mode === m.key ? '#4361ee12' : '#fff',
                        color: mode === m.key ? '#4361ee' : '#718096',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}
                    >
                      <span className="material-icons" style={{ fontSize: 15 }}>{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* ─── UNIFORM MODE ─── */}
            {mode === 'uniform' && (
              <>
                {/* Classes */}
                <Field label="Classes * — select one or more" error={errors.classes}>
                  <div style={{ border: `1.5px solid ${errors.classes ? '#e53e3e' : '#e2e8f0'}`, borderRadius: 9, padding: 12, background: '#fafbfc' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <button
                        onClick={() => { setSelClasses([...classes]); setErrors(p => ({ ...p, classes: '' })); }}
                        style={{ fontSize: 11, fontWeight: 600, color: '#76C442', background: 'none', border: '1px solid #76C44250', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
                      >Select All</button>
                      <button
                        onClick={() => setSelClasses([])}
                        style={{ fontSize: 11, fontWeight: 600, color: '#718096', background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
                      >Clear</button>
                      {selClasses.length > 0 && (
                        <span style={{ fontSize: 11, color: '#76C442', fontWeight: 700, marginLeft: 'auto' }}>
                          {selClasses.length} selected
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 6, maxHeight: 130, overflowY: 'auto' }}>
                      {classes.map(cls => {
                        const checked = selClasses.includes(cls);
                        return (
                          <label key={cls} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
                            borderRadius: 7, border: `1.5px solid ${checked ? '#76C442' : '#e2e8f0'}`,
                            background: checked ? '#76C44215' : '#fff', cursor: 'pointer', userSelect: 'none',
                          }}>
                            <input type="checkbox" checked={checked}
                              onChange={() => { toggleClass(cls); setErrors(p => ({ ...p, classes: '' })); }}
                              style={{ accentColor: '#76C442', width: 13, height: 13 }} />
                            <span style={{ fontSize: 12, fontWeight: checked ? 700 : 500, color: checked ? '#276749' : '#4a5568' }}>{cls}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </Field>

                {/* Subject */}
                <Field label="Subject *" error={errors.subject}>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics, Physics, English"
                    value={subject}
                    onChange={e => { setSubject(e.target.value); setErrors(p => ({ ...p, subject: '' })); }}
                    style={inputStyle(!!errors.subject)}
                    autoComplete="off"
                  />
                </Field>

                {/* Days */}
                <Field label="Days * — select one or more" error={errors.days}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6,
                    padding: 12, border: `1.5px solid ${errors.days ? '#e53e3e' : '#e2e8f0'}`,
                    borderRadius: 9, background: '#fafbfc',
                  }}>
                    {DAYS.map(day => {
                      const checked = selDays.includes(day);
                      const color   = DAY_COLOR[day];
                      return (
                        <label key={day} style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          padding: '8px 4px', borderRadius: 8,
                          border: `1.5px solid ${checked ? color : '#e2e8f0'}`,
                          background: checked ? color + '15' : '#fff', cursor: 'pointer', userSelect: 'none',
                        }}>
                          <input type="checkbox" checked={checked}
                            onChange={() => { toggleSelDay(day); setErrors(p => ({ ...p, days: '' })); }}
                            style={{ accentColor: color, width: 14, height: 14 }} />
                          <span style={{ fontSize: 10, fontWeight: checked ? 700 : 500, color: checked ? color : '#718096' }}>
                            {day.slice(0, 3)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setSelDays([...DAYS]); setErrors(p => ({ ...p, days: '' })); }}
                      style={{ fontSize: 11, fontWeight: 600, color: '#4361ee', background: 'none', border: '1px solid #4361ee50', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
                    >Full Week (Mon–Sat)</button>
                    <button
                      onClick={() => { setSelDays(['Monday','Tuesday','Wednesday','Thursday','Friday']); setErrors(p => ({ ...p, days: '' })); }}
                      style={{ fontSize: 11, fontWeight: 600, color: '#718096', background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
                    >Weekdays Only</button>
                  </div>
                </Field>

                {/* Time Slots */}
                <Field label="Time Slots *" error={errors.timeSlots}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, background: '#f7fafc', borderRadius: 8, padding: 4, border: '1px solid #e2e8f0' }}>
                    {[['predefined', 'Predefined Periods'], ['custom', 'Custom Times']].map(([m, label]) => (
                      <button key={m} onClick={() => { setTimeMode(m); setErrors(p => ({ ...p, timeSlots: '' })); }} style={{
                        flex: 1, padding: '7px 0', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                        background: timeMode === m ? '#4361ee' : 'transparent',
                        color: timeMode === m ? '#fff' : '#718096',
                        transition: 'all 0.15s',
                      }}>{label}</button>
                    ))}
                  </div>

                  {timeMode === 'predefined' ? (
                    <>
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6,
                        padding: 12, border: `1.5px solid ${errors.timeSlots ? '#e53e3e' : '#e2e8f0'}`,
                        borderRadius: 9, background: '#fafbfc',
                      }}>
                        {PREDEFINED_PERIODS.map((p, i) => {
                          const checked = selPeriods.includes(i);
                          return (
                            <label key={i} style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                              borderRadius: 8, border: `1.5px solid ${checked ? '#3182ce' : '#e2e8f0'}`,
                              background: checked ? '#ebf8ff' : '#fff', cursor: 'pointer', userSelect: 'none',
                            }}>
                              <input type="checkbox" checked={checked}
                                onChange={() => { togglePeriod(i); setErrors(pp => ({ ...pp, timeSlots: '' })); }}
                                style={{ accentColor: '#3182ce', width: 14, height: 14 }} />
                              <div>
                                <div style={{ fontSize: 12, fontWeight: checked ? 700 : 600, color: checked ? '#2b6cb0' : '#4a5568' }}>{p.label}</div>
                                <div style={{ fontSize: 11, color: '#a0aec0' }}>{formatTime(p.startTime)} – {formatTime(p.endTime)}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { setSelPeriods(PREDEFINED_PERIODS.map((_, i) => i)); setErrors(p => ({ ...p, timeSlots: '' })); }}
                          style={{ fontSize: 11, fontWeight: 600, color: '#3182ce', background: 'none', border: '1px solid #3182ce50', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
                        >Select All Periods</button>
                        <button
                          onClick={() => setSelPeriods([])}
                          style={{ fontSize: 11, fontWeight: 600, color: '#718096', background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
                        >Clear</button>
                      </div>
                    </>
                  ) : (
                    <div>
                      {customSlots.map((slot, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#718096', marginBottom: 3 }}>Start Time</div>
                            <input type="time" value={slot.startTime}
                              onChange={e => { updateSlot(i, 'startTime', e.target.value); setErrors(p => ({ ...p, timeSlots: '' })); }}
                              style={inputStyle(false)} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#718096', marginBottom: 3 }}>End Time</div>
                            <input type="time" value={slot.endTime}
                              onChange={e => { updateSlot(i, 'endTime', e.target.value); setErrors(p => ({ ...p, timeSlots: '' })); }}
                              style={inputStyle(false)} />
                          </div>
                          <button
                            onClick={() => removeSlot(i)}
                            disabled={customSlots.length === 1}
                            style={{ padding: '9px 10px', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, cursor: customSlots.length === 1 ? 'not-allowed' : 'pointer', color: customSlots.length === 1 ? '#cbd5e0' : '#e53e3e' }}
                          >
                            <span className="material-icons" style={{ fontSize: 17 }}>remove_circle_outline</span>
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={addSlot}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', background: 'none', border: '1.5px dashed #4361ee60', borderRadius: 9, color: '#4361ee', fontWeight: 600, fontSize: 12, cursor: 'pointer', width: '100%', justifyContent: 'center', marginTop: 4 }}
                      >
                        <span className="material-icons" style={{ fontSize: 16 }}>add</span> Add Time Slot
                      </button>
                    </div>
                  )}
                </Field>

                {/* Room */}
                <Field label="Room (Optional)">
                  <input
                    type="text"
                    placeholder="e.g. Room 101, Science Lab, Computer Lab"
                    value={room}
                    onChange={e => setRoom(e.target.value)}
                    style={inputStyle(false)}
                  />
                </Field>
              </>
            )}

            {/* ─── CUSTOM ROWS MODE ─── */}
            {mode === 'custom' && (
              <>
                {errors.customRows && (
                  <div style={{ padding: '10px 14px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8, fontSize: 12, color: '#c53030', marginBottom: 12 }}>
                    {errors.customRows}
                  </div>
                )}
                <div style={{ overflowX: 'auto', border: '1.5px solid #e2e8f0', borderRadius: 10, marginBottom: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 620 }}>
                    <thead>
                      <tr style={{ background: '#f7fafc' }}>
                        {['Class *', 'Day *', 'Subject *', 'Start *', 'End *', 'Room', ''].map((h, i) => (
                          <th key={i} style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700, color: '#4a5568', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customRows.map((row) => (
                        <tr key={row.id} style={{ borderBottom: '1px solid #f0f4f8' }}>
                          <td style={{ padding: '5px 5px' }}>
                            <select value={row.classSection} onChange={e => updateRow(row.id, 'classSection', e.target.value)}
                              style={{ ...inputStyle(false), padding: '7px 8px', fontSize: 12 }}>
                              <option value="">Select</option>
                              {classes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '5px 5px' }}>
                            <select value={row.day} onChange={e => updateRow(row.id, 'day', e.target.value)}
                              style={{ ...inputStyle(false), padding: '7px 8px', fontSize: 12 }}>
                              <option value="">Select</option>
                              {DAYS.map(d => <option key={d} value={d}>{d.slice(0, 3)}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '5px 5px' }}>
                            <input type="text" value={row.subject} placeholder="Subject"
                              onChange={e => updateRow(row.id, 'subject', e.target.value)}
                              style={{ ...inputStyle(false), padding: '7px 8px', fontSize: 12 }} />
                          </td>
                          <td style={{ padding: '5px 5px' }}>
                            <input type="time" value={row.startTime}
                              onChange={e => updateRow(row.id, 'startTime', e.target.value)}
                              style={{ ...inputStyle(false), padding: '7px 8px', fontSize: 12 }} />
                          </td>
                          <td style={{ padding: '5px 5px' }}>
                            <input type="time" value={row.endTime}
                              onChange={e => updateRow(row.id, 'endTime', e.target.value)}
                              style={{ ...inputStyle(false), padding: '7px 8px', fontSize: 12 }} />
                          </td>
                          <td style={{ padding: '5px 5px' }}>
                            <input type="text" value={row.room} placeholder="Optional"
                              onChange={e => updateRow(row.id, 'room', e.target.value)}
                              style={{ ...inputStyle(false), padding: '7px 8px', fontSize: 12 }} />
                          </td>
                          <td style={{ padding: '5px 6px' }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => duplicateRow(row.id)} title="Duplicate" style={{ background: '#ebf8ff', border: '1px solid #90cdf4', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', color: '#2b6cb0' }}>
                                <span className="material-icons" style={{ fontSize: 14 }}>content_copy</span>
                              </button>
                              <button onClick={() => removeRow(row.id)} disabled={customRows.length === 1} title="Remove" style={{ background: customRows.length === 1 ? '#f7fafc' : '#fff5f5', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 7px', cursor: customRows.length === 1 ? 'not-allowed' : 'pointer', color: customRows.length === 1 ? '#cbd5e0' : '#e53e3e' }}>
                                <span className="material-icons" style={{ fontSize: 14 }}>delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={addRow}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 0', background: 'none', border: '1.5px dashed #76C44260', borderRadius: 9, color: '#76C442', fontWeight: 600, fontSize: 13, cursor: 'pointer', width: '100%', justifyContent: 'center' }}
                >
                  <span className="material-icons" style={{ fontSize: 18 }}>add</span> Add Row
                </button>
              </>
            )}

            {/* Entry count hint */}
            {entryCount > 0 && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: '#ebf8ff', border: '1px solid #90cdf4', borderRadius: 9, fontSize: 12, color: '#2b6cb0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-icons" style={{ fontSize: 15 }}>info</span>
                Will generate <strong>{entryCount}</strong> timetable entr{entryCount === 1 ? 'y' : 'ies'} — click Preview to check for conflicts
              </div>
            )}
          </div>
        )}

        {/* ══════════════ STEP 2: PREVIEW ══════════════ */}
        {step === 2 && (
          <div className="modal-body">
            {/* Summary cards */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, padding: '14px 18px', background: '#f0fff4', border: '1.5px solid #9ae6b4', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#276749' }}>{validCount}</div>
                <div style={{ fontSize: 11, color: '#48bb78', fontWeight: 700, marginTop: 2 }}>Valid Entries</div>
              </div>
              <div style={{ flex: 1, padding: '14px 18px', background: conflictCount > 0 ? '#fff5f5' : '#f7fafc', border: `1.5px solid ${conflictCount > 0 ? '#feb2b2' : '#e2e8f0'}`, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: conflictCount > 0 ? '#c53030' : '#a0aec0' }}>{conflictCount}</div>
                <div style={{ fontSize: 11, color: conflictCount > 0 ? '#e53e3e' : '#a0aec0', fontWeight: 700, marginTop: 2 }}>
                  Conflict{conflictCount !== 1 ? 's' : ''} (skipped)
                </div>
              </div>
              <div style={{ flex: 1, padding: '14px 18px', background: '#ebf8ff', border: '1.5px solid #90cdf4', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#2b6cb0' }}>{previewEntries.length}</div>
                <div style={{ fontSize: 11, color: '#3182ce', fontWeight: 700, marginTop: 2 }}>Total Generated</div>
              </div>
            </div>

            {conflictCount > 0 && (
              <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #f6e05e', borderRadius: 8, fontSize: 12, color: '#744210', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span className="material-icons" style={{ fontSize: 16, flexShrink: 0, color: '#d69e2e' }}>warning</span>
                <span>
                  <strong>{conflictCount}</strong> conflicting entr{conflictCount === 1 ? 'y is' : 'ies are'} highlighted in red and will be <strong>skipped</strong>.
                  Only the <strong>{validCount}</strong> valid entr{validCount === 1 ? 'y' : 'ies'} will be saved.
                </span>
              </div>
            )}

            {saveResult && (
              <div style={{
                padding: '10px 14px',
                background: saveResult.success ? '#f0fff4' : '#fff5f5',
                border: `1px solid ${saveResult.success ? '#9ae6b4' : '#feb2b2'}`,
                borderRadius: 8, fontSize: 12,
                color: saveResult.success ? '#276749' : '#c53030',
                marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span className="material-icons" style={{ fontSize: 16 }}>
                  {saveResult.success ? 'check_circle' : 'error'}
                </span>
                {saveResult.success
                  ? `${saveResult.count} timetable entr${saveResult.count === 1 ? 'y' : 'ies'} saved successfully!`
                  : `Error: ${saveResult.message}`}
              </div>
            )}

            {/* Preview table */}
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, maxHeight: 380, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 600 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: '#f7fafc' }}>
                    {['#', 'Class', 'Day', 'Subject', 'Time', 'Room', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#4a5568', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewEntries.map((entry, i) => {
                    const conflict = previewConflicts[i];
                    const sColor   = subjectColor(entry.subject);
                    const dColor   = DAY_COLOR[entry.day] || '#4a5568';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f4f8', background: conflict ? '#fff5f5' : i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                        <td style={{ padding: '8px 12px', color: '#a0aec0', fontSize: 11 }}>{i + 1}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#76C44220', color: '#276749' }}>{entry.classSection}</span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: dColor + '18', color: dColor }}>{entry.day.slice(0, 3)}</span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: sColor + '18', color: sColor }}>{entry.subject}</span>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#4a5568', whiteSpace: 'nowrap', fontSize: 11 }}>
                          {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#718096', fontSize: 11 }}>{entry.room || '—'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {conflict ? (
                            <div title={conflict} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span className="material-icons" style={{ fontSize: 15, color: '#e53e3e', flexShrink: 0 }}>error</span>
                              <span style={{ fontSize: 10, color: '#e53e3e', fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {conflict}
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span className="material-icons" style={{ fontSize: 15, color: '#48bb78' }}>check_circle</span>
                              <span style={{ fontSize: 11, color: '#48bb78', fontWeight: 600 }}>OK</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          {step === 1 ? (
            <>
              <button onClick={onClose} style={{ padding: '9px 20px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleNext}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 24px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Preview Entries
                <span className="material-icons" style={{ fontSize: 17 }}>arrow_forward</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep(1); setSaveResult(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                <span className="material-icons" style={{ fontSize: 17 }}>arrow_back</span>
                Back
              </button>
              {saveResult?.success ? (
                <button
                  onClick={onClose}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 24px', background: '#276749', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  <span className="material-icons" style={{ fontSize: 17 }}>check_circle</span>
                  Done
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || validCount === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '9px 24px',
                    background: validCount === 0 || saving ? '#a0aec0' : '#76C442',
                    color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13,
                    cursor: validCount === 0 || saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: 17 }}>{saving ? 'hourglass_empty' : 'save'}</span>
                  {saving ? 'Saving…' : `Save ${validCount} Entr${validCount === 1 ? 'y' : 'ies'}`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
