import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { messageAPI } from '../../services/api';
import { formatClassName } from '../../utils/format';
import CategoryBadge from '../../components/CategoryBadge';
import { MESSAGE_CATEGORIES, formatRelativeTime, formatMessageDateTime } from '../../utils/messageFormat';

const CATEGORIES = ['ALL', ...MESSAGE_CATEGORIES];

export default function StudentMessages() {
  const [messages, setMessages]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [category, setCategory]   = useState('ALL');
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await messageAPI.getStudentInbox();
      setMessages(res.data?.data ?? []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (msg) => {
    if (msg.isRead) return;
    try {
      await messageAPI.markReadByStudent(msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
    } catch { /* silent */ }
  };

  const openMessage = (msg) => {
    setSelected(msg);
    markRead(msg);
  };

  const filtered = messages.filter(m => {
    const matchCat = category === 'ALL' || m.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || m.title?.toLowerCase().includes(q) || m.content?.toLowerCase().includes(q) || m.senderName?.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const unreadCount = messages.filter(m => !m.isRead).length;

  return (
    <Layout pageTitle="Messages">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span className="material-icons" style={{ fontSize: 28, color: '#4f46e5' }}>chat</span>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>Messages</h1>
          {unreadCount > 0 && (
            <span style={{ background: '#4f46e5', color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: 13, fontWeight: 700 }}>
              {unreadCount} new
            </span>
          )}
        </div>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
          Messages from your school, class teacher, and subject teachers
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Left: list panel */}
        <div style={{ flex: '0 0 380px', background: 'var(--surface)', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {/* Search */}
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ position: 'relative' }}>
              <span className="material-icons" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 18 }}>search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search messages…"
                style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 6, padding: '12px 16px', overflowX: 'auto', flexWrap: 'nowrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  background: category === cat ? '#4f46e5' : 'var(--border)',
                  color: category === cat ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Message list */}
          <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>inbox</span>
                No messages
              </div>
            ) : filtered.map(msg => {
              const isActive = selected?.id === msg.id;
              return (
                <div
                  key={msg.id}
                  onClick={() => openMessage(msg)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: isActive ? '#eef2ff' : (msg.isRead ? 'var(--surface)' : '#f8f9ff'),
                    borderLeft: isActive ? '3px solid #4f46e5' : '3px solid transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{
                      fontSize: 13, fontWeight: msg.isRead ? 500 : 700, color: 'var(--text-primary)',
                      flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {!msg.isRead && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#4f46e5', marginRight: 6, verticalAlign: 'middle' }} />}
                      {msg.title}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatRelativeTime(msg.createdAt)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>
                    {msg.senderName} · {msg.isSchoolWide ? 'School-wide' : msg.classSection || 'Direct'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <CategoryBadge category={msg.category} withBorder style={{ fontSize: 10 }} />
                    {msg.isImportant && (
                      <span className="material-icons" style={{ fontSize: 14, color: '#e53e3e' }}>priority_high</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: detail panel */}
        <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', minHeight: 400 }}>
          {selected ? (
            <div style={{ padding: 32 }}>
              {/* Detail header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    {selected.isImportant && (
                      <span className="material-icons" style={{ fontSize: 20, color: '#e53e3e' }}>priority_high</span>
                    )}
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{selected.title}</h2>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <CategoryBadge category={selected.category} withBorder style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12 }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      From <strong>{selected.senderName}</strong> ({selected.senderRole?.replace('_', ' ')})
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {selected.isSchoolWide ? 'School-wide message' : selected.classSection ? formatClassName(selected.classSection) : 'Direct message'}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 16 }}>
                  {formatMessageDateTime(selected.createdAt)}
                </span>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-strong)', margin: '0 0 24px' }} />

              <p style={{ margin: 0, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {selected.content}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--text-muted)' }}>
              <span className="material-icons" style={{ fontSize: 56, marginBottom: 12 }}>mark_email_unread</span>
              <p style={{ margin: 0, fontSize: 15 }}>Select a message to read</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
