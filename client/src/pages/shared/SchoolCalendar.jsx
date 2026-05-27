import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { calendarAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const TYPE_META = {
  HOLIDAY: { bg: '#fff5f5', color: '#c53030', label: 'Holiday' },
  EVENT:   { bg: '#ebf8ff', color: '#2b6cb0', label: 'Event'   },
  EXAM:    { bg: '#faf5ff', color: '#6b46c1', label: 'Exam'    },
  MEETING: { bg: '#f0fff4', color: '#276749', label: 'Meeting'  },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const fmt = (d) => d ? new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export default function SchoolCalendar() {
  const { user } = useAuth();
  const canEdit  = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const today    = new Date();

  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [year,     setYear]     = useState(today.getFullYear());
  const [month,    setMonth]    = useState(today.getMonth()); // 0-based
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [form,     setForm]     = useState({ title: '', description: '', startDate: '', endDate: '', eventType: 'EVENT' });
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await calendarAPI.getEvents();
      setEvents(res.data?.data || []);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build calendar grid
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMo  = new Date(year, month + 1, 0).getDate();
  const cells     = Array(firstDay).fill(null).concat(Array.from({ length: daysInMo }, (_, i) => i + 1));

  const eventsForDay = (d) => {
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return events.filter(e => e.startDate <= dateStr && (!e.endDate || e.endDate >= dateStr));
  };

  const monthEvents = events.filter(e => {
    const mo = parseInt(e.startDate?.split('-')[1]) - 1;
    const yr = parseInt(e.startDate?.split('-')[0]);
    return yr === year && mo === month;
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate) { setError('Title and start date are required'); return; }
    setSaving(true); setError('');
    try {
      if (editId) await calendarAPI.updateEvent(editId, form);
      else        await calendarAPI.createEvent(form);
      setShowForm(false); setEditId(null);
      setForm({ title: '', description: '', startDate: '', endDate: '', eventType: 'EVENT' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save event');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    try { await calendarAPI.deleteEvent(id); await load(); } catch {}
  };

  const openEdit = (ev) => {
    setForm({ title: ev.title, description: ev.description || '', startDate: ev.startDate, endDate: ev.endDate || '', eventType: ev.eventType || 'EVENT' });
    setEditId(ev.id); setShowForm(true);
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' };

  return (
    <Layout pageTitle="School Calendar">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a202c', margin: 0 }}>School Calendar</h1>
            <p style={{ color: '#718096', marginTop: 4, fontSize: 14 }}>Holidays, exams, and school events</p>
          </div>
          {canEdit && (
            <button onClick={() => { setShowForm(true); setEditId(null); setForm({ title: '', description: '', startDate: '', endDate: '', eventType: 'EVENT' }); }}
              style={{ padding: '10px 20px', background: '#4299e1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-icons" style={{ fontSize: 18 }}>add</span> Add Event
            </button>
          )}
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', padding: 24, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>{editId ? 'Edit Event' : 'New Event'}</h3>
            {error && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>{error}</div>}
            <form onSubmit={handleSave}>
              <div className="calendar-form-grid">
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 5 }}>Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 5 }}>Type</label>
                  <select value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))} style={inp}>
                    {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 5 }}>Start Date *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 5 }}>End Date</label>
                  <input type="date" value={form.endDate} min={form.startDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={inp} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 5 }}>Description</label>
                  <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" style={{ ...inp, resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={saving} style={{ padding: '9px 22px', background: '#4299e1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {saving ? 'Saving…' : (editId ? 'Update' : 'Create')}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} style={{ padding: '9px 22px', background: '#edf2f7', color: '#4a5568', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="calendar-main-grid">

          {/* Calendar grid */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            {/* Month navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
                <span className="material-icons">chevron_left</span>
              </button>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{MONTHS[month]} {year}</span>
              <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
                <span className="material-icons">chevron_right</span>
              </button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
              {DAYS.map(d => <div key={d} style={{ padding: '8px 0', fontSize: 11, fontWeight: 700, color: '#718096' }}>{d}</div>)}
            </div>

            {/* Cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {cells.map((day, idx) => {
                if (!day) return <div key={`e${idx}`} style={{ minHeight: 70, borderRight: '1px solid #f7fafc', borderBottom: '1px solid #f7fafc' }} />;
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const dayEvs = eventsForDay(day);
                return (
                  <div key={day} style={{ minHeight: 70, borderRight: '1px solid #f7fafc', borderBottom: '1px solid #f7fafc', padding: 4 }}>
                    <div style={{ fontWeight: isToday ? 700 : 400, fontSize: 13, color: isToday ? '#fff' : '#2d3748',
                      background: isToday ? '#4299e1' : 'transparent',
                      borderRadius: 20, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
                      {day}
                    </div>
                    {dayEvs.slice(0, 2).map(ev => {
                      const m = TYPE_META[ev.eventType] || TYPE_META.EVENT;
                      return <div key={ev.id} style={{ fontSize: 10, fontWeight: 600, background: m.bg, color: m.color, borderRadius: 4, padding: '1px 4px', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>;
                    })}
                    {dayEvs.length > 2 && <div style={{ fontSize: 10, color: '#718096' }}>+{dayEvs.length - 2} more</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar: this month's events */}
          <div>
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>{MONTHS[month]} Events</div>
              {loading ? (
                <div style={{ color: '#718096', fontSize: 13, textAlign: 'center', padding: 20 }}>Loading…</div>
              ) : monthEvents.length === 0 ? (
                <div style={{ color: '#a0aec0', fontSize: 13, textAlign: 'center', padding: 20 }}>No events this month</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {monthEvents.map(ev => {
                    const m = TYPE_META[ev.eventType] || TYPE_META.EVENT;
                    return (
                      <div key={ev.id} style={{ borderLeft: `3px solid ${m.color}`, padding: '8px 12px', background: m.bg, borderRadius: '0 8px 8px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: m.color }}>{ev.title}</div>
                            <div style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>
                              {fmt(ev.startDate)}{ev.endDate && ev.endDate !== ev.startDate ? ` – ${fmt(ev.endDate)}` : ''}
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 600, background: m.color, color: '#fff', padding: '1px 7px', borderRadius: 10, display: 'inline-block', marginTop: 4 }}>{m.label}</span>
                          </div>
                          {canEdit && (
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              <button onClick={() => openEdit(ev)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                                <span className="material-icons" style={{ fontSize: 16, color: '#718096' }}>edit</span>
                              </button>
                              <button onClick={() => handleDelete(ev.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                                <span className="material-icons" style={{ fontSize: 16, color: '#e53e3e' }}>delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                        {ev.description && <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>{ev.description}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
