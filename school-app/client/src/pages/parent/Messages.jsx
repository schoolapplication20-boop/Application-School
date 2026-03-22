import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import '../../styles/sidebar.css';
import '../../styles/dashboard.css';

const mockMessages = [
  { id: 1, sender: 'Priya Sharma', role: 'Mathematics Teacher', message: "Arjun has been performing well in class. His recent unit test score shows great improvement. Please ensure he completes the practice assignment by March 20th.", time: '2:30 PM', date: 'Today', unread: true, avatar: 'PS' },
  { id: 2, sender: 'Principal Office', role: 'Administration', message: "Parent-Teacher Meeting is scheduled for Saturday, March 22nd from 10 AM to 1 PM. Please confirm your attendance by replying to this message.", time: '11:15 AM', date: 'Today', unread: true, avatar: 'PO' },
  { id: 3, sender: 'Rajesh Verma', role: 'Science Teacher', message: "Arjun's lab report is pending. Kindly remind him to submit it before March 25th.", time: 'Yesterday', date: 'Yesterday', unread: false, avatar: 'RV' },
  { id: 4, sender: 'School Nurse', role: 'Health Department', message: "Annual health check-up is scheduled for March 24th. Please submit the health form available at the school office.", time: '3 days ago', date: '14 Mar 2026', unread: false, avatar: 'SN' },
  { id: 5, sender: 'Sports Department', role: 'Co-Curricular', message: "Arjun has been selected for the inter-school chess tournament on March 28th. Congratulations!", time: '5 days ago', date: '12 Mar 2026', unread: false, avatar: 'SD' },
];

const Messages = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [messages, setMessages] = useState(mockMessages);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', subject: '', message: '' });

  const unreadCount = messages.filter(m => m.unread).length;

  const handleSelectMessage = (msg) => {
    setSelectedMsg(msg);
    setMessages(messages.map(m => m.id === msg.id ? { ...m, unread: false } : m));
  };

  const handleReply = () => {
    if (!replyText.trim()) return;
    alert('Reply sent successfully!');
    setReplyText('');
  };

  const handleCompose = () => {
    if (!composeData.to || !composeData.message) { alert('Please fill all fields.'); return; }
    alert('Message sent successfully!');
    setShowCompose(false);
    setComposeData({ to: '', subject: '', message: '' });
  };

  const avatarColors = ['#76C442', '#3182ce', '#805ad5', '#ed8936', '#e53e3e'];

  return (
    <div className="app-layout">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} mobileOpen={mobileSidebarOpen} />
      {mobileSidebarOpen && <div className="sidebar-overlay visible" onClick={() => setMobileSidebarOpen(false)} />}

      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar pageTitle="Messages" onMenuToggle={() => {
          if (window.innerWidth <= 1024) setMobileSidebarOpen(!mobileSidebarOpen);
          else setSidebarCollapsed(!sidebarCollapsed);
        }} />

        <div className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1>Messages</h1>
              <p>{unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</p>
            </div>
            <button className="btn-add" onClick={() => setShowCompose(true)}>
              <span className="material-icons">edit</span>
              New Message
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', height: 'calc(100vh - 240px)', minHeight: '400px' }}>
            {/* Message List */}
            <div className="data-table-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>Inbox</span>
                {unreadCount > 0 && (
                  <span style={{ background: '#76C442', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>{unreadCount}</span>
                )}
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {messages.map((msg, i) => (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    style={{
                      padding: '16px 20px', cursor: 'pointer', borderBottom: '1px solid #f7fafc',
                      background: selectedMsg?.id === msg.id ? '#f0fff4' : msg.unread ? '#fafffe' : '#fff',
                      transition: 'background 0.2s', borderLeft: selectedMsg?.id === msg.id ? '3px solid #76C442' : '3px solid transparent'
                    }}
                    onMouseEnter={e => { if (selectedMsg?.id !== msg.id) e.currentTarget.style.background = '#f7fafc'; }}
                    onMouseLeave={e => { if (selectedMsg?.id !== msg.id) e.currentTarget.style.background = msg.unread ? '#fafffe' : '#fff'; }}
                  >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                        {msg.avatar}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: msg.unread ? 700 : 600, color: msg.unread ? '#76C442' : '#2d3748' }}>{msg.sender}</span>
                          <span style={{ fontSize: '11px', color: '#a0aec0' }}>{msg.time}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#a0aec0', marginBottom: '3px' }}>{msg.role}</div>
                        <div style={{ fontSize: '12px', color: '#718096', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.message}</div>
                      </div>
                      {msg.unread && <div style={{ width: '8px', height: '8px', background: '#76C442', borderRadius: '50%', flexShrink: 0, marginTop: '4px' }} />}
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
                        {selectedMsg.avatar}
                      </div>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#2d3748' }}>{selectedMsg.sender}</div>
                        <div style={{ fontSize: '12px', color: '#a0aec0' }}>{selectedMsg.role}</div>
                        <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px' }}>{selectedMsg.date} at {selectedMsg.time}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1, fontSize: '14px', color: '#4a5568', lineHeight: '1.7', marginBottom: '20px' }}>
                    {selectedMsg.message}
                  </div>
                  <div style={{ borderTop: '1px solid #f0f4f8', paddingTop: '16px' }}>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        placeholder="Write your reply..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        style={{ width: '100%', padding: '12px 50px 12px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', resize: 'none', height: '90px', outline: 'none', fontFamily: 'inherit' }}
                        onFocus={e => e.target.style.borderColor = '#76C442'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                      <button
                        onClick={handleReply}
                        style={{ position: 'absolute', right: '12px', bottom: '12px', width: '36px', height: '36px', background: '#76C442', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <span className="material-icons" style={{ color: '#fff', fontSize: '18px' }}>send</span>
                      </button>
                    </div>
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
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCompose(false)}>
          <div className="modal-container">
            <div className="modal-header">
              <span className="modal-title">New Message</span>
              <button className="modal-close" onClick={() => setShowCompose(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body">
              {[
                { field: 'to', label: 'To (Teacher/Staff)', placeholder: 'Select recipient' },
                { field: 'subject', label: 'Subject', placeholder: 'Message subject' },
              ].map(f => (
                <div key={f.field} className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">{f.label}</label>
                  <input type="text" className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                    placeholder={f.placeholder} value={composeData[f.field]} onChange={e => setComposeData({ ...composeData, [f.field]: e.target.value })} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="form-control" style={{ padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', minHeight: '120px', resize: 'vertical' }}
                  placeholder="Type your message here..." value={composeData.message} onChange={e => setComposeData({ ...composeData, message: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowCompose(false)} style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCompose} style={{ padding: '10px 24px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icons" style={{ fontSize: '16px' }}>send</span>
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
