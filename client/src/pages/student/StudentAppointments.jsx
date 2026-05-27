import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { appointmentAPI } from '../../services/api';

const fmt = (d) => d ? new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_STYLE = {
  PENDING:   { bg: '#fffbeb', color: '#92400e', label: 'Pending' },
  ACCEPTED:  { bg: '#f0fff4', color: '#276749', label: 'Accepted' },
  REJECTED:  { bg: '#fff5f5', color: '#c53030', label: 'Declined' },
  CANCELLED: { bg: '#f7fafc', color: '#718096', label: 'Cancelled' },
};

const today = () => new Date().toISOString().split('T')[0];

export default function StudentAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [tab,          setTab]          = useState('list');
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  const [form, setForm] = useState({
    topic: '', proposedDate: '', proposedTime: '', studentNote: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await appointmentAPI.getStudentAppointments();
      setAppointments(res.data?.data || []);
    } catch { setAppointments([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      await appointmentAPI.studentRequest(form);
      setSuccess('Appointment request sent to your class teacher!');
      setForm({ topic: '', proposedDate: '', proposedTime: '', studentNote: '' });
      setTab('list');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send request. Please try again.');
    } finally { setSubmitting(false); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment request?')) return;
    setError(''); setSuccess('');
    try {
      await appointmentAPI.studentCancel(id);
      setSuccess('Appointment cancelled.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel.');
    }
  };

  return (
    <Layout pageTitle="Parent-Teacher Appointment">
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 }}>Parent-Teacher Appointment</h1>
          <p style={{ color: '#718096', marginTop: 4, fontSize: 13 }}>
            Request a one-on-one meeting with your class teacher.
          </p>
        </div>

        {error   && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: '#f0fff4', color: '#276749', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{success}</div>}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
          {[{ key: 'list', label: 'My Appointments' }, { key: 'new', label: '+ New Request' }].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setError(''); setSuccess(''); }}
              style={{ padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: 'none', borderBottom: tab === t.key ? '2px solid #4299e1' : '2px solid transparent',
                color: tab === t.key ? '#4299e1' : '#718096', marginBottom: -2 }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'new' ? (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', padding: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2d3748', marginBottom: 20, marginTop: 0 }}>
              Request a Meeting with Your Class Teacher
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>
                  Topic <span style={{ color: '#c53030' }}>*</span>
                </label>
                <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="e.g. Academic performance, Attendance concern…"
                  maxLength={200} required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>
                    Preferred Date <span style={{ color: '#c53030' }}>*</span>
                  </label>
                  <input type="date" value={form.proposedDate} min={today()} required
                    onChange={e => setForm(f => ({ ...f, proposedDate: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>
                    Preferred Time
                  </label>
                  <input type="time" value={form.proposedTime}
                    onChange={e => setForm(f => ({ ...f, proposedTime: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>
                  Additional Note
                </label>
                <textarea value={form.studentNote} maxLength={500}
                  onChange={e => setForm(f => ({ ...f, studentNote: e.target.value }))}
                  placeholder="Any specific concerns or details you'd like to share…"
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <button type="submit" disabled={submitting}
                style={{ padding: '12px 0', background: submitting ? '#a0aec0' : '#4299e1', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Sending…' : 'Send Request'}
              </button>
            </form>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#718096' }}>
            <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>hourglass_top</span>
            Loading…
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 52, display: 'block', marginBottom: 12, opacity: 0.4 }}>event_note</span>
            <p style={{ fontWeight: 600, margin: 0 }}>No appointments yet</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Click "+ New Request" to schedule a meeting with your class teacher.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {appointments.map(appt => {
              const s = STATUS_STYLE[appt.status] || STATUS_STYLE.PENDING;
              const isTeacherInitiated = appt.requestedBy === 'TEACHER';
              return (
                <div key={appt.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#2d3748' }}>{appt.topic}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                          background: s.bg, color: s.color }}>{s.label}</span>
                        {isTeacherInitiated && (
                          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20,
                            background: '#ebf8ff', color: '#2b6cb0', fontWeight: 600 }}>Teacher Requested</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#718096', marginTop: 6 }}>
                        <span className="material-icons" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>person</span>
                        {appt.teacherName}
                        {' · '}
                        <span className="material-icons" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>calendar_today</span>
                        {fmt(appt.proposedDate)}{appt.proposedTime ? ` at ${appt.proposedTime}` : ''}
                      </div>
                      {appt.studentNote && (
                        <div style={{ fontSize: 12, color: '#718096', marginTop: 6, fontStyle: 'italic' }}>
                          Your note: {appt.studentNote}
                        </div>
                      )}
                      {appt.teacherNote && (
                        <div style={{ fontSize: 12, color: '#4a5568', marginTop: 6, background: '#f8fafc', borderRadius: 6, padding: '6px 10px' }}>
                          Teacher's response: {appt.teacherNote}
                        </div>
                      )}
                    </div>
                    {(appt.status === 'PENDING' || appt.status === 'ACCEPTED') && (
                      <button onClick={() => handleCancel(appt.id)}
                        style={{ padding: '6px 14px', background: '#fff5f5', color: '#c53030',
                          border: '1px solid #fed7d7', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Cancel
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 10 }}>
                    Requested {new Date(appt.createdAt).toLocaleDateString('en-IN')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
