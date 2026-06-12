import React, { useState } from 'react';
import { timetableAPI } from '../../../services/api';
import { formatTime } from '../../../services/timetableService';
import { DAYS, DAY_COLOR, PREDEFINED_PERIODS, subjectColor, getEntryConflict, inputStyle } from './constants';
import { Field } from './FormControls';

export default function BulkAssignModal({ teachers, classes, entries, onSave, onClose }) {
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
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
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
                        flex: 1, padding: '9px 0', border: `2px solid ${mode === m.key ? '#4361ee' : 'var(--border-strong)'}`,
                        borderRadius: 9, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                        background: mode === m.key ? '#4361ee12' : 'var(--surface)',
                        color: mode === m.key ? '#4361ee' : 'var(--text-secondary)',
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
                  <div style={{ border: `1.5px solid ${errors.classes ? '#e53e3e' : 'var(--border-strong)'}`, borderRadius: 9, padding: 12, background: 'var(--surface-alt)' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                      <button
                        onClick={() => { setSelClasses([...classes]); setErrors(p => ({ ...p, classes: '' })); }}
                        style={{ fontSize: 11, fontWeight: 600, color: '#0de1e8', background: 'none', border: '1px solid #0de1e850', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
                      >Select All</button>
                      <button
                        onClick={() => setSelClasses([])}
                        style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
                      >Clear</button>
                      {selClasses.length > 0 && (
                        <span style={{ fontSize: 11, color: '#0de1e8', fontWeight: 700, marginLeft: 'auto' }}>
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
                            borderRadius: 7, border: `1.5px solid ${checked ? '#0de1e8' : 'var(--border-strong)'}`,
                            background: checked ? '#0de1e815' : 'var(--surface)', cursor: 'pointer', userSelect: 'none',
                          }}>
                            <input type="checkbox" checked={checked}
                              onChange={() => { toggleClass(cls); setErrors(p => ({ ...p, classes: '' })); }}
                              style={{ accentColor: '#0de1e8', width: 13, height: 13 }} />
                            <span style={{ fontSize: 12, fontWeight: checked ? 700 : 500, color: checked ? '#276749' : 'var(--text-secondary)' }}>{cls}</span>
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
                    padding: 12, border: `1.5px solid ${errors.days ? '#e53e3e' : 'var(--border-strong)'}`,
                    borderRadius: 9, background: 'var(--surface-alt)',
                  }}>
                    {DAYS.map(day => {
                      const checked = selDays.includes(day);
                      const color   = DAY_COLOR[day];
                      return (
                        <label key={day} style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          padding: '8px 4px', borderRadius: 8,
                          border: `1.5px solid ${checked ? color : 'var(--border-strong)'}`,
                          background: checked ? color + '15' : 'var(--surface)', cursor: 'pointer', userSelect: 'none',
                        }}>
                          <input type="checkbox" checked={checked}
                            onChange={() => { toggleSelDay(day); setErrors(p => ({ ...p, days: '' })); }}
                            style={{ accentColor: color, width: 14, height: 14 }} />
                          <span style={{ fontSize: 10, fontWeight: checked ? 700 : 500, color: checked ? color : 'var(--text-secondary)' }}>
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
                      style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
                    >Weekdays Only</button>
                  </div>
                </Field>

                {/* Time Slots */}
                <Field label="Time Slots *" error={errors.timeSlots}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, background: 'var(--surface-alt)', borderRadius: 8, padding: 4, border: '1px solid var(--border-strong)' }}>
                    {[['predefined', 'Predefined Periods'], ['custom', 'Custom Times']].map(([m, label]) => (
                      <button key={m} onClick={() => { setTimeMode(m); setErrors(p => ({ ...p, timeSlots: '' })); }} style={{
                        flex: 1, padding: '7px 0', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                        background: timeMode === m ? '#4361ee' : 'transparent',
                        color: timeMode === m ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                      }}>{label}</button>
                    ))}
                  </div>

                  {timeMode === 'predefined' ? (
                    <>
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6,
                        padding: 12, border: `1.5px solid ${errors.timeSlots ? '#e53e3e' : 'var(--border-strong)'}`,
                        borderRadius: 9, background: 'var(--surface-alt)',
                      }}>
                        {PREDEFINED_PERIODS.map((p, i) => {
                          const checked = selPeriods.includes(i);
                          return (
                            <label key={i} style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                              borderRadius: 8, border: `1.5px solid ${checked ? '#3182ce' : 'var(--border-strong)'}`,
                              background: checked ? '#ebf8ff' : 'var(--surface)', cursor: 'pointer', userSelect: 'none',
                            }}>
                              <input type="checkbox" checked={checked}
                                onChange={() => { togglePeriod(i); setErrors(pp => ({ ...pp, timeSlots: '' })); }}
                                style={{ accentColor: '#3182ce', width: 14, height: 14 }} />
                              <div>
                                <div style={{ fontSize: 12, fontWeight: checked ? 700 : 600, color: checked ? '#2b6cb0' : 'var(--text-secondary)' }}>{p.label}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatTime(p.startTime)} – {formatTime(p.endTime)}</div>
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
                          style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
                        >Clear</button>
                      </div>
                    </>
                  ) : (
                    <div>
                      {customSlots.map((slot, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 3 }}>Start Time</div>
                            <input type="time" value={slot.startTime}
                              onChange={e => { updateSlot(i, 'startTime', e.target.value); setErrors(p => ({ ...p, timeSlots: '' })); }}
                              style={inputStyle(false)} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 3 }}>End Time</div>
                            <input type="time" value={slot.endTime}
                              onChange={e => { updateSlot(i, 'endTime', e.target.value); setErrors(p => ({ ...p, timeSlots: '' })); }}
                              style={inputStyle(false)} />
                          </div>
                          <button
                            onClick={() => removeSlot(i)}
                            disabled={customSlots.length === 1}
                            style={{ padding: '9px 10px', background: 'none', border: '1px solid var(--border-strong)', borderRadius: 8, cursor: customSlots.length === 1 ? 'not-allowed' : 'pointer', color: customSlots.length === 1 ? 'var(--text-muted)' : '#e53e3e' }}
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

                {selDays.length > 1 && getTimeSlots().length > 0 && (
                  <div style={{ padding: '9px 12px', background: '#fffbeb', border: '1px solid #f6e05e', borderRadius: 8, fontSize: 12, color: '#92400e', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                    <span className="material-icons" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>info</span>
                    <span>Uniform mode applies the <strong>same time slot to every selected day</strong>. To set <strong>different times per day</strong>, switch to <strong>Custom Rows</strong> mode above.</span>
                  </div>
                )}
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
                <div style={{ overflowX: 'auto', border: '1.5px solid var(--border-strong)', borderRadius: 10, marginBottom: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 620 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-alt)' }}>
                        {['Class *', 'Day *', 'Subject *', 'Start *', 'End *', 'Room', ''].map((h, i) => (
                          <th key={i} style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border-strong)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customRows.map((row) => (
                        <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
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
                              <button onClick={() => removeRow(row.id)} disabled={customRows.length === 1} title="Remove" style={{ background: customRows.length === 1 ? 'var(--surface-alt)' : '#fff5f5', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '5px 7px', cursor: customRows.length === 1 ? 'not-allowed' : 'pointer', color: customRows.length === 1 ? 'var(--text-muted)' : '#e53e3e' }}>
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
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 0', background: 'none', border: '1.5px dashed #0de1e860', borderRadius: 9, color: '#0de1e8', fontWeight: 600, fontSize: 13, cursor: 'pointer', width: '100%', justifyContent: 'center' }}
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
              <div style={{ flex: 1, padding: '14px 18px', background: conflictCount > 0 ? '#fff5f5' : 'var(--surface-alt)', border: `1.5px solid ${conflictCount > 0 ? '#feb2b2' : 'var(--border-strong)'}`, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: conflictCount > 0 ? '#c53030' : 'var(--text-muted)' }}>{conflictCount}</div>
                <div style={{ fontSize: 11, color: conflictCount > 0 ? '#e53e3e' : 'var(--text-muted)', fontWeight: 700, marginTop: 2 }}>
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
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-strong)', borderRadius: 10, maxHeight: 380, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 600 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: 'var(--surface-alt)' }}>
                    {['#', 'Class', 'Day', 'Subject', 'Time', 'Room', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border-strong)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewEntries.map((entry, i) => {
                    const conflict = previewConflicts[i];
                    const sColor   = subjectColor(entry.subject);
                    const dColor   = DAY_COLOR[entry.day] || '#4a5568';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: conflict ? '#fff5f5' : i % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)' }}>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: '#0de1e820', color: '#276749' }}>{entry.classSection}</span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: dColor + '18', color: dColor }}>{entry.day.slice(0, 3)}</span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: sColor + '18', color: sColor }}>{entry.subject}</span>
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: 11 }}>
                          {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 11 }}>{entry.room || '—'}</td>
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
              <button onClick={onClose} style={{ padding: '9px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 9, background: 'var(--surface)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
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
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 9, background: 'var(--surface)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
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
                    background: validCount === 0 || saving ? '#a0aec0' : '#0de1e8',
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
