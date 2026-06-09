import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { calendarAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const TYPE_META = {
  HOLIDAY: { color: '#ef4444', label: 'Holiday', icon: 'beach_access' },
  EVENT:   { color: '#3b82f6', label: 'Event',   icon: 'event'        },
  EXAM:    { color: '#8b5cf6', label: 'Exam',    icon: 'quiz'         },
  MEETING: { color: '#10b981', label: 'Meeting', icon: 'groups'       },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const fmt = (d) => d ? new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export default function SchoolCalendar() {
  const { user } = useAuth();
  const canEdit  = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const today    = new Date();

  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [year,     setYear]     = useState(today.getFullYear());
  const [month,    setMonth]    = useState(today.getMonth());
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

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMo = new Date(year, month + 1, 0).getDate();
  const cells    = Array(firstDay).fill(null).concat(Array.from({ length: daysInMo }, (_, i) => i + 1));

  const eventsForDay = (d) => {
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return events.filter(e => e.startDate <= dateStr && (!e.endDate || e.endDate >= dateStr));
  };

  const monthEvents = events
    .filter(e => {
      const mo = parseInt(e.startDate?.split('-')[1]) - 1;
      const yr = parseInt(e.startDate?.split('-')[0]);
      return yr === year && mo === month;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

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

  const resetForm = () => { setShowForm(false); setEditId(null); setForm({ title: '', description: '', startDate: '', endDate: '', eventType: 'EVENT' }); setError(''); };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  const inp = {
    width: '100%', padding: '9px 12px',
    border: '1px solid var(--border, #e2e8f0)',
    borderRadius: 8, fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
    background: 'var(--surface-input, #fafafa)',
    color: 'var(--text-primary, #1a202c)',
  };

  const eventCount = monthEvents.length;
  const accentColor = '#3b82f6';

  return (
    <Layout pageTitle="School Calendar">
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: 24 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary, #1a202c)', margin: 0, letterSpacing: '-0.3px' }}>
              School Calendar
            </h1>
            <p style={{ color: 'var(--text-muted, #718096)', marginTop: 4, fontSize: 14 }}>
              Holidays, exams, events &amp; meetings
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Type legend */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(TYPE_META).map(([k, v]) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: v.color, background: v.color + '15', padding: '3px 9px', borderRadius: 20 }}>
                  <span className="material-icons" style={{ fontSize: 12 }}>{v.icon}</span>
                  {v.label}
                </span>
              ))}
            </div>
            {canEdit && (
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(59,130,246,0.35)', whiteSpace: 'nowrap' }}>
                <span className="material-icons" style={{ fontSize: 18 }}>add</span>
                Add Event
              </button>
            )}
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div style={{ background: 'var(--surface, #fff)', borderRadius: 16, boxShadow: 'var(--shadow-card, 0 4px 20px rgba(0,0,0,0.08))', border: '1px solid var(--border, #f0f4f8)', padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: accentColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-icons" style={{ fontSize: 18, color: accentColor }}>{editId ? 'edit' : 'add_circle'}</span>
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #1a202c)' }}>
                {editId ? 'Edit Event' : 'New Event'}
              </h3>
            </div>
            {error && (
              <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13, border: '1px solid #fed7d7' }}>{error}</div>
            )}
            <form onSubmit={handleSave}>
              <div className="calendar-form-grid">
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #4a5568)', display: 'block', marginBottom: 5 }}>Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title" style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #4a5568)', display: 'block', marginBottom: 5 }}>Type</label>
                  <select value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))} style={inp}>
                    {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #4a5568)', display: 'block', marginBottom: 5 }}>Start Date *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #4a5568)', display: 'block', marginBottom: 5 }}>End Date</label>
                  <input type="date" value={form.endDate} min={form.startDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={inp} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #4a5568)', display: 'block', marginBottom: 5 }}>Description</label>
                  <textarea rows={2} maxLength={500} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" style={{ ...inp, resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={saving}
                  style={{ padding: '9px 22px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : (editId ? 'Update Event' : 'Create Event')}
                </button>
                <button type="button" onClick={resetForm}
                  style={{ padding: '9px 22px', background: 'var(--surface-alt, #f7fafc)', color: 'var(--text-secondary, #4a5568)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="calendar-main-grid">

          {/* Calendar grid */}
          <div style={{ background: 'var(--surface, #fff)', borderRadius: 16, boxShadow: 'var(--shadow-card, 0 2px 14px rgba(0,0,0,0.07))', border: '1px solid var(--border, #f0f4f8)', overflow: 'hidden' }}>

            {/* Month navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border, #f0f4f8)', background: 'var(--surface-alt, #f7fafc)' }}>
              <button onClick={prevMonth} style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary, #4a5568)' }}>
                <span className="material-icons" style={{ fontSize: 20 }}>chevron_left</span>
              </button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary, #1a202c)', letterSpacing: '-0.3px' }}>{MONTHS[month]}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #a0aec0)', marginTop: 1 }}>{year}</div>
              </div>
              <button onClick={nextMonth} style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 8, cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary, #4a5568)' }}>
                <span className="material-icons" style={{ fontSize: 20 }}>chevron_right</span>
              </button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center', borderBottom: '1px solid var(--border, #f0f4f8)', background: 'var(--surface-alt, #f7fafc)' }}>
              {DAYS.map((d, i) => (
                <div key={d} style={{ padding: '8px 0', fontSize: 11, fontWeight: 700, color: i === 0 ? '#ef4444' : 'var(--text-muted, #718096)' }}>{d}</div>
              ))}
            </div>

            {/* Cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {cells.map((day, idx) => {
                if (!day) return <div key={`e${idx}`} style={{ minHeight: 76, borderRight: '1px solid var(--border, #f7fafc)', borderBottom: '1px solid var(--border, #f7fafc)', background: 'var(--surface-alt, #fafafa)' }} />;
                const isToday   = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const isSunday  = new Date(year, month, day).getDay() === 0;
                const dayEvs    = eventsForDay(day);
                return (
                  <div key={day} style={{ minHeight: 76, borderRight: '1px solid var(--border, #f0f4f8)', borderBottom: '1px solid var(--border, #f0f4f8)', padding: '4px 3px', background: 'var(--surface, #fff)' }}>
                    <div style={{
                      fontWeight: isToday ? 800 : 400,
                      fontSize: 13,
                      color: isToday ? '#fff' : isSunday ? '#ef4444' : 'var(--text-primary, #2d3748)',
                      background: isToday ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'transparent',
                      borderRadius: '50%', width: 26, height: 26,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 3,
                      boxShadow: isToday ? '0 2px 8px rgba(59,130,246,0.4)' : 'none',
                    }}>
                      {day}
                    </div>
                    {dayEvs.slice(0, 2).map(ev => {
                      const meta = TYPE_META[ev.eventType] || TYPE_META.EVENT;
                      return (
                        <div key={ev.id} style={{ fontSize: 10, fontWeight: 600, background: meta.color + '18', color: meta.color, borderLeft: `2px solid ${meta.color}`, borderRadius: '0 3px 3px 0', padding: '1px 4px', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.title}
                        </div>
                      );
                    })}
                    {dayEvs.length > 2 && <div style={{ fontSize: 10, color: 'var(--text-muted, #a0aec0)', fontWeight: 600 }}>+{dayEvs.length - 2}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar: this month's events */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--surface, #fff)', borderRadius: 16, boxShadow: 'var(--shadow-card, 0 2px 14px rgba(0,0,0,0.07))', border: '1px solid var(--border, #f0f4f8)', padding: 20 }}>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingLeft: 10, borderLeft: `3px solid ${accentColor}` }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary, #1a202c)' }}>
                  {MONTHS[month]} Events
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, background: accentColor + '15', padding: '2px 8px', borderRadius: 10 }}>
                  {eventCount}
                </span>
              </div>

              {loading ? (
                <div style={{ color: 'var(--text-muted, #718096)', fontSize: 13, textAlign: 'center', padding: 20 }}>Loading…</div>
              ) : monthEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <span className="material-icons" style={{ fontSize: 36, color: 'var(--text-muted, #cbd5e0)', display: 'block', marginBottom: 8 }}>event_busy</span>
                  <div style={{ color: 'var(--text-muted, #a0aec0)', fontSize: 13 }}>No events this month</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {monthEvents.map(ev => {
                    const meta = TYPE_META[ev.eventType] || TYPE_META.EVENT;
                    return (
                      <div key={ev.id} style={{ borderLeft: `3px solid ${meta.color}`, padding: '10px 12px', background: meta.color + '0d', borderRadius: '0 10px 10px 0', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                              <span className="material-icons" style={{ fontSize: 13, color: meta.color }}>{meta.icon}</span>
                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary, #1a202c)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted, #718096)' }}>
                              {fmt(ev.startDate)}{ev.endDate && ev.endDate !== ev.startDate ? ` – ${fmt(ev.endDate)}` : ''}
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, background: meta.color, color: '#fff', padding: '1px 7px', borderRadius: 10, display: 'inline-block', marginTop: 5 }}>{meta.label}</span>
                            {ev.description && <div style={{ fontSize: 11, color: 'var(--text-secondary, #4a5568)', marginTop: 5, lineHeight: 1.4 }}>{ev.description}</div>}
                          </div>
                          {canEdit && (
                            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                              <button onClick={() => openEdit(ev)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, borderRadius: 6 }}>
                                <span className="material-icons" style={{ fontSize: 15, color: 'var(--text-muted, #718096)' }}>edit</span>
                              </button>
                              <button onClick={() => handleDelete(ev.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, borderRadius: 6 }}>
                                <span className="material-icons" style={{ fontSize: 15, color: '#ef4444' }}>delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Type breakdown mini-card */}
            {monthEvents.length > 0 && (
              <div style={{ background: 'var(--surface, #fff)', borderRadius: 16, boxShadow: 'var(--shadow-card, 0 2px 14px rgba(0,0,0,0.07))', border: '1px solid var(--border, #f0f4f8)', padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #8a99b0)', letterSpacing: '0.04em', marginBottom: 12, textTransform: 'uppercase' }}>Breakdown</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(TYPE_META).map(([k, v]) => {
                    const count = monthEvents.filter(e => (e.eventType || 'EVENT') === k).length;
                    if (!count) return null;
                    return (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="material-icons" style={{ fontSize: 15, color: v.color }}>{v.icon}</span>
                        <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary, #4a5568)', fontWeight: 600 }}>{v.label}</div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: v.color }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
