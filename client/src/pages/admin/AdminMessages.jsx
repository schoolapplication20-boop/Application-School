import React, { useState, useEffect, useCallback } from 'react';
import { messageAPI, adminAPI } from '../../services/api';
import Toast from '../../components/Toast';

const CATEGORIES = ['GENERAL', 'ACADEMIC', 'ANNOUNCEMENT', 'EXAM', 'FEE', 'URGENT'];

const empty = () => ({
  title: '', content: '', category: 'GENERAL',
  isSchoolWide: true, classSection: '', isImportant: false,
});

export default function AdminMessages() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [classList,  setClassList]  = useState([]);
  const [form,       setForm]       = useState(empty());
  const [loading,    setLoading]    = useState(true);
  const [sending,    setSending]    = useState(false);
  const [toast,      setToast]      = useState(null);
  const [showForm,   setShowForm]   = useState(false);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [bcRes, clRes] = await Promise.all([
      messageAPI.getBroadcasts().catch(() => null),
      adminAPI.getClasses().catch(() => null),
    ]);
    setBroadcasts(bcRes?.data?.data ?? []);
    const classes = clRes?.data?.data ?? [];
    setClassList(classes.map(c => ({
      id: c.id,
      label: c.name + (c.section ? ` - ${c.section}` : ''),
      classSection: c.name + (c.section ? `-${c.section}` : ''),
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSend = async () => {
    if (!form.title.trim()) { showToast('Title is required', 'error'); return; }
    if (!form.content.trim()) { showToast('Message content is required', 'error'); return; }
    if (!form.isSchoolWide && !form.classSection) { showToast('Select a class or choose school-wide', 'error'); return; }

    setSending(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        isSchoolWide: form.isSchoolWide,
        classSection: form.isSchoolWide ? null : form.classSection,
        isImportant: form.isImportant,
      };
      const res = await messageAPI.sendBroadcast(payload);
      if (res.data?.success) {
        showToast('Message sent successfully');
        setForm(empty());
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

  const categoryColor = (cat) => {
    switch (cat) {
      case 'URGENT': return { bg: '#fff5f5', color: '#c53030' };
      case 'EXAM': return { bg: '#faf5ff', color: '#6b46c1' };
      case 'FEE': return { bg: '#fffaf0', color: '#c05621' };
      case 'ACADEMIC': return { bg: '#f0fff4', color: '#276749' };
      case 'ANNOUNCEMENT': return { bg: '#ebf8ff', color: '#2b6cb0' };
      default: return { bg: '#f7fafc', color: '#4a5568' };
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', padding: '24px' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span className="material-icons" style={{ fontSize: 28, color: '#4f46e5' }}>campaign</span>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1a202c' }}>Messages</h1>
          </div>
          <p style={{ margin: 0, color: '#718096', fontSize: 14 }}>Send announcements to classes or the entire school</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          <span className="material-icons" style={{ fontSize: 18 }}>add</span>
          New Message
        </button>
      </div>

      {/* Compose form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Compose Message</h2>
              <button onClick={() => { setShowForm(false); setForm(empty()); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#718096' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

              {/* Category + Important */}
              <div style={{ display: 'flex', gap: 12 }}>
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
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.isImportant}
                      onChange={e => setForm(f => ({ ...f, isImportant: e.target.checked }))}
                    />
                    <span style={{ color: '#e53e3e', fontWeight: 600 }}>Important</span>
                  </label>
                </div>
              </div>

              {/* Audience */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 8 }}>Send to</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    onClick={() => setForm(f => ({ ...f, isSchoolWide: true, classSection: '' }))}
                    style={{ flex: 1, padding: '8px', border: `2px solid ${form.isSchoolWide ? '#4f46e5' : '#e2e8f0'}`, borderRadius: 8, background: form.isSchoolWide ? '#eef2ff' : '#fff', color: form.isSchoolWide ? '#4f46e5' : '#4a5568', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                  >
                    🏫 Entire School
                  </button>
                  <button
                    onClick={() => setForm(f => ({ ...f, isSchoolWide: false }))}
                    style={{ flex: 1, padding: '8px', border: `2px solid ${!form.isSchoolWide ? '#4f46e5' : '#e2e8f0'}`, borderRadius: 8, background: !form.isSchoolWide ? '#eef2ff' : '#fff', color: !form.isSchoolWide ? '#4f46e5' : '#4a5568', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                  >
                    🎓 Specific Class
                  </button>
                </div>
                {!form.isSchoolWide && (
                  <select
                    value={form.classSection}
                    onChange={e => setForm(f => ({ ...f, classSection: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' }}
                  >
                    <option value="">— Select class —</option>
                    {classList.map(c => <option key={c.id} value={c.classSection}>{c.label}</option>)}
                  </select>
                )}
              </div>

              {/* Content */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>Message *</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Type your message here…"
                  rows={5}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
                <button
                  onClick={() => { setShowForm(false); setForm(empty()); }}
                  style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#4a5568', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#4f46e5', color: '#fff', fontSize: 14, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1 }}
                >
                  {sending ? 'Sending…' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sent messages list */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f4f8' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a202c' }}>Sent Messages</h2>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>Loading…</div>
        ) : broadcasts.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 8 }}>campaign</span>
            No messages sent yet
          </div>
        ) : broadcasts.map(msg => {
          const colors = categoryColor(msg.category);
          return (
            <div key={msg.id} style={{ padding: '16px 24px', borderBottom: '1px solid #f0f4f8', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  {msg.isImportant && <span className="material-icons" style={{ fontSize: 16, color: '#e53e3e' }}>priority_high</span>}
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#1a202c' }}>{msg.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: colors.bg, color: colors.color }}>{msg.category}</span>
                </div>
                <p style={{ margin: '0 0 6px', fontSize: 14, color: '#4a5568', lineHeight: 1.5 }}>{msg.content}</p>
                <div style={{ fontSize: 12, color: '#a0aec0' }}>
                  <span>{msg.isSchoolWide ? '🏫 School-wide' : `🎓 ${msg.classSection}`}</span>
                  <span style={{ margin: '0 8px' }}>·</span>
                  <span>{msg.senderName}</span>
                  <span style={{ margin: '0 8px' }}>·</span>
                  <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
