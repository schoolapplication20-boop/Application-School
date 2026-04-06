import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { parentAPI, diaryAPI } from '../../services/api';

const STATUS_COLOR = { PENDING: '#ed8936', APPROVED: '#76C442', REJECTED: '#e53e3e' };

export default function DiaryView() {
  const { user } = useAuth();

  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [preview,  setPreview]  = useState(null);
  const [toast,    setToast]    = useState(null);
  const [childClass, setChildClass] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Get child's class first, then load diary entries
  useEffect(() => {
    if (!user?.id) return;

    parentAPI.getChildInfo(user.id)
      .then(res => {
        const child = res.data?.data;
        const cls = child?.className ?? child?.class ?? '';
        setChildClass(cls);
        return cls;
      })
      .then(cls => {
        if (!cls) { setLoading(false); return; }
        return diaryAPI.getByClass(cls);
      })
      .then(res => {
        if (!res) return;
        const data = res.data?.data ?? [];
        // Show only APPROVED entries to parents (filter out REJECTED/PENDING)
        const approved = Array.isArray(data) ? data.filter(e => !e.reviewStatus || e.reviewStatus === 'APPROVED' || e.reviewStatus === 'PENDING') : [];
        setEntries(approved);
      })
      .catch(() => {
        setEntries([]);
        showToast('Could not load diary entries', 'error');
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleDownload = (entry) => {
    const link = document.createElement('a');
    link.href = entry.imageUrl;
    link.download = entry.imageName || `diary-${entry.diaryDate}.jpg`;
    link.click();
  };

  // Group entries by date for a nice timeline view
  const grouped = entries.reduce((acc, entry) => {
    const date = entry.diaryDate || 'Unknown';
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <Layout pageTitle="Class Diary">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Class Diary</h1>
        <p>Today's diary entries uploaded by your child's teacher{childClass ? ` — Class ${childClass}` : ''}</p>
      </div>

      {/* Stats */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Entries', value: entries.length,                                      color: '#3182ce', icon: 'photo_library' },
            { label: 'This Month',    value: entries.filter(e => e.diaryDate?.startsWith(new Date().toISOString().slice(0,7))).length, color: '#76C442', icon: 'calendar_today' },
            { label: 'This Week',     value: entries.filter(e => {
                if (!e.diaryDate) return false;
                const d = new Date(e.diaryDate);
                const now = new Date();
                const diff = (now - d) / (1000 * 60 * 60 * 24);
                return diff >= 0 && diff < 7;
              }).length, color: '#805ad5', icon: 'date_range' },
          ].map(c => (
            <div key={c.label} className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: c.color + '15' }}>
                <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
              </div>
              <div className="stat-value">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: '#a0aec0' }}>
          <span className="material-icons" style={{ fontSize: 56, display: 'block', marginBottom: 14 }}>hourglass_empty</span>
          Loading diary entries...
        </div>
      ) : !childClass ? (
        <div className="data-table-card" style={{ textAlign: 'center', padding: '60px' }}>
          <span className="material-icons" style={{ fontSize: 56, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>info_outline</span>
          <h3 style={{ color: '#a0aec0', margin: '0 0 8px' }}>No class information found</h3>
          <p style={{ color: '#cbd5e0', margin: 0, fontSize: '14px' }}>Please contact the school administration</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="data-table-card" style={{ textAlign: 'center', padding: '60px' }}>
          <span className="material-icons" style={{ fontSize: 56, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>photo_library</span>
          <h3 style={{ color: '#a0aec0', margin: '0 0 8px' }}>No diary entries yet</h3>
          <p style={{ color: '#cbd5e0', margin: 0, fontSize: '14px' }}>Your child's teacher hasn't uploaded any diary entries yet</p>
        </div>
      ) : (
        <div>
          {sortedDates.map(date => (
            <div key={date} style={{ marginBottom: '32px' }}>
              {/* Date Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#76C442', color: '#fff', borderRadius: '10px', padding: '6px 14px', fontSize: '13px', fontWeight: 700 }}>
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div style={{ flex: 1, height: '1px', background: '#f0f4f8' }} />
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{grouped[date].length} {grouped[date].length === 1 ? 'entry' : 'entries'}</div>
              </div>

              {/* Cards for this date */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {grouped[date].map(entry => (
                  <div key={entry.id} style={{ border: '1.5px solid #f0f4f8', borderRadius: '14px', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'}>
                    {/* Image */}
                    <div style={{ position: 'relative', cursor: 'pointer', height: '200px', background: '#f7fafc' }}
                      onClick={() => setPreview(entry)}>
                      <img src={entry.imageUrl} alt="Diary"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                        <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: '50%', padding: '10px', display: 'flex' }}>
                          <span className="material-icons" style={{ color: '#2d3748', fontSize: 28 }}>zoom_in</span>
                        </div>
                      </div>
                      {entry.subject && (
                        <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 600 }}>
                          {entry.subject}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: '#2d3748' }}>
                            {entry.teacherName || 'Teacher'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px' }}>
                            Class {entry.className}{entry.section ? ` - ${entry.section}` : ''}
                          </div>
                        </div>
                        <button onClick={() => handleDownload(entry)} title="Download" style={{ border: 'none', background: '#f0f4f8', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: '#4a5568', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <span className="material-icons" style={{ fontSize: '14px' }}>download</span>
                        </button>
                      </div>

                      {entry.description && (
                        <p style={{ fontSize: '13px', color: '#718096', margin: '0 0 12px', lineHeight: 1.6 }}>
                          {entry.description.length > 100 ? entry.description.slice(0, 100) + '…' : entry.description}
                        </p>
                      )}

                      <button onClick={() => setPreview(entry)}
                        style={{ width: '100%', border: 'none', background: '#f0fff4', color: '#276749', borderRadius: '10px', padding: '9px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <span className="material-icons" style={{ fontSize: '16px' }}>open_in_full</span>
                        View Full Photo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', maxWidth: '720px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f4f8' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#2d3748', fontSize: '15px' }}>
                  {preview.subject || 'Class Diary'} — {new Date((preview.diaryDate || '') + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>
                  {preview.teacherName} · Class {preview.className}{preview.section ? ` - ${preview.section}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleDownload(preview)}
                  style={{ border: 'none', background: '#f0f4f8', color: '#4a5568', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-icons" style={{ fontSize: '16px' }}>download</span> Download
                </button>
                <button onClick={() => setPreview(null)}
                  style={{ border: 'none', background: '#fff5f5', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#e53e3e' }}>
                  <span className="material-icons" style={{ fontSize: '18px' }}>close</span>
                </button>
              </div>
            </div>
            <img src={preview.imageUrl} alt="Diary full"
              style={{ width: '100%', maxHeight: '540px', objectFit: 'contain', background: '#f7fafc' }} />
            {preview.description && (
              <div style={{ padding: '16px 20px', fontSize: '14px', color: '#4a5568', lineHeight: 1.6, borderTop: '1px solid #f0f4f8' }}>
                {preview.description}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
