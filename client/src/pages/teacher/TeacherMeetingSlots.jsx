import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { meetingAPI } from '../../services/api';

const fmt = (d) => d ? new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export default function TeacherMeetingSlots() {
  const [slots,    setSlots]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ meetingDate: today, startTime: '09:00', endTime: '09:30', topic: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await meetingAPI.getTeacherSlots();
      setSlots(res.data?.data || []);
    } catch { setSlots([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.meetingDate || !form.startTime || !form.endTime) { setError('Date, start time, and end time are required'); return; }
    setSaving(true);
    try {
      await meetingAPI.createSlot(form);
      setSuccess('Slot created!');
      setShowForm(false);
      setForm({ meetingDate: today, startTime: '09:00', endTime: '09:30', topic: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create slot');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this slot?')) return;
    try { await meetingAPI.deleteSlot(id); await load(); } catch {}
  };

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };

  return (
    <Layout pageTitle="Meeting Slots">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a202c', margin: 0 }}>Parent-Teacher Meeting Slots</h1>
            <p style={{ color: '#718096', marginTop: 4, fontSize: 14 }}>Create available slots for parents to book meetings</p>
          </div>
          <button onClick={() => { setShowForm(true); setError(''); setSuccess(''); }}
            style={{ padding: '10px 20px', background: '#48bb78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-icons" style={{ fontSize: 18 }}>add</span> Create Slot
          </button>
        </div>

        {error   && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: '#f0fff4', color: '#276749', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{success}</div>}

        {/* Create Form */}
        {showForm && (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: 24, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>New Meeting Slot</h3>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 5 }}>Date *</label>
                  <input type="date" min={today} value={form.meetingDate} onChange={e => setForm(f => ({ ...f, meetingDate: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 5 }}>Start Time *</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 5 }}>End Time *</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} style={inp} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 5 }}>Topic / Agenda</label>
                  <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. Mid-term progress discussion" style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={saving} style={{ padding: '9px 22px', background: '#48bb78', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {saving ? 'Creating…' : 'Create Slot'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 22px', background: '#edf2f7', color: '#4a5568', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Slot list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#718096' }}>
            <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>hourglass_top</span>
            Loading slots…
          </div>
        ) : slots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.4 }}>event_available</span>
            <p style={{ fontWeight: 600 }}>No meeting slots yet</p>
            <p style={{ fontSize: 13 }}>Create a slot to let parents book meetings with you.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {slots.map(({ slot, bookings }) => (
              <div key={slot.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span className="material-icons" style={{ color: '#48bb78', fontSize: 24 }}>event_available</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#2d3748' }}>{fmt(slot.meetingDate)}</div>
                      <div style={{ fontSize: 13, color: '#718096' }}>{slot.startTime} – {slot.endTime}</div>
                      {slot.topic && <div style={{ fontSize: 12, color: '#4a5568', marginTop: 2 }}>📋 {slot.topic}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                      background: slot.isAvailable ? '#f0fff4' : '#fff5f5',
                      color: slot.isAvailable ? '#276749' : '#c53030' }}>
                      {slot.isAvailable ? 'Available' : 'Booked'}
                    </span>
                    <button onClick={() => handleDelete(slot.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <span className="material-icons" style={{ fontSize: 18, color: '#e53e3e' }}>delete</span>
                    </button>
                  </div>
                </div>

                {bookings && bookings.length > 0 && (
                  <div style={{ padding: '12px 20px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#718096', marginBottom: 8 }}>BOOKINGS</div>
                    {bookings.map(b => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f7fafc' }}>
                        <span className="material-icons" style={{ fontSize: 18, color: b.status === 'CONFIRMED' ? '#48bb78' : '#a0aec0' }}>
                          {b.status === 'CONFIRMED' ? 'check_circle' : 'cancel'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{b.studentName}</div>
                          {b.parentName && <div style={{ fontSize: 12, color: '#718096' }}>Parent: {b.parentName}</div>}
                          {b.parentEmail && <div style={{ fontSize: 12, color: '#718096' }}>Email: {b.parentEmail}</div>}
                          {b.notes && <div style={{ fontSize: 12, color: '#4a5568', fontStyle: 'italic' }}>Note: {b.notes}</div>}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                          background: b.status === 'CONFIRMED' ? '#f0fff4' : '#f7fafc',
                          color: b.status === 'CONFIRMED' ? '#276749' : '#a0aec0' }}>
                          {b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
