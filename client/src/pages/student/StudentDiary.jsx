import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { studentAPI } from '../../services/api';

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
};

export default function StudentDiary() {
  const [entries, setEntries]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDate, setFilterDate]   = useState('');
  const [selected, setSelected]       = useState(null);

  useEffect(() => {
    studentAPI.getMyDiary()
      .then(res => setEntries(res.data?.data ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const subjects = [...new Set(entries.map(e => e.subject).filter(Boolean))];

  const filtered = entries.filter(e => {
    const matchSubject = !filterSubject || e.subject === filterSubject;
    const matchDate    = !filterDate    || e.diaryDate === filterDate;
    return matchSubject && matchDate;
  });

  if (loading) {
    return (
      <Layout pageTitle="Class Diary">
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#a0aec0' }}>
          <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>hourglass_empty</span>
          Loading…
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Class Diary">
      <div className="page-header">
        <h1>Class Diary</h1>
        <p>Daily topic, homework, and notes from your teachers</p>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Total Entries',  value: entries.length,          icon: 'menu_book',   color: '#76C442' },
          { label: 'Subjects',       value: subjects.length,          icon: 'science',     color: '#3182ce' },
          { label: 'This Month',     value: entries.filter(e => {
              if (!e.diaryDate) return false;
              const d = new Date(e.diaryDate);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length,               icon: 'calendar_month',          color: '#805ad5' },
          { label: 'Latest Entry',   value: entries.length > 0 ? fmtDate(entries[0].diaryDate) : '—', icon: 'event', color: '#ed8936' },
        ].map((s, i) => (
          <div key={i} className="stat-card card-hover">
            <div className="stat-icon" style={{ backgroundColor: s.color + '15' }}>
              <span className="material-icons" style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div className="stat-value" style={{ fontSize: s.label === 'Latest Entry' ? '16px' : undefined }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="data-table-card" style={{ marginBottom: '20px' }}>
        <div className="search-filter-bar">
          <select className="filter-select" value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s}>{s}</option>)}
          </select>
          <input type="date" value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
          {(filterSubject || filterDate) && (
            <button onClick={() => { setFilterSubject(''); setFilterDate(''); }}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff5f5', color: '#e53e3e', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
              Clear Filters
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#a0aec0' }}>
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#a0aec0' }}>
          <span className="material-icons" style={{ fontSize: 56, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>menu_book</span>
          <h3 style={{ color: '#a0aec0', margin: '0 0 8px' }}>
            {entries.length === 0 ? 'No diary entries yet' : 'No entries match your filters'}
          </h3>
        </div>
      ) : (
        <div className="data-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Topic Covered</th>
                <th>Homework</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id}>
                  <td style={{ fontSize: 13, color: '#4a5568', whiteSpace: 'nowrap' }}>
                    {fmtDate(entry.diaryDate)}
                  </td>
                  <td>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: '#76C44215', color: '#276749',
                    }}>
                      {entry.subject || 'General'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: '#2d3748', maxWidth: 240 }}>
                    {entry.topic && entry.topic.length > 60
                      ? entry.topic.slice(0, 60) + '…'
                      : (entry.topic || '—')}
                  </td>
                  <td style={{ fontSize: 13, color: '#4a5568', maxWidth: 240 }}>
                    {entry.homework && entry.homework.length > 60
                      ? entry.homework.slice(0, 60) + '…'
                      : (entry.homework || '—')}
                  </td>
                  <td>
                    <button onClick={() => setSelected(entry)}
                      style={{ border: 'none', background: '#ebf8ff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#2b6cb0', fontWeight: 600, fontSize: 12 }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: '#2d3748' }}>
                  {selected.subject || 'General Diary'}
                </div>
                <div style={{ fontSize: 13, color: '#a0aec0', marginTop: 2 }}>
                  {fmtDate(selected.diaryDate)}
                  {selected.teacherName && ` · By ${selected.teacherName}`}
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ border: 'none', background: '#fff5f5', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#e53e3e' }}>
                <span className="material-icons" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Topic */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Topic Covered
                </div>
                <div style={{ fontSize: 14, color: '#2d3748', lineHeight: 1.6 }}>{selected.topic || '—'}</div>
              </div>

              {/* Homework */}
              <div style={{ marginBottom: 16, background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Homework
                </div>
                <div style={{ fontSize: 14, color: '#2d3748', lineHeight: 1.6 }}>{selected.homework || '—'}</div>
              </div>

              {/* Description */}
              {selected.description && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Notes
                  </div>
                  <div style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.6 }}>{selected.description}</div>
                </div>
              )}

              {/* Remarks */}
              {selected.remarks && (
                <div style={{ marginBottom: 16, background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Teacher's Remark
                  </div>
                  <div style={{ fontSize: 13, color: '#4a5568', fontStyle: 'italic' }}>{selected.remarks}</div>
                </div>
              )}

              {/* Image */}
              {selected.imageUrl && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                    Diary Photo
                  </div>
                  <img src={selected.imageUrl} alt="Diary"
                    style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 10, background: '#f7fafc' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
