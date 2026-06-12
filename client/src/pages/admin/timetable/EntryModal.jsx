import React from 'react';
import { DAYS, DAY_COLOR, inputStyle } from './constants';
import { Field, Col2 } from './FormControls';

export default function EntryModal({ editId, form, errors, saving, classes, teacherOptions, set, toggleDay, onClose, onSave }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ width: 540, maxHeight: '90vh', overflowY: 'auto' }}
           onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{editId ? 'Edit Timetable Entry' : 'Add Timetable Entry'}</h3>
          <button className="modal-close" onClick={onClose}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '12px', border: `1.5px solid ${errors.days ? '#e53e3e' : 'var(--border-strong)'}`, borderRadius: '8px', background: 'var(--surface-alt)' }}>
              {DAYS.map(day => {
                const checked = form.days.includes(day);
                const color   = DAY_COLOR[day];
                return (
                  <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', border: `1.5px solid ${checked ? color : 'var(--border-strong)'}`, background: checked ? color + '15' : 'var(--surface)', cursor: 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleDay(day)} style={{ accentColor: color, width: 15, height: 15, cursor: 'pointer' }} />
                    <span style={{ fontSize: '12px', fontWeight: checked ? 700 : 500, color: checked ? color : 'var(--text-secondary)' }}>{day}</span>
                  </label>
                );
              })}
            </div>
            {!editId && form.days.length > 0 && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#0de1e8', fontWeight: 600 }}>
                {form.days.length} day{form.days.length > 1 ? 's' : ''} selected — will create {form.days.length} entr{form.days.length > 1 ? 'ies' : 'y'}
              </div>
            )}
          {!editId && form.days.length > 1 && (
            <div style={{ marginTop: 6, padding: '7px 10px', background: '#fffbeb', border: '1px solid #f6e05e', borderRadius: 7, fontSize: 11, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-icons" style={{ fontSize: 14, flexShrink: 0 }}>info</span>
              All days share the same time. For <strong>different times on different days</strong>, use <strong>Bulk Assign → Custom Rows</strong>.
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
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 9, background: 'var(--surface)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onSave} disabled={saving} style={{ padding: '9px 24px', background: saving ? '#a0aec0' : '#0de1e8', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving...' : (editId ? 'Update Entry' : `Add ${form.days.length > 1 ? `${form.days.length} Entries` : 'Entry'}`)}
          </button>
        </div>
      </div>
    </div>
  );
}
