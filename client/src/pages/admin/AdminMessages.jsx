import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../../components/Layout';
import { messageAPI, adminAPI } from '../../services/api';
import CategoryBadge from '../../components/CategoryBadge';
import { sortClasses } from '../../utils/classOrder';
import { MESSAGE_CATEGORIES, formatMessageDateTime } from '../../utils/messageFormat';
import { useToast } from '../../context/ToastContext';

const empty = () => ({
  title: '', content: '', category: 'GENERAL',
  sendTo: 'school',         // 'school' | 'class' | 'student'
  classSection: '',
  isImportant: false,
  selectedStudent: null,    // { id, name, className, rollNumber, admissionNumber }
});

const SEND_TARGETS = [
  { key: 'school',  icon: '🏫', label: 'Entire School'    },
  { key: 'class',   icon: '🎓', label: 'Specific Class'   },
  { key: 'student', icon: '👤', label: 'Specific Student' },
];

export default function AdminMessages() {
  const [broadcasts,  setBroadcasts]  = useState([]);
  const [classList,   setClassList]   = useState([]);
  const [form,        setForm]        = useState(empty());
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const [showForm,    setShowForm]    = useState(false);

  // Student search state
  const [studentQuery,   setStudentQuery]   = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [searching,      setSearching]      = useState(false);
  const searchTimer = useRef(null);

  const showToast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [bcRes, clRes] = await Promise.all([
      messageAPI.getBroadcasts().catch(() => null),
      adminAPI.getClasses().catch(() => null),
    ]);
    setBroadcasts(bcRes?.data?.data ?? []);
    const classes = (clRes?.data?.data ?? []).slice().sort(sortClasses);
    setClassList(classes.map(c => ({
      id: c.id,
      label: c.name + (c.section ? ` - ${c.section}` : ''),
      classSection: c.name + (c.section ? `-${c.section}` : ''),
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Debounced student search
  useEffect(() => {
    if (form.sendTo !== 'student') { setStudentResults([]); return; }
    if (studentQuery.length < 2) { setStudentResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await adminAPI.searchStudentsForFee(studentQuery, '', '');
        setStudentResults(res.data?.data ?? []);
      } catch { setStudentResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [studentQuery, form.sendTo]);

  const selectStudent = (s) => {
    setForm(f => ({ ...f, selectedStudent: s }));
    setStudentQuery(s.name);
    setStudentResults([]);
  };

  const clearStudent = () => {
    setForm(f => ({ ...f, selectedStudent: null }));
    setStudentQuery('');
    setStudentResults([]);
  };

  const handleSend = async () => {
    if (!form.title.trim())   { showToast('Title is required', 'error'); return; }
    if (!form.content.trim()) { showToast('Message content is required', 'error'); return; }
    if (form.sendTo === 'class'   && !form.classSection)      { showToast('Select a class', 'error'); return; }
    if (form.sendTo === 'student' && !form.selectedStudent)   { showToast('Select a student', 'error'); return; }

    setSending(true);
    try {
      const payload = {
        title:       form.title.trim(),
        content:     form.content.trim(),
        category:    form.category,
        isImportant: form.isImportant,
        isSchoolWide: form.sendTo === 'school',
        classSection: form.sendTo === 'class' ? form.classSection : null,
        ...(form.sendTo === 'student' && { targetStudentId: form.selectedStudent.id }),
      };
      const res = await messageAPI.sendBroadcast(payload);
      if (res.data?.success) {
        showToast(
          form.sendTo === 'student'
            ? `Message sent to ${form.selectedStudent.name}`
            : 'Message sent successfully'
        );
        setForm(empty());
        setStudentQuery('');
        setStudentResults([]);
        setShowForm(false);
        loadData();
      } else {
        showToast(res.data?.message || 'Failed to send', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const openForm = () => {
    setForm(empty());
    setStudentQuery('');
    setStudentResults([]);
    setShowForm(true);
  };

  const closeForm = () => {
    setForm(empty());
    setStudentQuery('');
    setStudentResults([]);
    setShowForm(false);
  };

  const audienceLabel = (msg) => {
    if (msg.targetStudentId) return '👤 Direct Message';
    if (msg.isSchoolWide)    return '🏫 School-wide';
    return `🎓 ${msg.classSection}`;
  };

  return (
    <Layout pageTitle="Messages">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span className="material-icons" style={{ fontSize: 28, color: '#4f46e5' }}>campaign</span>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>Messages</h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
            Send announcements to the school, a class, or directly to a student
          </p>
        </div>
        <button
          onClick={openForm}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          <span className="material-icons" style={{ fontSize: 18 }}>add</span>
          New Message
        </button>
      </div>

      {/* Compose modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 580, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Compose Message</h2>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-secondary)' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Send To — 3 targets */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Send to</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {SEND_TARGETS.map(t => (
                    <button key={t.key}
                      onClick={() => {
                        setForm(f => ({ ...f, sendTo: t.key, classSection: '', selectedStudent: null }));
                        setStudentQuery(''); setStudentResults([]);
                      }}
                      style={{
                        flex: 1, padding: '9px 6px',
                        border: `2px solid ${form.sendTo === t.key ? '#4f46e5' : 'var(--border-strong)'}`,
                        borderRadius: 8,
                        background: form.sendTo === t.key ? '#eef2ff' : 'var(--surface)',
                        color: form.sendTo === t.key ? '#4f46e5' : 'var(--text-secondary)',
                        fontWeight: 600, cursor: 'pointer', fontSize: 12, textAlign: 'center',
                      }}>
                      <div style={{ fontSize: 18 }}>{t.icon}</div>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class picker */}
              {form.sendTo === 'class' && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Class *</label>
                  <select
                    value={form.classSection}
                    onChange={e => setForm(f => ({ ...f, classSection: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 14, outline: 'none' }}>
                    <option value="">— Select class —</option>
                    {classList.map(c => <option key={c.id} value={c.classSection}>{c.label}</option>)}
                  </select>
                </div>
              )}

              {/* Student search */}
              {form.sendTo === 'student' && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Student * <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(search by name or admission no.)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${form.selectedStudent ? '#4f46e5' : 'var(--border-strong)'}`, borderRadius: 8, overflow: 'hidden', background: form.selectedStudent ? '#eef2ff' : 'var(--surface)' }}>
                      <span className="material-icons" style={{ padding: '0 10px', color: 'var(--text-muted)', fontSize: 18 }}>search</span>
                      <input
                        value={studentQuery}
                        onChange={e => { setStudentQuery(e.target.value); if (form.selectedStudent) clearStudent(); }}
                        placeholder="Type student name or admission no…"
                        style={{ flex: 1, padding: '9px 0', border: 'none', outline: 'none', fontSize: 14, background: 'transparent' }}
                      />
                      {form.selectedStudent && (
                        <button onClick={clearStudent} style={{ padding: '0 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', fontSize: 18, lineHeight: 1 }}>✕</button>
                      )}
                      {searching && <span style={{ padding: '0 12px', fontSize: 12, color: 'var(--text-muted)' }}>…</span>}
                    </div>

                    {/* Search results dropdown */}
                    {studentResults.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 10, maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
                        {studentResults.map(s => (
                          <div key={s.id}
                            onMouseDown={() => selectStudent(s)}
                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                              {s.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{s.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {s.className}{s.section ? ` - ${s.section}` : ''} · Roll: {s.rollNumber || '—'} · {s.admissionNumber || ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Selected student pill */}
                    {form.selectedStudent && (
                      <div style={{ marginTop: 8, padding: '8px 12px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="material-icons" style={{ color: '#4f46e5', fontSize: 18 }}>person</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#3730a3' }}>{form.selectedStudent.name}</div>
                          <div style={{ fontSize: 11, color: '#6366f1' }}>
                            {form.selectedStudent.className}{form.selectedStudent.section ? ` - ${form.selectedStudent.section}` : ''}
                            {form.selectedStudent.rollNumber ? ` · Roll: ${form.selectedStudent.rollNumber}` : ''}
                          </div>
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: 12, background: '#4f46e5', color: '#fff', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>Selected</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder={form.sendTo === 'student' ? `e.g. Fee reminder for ${form.selectedStudent?.name || 'student'}` : 'Message title…'}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {/* Category + Important */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 14, outline: 'none' }}>
                    {MESSAGE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.isImportant} onChange={e => setForm(f => ({ ...f, isImportant: e.target.checked }))} />
                    <span style={{ color: '#e53e3e', fontWeight: 600 }}>Important</span>
                  </label>
                </div>
              </div>

              {/* Content */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Message *</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Type your message here…"
                  maxLength={5000}
                  rows={5}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {/* Preview summary */}
              {(form.sendTo === 'school' || (form.sendTo === 'class' && form.classSection) || (form.sendTo === 'student' && form.selectedStudent)) && (
                <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#276749' }}>
                  ✅ {form.sendTo === 'school'   ? 'Will be sent to all students and parents in the school'
                     : form.sendTo === 'class'   ? `Will be sent to all students in ${classList.find(c => c.classSection === form.classSection)?.label || form.classSection}`
                     : `Will be sent directly to ${form.selectedStudent.name} (${form.selectedStudent.className})`}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
                <button onClick={closeForm}
                  style={{ padding: '10px 20px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleSend} disabled={sending}
                  style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#4f46e5', color: '#fff', fontSize: 14, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1 }}>
                  {sending ? 'Sending…' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sent messages list */}
      <div style={{ background: 'var(--surface)', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Sent Messages</h2>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : broadcasts.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 8 }}>campaign</span>
            No messages sent yet
          </div>
        ) : broadcasts.map(msg => (
          <div key={msg.id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Icon */}
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: msg.targetStudentId ? '#eef2ff' : msg.isSchoolWide ? '#fefce8' : '#f0fff4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-icons" style={{ fontSize: 18, color: msg.targetStudentId ? '#4f46e5' : msg.isSchoolWide ? '#b45309' : '#276749' }}>
                {msg.targetStudentId ? 'person' : msg.isSchoolWide ? 'campaign' : 'groups'}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                {msg.isImportant && <span className="material-icons" style={{ fontSize: 16, color: '#e53e3e' }}>priority_high</span>}
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{msg.title}</span>
                <CategoryBadge category={msg.category} />
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{msg.content}</p>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ padding: '2px 8px', borderRadius: 12, background: msg.targetStudentId ? '#eef2ff' : msg.isSchoolWide ? '#fefce8' : '#f0fff4', color: msg.targetStudentId ? '#4f46e5' : msg.isSchoolWide ? '#b45309' : '#276749', fontWeight: 600, fontSize: 11 }}>
                  {audienceLabel(msg)}
                </span>
                <span>·</span>
                <span>{msg.senderName}</span>
                <span>·</span>
                <span>{formatMessageDateTime(msg.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
