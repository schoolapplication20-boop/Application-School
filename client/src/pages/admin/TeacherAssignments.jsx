import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { adminAPI } from '../../services/api';

const emptyRow = () => ({ classSection: '', subject: '' });

// Inline tag input for subjects within each assignment row
function SubjectTagCell({ value, onChange }) {
  const [inputVal, setInputVal] = useState('');
  const ref = useRef(null);
  const tags = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const add = (raw) => {
    const v = raw.trim();
    if (!v || tags.includes(v)) { setInputVal(''); return; }
    onChange([...tags, v].join(', '));
    setInputVal('');
  };
  const remove = (tag) => onChange(tags.filter(t => t !== tag).join(', '));
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(inputVal); }
    else if (e.key === 'Backspace' && !inputVal && tags.length > 0) remove(tags[tags.length - 1]);
  };

  return (
    <div onClick={() => ref.current?.focus()}
      style={{ flex: 1, minHeight: 34, padding: '3px 8px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'text', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {tags.map(tag => (
        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#76C44220', color: '#276749', border: '1px solid #76C44240' }}>
          {tag}
          <button type="button" onClick={e => { e.stopPropagation(); remove(tag); }}
            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#e53e3e', lineHeight: 1 }}>
            <span className="material-icons" style={{ fontSize: 12 }}>close</span>
          </button>
        </span>
      ))}
      <input ref={ref} type="text" value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (inputVal.trim()) add(inputVal); }}
        placeholder={tags.length === 0 ? 'Subject (↵ or , to add)' : '+ add'}
        style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1, minWidth: 80, background: 'transparent', color: '#2d3748', padding: '2px 0' }} />
    </div>
  );
}

export default function TeacherAssignments() {
  const [toast, setToast]         = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [teachers, setTeachers]   = useState([]);
  const [classes, setClasses]     = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [rows, setRows]           = useState([emptyRow()]);
  const [existing, setExisting]   = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    Promise.all([
      adminAPI.getTeachers().catch(() => null),
      adminAPI.getClasses().catch(() => null),
    ]).then(([tRes, cRes]) => {
      setTeachers(tRes?.data?.data?.content ?? tRes?.data?.data ?? []);
      setClasses(cRes?.data?.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!selectedTeacherId) { setExisting([]); return; }
    setLoadingExisting(true);
    adminAPI.getTeacherAssignments(selectedTeacherId)
      .then(r => setExisting(r.data?.data ?? []))
      .catch(() => setExisting([]))
      .finally(() => setLoadingExisting(false));
  }, [selectedTeacherId]);

  const classOptions = classes.map(c => ({
    value: c.section ? `${c.name}-${c.section}` : c.name,
    label: c.section ? `${c.name} - ${c.section}` : c.name,
  }));

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));

  const updateRow = (idx, field, value) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId) { showToast('Please select a teacher', 'error'); return; }
    const valid = rows.filter(r => r.classSection.trim() && r.subject.trim());
    if (valid.length === 0) { showToast('Add at least one class-subject row', 'error'); return; }

    setSubmitting(true);
    try {
      const res = await adminAPI.saveTeacherAssignments({
        teacherId: Number(selectedTeacherId),
        assignments: valid,
      });
      showToast('Assignments saved successfully!');
      setExisting(res.data?.data ?? []);
      setRows([emptyRow()]);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save assignments', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminAPI.deleteTeacherAssignment(id);
      setExisting(prev => prev.filter(a => a.id !== id));
      showToast('Assignment removed');
    } catch {
      showToast('Failed to remove assignment', 'error');
    }
  };

  const selectedTeacher = teachers.find(t => String(t.id) === String(selectedTeacherId));

  return (
    <Layout pageTitle="Subject Assignments">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Teacher Subject Assignments</h1>
        <p>Assign a teacher to one or more classes with a specific subject for each class</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Left: Assign Form ── */}
        <div className="data-table-card" style={{ padding: 28 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#2d3748' }}>
            New / Update Assignments
          </h3>

          <form onSubmit={handleSubmit}>
            {/* Teacher selector */}
            <div className="mb-4">
              <label className="form-label small fw-medium">Select Teacher *</label>
              <select
                className="form-select form-select-sm"
                value={selectedTeacherId}
                onChange={e => { setSelectedTeacherId(e.target.value); setRows([emptyRow()]); }}
                required
              >
                <option value="">— Choose a teacher —</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.subject ? ` (${t.subject})` : ''}
                  </option>
                ))}
              </select>
              {selectedTeacher && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#718096' }}>
                  Employee ID: {selectedTeacher.employeeId || '—'} &nbsp;·&nbsp;
                  Dept: {selectedTeacher.department || '—'}
                </div>
              )}
            </div>

            {/* Class-subject rows */}
            <label className="form-label small fw-medium">Class → Subject Mappings *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {rows.map((row, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* Class dropdown */}
                  <select
                    className="form-select form-select-sm"
                    style={{ flex: 1 }}
                    value={row.classSection}
                    onChange={e => updateRow(idx, 'classSection', e.target.value)}
                    required
                  >
                    <option value="">— Class —</option>
                    {classOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>

                  {/* Multi-subject tag input */}
                  <SubjectTagCell
                    value={row.subject}
                    onChange={v => updateRow(idx, 'subject', v)}
                  />

                  {/* Remove row */}
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(idx)}
                      style={{ border: 'none', background: '#fff5f5', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: '#e53e3e', flexShrink: 0 }}>
                      <span className="material-icons" style={{ fontSize: 16 }}>remove_circle_outline</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button type="button" onClick={addRow}
              style={{ marginBottom: 20, border: '1.5px dashed #76C442', background: 'transparent', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', color: '#276749', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-icons" style={{ fontSize: 16 }}>add_circle_outline</span>
              Add another class
            </button>

            <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#92400e' }}>
              <span className="material-icons" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>info</span>
              Saving will replace all existing assignments for the selected teacher.
            </div>

            <button type="submit" disabled={submitting || !selectedTeacherId}
              style={{ width: '100%', padding: '11px', background: submitting ? '#a0aec0' : '#76C442', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Saving…' : 'Save Assignments'}
            </button>
          </form>
        </div>

        {/* ── Right: Existing Assignments ── */}
        <div className="data-table-card" style={{ padding: 28 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#2d3748' }}>
            {selectedTeacherId
              ? `Current Assignments — ${selectedTeacher?.name || ''}`
              : 'Select a teacher to view assignments'}
          </h3>

          {!selectedTeacherId ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#a0aec0' }}>
              <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 10 }}>person_search</span>
              <p style={{ margin: 0, fontSize: 13 }}>Choose a teacher on the left</p>
            </div>
          ) : loadingExisting ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#a0aec0', fontSize: 13 }}>Loading…</div>
          ) : existing.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#a0aec0' }}>
              <span className="material-icons" style={{ fontSize: 44, display: 'block', marginBottom: 10 }}>assignment_late</span>
              <p style={{ margin: 0, fontSize: 13 }}>No assignments yet for this teacher</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {existing.map(a => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: 10,
                  background: '#f7fafc', border: '1px solid #e2e8f0',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#2d3748', marginBottom: 4 }}>{a.classSection}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(a.subject || '').split(',').map(s => s.trim()).filter(Boolean).map(s => (
                        <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#76C44220', color: '#276749', fontWeight: 600, border: '1px solid #76C44240' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(a.id)}
                    style={{ border: 'none', background: '#fff5f5', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#e53e3e', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                    <span className="material-icons" style={{ fontSize: 14 }}>delete_outline</span>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
