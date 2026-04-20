import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { messageAPI, teacherAPI, adminAPI } from '../../services/api';

const CATEGORIES = ['GENERAL', 'ACADEMIC', 'ANNOUNCEMENT', 'EXAM', 'FEE', 'URGENT'];

const categoryColor = (cat) => {
  switch (cat) {
    case 'URGENT':       return { bg: '#fff5f5', color: '#c53030' };
    case 'EXAM':         return { bg: '#faf5ff', color: '#6b46c1' };
    case 'FEE':          return { bg: '#fffaf0', color: '#c05621' };
    case 'ACADEMIC':     return { bg: '#f0fff4', color: '#276749' };
    case 'ANNOUNCEMENT': return { bg: '#ebf8ff', color: '#2b6cb0' };
    default:             return { bg: '#f7fafc', color: '#4a5568' };
  }
};

const formatDate = (dt) => {
  if (!dt) return '';
  return new Date(dt).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const emptyForm = () => ({
  classSection: '', title: '', content: '',
  category: 'GENERAL', isImportant: false,
});

export default function TeacherMessages() {
  const { user } = useAuth();
  const [broadcasts,   setBroadcasts]   = useState([]);
  const [classList,    setClassList]    = useState([]);
  const [selectedMsg,  setSelectedMsg]  = useState(null);
  const [showCompose,  setShowCompose]  = useState(false);
  const [form,         setForm]         = useState(emptyForm());
  const [toast,        setToast]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);

  const showToast = (message, type = 'success') => setToast({ message, type });

  // Build combined "Class N - Section" options from the teacher's assigned classes
  const classOptions = classList.map(c => ({
    value: c.section ? `${c.name}-${c.section}` : c.name,
    label: c.section ? `${c.name} - ${c.section}` : c.name,
  }));

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const loadData = useCallback(async () => {
    setLoading(true);

    // Load classes and broadcasts independently so one failure doesn't blank the other
    const classPromise = isAdmin
      ? adminAPI.getClasses().catch(() => null)
      : teacherAPI.getMyClasses().catch(() => null);

    const bcPromise = messageAPI.getBroadcasts().catch(() => null);

    const [clRes, bcRes] = await Promise.all([classPromise, bcPromise]);

    setClassList(clRes?.data?.data ?? []);
    setBroadcasts(bcRes?.data?.data ?? []);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSend = async () => {
    if (!form.classSection)     { showToast('Please select a class', 'error'); return; }
    if (!form.title.trim())     { showToast('Title is required', 'error'); return; }
    if (!form.content.trim())   { showToast('Message content is required', 'error'); return; }

    const classSection = form.classSection;
    setSending(true);
    try {
      const res = await messageAPI.sendBroadcast({
        title:        form.title.trim(),
        content:      form.content.trim(),
        category:     form.category,
        isSchoolWide: false,
        classSection,
        isImportant:  form.isImportant,
      });
      if (res.data?.success) {
        const label = classOptions.find(o => o.value === classSection)?.label || classSection;
        showToast('Message sent to ' + label);
        setShowCompose(false);
        setForm(emptyForm());
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

  return (
    <Layout pageTitle="Messages">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Messages</h1>
          <p>Send announcements to your class students</p>
        </div>
        <button className="btn-add" onClick={() => setShowCompose(true)}>
          <span className="material-icons">edit</span>
          New Message
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', height: 'calc(100vh - 240px)', minHeight: '400px' }}>

        {/* Sent Messages List */}
        <div className="data-table-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Sent Messages</span>
            <span style={{ fontSize: '12px', color: '#a0aec0' }}>{broadcasts.length} total</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#a0aec0' }}>Loading…</div>
            ) : broadcasts.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <span className="material-icons" style={{ fontSize: 40, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>chat</span>
                <p style={{ color: '#a0aec0', fontSize: '13px' }}>No messages sent yet</p>
              </div>
            ) : broadcasts.map(msg => {
              const colors = categoryColor(msg.category);
              const isActive = selectedMsg?.id === msg.id;
              return (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMsg(msg)}
                  style={{
                    padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid #f7fafc',
                    background: isActive ? '#f0fff4' : '#fff',
                    borderLeft: isActive ? '3px solid #76C442' : '3px solid transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#2d3748', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
                      {msg.isImportant && <span className="material-icons" style={{ fontSize: 14, color: '#e53e3e', verticalAlign: 'middle', marginRight: 4 }}>priority_high</span>}
                      {msg.title}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: colors.bg, color: colors.color, whiteSpace: 'nowrap' }}>
                      {msg.category}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#718096', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: 11, color: '#a0aec0' }}>
                    🎓 Class {msg.classSection || 'School-wide'} · {formatDate(msg.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Message Detail */}
        <div className="data-table-card" style={{ display: 'flex', flexDirection: 'column' }}>
          {selectedMsg ? (
            <>
              <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f0f4f8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {selectedMsg.isImportant && (
                        <span className="material-icons" style={{ fontSize: 18, color: '#e53e3e' }}>priority_high</span>
                      )}
                      <span style={{ fontSize: '18px', fontWeight: 700, color: '#2d3748' }}>{selectedMsg.title}</span>
                    </div>
                    {(() => {
                      const colors = categoryColor(selectedMsg.category);
                      return (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 10, background: colors.bg, color: colors.color }}>
                          {selectedMsg.category}
                        </span>
                      );
                    })()}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#a0aec0' }}>
                    <div>🎓 Class {selectedMsg.classSection || 'School-wide'}</div>
                    <div style={{ marginTop: 4 }}>{formatDate(selectedMsg.createdAt)}</div>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, fontSize: '14px', color: '#4a5568', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {selectedMsg.content}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <span className="material-icons">chat</span>
              <h3>No message selected</h3>
              <p>Click a message to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1a202c' }}>New Message</h2>
              <button onClick={() => { setShowCompose(false); setForm(emptyForm()); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#718096', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Class & Section — single combined dropdown of teacher's assigned classes */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>
                  Class &amp; Section *
                </label>
                {classOptions.length === 0 ? (
                  <div style={{ padding: '10px 14px', border: '1px solid #fed7d7', borderRadius: 8, fontSize: 13, color: '#c53030', background: '#fff5f5' }}>
                    ⚠️ No classes assigned. Contact admin to assign classes to your profile.
                  </div>
                ) : (
                  <select
                    value={form.classSection}
                    onChange={e => setForm(f => ({ ...f, classSection: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' }}
                  >
                    <option value="">— Select your class —</option>
                    {classOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Category + Important */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' }}
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', paddingBottom: 2, whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={form.isImportant}
                    onChange={e => setForm(f => ({ ...f, isImportant: e.target.checked }))}
                  />
                  <span style={{ color: '#e53e3e', fontWeight: 600 }}>Important</span>
                </label>
              </div>

              {/* Title */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Message title…"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {/* Message */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>Message *</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Type your message here…"
                  rows={4}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {/* Preview */}
              {form.classSection && (
                <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#276749' }}>
                  ✅ This message will be sent to all students in <strong>{classOptions.find(o => o.value === form.classSection)?.label || form.classSection}</strong>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
                <button
                  onClick={() => { setShowCompose(false); setForm(emptyForm()); }}
                  style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#4a5568', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || classOptions.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', border: 'none', borderRadius: 8, background: '#76C442', color: '#fff', fontSize: 14, fontWeight: 600, cursor: (sending || classOptions.length === 0) ? 'not-allowed' : 'pointer', opacity: (sending || classOptions.length === 0) ? 0.5 : 1 }}
                >
                  <span className="material-icons" style={{ fontSize: 16 }}>send</span>
                  {sending ? 'Sending…' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
