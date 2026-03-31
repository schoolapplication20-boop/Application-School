import React, { useState } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';


const avatarColors = ['#76C442', '#3182ce', '#805ad5', '#ed8936', '#e53e3e'];
const getColor = (i) => avatarColors[i % avatarColors.length];

export default function TeacherMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [toast, setToast] = useState(null);
  const [composeData, setComposeData] = useState({
    toParentName: 'Rajesh Kumar',
    toParentId: 3,
    subject: '',
    text: '',
  });


  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCompose = (e) => {
    e.preventDefault();
    if (!composeData.subject.trim() || !composeData.text.trim()) {
      showToast('Please fill subject and message', 'error');
      return;
    }
    const newMsg = {
      id: Date.now(),
      from: 'TEACHER',
      fromName: user?.name || 'Priya Sharma',
      toParentId: composeData.toParentId,
      toParentName: composeData.toParentName,
      subject: composeData.subject,
      text: composeData.text,
      sentAt: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      seen: false,
      seenAt: null,
    };
    setMessages(prev => [newMsg, ...prev]);
    setShowCompose(false);
    setComposeData({ toParentName: 'Rajesh Kumar', toParentId: 3, subject: '', text: '' });
    showToast('Message sent to parent');
  };

  const unread = messages.filter(m => !m.seen).length;

  return (
    <Layout pageTitle="Messages">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Messages</h1>
          <p>{unread} message{unread !== 1 ? 's' : ''} not yet seen by parent</p>
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
            <span style={{ fontSize: '12px', color: '#a0aec0' }}>{messages.length} total</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {messages.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <span className="material-icons" style={{ fontSize: 40, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>chat</span>
                <p style={{ color: '#a0aec0', fontSize: '13px' }}>No messages sent yet</p>
              </div>
            ) : messages.map((msg, i) => (
              <div
                key={msg.id}
                onClick={() => setSelectedMsg(msg)}
                style={{
                  padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid #f7fafc',
                  background: selectedMsg?.id === msg.id ? '#f0fff4' : '#fff',
                  borderLeft: selectedMsg?.id === msg.id ? '3px solid #76C442' : '3px solid transparent',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: getColor(i), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                    {msg.toParentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748' }}>To: {msg.toParentName}</span>
                      {msg.seen ? (
                        <span style={{ fontSize: '10px', background: '#f0fff4', color: '#76C442', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span className="material-icons" style={{ fontSize: 11 }}>done_all</span>Seen
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', background: '#fffaf0', color: '#ed8936', fontWeight: 700, padding: '2px 7px', borderRadius: '10px' }}>
                          Unseen
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.subject}</div>
                    <div style={{ fontSize: '11px', color: '#a0aec0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.text}</div>
                  </div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#2d3748', marginBottom: '4px' }}>{selectedMsg.subject}</div>
                    <div style={{ fontSize: '13px', color: '#718096' }}>To: <strong>{selectedMsg.toParentName}</strong></div>
                    <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>Sent: {selectedMsg.sentAt}</div>
                  </div>
                  <div>
                    {selectedMsg.seen ? (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, background: '#f0fff4', color: '#76C442', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span className="material-icons" style={{ fontSize: 16 }}>done_all</span>Seen by Parent
                        </span>
                        {selectedMsg.seenAt && (
                          <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px', textAlign: 'right' }}>
                            {selectedMsg.seenAt}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, background: '#fffaf0', color: '#ed8936', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span className="material-icons" style={{ fontSize: 16 }}>schedule</span>Not Seen Yet
                      </span>
                    )}
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
              <p>Click a message to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">New Message to Parent</h5>
                <button className="btn-close" onClick={() => setShowCompose(false)} />
              </div>
              <form onSubmit={handleCompose}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-medium">To (Parent) *</label>
                    <select className="form-select form-select-sm"
                      value={composeData.toParentId}
                      onChange={e => {
                        const id = parseInt(e.target.value);
                        const names = { 3: 'Rajesh Kumar', 4: 'Sunita Patel', 5: 'Mohan Verma' };
                        setComposeData({ ...composeData, toParentId: id, toParentName: names[id] || 'Parent' });
                      }}>
                      <option value={3}>Rajesh Kumar (Parent of Arjun Patel)</option>
                      <option value={4}>Sunita Patel (Parent of Sneha Gupta)</option>
                      <option value={5}>Mohan Verma (Parent of Ravi Kumar)</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-medium">Subject *</label>
                    <input type="text" className="form-control form-control-sm" placeholder="e.g. Regarding Arjun's performance"
                      value={composeData.subject} onChange={e => setComposeData({ ...composeData, subject: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label small fw-medium">Message *</label>
                    <textarea className="form-control form-control-sm" rows={5} placeholder="Type your message here..."
                      value={composeData.text} onChange={e => setComposeData({ ...composeData, text: e.target.value })} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCompose(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary d-flex align-items-center gap-2">
                    <span className="material-icons" style={{ fontSize: 16 }}>send</span>
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
