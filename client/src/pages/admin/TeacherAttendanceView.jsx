import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { teacherAttendanceAPI } from '../../services/api';

const STATUS_CONFIG = {
  PRESENT: { label: 'Present', icon: 'check_circle', color: '#16a34a', bg: '#f0fdf4' },
  ABSENT:  { label: 'Absent',  icon: 'cancel',       color: '#dc2626', bg: '#fef2f2' },
  LEAVE:   { label: 'Leave',   icon: 'event_busy',   color: '#d97706', bg: '#fffbeb' },
};

export default function TeacherAttendanceView() {
  const todayISO = new Date().toISOString().slice(0, 10);
  const [date,     setDate]     = useState(todayISO);
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [view,     setView]     = useState('date'); // 'date' | 'range'
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [toDate,   setToDate]   = useState(todayISO);

  const load = async () => {
    setLoading(true);
    try {
      const res = view === 'date'
        ? await teacherAttendanceAPI.byDate(date)
        : await teacherAttendanceAPI.byRange(fromDate, toDate);
      setRecords(res.data?.data || []);
    } catch { setRecords([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const stats = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <Layout pageTitle="Teacher Attendance">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a202c', margin: 0 }}>Teacher Attendance</h2>
          <p style={{ color: '#718096', margin: '4px 0 0', fontSize: 14 }}>View attendance marked by teachers</p>
        </div>

        {/* Filter Panel */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['date', 'range'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                background: view === v ? '#7c3aed' : '#f0f4f8',
                color: view === v ? '#fff' : '#4a5568',
              }}>
                {v === 'date' ? 'By Date' : 'Date Range'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {view === 'date' ? (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#718096', display: 'block', marginBottom: 4 }}>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
              </div>
            ) : (
              <>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#718096', display: 'block', marginBottom: 4 }}>From</label>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#718096', display: 'block', marginBottom: 4 }}>To</label>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                </div>
              </>
            )}
            <button onClick={load} style={{
              padding: '10px 24px', background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
              color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>
              Search
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{
              background: cfg.bg, borderRadius: 12, padding: '16px 12px', textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: cfg.color }}>{stats[key] || 0}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{cfg.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ color: '#7c3aed', fontSize: 20 }}>person_check</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2d3748' }}>
              Attendance Records {records.length > 0 && `(${records.length})`}
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>Loading…</div>
          ) : records.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>
              <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 8 }}>event_note</span>
              No attendance records found
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Teacher', 'Date', 'Status', 'Note'].map(h => (
                        <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => {
                      const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.PRESENT;
                      return (
                        <tr key={r.id} style={{ borderTop: '1px solid #f0f4f8' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '14px 20px', fontWeight: 600, color: '#2d3748', fontSize: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: '50%',
                                background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
                              }}>
                                {(r.teacherName || 'T').charAt(0).toUpperCase()}
                              </div>
                              {r.teacherName || '—'}
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px', color: '#4a5568', fontSize: 14 }}>
                            {new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                              background: cfg.bg, color: cfg.color,
                            }}>
                              <span className="material-icons" style={{ fontSize: 14 }}>{cfg.icon}</span>
                              {cfg.label}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', color: '#718096', fontSize: 13 }}>
                            {r.note || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
