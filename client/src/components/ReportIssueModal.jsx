import React, { useState } from 'react';
import { issueAPI } from '../services/api';

const CATEGORIES = [
  { value: 'BUG',             label: '🐛 Bug / Error' },
  { value: 'UI_ISSUE',        label: '🎨 UI / Display Issue' },
  { value: 'FEATURE_REQUEST', label: '💡 Feature Request' },
  { value: 'PERFORMANCE',     label: '⚡ Performance Issue' },
  { value: 'OTHER',           label: '📝 Other' },
];

const PRIORITIES = [
  { value: 'LOW',      label: 'Low',      color: '#22c55e' },
  { value: 'MEDIUM',   label: 'Medium',   color: '#f59e0b' },
  { value: 'HIGH',     label: 'High',     color: '#f97316' },
  { value: 'CRITICAL', label: 'Critical', color: '#dc2626' },
];

export default function ReportIssueModal({ onClose }) {
  const [form, setForm] = useState({
    title:       '',
    category:    'BUG',
    priority:    'MEDIUM',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim())       { setError('Please enter a title.'); return; }
    if (!form.description.trim()) { setError('Please describe the issue.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await issueAPI.report(form);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inp = {
    width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e2e8f0',
    borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    background: '#fff', color: '#1e293b',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520,
        boxShadow: '0 24px 72px rgba(0,0,0,0.22)', overflow: 'hidden',
        animation: 'ai-enter 0.25s cubic-bezier(0.34,1.46,0.64,1)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#1e1b4b,#4c1d95)',
          padding: '20px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>🐛 Report an Issue</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>
              Help us improve My-Skoolz
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {submitted ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 28,
            }}>✓</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>
              Issue Reported!
            </h3>
            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
              Thank you for your feedback. Our team has been notified and will look into it.
            </p>
            <button onClick={onClose} style={{
              padding: '10px 28px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700,
              fontSize: 14, cursor: 'pointer',
            }}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {error && (
              <div style={{
                padding: '10px 14px', background: '#fff5f5', border: '1px solid #fecaca',
                borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 16,
              }}>{error}</div>
            )}

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>
                Title <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text" style={inp} placeholder="Brief summary of the issue"
                value={form.title} onChange={e => set('title', e.target.value)}
                maxLength={200} autoFocus
              />
            </div>

            {/* Category + Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Category
                </label>
                <select style={inp} value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Priority
                </label>
                <select style={inp} value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* Priority indicator */}
            <div style={{
              display: 'flex', gap: 6, marginBottom: 14,
            }}>
              {PRIORITIES.map(p => (
                <button
                  key={p.value} type="button"
                  onClick={() => set('priority', p.value)}
                  style={{
                    flex: 1, padding: '6px 4px', border: `2px solid ${form.priority === p.value ? p.color : '#e2e8f0'}`,
                    borderRadius: 7, background: form.priority === p.value ? p.color + '15' : '#fff',
                    color: form.priority === p.value ? p.color : '#94a3b8',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >{p.label}</button>
              ))}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>
                Description <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                style={{ ...inp, minHeight: 110, resize: 'vertical', lineHeight: 1.6 }}
                placeholder="Describe the issue in detail — steps to reproduce, what you expected, what happened..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
                maxLength={5000}
              />
              <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 3 }}>
                {form.description.length}/5000
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={{
                padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8,
                background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 13,
                cursor: 'pointer',
              }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{
                padding: '10px 24px',
                background: submitting ? '#a5b4fc' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700,
                fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                {submitting ? (
                  <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Submitting…</>
                ) : (
                  <><span className="material-icons" style={{ fontSize: 16 }}>bug_report</span>Submit Issue</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
