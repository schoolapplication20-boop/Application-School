import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import CategoryBadge from '../../components/CategoryBadge';
import { useAuth } from '../../context/AuthContext';
import { messageAPI, teacherAPI, adminAPI } from '../../services/api';
import { sortClasses } from '../../utils/classOrder';
import { MESSAGE_CATEGORIES, formatMessageDateTime } from '../../utils/messageFormat';
import { useToast } from '../../context/ToastContext';

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
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);

  const showToast = useToast();

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

    setClassList((clRes?.data?.data ?? []).slice().sort(sortClasses));
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Messages</h1>
          <p>Send announcements to your class students</p>
        </div>
        <Button variant="add" onClick={() => setShowCompose(true)}>
          <span className="material-icons">edit</span>
          New Message
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', height: 'calc(100vh - 240px)', minHeight: '400px' }}>

        {/* Sent Messages List */}
        <div className="data-table-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Sent Messages</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{broadcasts.length} total</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
            ) : broadcasts.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <span className="material-icons" style={{ fontSize: 40, color: 'var(--border-strong)', display: 'block', marginBottom: 8 }}>chat</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No messages sent yet</p>
              </div>
            ) : broadcasts.map(msg => {
              const isActive = selectedMsg?.id === msg.id;
              return (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMsg(msg)}
                  style={{
                    padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                    background: isActive ? '#f0fff4' : 'var(--surface)',
                    borderLeft: isActive ? '3px solid #0de1e8' : '3px solid transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
                      {msg.isImportant && <span className="material-icons" style={{ fontSize: 14, color: '#e53e3e', verticalAlign: 'middle', marginRight: 4 }}>priority_high</span>}
                      {msg.title}
                    </span>
                    <CategoryBadge category={msg.category} style={{ borderRadius: '10px', whiteSpace: 'nowrap' }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    🎓 Class {msg.classSection || 'School-wide'} · {formatMessageDateTime(msg.createdAt)}
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
              <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {selectedMsg.isImportant && (
                        <span className="material-icons" style={{ fontSize: 18, color: '#e53e3e' }}>priority_high</span>
                      )}
                      <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedMsg.title}</span>
                    </div>
                    <CategoryBadge category={selectedMsg.category} style={{ padding: '2px 10px' }} />
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                    <div>🎓 Class {selectedMsg.classSection || 'School-wide'}</div>
                    <div style={{ marginTop: 4 }}>{formatMessageDateTime(selectedMsg.createdAt)}</div>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
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
          <div style={{ background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 520, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>New Message</h2>
              <button onClick={() => { setShowCompose(false); setForm(emptyForm()); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-secondary)', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Class & Section — single combined dropdown of teacher's assigned classes */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
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
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 14, outline: 'none' }}
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
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 14, outline: 'none' }}
                  >
                    {MESSAGE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
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
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Message title…"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {/* Message */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Message *</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Type your message here…"
                  maxLength={5000}
                  rows={4}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
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
                  style={{ padding: '10px 20px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || classOptions.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', border: 'none', borderRadius: 8, background: '#0de1e8', color: '#fff', fontSize: 14, fontWeight: 600, cursor: (sending || classOptions.length === 0) ? 'not-allowed' : 'pointer', opacity: (sending || classOptions.length === 0) ? 0.5 : 1 }}
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
