import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { teacherAttendanceAPI } from '../../services/api';

const STATUS_CONFIG = {
  PRESENT: { label: 'Present', icon: 'check_circle', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  ABSENT:  { label: 'Absent',  icon: 'cancel',       color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  LEAVE:   { label: 'Leave',   icon: 'event_busy',   color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
};

export default function TeacherSelfAttendance() {
  const [todayRecord, setTodayRecord] = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [note,        setNote]        = useState('');
  const [history,     setHistory]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState(null);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    Promise.all([teacherAttendanceAPI.today(), teacherAttendanceAPI.my()])
      .then(([todayRes, histRes]) => {
        const rec = todayRes.data?.data;
        if (rec) { setTodayRecord(rec); setSelected(rec.status); setNote(rec.note || ''); }
        setHistory(histRes.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleMark = async () => {
    if (!selected) return showToast('Please select a status', 'error');
    setSaving(true);
    try {
      const res = await teacherAttendanceAPI.mark({ status: selected, note });
      const rec = res.data?.data;
      setTodayRecord(rec);
      setHistory(prev => {
        const filtered = prev.filter(r => r.date !== todayStr);
        return [rec, ...filtered];
      });
      showToast('Attendance marked successfully!');
    } catch {
      showToast('Failed to mark attendance', 'error');
    } finally {
      setSaving(false);
    }
  };

  const stats = history.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <Layout pageTitle="My Attendance">
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '8px 0' }}>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a202c', margin: 0 }}>My Attendance</h2>
          <p style={{ color: '#718096', margin: '4px 0 0', fontSize: 14 }}>{today}</p>
        </div>

        {/* Mark Today's Attendance */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span className="material-icons" style={{ color: '#7c3aed' }}>today</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#2d3748' }}>
              Mark Today's Attendance
              {todayRecord && (
                <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                  background: STATUS_CONFIG[todayRecord.status]?.bg,
                  color: STATUS_CONFIG[todayRecord.status]?.color }}>
                  Already marked: {STATUS_CONFIG[todayRecord.status]?.label}
                </span>
              )}
            </h3>
          </div>

          {/* Status buttons */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setSelected(key)}
                style={{
                  flex: 1, minWidth: 110, padding: '14px 10px',
                  border: `2px solid ${selected === key ? cfg.color : '#e2e8f0'}`,
                  borderRadius: 12, background: selected === key ? cfg.bg : '#fafafa',
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}
              >
                <span className="material-icons" style={{ fontSize: 28, color: selected === key ? cfg.color : '#a0aec0' }}>
                  {cfg.icon}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: selected === key ? cfg.color : '#718096' }}>
                  {cfg.label}
                </span>
              </button>
            ))}
          </div>

          {/* Note */}
          <textarea
            placeholder="Add a note (optional)..."
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1.5px solid #e2e8f0', fontSize: 14, resize: 'vertical',
              outline: 'none', color: '#2d3748', boxSizing: 'border-box',
            }}
          />

          <button
            onClick={handleMark}
            disabled={saving || !selected}
            style={{
              marginTop: 14, width: '100%', padding: '13px',
              background: selected ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : '#e2e8f0',
              color: selected ? '#fff' : '#a0aec0', border: 'none',
              borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: selected ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Saving…' : todayRecord ? 'Update Attendance' : 'Mark Attendance'}
          </button>
        </div>

        {/* Monthly Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              borderRadius: 12, padding: '16px 12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: cfg.color }}>{stats[key] || 0}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.label}</div>
              <div style={{ fontSize: 11, color: '#a0aec0' }}>This Month</div>
            </div>
          ))}
        </div>

        {/* History */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ color: '#7c3aed', fontSize: 20 }}>history</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2d3748' }}>This Month's History</h3>
          </div>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#a0aec0' }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#a0aec0' }}>
              <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>event_note</span>
              No attendance marked yet this month
            </div>
          ) : (
            <div>
              {history.map(r => {
                const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.PRESENT;
                return (
                  <div key={r.id} style={{
                    padding: '14px 20px', borderBottom: '1px solid #f8fafc',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <span className="material-icons" style={{ color: cfg.color, fontSize: 22 }}>{cfg.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#2d3748' }}>
                        {new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      {r.note && <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>{r.note}</div>}
                    </div>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: cfg.bg, color: cfg.color,
                    }}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
