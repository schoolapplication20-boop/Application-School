import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { studentAPI } from '../../services/api';

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const isOverdue = (dueDate) => dueDate && new Date(dueDate + 'T23:59') < new Date();

export default function StudentAssignments() {
  const [assignments,  setAssignments]  = useState([]);
  const [submissions,  setSubmissions]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [submitFor,    setSubmitFor]    = useState(null); // assignment to submit
  const [notes,        setNotes]        = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([
        studentAPI.getMyAssignments().catch(() => ({ data: { data: [] } })),
        studentAPI.getMySubmissions().catch(() => ({ data: { data: [] } })),
      ]);
      setAssignments(aRes.data?.data ?? []);
      setSubmissions(sRes.data?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getSubmission = (assignmentId) => submissions.find(s => s.assignmentId === assignmentId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await studentAPI.submitAssignment(submitFor.id, { notes });
      setSuccess('Assignment submitted successfully!');
      setSubmitFor(null);
      setNotes('');
      await load();
      setTimeout(() => setSuccess(''), 3500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const pending   = assignments.filter(a => !getSubmission(a.id));
  const submitted = assignments.filter(a =>  getSubmission(a.id));

  return (
    <Layout pageTitle="Assignments">
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 0 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary, #1a202c)', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
            My Assignments
          </h1>
          <p style={{ color: 'var(--text-muted, #718096)', fontSize: 14, margin: 0 }}>
            Submit your work before the due date
          </p>
        </div>

        {success && (
          <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#276749', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 18 }}>check_circle</span>
            {success}
          </div>
        )}

        {/* Stats row */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
            {[
              { label: 'Total',     value: assignments.length,       color: '#3b82f6', icon: 'assignment' },
              { label: 'Pending',   value: pending.length,           color: '#f59e0b', icon: 'pending_actions' },
              { label: 'Submitted', value: submitted.length,         color: '#10b981', icon: 'task_alt' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface, #fff)', borderRadius: 14, padding: '16px 18px', border: '1px solid var(--border, #f0f4f8)', boxShadow: 'var(--shadow-card, 0 2px 8px rgba(0,0,0,0.06))', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-icons" style={{ color: s.color, fontSize: 22 }}>{s.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary, #1a202c)', lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted, #8a99b0)', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted, #a0aec0)' }}>
            <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>hourglass_empty</span>
            Loading assignments…
          </div>
        ) : assignments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <span className="material-icons" style={{ fontSize: 56, color: 'var(--border, #e2e8f0)', display: 'block', marginBottom: 12 }}>assignment</span>
            <h3 style={{ color: 'var(--text-muted, #a0aec0)', margin: '0 0 6px' }}>No assignments yet</h3>
            <p style={{ color: 'var(--text-muted, #a0aec0)', fontSize: 13, margin: 0 }}>Your teachers haven't posted any assignments for your class</p>
          </div>
        ) : (
          <>
            {/* Pending section */}
            {pending.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingLeft: 10, borderLeft: '3px solid #f59e0b' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #1a202c)' }}>Pending</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', background: '#fffbeb', padding: '2px 8px', borderRadius: 10 }}>{pending.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pending.map(a => {
                    const overdue = isOverdue(a.dueDate);
                    return (
                      <div key={a.id} style={{ background: 'var(--surface, #fff)', borderRadius: 14, border: `1px solid ${overdue ? '#fecaca' : 'var(--border, #f0f4f8)'}`, padding: 20, boxShadow: 'var(--shadow-card, 0 2px 8px rgba(0,0,0,0.05))' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#3b82f615', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span className="material-icons" style={{ color: '#3b82f6', fontSize: 18 }}>assignment</span>
                              </div>
                              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #2d3748)', margin: 0 }}>{a.title}</h3>
                            </div>
                            {a.description && <p style={{ fontSize: 13, color: 'var(--text-secondary, #4a5568)', margin: '0 0 8px', lineHeight: 1.5 }}>{a.description}</p>}
                            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                              {a.className && <span style={{ fontSize: 12, color: 'var(--text-muted, #718096)', display: 'flex', alignItems: 'center', gap: 3 }}><span className="material-icons" style={{ fontSize: 13 }}>class</span>Class {a.className}</span>}
                              {a.dueDate && (
                                <span style={{ fontSize: 12, color: overdue ? '#ef4444' : 'var(--text-muted, #718096)', fontWeight: overdue ? 700 : 400, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <span className="material-icons" style={{ fontSize: 13 }}>{overdue ? 'warning' : 'event'}</span>
                                  {overdue ? 'Overdue: ' : 'Due: '}{fmtDate(a.dueDate)}
                                </span>
                              )}
                              {a.teacherName && <span style={{ fontSize: 12, color: 'var(--text-muted, #718096)', display: 'flex', alignItems: 'center', gap: 3 }}><span className="material-icons" style={{ fontSize: 13 }}>person</span>{a.teacherName}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => { setSubmitFor(a); setNotes(''); setError(''); }}
                            style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, boxShadow: '0 3px 10px rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="material-icons" style={{ fontSize: 16 }}>upload</span>
                            Submit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submitted section */}
            {submitted.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingLeft: 10, borderLeft: '3px solid #10b981' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #1a202c)' }}>Submitted</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: '#f0fff4', padding: '2px 8px', borderRadius: 10 }}>{submitted.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {submitted.map(a => {
                    const sub = getSubmission(a.id);
                    const graded = !!sub?.grade;
                    return (
                      <div key={a.id} style={{ background: 'var(--surface, #fff)', borderRadius: 14, border: '1px solid var(--border, #f0f4f8)', padding: 20, boxShadow: 'var(--shadow-card, 0 2px 8px rgba(0,0,0,0.05))' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#10b98115', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span className="material-icons" style={{ color: '#10b981', fontSize: 18 }}>task_alt</span>
                              </div>
                              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #2d3748)', margin: 0 }}>{a.title}</h3>
                            </div>
                            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: sub?.notes || graded ? 10 : 0 }}>
                              {a.className && <span style={{ fontSize: 12, color: 'var(--text-muted, #718096)', display: 'flex', alignItems: 'center', gap: 3 }}><span className="material-icons" style={{ fontSize: 13 }}>class</span>Class {a.className}</span>}
                              {a.dueDate && <span style={{ fontSize: 12, color: 'var(--text-muted, #718096)', display: 'flex', alignItems: 'center', gap: 3 }}><span className="material-icons" style={{ fontSize: 13 }}>event</span>Due: {fmtDate(a.dueDate)}</span>}
                              <span style={{ fontSize: 12, color: '#718096', display: 'flex', alignItems: 'center', gap: 3 }}><span className="material-icons" style={{ fontSize: 13 }}>schedule</span>Submitted: {sub?.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</span>
                            </div>
                            {sub?.notes && (
                              <div style={{ fontSize: 13, color: 'var(--text-secondary, #4a5568)', padding: '8px 12px', background: 'var(--surface-alt, #f7fafc)', borderRadius: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #8a99b0)', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Your submission</span>
                                {sub.notes}
                              </div>
                            )}
                            {graded && (
                              <div style={{ padding: '8px 12px', background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#2b6cb0' }}>Grade: {sub.grade}</span>
                                {sub.feedback && <div style={{ fontSize: 12, color: '#4a5568', marginTop: 4, fontStyle: 'italic' }}>"{sub.feedback}"</div>}
                              </div>
                            )}
                          </div>
                          <div style={{ flexShrink: 0, textAlign: 'center' }}>
                            {graded ? (
                              <span style={{ display: 'inline-block', padding: '4px 12px', background: '#ebf8ff', color: '#2b6cb0', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>Graded</span>
                            ) : (
                              <span style={{ display: 'inline-block', padding: '4px 12px', background: '#f0fff4', color: '#10b981', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>Submitted</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Submit Modal */}
      {submitFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => e.target === e.currentTarget && !submitting && setSubmitFor(null)}>
          <div style={{ background: 'var(--surface, #fff)', borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border, #f0f4f8)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary, #1a202c)' }}>Submit Assignment</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted, #a0aec0)', marginTop: 2 }}>{submitFor.title}</div>
              </div>
              <button onClick={() => setSubmitFor(null)} disabled={submitting}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted, #718096)', padding: 4 }}>
                <span className="material-icons" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '20px 24px' }}>
                {error && (
                  <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13, border: '1px solid #fed7d7' }}>{error}</div>
                )}
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #4a5568)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Notes / Answer
                </label>
                <textarea
                  rows={5}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Write your answer, notes, or any relevant information…"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border, #e2e8f0)', borderRadius: 10, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', background: 'var(--surface-input, #fafafa)', color: 'var(--text-primary, #1a202c)' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted, #a0aec0)', marginTop: 6 }}>
                  You can also leave this blank to mark the assignment as done.
                </div>
              </div>
              <div style={{ padding: '12px 24px 20px', display: 'flex', gap: 10 }}>
                <button type="submit" disabled={submitting}
                  style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Submitting…' : 'Submit Assignment'}
                </button>
                <button type="button" onClick={() => setSubmitFor(null)} disabled={submitting}
                  style={{ padding: '11px 20px', background: 'var(--surface-alt, #f7fafc)', color: 'var(--text-secondary, #4a5568)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
