import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import '../styles/sidebar.css';

const Navbar = ({ onMenuToggle }) => {
  const { user, updateUser } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, removeNotification, loadFromServer } = useNotifications();

  // Load server notifications on mount and poll every 30 seconds
  useEffect(() => {
    if (!user?.id) return;
    loadFromServer(user.id);
    const interval = setInterval(() => loadFromServer(user.id), 30000);
    return () => clearInterval(interval);
  }, [user?.id, loadFromServer]);
  const navigate = useNavigate();

  const [showDropdown, setShowDropdown]   = useState(false);
  const [showNotif, setShowNotif]         = useState(false);
  const [showProfile, setShowProfile]     = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [profileForm, setProfileForm]     = useState({
    name:   user?.name  || '',
    email:  user?.email || '',
    phone:  user?.phone || user?.mobile || '',
    address: user?.address || '',
  });
  const [profileSaved, setProfileSaved]   = useState(false);

  // Keep profileForm in sync when user data changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        name:    user.name    || '',
        email:   user.email   || '',
        phone:   user.phone   || user.mobile || '',
        address: user.address || '',
      });
    }
  }, [user]);

  // Only show notifications relevant to this role
  const myNotifications = notifications.filter(n => !n.role || n.role === user?.role);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    updateUser({ name: profileForm.name, phone: profileForm.phone, address: profileForm.address });
    setProfileSaved(true);
    setTimeout(() => { setProfileSaved(false); setShowProfile(false); }, 1500);
  };

  // Global search: navigate to relevant page
  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (user?.role === 'ADMIN') {
        if (q.includes('student')) navigate('/admin/students');
        else if (q.includes('teacher')) navigate('/admin/teachers');
        else if (q.includes('class')) navigate('/admin/classes');
        else if (q.includes('fee')) navigate('/admin/fees');
        else if (q.includes('leave')) navigate('/admin/leave');
        else if (q.includes('salary')) navigate('/admin/salaries');
        else if (q.includes('expense')) navigate('/admin/expenses');
        else navigate('/admin/students');
      } else if (user?.role === 'TEACHER') {
        if (q.includes('homework')) navigate('/teacher/homework');
        else if (q.includes('attendance')) navigate('/teacher/attendance');
        else if (q.includes('mark') || q.includes('grade')) navigate('/teacher/marks');
        else if (q.includes('assignment')) navigate('/teacher/assignments');
        else if (q.includes('leave')) navigate('/teacher/leave-approval');
        else navigate('/teacher/assignments');
      } else {
        if (q.includes('fee')) navigate('/parent/pay-fees');
        else if (q.includes('attendance')) navigate('/parent/attendance');
        else if (q.includes('assignment')) navigate('/parent/assignments');
        else if (q.includes('leave')) navigate('/parent/leave');
        else navigate('/parent/dashboard');
      }
      setSearchQuery('');
    }
  };

  const iconForNotif = (n) => n.icon || 'notifications';

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <button
          onClick={onMenuToggle}
          style={{
            width: '40px', height: '40px', border: 'none', background: '#f7fafc',
            borderRadius: '10px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: '#718096', transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(118,196,66,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = '#f7fafc'}
        >
          <span className="material-icons">menu</span>
        </button>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748' }}>
            Welcome back, {user?.name?.split(' ')[0] || 'User'}!
          </div>
        </div>
      </div>

      <div className="navbar-right">
        {/* Search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span className="material-icons" style={{ position: 'absolute', left: '10px', color: '#a0aec0', fontSize: '18px', pointerEvents: 'none' }}>search</span>
          <input
            type="text"
            placeholder="Search… (press Enter)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            style={{
              padding: '8px 12px 8px 36px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
              fontSize: '13px', color: '#4a5568', background: '#fafafa', outline: 'none',
              width: '220px', transition: 'all 0.2s'
            }}
            onFocus={e => { e.target.style.borderColor = '#76C442'; e.target.style.width = '260px'; }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.width = '220px'; }}
          />
        </div>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="navbar-icon-btn"
            onClick={() => { setShowNotif(!showNotif); setShowDropdown(false); setShowProfile(false); }}
          >
            <span className="material-icons">notifications</span>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                background: '#e53e3e', color: '#fff', borderRadius: '50%',
                width: '18px', height: '18px', fontSize: '10px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
            {unreadCount === 0 && <span className="notification-dot" />}
          </button>
          {showNotif && (
            <div style={{
              position: 'absolute', right: 0, top: '50px', width: '340px', background: '#fff',
              borderRadius: '14px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 1000,
              border: '1px solid #f0f4f8', overflow: 'hidden', maxHeight: '420px', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748' }}>
                  Notifications {unreadCount > 0 && <span style={{ background: '#e53e3e', color: '#fff', borderRadius: '12px', padding: '1px 7px', fontSize: '11px', marginLeft: 6 }}>{unreadCount}</span>}
                </span>
                {unreadCount > 0 && (
                  <span style={{ fontSize: '11px', color: '#76C442', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => markAllRead(user?.id)}>Mark all read</span>
                )}
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {myNotifications.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: '#a0aec0', fontSize: '13px' }}>
                    <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>notifications_none</span>
                    No notifications yet
                  </div>
                ) : myNotifications.slice(0, 20).map(n => (
                  <div
                    key={n.id}
                    style={{
                      padding: '12px 16px 12px 20px', borderBottom: '1px solid #f7fafc',
                      display: 'flex', gap: '12px', alignItems: 'flex-start',
                      transition: 'background 0.2s',
                      background: n.read ? 'transparent' : '#fafff5',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f7fafc'; e.currentTarget.querySelector('.notif-delete').style.opacity = '1'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = n.read ? 'transparent' : '#fafff5'; e.currentTarget.querySelector('.notif-delete').style.opacity = '0'; }}
                  >
                    {/* Icon */}
                    <div
                      onClick={() => { markRead(n.id); setSelectedNotif(n); setShowNotif(false); }}
                      style={{ cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1, minWidth: 0 }}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: (n.color || '#76C442') + '20',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <span className="material-icons" style={{ fontSize: '18px', color: n.color || '#76C442' }}>{iconForNotif(n)}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: '#2d3748', fontWeight: n.read ? 400 : 600, lineHeight: 1.4 }}>{n.text}</div>
                        <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '3px' }}>{n.time}
                          {n.details && <span style={{ marginLeft: 6, color: '#76C442', fontWeight: 600 }}>· view details</span>}
                        </div>
                      </div>
                    </div>

                    {/* Right side: unread dot + delete */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {!n.read && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#76C442' }} />
                      )}
                      <button
                        className="notif-delete"
                        onClick={e => { e.stopPropagation(); removeNotification(n.id); }}
                        title="Delete notification"
                        style={{
                          opacity: 0, border: 'none', background: 'none', cursor: 'pointer',
                          padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '6px', transition: 'opacity 0.15s, background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fff1f0'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <span className="material-icons" style={{ fontSize: '16px', color: '#e53e3e' }}>delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            className="navbar-user"
            onClick={() => { setShowDropdown(!showDropdown); setShowNotif(false); setShowProfile(false); }}
          >
            <div className="user-avatar" style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #76C442, #5fa832)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '15px', fontWeight: 700
            }}>
              {getInitials(user?.name)}
            </div>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748' }}>{user?.name}</div>
              <div style={{ fontSize: '11px', color: '#a0aec0' }}>{user?.role}</div>
            </div>
            <span className="material-icons" style={{ fontSize: '18px', color: '#a0aec0' }}>expand_more</span>
          </div>

          {showDropdown && (
            <div style={{
              position: 'absolute', right: 0, top: '50px', width: '220px', background: '#fff',
              borderRadius: '14px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 1000,
              border: '1px solid #f0f4f8', overflow: 'hidden'
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f4f8' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#2d3748' }}>{user?.name}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{user?.email}</div>
              </div>
              {[
                { icon: 'person', label: 'My Profile', action: () => { setShowDropdown(false); setShowProfile(true); } },
                { icon: 'lock', label: 'Change Password', action: () => { setShowDropdown(false); navigate('/reset-password'); } },
              ].map(item => (
                <div key={item.label} style={{
                  padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', color: '#4a5568', fontSize: '14px', transition: 'background 0.2s'
                }}
                  onClick={item.action}
                  onMouseEnter={e => e.currentTarget.style.background = '#f7fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span className="material-icons" style={{ fontSize: '18px', color: '#a0aec0' }}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile Edit Modal */}
      {showProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '420px', maxWidth: '95vw', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h5 style={{ margin: 0, fontWeight: 700, fontSize: '16px' }}>My Profile</h5>
              <button onClick={() => setShowProfile(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', color: '#a0aec0' }}>×</button>
            </div>
            <form onSubmit={handleProfileSave}>
              <div style={{ padding: '24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '26px', fontWeight: 700, color: '#fff' }}>
                    {getInitials(profileForm.name)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aec0' }}>{user?.role}</div>
                </div>
                <div style={{ display: 'grid', gap: '14px' }}>
                  {[
                    { field: 'name',    label: 'Full Name',    type: 'text' },
                    { field: 'email',   label: 'Email',        type: 'email', disabled: true },
                    { field: 'phone',   label: 'Phone',        type: 'tel' },
                    { field: 'address', label: 'Address',      type: 'text' },
                  ].map(f => (
                    <div key={f.field}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                      <input
                        type={f.type}
                        disabled={f.disabled}
                        value={profileForm[f.field] || ''}
                        onChange={e => setProfileForm({ ...profileForm, [f.field]: e.target.value })}
                        style={{
                          width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px',
                          fontSize: '13px', background: f.disabled ? '#f7fafc' : '#fff',
                          color: f.disabled ? '#a0aec0' : '#2d3748', outline: 'none', boxSizing: 'border-box'
                        }}
                        onFocus={e => !f.disabled && (e.target.style.borderColor = '#76C442')}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f4f8', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowProfile(false)}
                  style={{ padding: '9px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                  Cancel
                </button>
                <button type="submit"
                  style={{ padding: '9px 24px', background: profileSaved ? '#38a169' : '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'background 0.2s' }}>
                  {profileSaved ? '✓ Saved!' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {(showDropdown || showNotif) && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 999 }}
          onClick={() => { setShowDropdown(false); setShowNotif(false); }}
        />
      )}

      {/* Notification Detail Modal */}
      {selectedNotif && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setSelectedNotif(null)}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '460px', maxWidth: '95vw', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 42, height: 42, borderRadius: '12px', background: (selectedNotif.color || '#76C442') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-icons" style={{ color: selectedNotif.color || '#76C442', fontSize: '22px' }}>{iconForNotif(selectedNotif)}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748' }}>Notification Details</div>
                <div style={{ fontSize: '11px', color: '#a0aec0' }}>{selectedNotif.time}</div>
              </div>
              <button onClick={() => setSelectedNotif(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '22px', color: '#a0aec0', lineHeight: 1 }}>×</button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px' }}>
              {/* Summary text */}
              <div style={{ background: (selectedNotif.color || '#76C442') + '10', borderLeft: `3px solid ${selectedNotif.color || '#76C442'}`, borderRadius: '0 8px 8px 0', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#2d3748', lineHeight: 1.5 }}>
                {selectedNotif.text}
              </div>

              {/* Structured details */}
              {selectedNotif.details ? (() => {
                const d = selectedNotif.details;
                const Row = ({ label, value }) => value ? (
                  <div style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f7fafc' }}>
                    <div style={{ width: '120px', fontSize: '12px', color: '#a0aec0', fontWeight: 600, flexShrink: 0 }}>{label}</div>
                    <div style={{ fontSize: '13px', color: '#2d3748', fontWeight: 500 }}>{value}</div>
                  </div>
                ) : null;

                if (d.type === 'teacher_leave') return (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Leave Request Details</div>
                    <Row label="From" value={d.sender} />
                    <Row label="Role" value={d.senderRole} />
                    <Row label="Leave Type" value={d.leaveType} />
                    <Row label="From Date" value={d.fromDate} />
                    <Row label="To Date" value={d.toDate} />
                    <Row label="Reason" value={d.reason} />
                    <Row label="Submitted" value={d.submittedAt} />
                  </div>
                );

                if (d.type === 'forwarded_leave') return (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Forwarded Leave Request</div>
                    <Row label="Student" value={d.studentName} />
                    <Row label="Class" value={d.class} />
                    <Row label="Parent" value={d.parentName} />
                    <Row label="Leave Type" value={d.leaveType} />
                    <Row label="From Date" value={d.fromDate} />
                    <Row label="To Date" value={d.toDate} />
                    <Row label="Reason" value={d.reason} />
                    {d.teacherComment && <Row label="Teacher Note" value={d.teacherComment} />}
                    <Row label="Submitted" value={d.submittedAt} />
                  </div>
                );

                if (d.type === 'parent_leave') return (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Leave Request Details</div>
                    <Row label="From" value={d.sender} />
                    <Row label="Role" value={d.senderRole} />
                    <Row label="Student" value={d.studentName} />
                    <Row label="Class" value={d.class} />
                    <Row label="Leave Type" value={d.leaveType} />
                    <Row label="From Date" value={d.fromDate} />
                    <Row label="To Date" value={d.toDate} />
                    <Row label="Reason" value={d.reason} />
                    <Row label="Submitted" value={d.submittedAt} />
                  </div>
                );

                if (d.type === 'fee_payment') return (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Payment Details</div>
                    <Row label="From" value={d.sender} />
                    <Row label="Role" value={d.senderRole} />
                    <Row label="Fee Type" value={d.feeType} />
                    <Row label="Amount" value={`₹${d.amount?.toLocaleString()}`} />
                    <Row label="Method" value={d.method} />
                    <Row label="Paid On" value={d.paidDate} />
                  </div>
                );

                return <div style={{ fontSize: '13px', color: '#718096' }}>No additional details available.</div>;
              })() : (
                <div style={{ fontSize: '13px', color: '#718096', textAlign: 'center', padding: '12px 0' }}>No additional details available.</div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid #f0f4f8', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedNotif(null)}
                style={{ padding: '9px 24px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
