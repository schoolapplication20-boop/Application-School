import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { onlineExamAdminAPI } from '../../services/api';

const STATUS_COLOR = { DRAFT: '#718096', PUBLISHED: '#3182ce', CLOSED: '#a0aec0' };
const STATUS_BG    = { DRAFT: '#edf2f7', PUBLISHED: '#ebf8ff', CLOSED: '#f7fafc' };

function formatDue(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function OnlineExamsAdmin() {
  const [exams,          setExams]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [toast,          setToast]          = useState(null);
  const [selectedExam,   setSelectedExam]   = useState(null);
  const [results,        setResults]        = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [expandedAttempt, setExpandedAttempt] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await onlineExamAdminAPI.listExams();
      setExams(res.data?.data ?? []);
    } catch {
      showToast('Failed to load exams', 'error');
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadExams(); }, [loadExams]);

  const handleSelectExam = async (exam) => {
    setSelectedExam(exam);
    setExpandedAttempt(null);
    setLoadingResults(true);
    try {
      const res = await onlineExamAdminAPI.getResults(exam.id);
      setResults(res.data?.data ?? []);
    } catch {
      showToast('Failed to load results', 'error');
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  };

  return (
    <Layout pageTitle="Online Exams">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Online Exams</h1>
        <p>View all published and closed exams and student results for your school</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedExam ? '360px 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
        {/* Exam list */}
        <div className="data-table-card">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #edf2f7', fontWeight: 700, fontSize: 14, color: '#2d3748' }}>
            All Exams ({exams.length})
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>
              <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
              Loading…
            </div>
          ) : exams.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>
              <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8, color: '#e2e8f0' }}>quiz</span>
              No published or closed exams yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {exams.map(exam => (
                <div key={exam.id}
                  onClick={() => handleSelectExam(exam)}
                  style={{
                    padding: '14px 20px', cursor: 'pointer',
                    borderBottom: '1px solid #edf2f7',
                    background: selectedExam?.id === exam.id ? '#f0fffe' : '#fff',
                    borderLeft: selectedExam?.id === exam.id ? '3px solid #0de1e8' : '3px solid transparent',
                    transition: 'background 0.1s',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#2d3748', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.title}</div>
                      <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
                        {exam.subject && <span>{exam.subject} · </span>}
                        <span>{exam.className}{exam.section ? ` – ${exam.section}` : ''}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>{exam.teacherName}</div>
                    </div>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, flexShrink: 0,
                      background: STATUS_BG[exam.status] || '#edf2f7',
                      color: STATUS_COLOR[exam.status] || '#718096' }}>
                      {exam.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: '#a0aec0' }}>
                    <span>{exam.questionCount ?? 0} questions</span>
                    <span>{exam.totalMarks} marks</span>
                    <span>Due: {formatDue(exam.dueDateTime)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results panel */}
        {selectedExam && (
          <div className="data-table-card">
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #edf2f7', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#2d3748' }}>{selectedExam.title}</div>
                <div style={{ fontSize: 12, color: '#718096' }}>
                  {selectedExam.subject && `${selectedExam.subject} · `}
                  {selectedExam.className}{selectedExam.section ? ` – ${selectedExam.section}` : ''} · {selectedExam.teacherName}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#718096' }}>
                <span style={{ padding: '4px 10px', background: '#f7fafc', borderRadius: 6, fontWeight: 600 }}>
                  {selectedExam.totalMarks} marks
                </span>
                <span style={{
                  padding: '4px 10px', borderRadius: 6, fontWeight: 700,
                  background: STATUS_BG[selectedExam.status],
                  color: STATUS_COLOR[selectedExam.status] }}>
                  {selectedExam.status}
                </span>
              </div>
              <button onClick={() => { setSelectedExam(null); setResults([]); }}
                style={{ border: 'none', background: '#f7fafc', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#718096', fontSize: 12 }}>
                <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle' }}>close</span>
              </button>
            </div>

            {loadingResults ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>
                <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
                Loading results…
              </div>
            ) : results.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>
                <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8, color: '#e2e8f0' }}>bar_chart</span>
                No submissions yet for this exam.
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '14px 20px', borderBottom: '1px solid #edf2f7' }}>
                  {[
                    { label: 'Total',     value: results.length,                                                color: '#0de1e8' },
                    { label: 'Submitted', value: results.filter(r => r.status === 'SUBMITTED').length,          color: '#3182ce' },
                    { label: 'Graded',    value: results.filter(r => r.status === 'GRADED').length,             color: '#276749' },
                    { label: 'Avg Score', value: (() => {
                        const graded = results.filter(r => r.totalScore !== null && r.totalScore !== undefined);
                        if (!graded.length) return '—';
                        const avg = graded.reduce((s, r) => s + r.totalScore, 0) / graded.length;
                        return `${avg.toFixed(1)}/${selectedExam.totalMarks}`;
                      })(), color: '#805ad5' },
                  ].map(stat => (
                    <div key={stat.label} className="stat-card" style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Results table */}
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {results.map(attempt => {
                    const statusClr = attempt.status === 'GRADED' ? '#276749' : attempt.status === 'SUBMITTED' ? '#2b6cb0' : '#a0aec0';
                    const isExpanded = expandedAttempt === attempt.attemptId;
                    return (
                      <div key={attempt.attemptId} style={{ border: '1px solid #edf2f7', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                          onClick={() => setExpandedAttempt(isExpanded ? null : attempt.attemptId)}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#edf2f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span className="material-icons" style={{ fontSize: 17, color: '#718096' }}>person</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#2d3748' }}>{attempt.studentName}</div>
                            <div style={{ fontSize: 11, color: '#718096' }}>
                              {attempt.className}{attempt.section ? ` – ${attempt.section}` : ''}
                              {attempt.submittedAt && ` · ${new Date(attempt.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: statusClr }}>
                              {attempt.totalScore !== null && attempt.totalScore !== undefined
                                ? `${attempt.totalScore}/${selectedExam.totalMarks}`
                                : '—'}
                            </div>
                            <span style={{ padding: '2px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                              background: attempt.status === 'GRADED' ? '#f0fff4' : attempt.status === 'SUBMITTED' ? '#ebf8ff' : '#edf2f7',
                              color: statusClr }}>
                              {attempt.status}
                            </span>
                          </div>
                          <span className="material-icons" style={{ fontSize: 18, color: '#a0aec0' }}>
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>

                        {isExpanded && (
                          <div style={{ borderTop: '1px solid #edf2f7', padding: '14px 16px', background: '#fafcff' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {(attempt.answers || []).map((ans, idx) => (
                                <div key={ans.questionId} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#4a5568' }}>Q{idx + 1}</span>
                                        <span style={{ padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                                          background: ans.questionType === 'MCQ' ? '#ebf8ff' : '#faf5ff',
                                          color: ans.questionType === 'MCQ' ? '#2b6cb0' : '#6b46c1' }}>
                                          {ans.questionType}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: 13, color: '#2d3748', marginBottom: 6 }}>{ans.questionText}</div>
                                      {ans.questionType === 'MCQ' && ans.correctAnswer && (
                                        <div style={{ fontSize: 11, color: '#276749', marginBottom: 4 }}>
                                          Correct: <strong>{ans.correctAnswer}</strong>
                                        </div>
                                      )}
                                      <div style={{ fontSize: 12, padding: '5px 10px', background: '#f7fafc', borderRadius: 5, color: '#4a5568' }}>
                                        Answer: <strong>{ans.studentAnswer ?? <em style={{ color: '#a0aec0' }}>No answer</em>}</strong>
                                      </div>
                                    </div>
                                    <div style={{ flexShrink: 0 }}>
                                      {ans.marksAwarded !== null && ans.marksAwarded !== undefined ? (
                                        <span style={{ padding: '4px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                          background: ans.marksAwarded === ans.marks ? '#f0fff4' : ans.marksAwarded > 0 ? '#fffaf0' : '#fff5f5',
                                          color: ans.marksAwarded === ans.marks ? '#276749' : ans.marksAwarded > 0 ? '#c05621' : '#c53030' }}>
                                          {ans.marksAwarded}/{ans.marks}
                                        </span>
                                      ) : (
                                        <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: '#faf5ff', color: '#6b46c1' }}>Pending</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
