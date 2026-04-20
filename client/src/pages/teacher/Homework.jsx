import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { teacherAPI, diaryAPI, adminAPI } from '../../services/api';

const TODAY = new Date().toISOString().split('T')[0];

const emptyForm = {
  className: '', section: '', classId: '',
  subject: '', diaryDate: TODAY,
  topic: '', homework: '', description: '', remarks: '',
  imageUrl: '', imageName: '',
};

export default function Homework() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('new');
  const [toast, setToast]       = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Teacher's class-subject assignments ──────────────────────────────────
  // subjectAssignments = [{ id, classSection, subject, teacherName }]
  // Falls back to myClasses+profile if no subject assignments exist.
  const [subjectAssignments, setSubjectAssignments] = useState([]);
  const [myClasses, setMyClasses]                   = useState([]);
  const [teacherProfile, setTeacherProfile]         = useState(null);
  const [classesLoading, setClassesLoading]         = useState(true);

  useEffect(() => {
    setClassesLoading(true);
    Promise.all([
      teacherAPI.getMySubjectAssignments().catch(() => null),
      teacherAPI.getMyClasses().catch(() => null),
      teacherAPI.getMyProfile().catch(() => null),
    ]).then(([assignRes, classesRes, profileRes]) => {
      setSubjectAssignments(assignRes?.data?.data ?? []);
      setMyClasses(classesRes?.data?.data ?? []);
      setTeacherProfile(profileRes?.data?.data ?? null);
    }).finally(() => setClassesLoading(false));
  }, []);

  // Determine if a classroom is where this teacher is the Class Teacher
  const getClassRole = (cls) => {
    if (!teacherProfile) return null;
    const isPrimary = teacherProfile.primaryClassId != null
      && cls.id === teacherProfile.primaryClassId;
    return isPrimary ? 'CLASS_TEACHER' : 'SUBJECT_TEACHER';
  };

  // ── New entry form ────────────────────────────────────────────────────────
  const [form, setForm]               = useState(emptyForm);
  const [subjectInput, setSubjectInput] = useState('');   // live text in tag input
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const fileInputRef    = useRef(null);
  const subjectInputRef = useRef(null);

  // Derived: subjects as array for tag display; form.subject stays comma-joined string
  const subjectTags = form.subject ? form.subject.split(',').map(s => s.trim()).filter(Boolean) : [];

  const addSubjectTag = (raw) => {
    const val = raw.trim();
    if (!val) return;
    const existing = form.subject ? form.subject.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (existing.includes(val)) return;          // no duplicates
    const updated = [...existing, val].join(', ');
    setForm(prev => ({ ...prev, subject: updated }));
    setSubjectInput('');
  };

  const removeSubjectTag = (tag) => {
    const updated = subjectTags.filter(t => t !== tag).join(', ');
    setForm(prev => ({ ...prev, subject: updated }));
  };

  const handleSubjectKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSubjectTag(subjectInput);
    } else if (e.key === 'Backspace' && !subjectInput && subjectTags.length > 0) {
      removeSubjectTag(subjectTags[subjectTags.length - 1]);
    }
  };

  // ── Class + Subject option building ────────────────────────────────────────
  // When admin assignments exist: group by classSection so the dropdown shows
  // unique classes (not one entry per subject).  Subjects for the selected
  // class are auto-filled into the subject tag input but remain fully editable.
  const useAssignments = subjectAssignments.length > 0;

  // Map: classSection → [subject1, subject2, …]
  const assignmentSubjectMap = subjectAssignments.reduce((acc, a) => {
    const subjects = (a.subject || '').split(',').map(s => s.trim()).filter(Boolean);
    const existing = acc[a.classSection] || [];
    acc[a.classSection] = [...new Set([...existing, ...subjects])];
    return acc;
  }, {});

  const classOptions = useAssignments
    ? Object.keys(assignmentSubjectMap).map(cs => ({
        value: cs,
        label: cs,
        classSection: cs,
        subjects: assignmentSubjectMap[cs],
      }))
    : myClasses.map(cls => ({
        value: `id:${cls.id}`,
        label: `${cls.name}${cls.section ? ` – ${cls.section}` : ''}`,
        cls,
      }));

  const handleClassSelect = (e) => {
    const val = e.target.value;
    if (!val) {
      setForm(prev => ({ ...prev, className: '', section: '', classId: '', subject: '' }));
      setSubjectInput('');
      return;
    }

    if (useAssignments) {
      // val IS the classSection string (e.g. "Nursery-A")
      const opt = classOptions.find(o => o.value === val);
      if (!opt) return;
      // Split classSection on last '-' to separate name from section
      const lastDash = opt.classSection.lastIndexOf('-');
      const className = lastDash > 0 ? opt.classSection.slice(0, lastDash).trim() : opt.classSection;
      const section   = lastDash > 0 ? opt.classSection.slice(lastDash + 1).trim() : '';
      setForm(prev => ({
        ...prev,
        className,
        section,
        classId: val,
        subject: opt.subjects.join(', '),   // pre-fill all assigned subjects
      }));
      setSubjectInput('');
    } else {
      const cls = myClasses.find(c => `id:${c.id}` === val);
      if (!cls) return;
      setForm(prev => ({
        ...prev,
        className: cls.name,
        section:   cls.section || '',
        classId:   val,
        subject:   prev.subject,
      }));
    }
  };

  // Subjects assigned to the currently selected class (for hint display)
  const assignedSubjectsForClass = useAssignments && form.classId
    ? (assignmentSubjectMap[form.classId] || [])
    : [];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Only image files are allowed', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be smaller than 5 MB', 'error');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setForm(prev => ({ ...prev, imageUrl: base64, imageName: file.name }));
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.classId)                          { showToast('Please select a class', 'error'); return; }
    if (!form.subject.trim())                   { showToast('Subject is required', 'error'); return; }
    if (!form.topic.trim())                     { showToast('Topic is required', 'error'); return; }
    if (!form.homework.trim())                  { showToast('Homework is required', 'error'); return; }

    setSubmitting(true);
    try {
      await diaryAPI.create({
        ...form,
        teacherId:   user?.id,
        teacherName: user?.name,
      });
      showToast('Diary entry created successfully!');
      setForm(emptyForm);
      setSubjectInput('');
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Switch to My Entries tab and refresh
      setActiveTab('entries');
      fetchEntries();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create diary entry';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── My Entries ────────────────────────────────────────────────────────────
  const [entries, setEntries]       = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [filterSubject, setFilterSubject]   = useState('');
  const [filterDate, setFilterDate]         = useState('');
  const [editEntry, setEditEntry]   = useState(null);   // entry being edited
  const [editForm, setEditForm]     = useState({});
  const [saving, setSaving]         = useState(false);
  const [previewEntry, setPreviewEntry] = useState(null);

  const fetchEntries = async () => {
    setLoadingEntries(true);
    try {
      const res = await diaryAPI.getForTeacher();
      const data = res.data?.data ?? [];
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'entries') fetchEntries();
  }, [activeTab]);

  const filteredEntries = entries.filter(e => {
    const entrySubjects = (e.subject || '').split(',').map(s => s.trim()).filter(Boolean);
    const matchSubject  = !filterSubject || entrySubjects.includes(filterSubject);
    const matchDate     = !filterDate    || e.diaryDate === filterDate;
    return matchSubject && matchDate;
  });

  const openEdit = (entry) => {
    setEditEntry(entry);
    setEditForm({
      topic:       entry.topic       || '',
      homework:    entry.homework    || '',
      description: entry.description || '',
      remarks:     entry.remarks     || '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.topic.trim())    { showToast('Topic is required', 'error'); return; }
    if (!editForm.homework.trim()) { showToast('Homework is required', 'error'); return; }
    setSaving(true);
    try {
      await diaryAPI.updateEntry(editEntry.id, editForm);
      showToast('Entry updated successfully!');
      setEditEntry(null);
      fetchEntries();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update entry';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return d; }
  };

  return (
    <Layout pageTitle="Diary">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Diary</h1>
        <p>Create daily diary entries with topic, homework, and optional notes</p>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #f0f4f8' }}>
        {[
          { key: 'new',     label: 'New Entry',   icon: 'add_circle' },
          { key: 'entries', label: 'My Entries',  icon: 'list_alt' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: 600,
            color: activeTab === tab.key ? '#76C442' : '#718096',
            borderBottom: activeTab === tab.key ? '2px solid #76C442' : '2px solid transparent',
            marginBottom: '-2px', transition: 'all 0.2s',
          }}>
            <span className="material-icons" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── NEW ENTRY TAB ── */}
      {activeTab === 'new' && (
        <div style={{ maxWidth: '680px' }}>
          <div className="data-table-card" style={{ padding: '28px' }}>
            <form onSubmit={handleSubmit}>

              {/* Class selector — single combined dropdown */}
              {classesLoading ? (
                <div style={{ padding: '10px 0 16px', fontSize: 13, color: '#a0aec0' }}>
                  <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>hourglass_empty</span>
                  Loading your assigned classes…
                </div>
              ) : (classOptions.length === 0) ? (
                <div style={{
                  padding: '16px', marginBottom: 16, borderRadius: 10,
                  background: '#fff5f5', border: '1px solid #fed7d7',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span className="material-icons" style={{ fontSize: 20, color: '#e53e3e' }}>assignment_late</span>
                  <span style={{ fontSize: 13, color: '#c53030', fontWeight: 600 }}>
                    No classes assigned to you. Please contact your admin.
                  </span>
                </div>
              ) : (
                <div className="mb-3">
                  <label className="form-label small fw-medium">Class &amp; Section *</label>
                  <select
                    className="form-select form-select-sm"
                    value={form.classId}
                    onChange={handleClassSelect}
                    required
                  >
                    <option value="">— Select class —</option>
                    {classOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {/* Hint showing how many subjects are assigned to this class */}
                  {useAssignments && form.classId && assignedSubjectsForClass.length > 0 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#f0fff4', color: '#276749', border: '1px solid #c6f6d5' }}>
                      <span className="material-icons" style={{ fontSize: 12 }}>verified</span>
                      {assignedSubjectsForClass.length} subject{assignedSubjectsForClass.length > 1 ? 's' : ''} assigned to this class
                    </div>
                  )}
                </div>
              )}

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-medium">
                    Subject *
                    <span style={{ marginLeft: 6, fontSize: 10, color: '#a0aec0', fontWeight: 400 }}>
                      ↵ or , to add multiple
                    </span>
                  </label>

                  {/* Always an editable tag input — no restrictions */}
                  <div
                    onClick={() => subjectInputRef.current?.focus()}
                    style={{
                      minHeight: 34, padding: '4px 8px',
                      border: `1px solid ${!form.subject.trim() ? '#e2e8f0' : '#76C442'}`,
                      borderRadius: 6, background: '#fff', cursor: 'text',
                      display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {subjectTags.map(tag => (
                      <span key={tag} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                        background: '#76C44220', color: '#276749', border: '1px solid #76C44240',
                      }}>
                        {tag}
                        <button type="button"
                          onClick={ev => { ev.stopPropagation(); removeSubjectTag(tag); }}
                          style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#e53e3e', display: 'flex', lineHeight: 1 }}>
                          <span className="material-icons" style={{ fontSize: 13 }}>close</span>
                        </button>
                      </span>
                    ))}
                    <input
                      ref={subjectInputRef}
                      type="text"
                      value={subjectInput}
                      onChange={e => setSubjectInput(e.target.value)}
                      onKeyDown={handleSubjectKeyDown}
                      onBlur={() => { if (subjectInput.trim()) addSubjectTag(subjectInput); }}
                      placeholder={subjectTags.length === 0 ? 'e.g. English, Maths' : '+ add'}
                      style={{ border: 'none', outline: 'none', fontSize: 13, padding: '2px 2px', flex: 1, minWidth: 80, background: 'transparent', color: '#2d3748' }}
                    />
                  </div>

                  {/* Show assigned subjects as quick-add hints when a class is selected */}
                  {assignedSubjectsForClass.length > 0 && (
                    <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: '#a0aec0', fontWeight: 600 }}>Assigned:</span>
                      {assignedSubjectsForClass.filter(s => !subjectTags.includes(s)).map(s => (
                        <button key={s} type="button" onClick={() => addSubjectTag(s)}
                          style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, border: '1px dashed #76C442', background: 'transparent', color: '#276749', cursor: 'pointer', fontWeight: 600 }}>
                          + {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="col-6">
                  <label className="form-label small fw-medium">Date</label>
                  <input type="date" className="form-control form-control-sm"
                    value={form.diaryDate} max={TODAY}
                    onChange={e => setForm(prev => ({ ...prev, diaryDate: e.target.value }))} />
                </div>
              </div>

              {/* Topic (required) */}
              <div className="mb-3">
                <label className="form-label small fw-medium">Topic Covered *</label>
                <input type="text" className="form-control form-control-sm"
                  placeholder="e.g. Chapter 4 — Quadratic Equations"
                  value={form.topic}
                  onChange={e => setForm(prev => ({ ...prev, topic: e.target.value }))}
                  required />
              </div>

              {/* Homework (required) */}
              <div className="mb-3">
                <label className="form-label small fw-medium">Homework Assigned *</label>
                <textarea className="form-control form-control-sm" rows={3}
                  placeholder="e.g. Solve exercises 1–10 from page 78"
                  value={form.homework}
                  onChange={e => setForm(prev => ({ ...prev, homework: e.target.value }))}
                  required />
              </div>

              {/* Description (optional) */}
              <div className="mb-3">
                <label className="form-label small fw-medium">
                  Description <span style={{ color: '#a0aec0', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea className="form-control form-control-sm" rows={2}
                  placeholder="Additional notes, classwork summary..."
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
              </div>

              {/* Remarks (optional) */}
              <div className="mb-3">
                <label className="form-label small fw-medium">
                  Remarks <span style={{ color: '#a0aec0', fontWeight: 400 }}>(optional)</span>
                </label>
                <input type="text" className="form-control form-control-sm"
                  placeholder="e.g. Students should revise Chapter 3 before next class"
                  value={form.remarks}
                  onChange={e => setForm(prev => ({ ...prev, remarks: e.target.value }))} />
              </div>

              {/* Image upload (optional) */}
              <div className="mb-4">
                <label className="form-label small fw-medium">
                  Diary Photo <span style={{ color: '#a0aec0', fontWeight: 400 }}>(optional, max 5 MB)</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '16px',
                    textAlign: 'center', cursor: 'pointer',
                    background: imagePreview ? '#f0fff4' : '#fafafa',
                  }}
                >
                  {imagePreview ? (
                    <div>
                      <img src={imagePreview} alt="Preview"
                        style={{ maxHeight: '140px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
                      <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#76C442' }}>
                        {form.imageName} — click to change
                      </p>
                    </div>
                  ) : (
                    <>
                      <span className="material-icons" style={{ fontSize: '36px', color: '#cbd5e0' }}>add_photo_alternate</span>
                      <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#a0aec0' }}>Click to upload (optional)</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*"
                  style={{ display: 'none' }} onChange={handleImageChange} />
              </div>

              <button type="submit" disabled={submitting}
                style={{
                  display: 'block', width: '100%', padding: '11px',
                  background: '#76C442', border: 'none', borderRadius: '10px',
                  color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                }}>
                {submitting ? 'Saving…' : 'Save Diary Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MY ENTRIES TAB ── */}
      {activeTab === 'entries' && (
        <div>
          {/* Filters */}
          <div className="data-table-card" style={{ marginBottom: '20px' }}>
            <div className="search-filter-bar">
              <select className="filter-select" value={filterSubject}
                onChange={e => setFilterSubject(e.target.value)}>
                <option value="">All Subjects</option>
                {[...new Set(entries.flatMap(e =>
                  (e.subject || '').split(',').map(s => s.trim()).filter(Boolean)
                ))].sort().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="date" className="filter-select" value={filterDate}
                max={TODAY}
                onChange={e => setFilterDate(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
              {filterDate && (
                <button onClick={() => setFilterDate('')}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff5f5', color: '#e53e3e', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                  Clear Date
                </button>
              )}
              <button onClick={fetchEntries}
                style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#76C44215', color: '#276749', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="material-icons" style={{ fontSize: 16 }}>refresh</span> Refresh
              </button>
            </div>
          </div>

          {loadingEntries ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#a0aec0' }}>
              <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>hourglass_empty</span>
              Loading…
            </div>
          ) : filteredEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#a0aec0' }}>
              <span className="material-icons" style={{ fontSize: 56, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>menu_book</span>
              <h3 style={{ color: '#a0aec0', margin: '0 0 8px' }}>No diary entries found</h3>
              <p style={{ margin: 0, fontSize: 13 }}>
                {entries.length === 0 ? 'Create your first entry using the New Entry tab' : 'Try clearing the filters'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {filteredEntries.map(entry => (
                <div key={entry.id} className="data-table-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

                    {/* Left: image or icon */}
                    <div style={{
                      width: 56, height: 56, borderRadius: 12, flexShrink: 0,
                      background: '#76C44215', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', cursor: entry.imageUrl ? 'pointer' : 'default',
                    }} onClick={() => entry.imageUrl && setPreviewEntry(entry)}>
                      {entry.imageUrl
                        ? <img src={entry.imageUrl} alt="diary"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span className="material-icons" style={{ color: '#76C442', fontSize: 26 }}>menu_book</span>
                      }
                    </div>

                    {/* Middle: content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#2d3748', fontSize: 15 }}>
                          {entry.subject || 'General'}
                        </span>
                        <span style={{ fontSize: 12, color: '#a0aec0' }}>
                          Class {entry.className}{entry.section ? ` - ${entry.section}` : ''}
                        </span>
                        <span style={{ fontSize: 12, color: '#a0aec0', marginLeft: 'auto' }}>
                          {fmtDate(entry.diaryDate)}
                        </span>
                      </div>

                      <div style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Topic: </span>
                        <span style={{ fontSize: 13, color: '#2d3748' }}>{entry.topic}</span>
                      </div>
                      <div style={{ marginBottom: entry.description || entry.remarks ? 6 : 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Homework: </span>
                        <span style={{ fontSize: 13, color: '#2d3748' }}>{entry.homework}</span>
                      </div>
                      {entry.description && (
                        <div style={{ fontSize: 12, color: '#718096', marginBottom: 4 }}>
                          {entry.description.length > 100 ? entry.description.slice(0, 100) + '…' : entry.description}
                        </div>
                      )}
                      {entry.remarks && (
                        <div style={{ fontSize: 12, color: '#805ad5', fontStyle: 'italic' }}>
                          Remark: {entry.remarks}
                        </div>
                      )}
                    </div>

                    {/* Right: edit button */}
                    <button onClick={() => openEdit(entry)}
                      style={{ border: 'none', background: '#ebf8ff', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: '#2b6cb0', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <span className="material-icons" style={{ fontSize: 16 }}>edit</span> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#2d3748' }}>Edit Diary Entry</div>
                <div style={{ fontSize: 12, color: '#a0aec0' }}>
                  {editEntry.subject || 'General'} — {fmtDate(editEntry.diaryDate)} — Class {editEntry.className}{editEntry.section ? ` - ${editEntry.section}` : ''}
                </div>
              </div>
              <button onClick={() => setEditEntry(null)}
                style={{ border: 'none', background: '#fff5f5', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#e53e3e' }}>
                <span className="material-icons" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <form onSubmit={handleSaveEdit} style={{ padding: '24px' }}>
              <div className="mb-3">
                <label className="form-label small fw-medium">Topic Covered *</label>
                <input type="text" className="form-control form-control-sm"
                  value={editForm.topic}
                  onChange={e => setEditForm(prev => ({ ...prev, topic: e.target.value }))}
                  required />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-medium">Homework Assigned *</label>
                <textarea className="form-control form-control-sm" rows={3}
                  value={editForm.homework}
                  onChange={e => setEditForm(prev => ({ ...prev, homework: e.target.value }))}
                  required />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-medium">Description <span style={{ color: '#a0aec0', fontWeight: 400 }}>(optional)</span></label>
                <textarea className="form-control form-control-sm" rows={2}
                  value={editForm.description}
                  onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))} />
              </div>
              <div className="mb-4">
                <label className="form-label small fw-medium">Remarks <span style={{ color: '#a0aec0', fontWeight: 400 }}>(optional)</span></label>
                <input type="text" className="form-control form-control-sm"
                  value={editForm.remarks}
                  onChange={e => setEditForm(prev => ({ ...prev, remarks: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditEntry(null)}
                  style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: '#76C442', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {previewEntry && (
        <div onClick={() => setPreviewEntry(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', maxWidth: 700, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f4f8' }}>
              <div style={{ fontWeight: 700, color: '#2d3748' }}>
                {previewEntry.subject || 'General'} — {fmtDate(previewEntry.diaryDate)}
              </div>
              <button onClick={() => setPreviewEntry(null)}
                style={{ border: 'none', background: '#fff5f5', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#e53e3e' }}>
                <span className="material-icons" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <img src={previewEntry.imageUrl} alt="Diary full"
              style={{ width: '100%', maxHeight: 500, objectFit: 'contain', background: '#f7fafc' }} />
          </div>
        </div>
      )}
    </Layout>
  );
}
