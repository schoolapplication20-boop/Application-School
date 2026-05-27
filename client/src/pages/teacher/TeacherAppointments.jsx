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

export default function TeacherAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [students,     setStudents]     = useState([]);
  const [tab,          setTab]          = useState('list');
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  // New request form
  const [form, setForm] = useState({
    studentId: '', topic: '', proposedDate: '', proposedTime: '', teacherNote: '',
  });

  // Respond modal
  const [responding,    setResponding]    = useState(null); // appointment object
  const [respondForm,   setRespondForm]   = useState({ status: 'ACCEPTED', teacherNote: '', confirmedDate: '', confirmedTime: '' });
  const [respondLoading, setRespondLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([
        appointmentAPI.getTeacherAppointments(),
        appointmentAPI.getClassStudents(),
      ]);
      setAppointments(aRes.data?.data || []);
      setStudents(sRes.data?.data || []);
    } catch { setAppointments([]); setStudents([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRequest = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      await appointmentAPI.teacherRequest(form);
      setSuccess('Appointment request sent to student.');
      setForm({ studentId: '', topic: '', proposedDate: '', proposedTime: '', teacherNote: '' });
      setTab('list');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send request.');
    } finally { setSubmitting(false); }
  };

  const openRespond = (appt) => {
    setResponding(appt);
    setRespondForm({ status: 'ACCEPTED', teacherNote: '', confirmedDate: appt.proposedDate || '', confirmedTime: appt.proposedTime || '' });
    setError(''); setSuccess('');
  };

  const handleRespond = async () => {
    setRespondLoading(true); setError('');
    try {
      await appointmentAPI.teacherRespond(responding.id, respondForm);
      setSuccess(respondForm.status === 'ACCEPTED' ? 'Appointment accepted.' : 'Appointment declined.');
      setResponding(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to respond.');
    } finally { setRespondLoading(false); }
  };

  const pendingCount = appointments.filter(a => a.status === 'PENDING' && a.requestedBy === 'STUDENT').length;

  return (
    <Layout pageTitle="Appointments">
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>

        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a202c', margin: 0 }}>Parent-Teacher Appointments</h1>
            <p style={{ color: '#718096', marginTop: 4, fontSize: 13 }}>Manage appointment requests with your class students.</p>
          </div>
          {pendingCount > 0 && (
            <span style={{ background: '#c53030', color: '#fff', fontSize: 12, fontWeight: 700,
              padding: '4px 12px', borderRadius: 20 }}>
              {pendingCount} pending
            </span>
          )}
        </div>

        {error   && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: '#f0fff4', color: '#276749', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{success}</div>}

        {/* Respond modal */}
        {responding && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 460, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2d3748', margin: '0 0 6px' }}>Respond to Request</h3>
              <p style={{ fontSize: 13, color: '#718096', margin: '0 0 20px' }}>
                {responding.studentName} · {responding.topic}
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['ACCEPTED', 'REJECTED'].map(s => (
                  <button key={s} onClick={() => setRespondForm(f => ({ ...f, status: s }))}
                    style={{ flex: 1, padding: '9px 0', border: '2px solid',
                      borderColor: respondForm.status === s ? (s === 'ACCEPTED' ? '#48bb78' : '#fc8181') : '#e2e8f0',
                      background: respondForm.status === s ? (s === 'ACCEPTED' ? '#f0fff4' : '#fff5f5') : '#fff',
                      color: respondForm.status === s ? (s === 'ACCEPTED' ? '#276749' : '#c53030') : '#718096',
                      borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {s === 'ACCEPTED' ? 'Accept' : 'Decline'}
                  </button>
                ))}
              </div>
              {respondForm.status === 'ACCEPTED' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Confirm Date</label>
                    <input type="date" value={respondForm.confirmedDate} min={today()}
                      onChange={e => setRespondForm(f => ({ ...f, confirmedDate: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Confirm Time</label>
                    <input type="time" value={respondForm.confirmedTime}
                      onChange={e => setRespondForm(f => ({ ...f, confirmedTime: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Note to Student/Parent (optional)</label>
                <textarea value={respondForm.teacherNote} maxLength={300}
                  onChange={e => setRespondForm(f => ({ ...f, teacherNote: e.target.value }))}
                  placeholder="Add a note…" rows={2}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleRespond} disabled={respondLoading}
                  style={{ flex: 1, padding: '10px 0',
                    background: respondLoading ? '#a0aec0' : (respondForm.status === 'ACCEPTED' ? '#48bb78' : '#fc8181'),
                    color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: respondLoading ? 'not-allowed' : 'pointer' }}>
                  {respondLoading ? 'Saving…' : (respondForm.status === 'ACCEPTED' ? 'Confirm Accept' : 'Confirm Decline')}
                </button>
                <button onClick={() => setResponding(null)}
                  style={{ padding: '10px 18px', background: '#edf2f7', color: '#4a5568', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
          {[{ key: 'list', label: 'All Appointments' }, { key: 'new', label: '+ Request Meeting' }].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setError(''); setSuccess(''); }}
              style={{ padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: 'none', borderBottom: tab === t.key ? '2px solid #4299e1' : '2px solid transparent',
                color: tab === t.key ? '#4299e1' : '#718096', marginBottom: -2 }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'new' ? (
          students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0' }}>
              <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.4 }}>people_outline</span>
              <p style={{ fontWeight: 600, margin: 0 }}>No class assigned</p>
              <p style={{ fontSize: 13, marginTop: 6 }}>You must be assigned as a class teacher to request appointments.</p>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', padding: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2d3748', marginBottom: 20, marginTop: 0 }}>
                Request Meeting with Student / Parent
              </h2>
              <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>
                    Student <span style={{ color: '#c53030' }}>*</span>
                  </label>
                  <select value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}>
                    <option value="">Select a student…</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}{s.rollNumber ? ` (Roll: ${s.rollNumber})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>
                    Topic <span style={{ color: '#c53030' }}>*</span>
                  </label>
                  <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                    placeholder="e.g. Academic performance, behaviour, attendance…"
                    maxLength={200} required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>
                      Proposed Date <span style={{ color: '#c53030' }}>*</span>
                    </label>
                    <input type="date" value={form.proposedDate} min={today()} required
                      onChange={e => setForm(f => ({ ...f, proposedDate: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>
                      Proposed Time
                    </label>
                    <input type="time" value={form.proposedTime}
                      onChange={e => setForm(f => ({ ...f, proposedTime: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>Note</label>
                  <textarea value={form.teacherNote} maxLength={500}
                    onChange={e => setForm(f => ({ ...f, teacherNote: e.target.value }))}
                    placeholder="Any details for the parent/student…" rows={3}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>

                <button type="submit" disabled={submitting}
                  style={{ padding: '12px 0', background: submitting ? '#a0aec0' : '#4299e1', color: '#fff',
                    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Sending…' : 'Send Request'}
                </button>
              </form>
            </div>
          )
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#718096' }}>
            <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>hourglass_top</span>Loading…
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 52, display: 'block', marginBottom: 12, opacity: 0.4 }}>event_note</span>
            <p style={{ fontWeight: 600, margin: 0 }}>No appointments yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {appointments.map(appt => {
              const s = STATUS_STYLE[appt.status] || STATUS_STYLE.PENDING;
              const studentRequested = appt.requestedBy === 'STUDENT';
              const canRespond = appt.status === 'PENDING' && studentRequested;
              return (
                <div key={appt.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#2d3748' }}>{appt.topic}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
                        {!studentRequested && (
                          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#ebf8ff', color: '#2b6cb0', fontWeight: 600 }}>You requested</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#718096' }}>
                        <span className="material-icons" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 3 }}>person</span>
                        {appt.studentName}{appt.parentName ? ` (Parent: ${appt.parentName})` : ''}
                        {' · '}
                        <span className="material-icons" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 3 }}>calendar_today</span>
                        {fmt(appt.proposedDate)}{appt.proposedTime ? ` at ${appt.proposedTime}` : ''}
                      </div>
                      {appt.studentNote && (
                        <div style={{ fontSize: 12, color: '#718096', marginTop: 6, fontStyle: 'italic' }}>Student note: {appt.studentNote}</div>
                      )}
                      {appt.teacherNote && (
                        <div style={{ fontSize: 12, color: '#4a5568', marginTop: 6, background: '#f8fafc', borderRadius: 6, padding: '6px 10px' }}>
                          Your note: {appt.teacherNote}
                        </div>
                      )}
                    </div>
                    {canRespond && (
                      <button onClick={() => openRespond(appt)}
                        style={{ padding: '8px 16px', background: '#4299e1', color: '#fff',
                          border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Respond
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 10 }}>
                    {studentRequested ? 'Student requested' : 'You requested'} · {new Date(appt.createdAt).toLocaleDateString('en-IN')}
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
