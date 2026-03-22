import React, { useState } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';


const avatarColors = ['#76C442', '#3182ce', '#805ad5', '#ed8936', '#e53e3e'];
const getColor = (i) => avatarColors[i % avatarColors.length];

export default function Messages() {
  const { user } = useAuth();
  const [allMessages, setAllMessages] = useState([]);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [toast, setToast] = useState(null);


  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSelectMessage = (msg) => {
    setSelectedMsg(msg);
    if (!msg.seen) {
      const seenAt = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      setAllMessages(prev => prev.map(m => m.id === msg.id ? { ...m, seen: true, seenAt } : m));
      setSelectedMsg({ ...msg, seen: true, seenAt });
    }
  };

  const markAllRead = () => {
    const seenAt = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setAllMessages(prev => prev.map(m => ({ ...m, seen: true, seenAt })));
    showToast('All messages marked as read');
  };

  const unreadCount = allMessages.filter(m => !m.seen).length;

  // Fallback demo messages when no real messages exist
  const displayMessages = allMessages.length > 0 ? allMessages : [
    { id: -1, fromName: 'Priya Sharma', subject: 'Welcome to Schoolers', text: 'Your child has been enrolled. Please check assignments regularly.', sentAt: '17 Mar 2026', seen: false, _demo: true },
  ];

  return (
    <Layout pageTitle="Messages">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Messages</h1>
          <p>{unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-outline-secondary btn-sm" onClick={markAllRead}>
            <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 3 }}>done_all</span>
            Mark All Read
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', height: 'calc(100vh - 240px)', minHeight: '400px' }}>
        {/* Message List */}
        <div className="data-table-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Inbox</span>
            {unreadCount > 0 && (
              <span style={{ background: '#76C442', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>{unreadCount}</span>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {displayMessages.map((msg, i) => (
              <div
                key={msg.id}
                onClick={() => !msg._demo && handleSelectMessage(msg)}
                style={{
                  padding: '14px 20px', cursor: msg._demo ? 'default' : 'pointer',
                  borderBottom: '1px solid #f7fafc',
                  background: selectedMsg?.id === msg.id ? '#f0fff4' : !msg.seen ? '#fafffe' : '#fff',
                  borderLeft: selectedMsg?.id === msg.id ? '3px solid #76C442' : '3px solid transparent',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: getColor(i), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                    {(msg.fromName || 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: !msg.seen ? 700 : 600, color: !msg.seen ? '#76C442' : '#2d3748' }}>{msg.fromName}</span>
                      <span style={{ fontSize: '11px', color: '#a0aec0' }}>{msg.sentAt?.split(',')[0] || ''}</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.subject}</div>
                    <div style={{ fontSize: '11px', color: '#718096', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.text}</div>
                  </div>
                  {!msg.seen && !msg._demo && <div style={{ width: '8px', height: '8px', background: '#76C442', borderRadius: '50%', flexShrink: 0, marginTop: '4px' }} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Detail */}
        <div className="data-table-card" style={{ display: 'flex', flexDirection: 'column' }}>
          {selectedMsg ? (
            <>
              <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f0f4f8' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#76C442', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', fontWeight: 700, flexShrink: 0 }}>
                    {(selectedMsg.fromName || 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#2d3748' }}>{selectedMsg.fromName}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', marginTop: '2px' }}>{selectedMsg.subject}</div>
                    <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>{selectedMsg.sentAt}</div>
                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#76C442', fontWeight: 600 }}>
                      <span className="material-icons" style={{ fontSize: 14 }}>done_all</span>
                      Marked as seen
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, fontSize: '14px', color: '#4a5568', lineHeight: '1.8' }}>
                {selectedMsg.text}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <span className="material-icons">chat</span>
              <h3>No message selected</h3>
              <p>Click on a message to read it</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
