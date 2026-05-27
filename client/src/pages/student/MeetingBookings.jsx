import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { meetingAPI } from '../../services/api';

const fmt = (d) => d ? new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export default function MeetingBookings() {
  const [slots,     setSlots]     = useState([]);
  const [bookings,  setBookings]  = useState([]);
  const [tab,       setTab]       = useState('available');
  const [loading,   setLoading]   = useState(true);
  const [booking,   setBooking]   = useState(null); // slotId being booked
  const [noteInput, setNoteInput] = useState('');
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, bRes] = await Promise.all([meetingAPI.getAvailableSlots(), meetingAPI.getMyBookings()]);
      setSlots(sRes.data?.data || []);
      setBookings(bRes.data?.data || []);
    } catch { setSlots([]); setBookings([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const handleBook = async (slotId) => {
    setError(''); setSuccess('');
    try {
      await meetingAPI.bookSlot(slotId, { notes: noteInput });
      setSuccess('Meeting booked successfully! A confirmation email has been sent.');
      setBooking(null); setNoteInput('');
      await loadSlots();
      setTab('mybookings');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book slot');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await meetingAPI.cancelBooking(id);
      setSuccess('Booking cancelled.');
      await loadSlots();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  return (
    <Layout pageTitle="Meeting Bookings">
      <div style={{ maxWidth: 860, margin: '0 auto', padding: 24 }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a202c', margin: 0 }}>Parent-Teacher Meetings</h1>
          <p style={{ color: '#718096', marginTop: 4, fontSize: 14 }}>Book a meeting slot with your teacher</p>
        </div>

        {error   && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}
        {success && <div style={{ background: '#f0fff4', color: '#276749', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{success}</div>}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
          {[{ key: 'available', label: 'Available Slots' }, { key: 'mybookings', label: 'My Bookings' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: 'none', borderBottom: tab === t.key ? '2px solid #4299e1' : '2px solid transparent',
                color: tab === t.key ? '#4299e1' : '#718096', marginBottom: -2 }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#718096' }}>
            <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>hourglass_top</span>Loading…
          </div>
        ) : tab === 'available' ? (
          slots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0' }}>
              <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.4 }}>event_busy</span>
              <p style={{ fontWeight: 600 }}>No available slots right now</p>
              <p style={{ fontSize: 13 }}>Check back later — your teacher may add new slots.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {slots.map(slot => (
                <div key={slot.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#ebf8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-icons" style={{ fontSize: 24, color: '#2b6cb0' }}>event_available</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#2d3748' }}>{slot.teacherName}</div>
                      <div style={{ fontSize: 13, color: '#718096' }}>{fmt(slot.meetingDate)} · {slot.startTime} – {slot.endTime}</div>
                      {slot.topic && <div style={{ fontSize: 12, color: '#4a5568', marginTop: 4 }}>📋 {slot.topic}</div>}
                    </div>
                  </div>
                  <div>
                    {booking === slot.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
                        <input value={noteInput} onChange={e => setNoteInput(e.target.value)}
                          placeholder="Add a note (optional)" maxLength={200}
                          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleBook(slot.id)}
                            style={{ flex: 1, padding: '8px 0', background: '#4299e1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            Confirm Book
                          </button>
                          <button onClick={() => setBooking(null)}
                            style={{ padding: '8px 14px', background: '#edf2f7', color: '#4a5568', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setBooking(slot.id); setNoteInput(''); setError(''); }}
                        style={{ padding: '9px 20px', background: '#4299e1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Book Slot
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0' }}>
              <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.4 }}>calendar_today</span>
              <p style={{ fontWeight: 600 }}>No bookings yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {bookings.map(({ booking: b, slot }) => (
                <div key={b.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <span className="material-icons" style={{ fontSize: 28, color: b.status === 'CONFIRMED' ? '#48bb78' : '#a0aec0', marginTop: 2 }}>
                      {b.status === 'CONFIRMED' ? 'check_circle' : 'cancel'}
                    </span>
                    <div>
                      {slot && <div style={{ fontWeight: 700, fontSize: 15, color: '#2d3748' }}>{slot.teacherName}</div>}
                      {slot && <div style={{ fontSize: 13, color: '#718096' }}>{fmt(slot.meetingDate)} · {slot.startTime} – {slot.endTime}</div>}
                      {slot?.topic && <div style={{ fontSize: 12, color: '#4a5568', marginTop: 3 }}>📋 {slot.topic}</div>}
                      {b.notes && <div style={{ fontSize: 12, color: '#718096', marginTop: 3, fontStyle: 'italic' }}>Note: {b.notes}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                      background: b.status === 'CONFIRMED' ? '#f0fff4' : '#f7fafc',
                      color: b.status === 'CONFIRMED' ? '#276749' : '#a0aec0' }}>
                      {b.status}
                    </span>
                    {b.status === 'CONFIRMED' && (
                      <button onClick={() => handleCancel(b.id)}
                        style={{ padding: '6px 14px', background: '#fff5f5', color: '#c53030', border: '1px solid #fed7d7', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </Layout>
  );
}
