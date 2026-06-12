import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../../components/Layout';
import { onlineExamStudentAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

function formatDue(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function msLeft(dt) {
  if (!dt) return Infinity;
  return new Date(dt) - Date.now();
}

function CountdownBadge({ dueDateTime, compact }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  const diff = msLeft(dueDateTime);
  if (!dueDateTime) return null;
  if (diff <= 0) return (
    <span style={{ padding: compact ? '2px 8px' : '4px 12px', borderRadius: 20, fontSize: compact ? 11 : 12, fontWeight: 700, background: '#fff5f5', color: '#c53030' }}>
      Overdue
    </span>
  );

  const days  = Math.floor(diff / 86400000);
  const hrs   = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  const color = diff < 600000 ? '#c53030' : diff < 3600000 ? '#d69e2e' : '#276749';
  const bg    = diff < 600000 ? '#fff5f5' : diff < 3600000 ? '#fffaf0' : '#f0fff4';
  const label = days > 0 ? `${days}d ${hrs}h` : hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  return (
    <span style={{ padding: compact ? '2px 8px' : '4px 12px', borderRadius: 20, fontSize: compact ? 11 : 12, fontWeight: 700, background: bg, color }}>
      {label} left
    </span>
  );
}

function CountdownTimer({ dueDateTime }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (!dueDateTime) return;
    const tick = () => {
      const diff = msLeft(dueDateTime);
      if (diff <= 0) { setDisplay('Time up'); return; }
      const hrs  = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setDisplay(`${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dueDateTime]);

  if (!dueDateTime) return null;
  const diff = msLeft(dueDateTime);
  const color = diff < 600000 ? '#c53030' : diff < 3600000 ? '#d69e2e' : 'var(--text-primary)';

  return (
    <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color }}>
      {display}
    </span>
  );
}

const ATTEMPT_LABEL = {
  null:         { label: 'Start Exam',    bg: '#0de1e8', color: '#fff' },
  IN_PROGRESS:  { label: 'Resume Exam',   bg: '#3182ce', color: '#fff' },
  SUBMITTED:    { label: 'View Result',   bg: '#805ad5', color: '#fff' },
  GRADED:       { label: 'View Result',   bg: '#276749', color: '#fff' },
};

export default function OnlineExamTake() {
  const [view,         setView]         = useState('list');   // 'list' | 'take' | 'result'
  const [exams,        setExams]        = useState([]);
  const [loading,      setLoading]      = useState(true);

  // Active exam taking state
  const [activeExam,   setActiveExam]   = useState(null);
  const [attempt,      setAttempt]      = useState(null);
  const [answers,      setAnswers]      = useState({});   // { questionId: studentAnswer }
  const [currentQ,     setCurrentQ]     = useState(0);
  const [saving,       setSaving]       = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  // Result view state
  const [resultData,   setResultData]   = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);

  const autoSaveRef = useRef(null);

  const showToast = useToast();

  // ── Load exam list ─────────────────────────────────────────────────────────
  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await onlineExamStudentAPI.listExams();
      setExams(res.data?.data ?? []);
    } catch {
      showToast('Failed to load exams', 'error');
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadExams(); }, [loadExams]);

  // ── Auto-save current answer while taking ─────────────────────────────────
  const doAutoSave = useCallback(async (examId, answersSnapshot) => {
    const entries = Object.entries(answersSnapshot).map(([qId, ans]) => ({
      questionId: Number(qId), studentAnswer: ans,
    }));
    if (entries.length === 0) return;
    try {
      await onlineExamStudentAPI.saveAnswers(examId, entries);
    } catch {
      // silent auto-save failure
    }
  }, []);

  // Debounced auto-save (2 seconds after last keystroke)
  const scheduleAutoSave = useCallback((examId, answersSnapshot) => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      doAutoSave(examId, answersSnapshot);
    }, 2000);
  }, [doAutoSave]);

  useEffect(() => () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); }, []);

  // ── Start / Resume exam ────────────────────────────────────────────────────
  const handleStartExam = async (exam) => {
    try {
      const res = await onlineExamStudentAPI.startExam(exam.id);
      const attemptData = res.data?.data ?? res.data;
      if (!res.data?.success) {
        showToast(res.data?.message || 'Cannot start exam', 'error');
        return;
      }

      // Load exam questions
      const examRes = await onlineExamStudentAPI.getExam(exam.id);
      const examDetail = examRes.data?.data ?? examRes.data;

      // Restore existing answers if resuming
      const initialAnswers = {};
      if (attemptData.status === 'IN_PROGRESS') {
        // If the attempt already existed, we don't have answers locally — they'll be re-submitted on submit
        // but the student can see saved progress via question navigation
      }

      setActiveExam(examDetail);
      setAttempt(attemptData);
      setAnswers(initialAnswers);
      setCurrentQ(0);
      setView('take');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to start exam', 'error');
    }
  };

  const handleViewResult = async (exam) => {
    setLoadingResult(true);
    setView('result');
    try {
      const res = await onlineExamStudentAPI.getMyResult(exam.id);
      setResultData(res.data?.data ?? res.data);
      setActiveExam(exam);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load result', 'error');
      setView('list');
    } finally {
      setLoadingResult(false);
    }
  };

  // ── Answer handling ────────────────────────────────────────────────────────
  const handleAnswer = (questionId, value) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);
    if (activeExam) scheduleAutoSave(activeExam.id, updated);
  };

  // ── Manual save ───────────────────────────────────────────────────────────
  const handleManualSave = async () => {
    if (!activeExam || !attempt) return;
    setSaving(true);
    try {
      const entries = Object.entries(answers).map(([qId, ans]) => ({
        questionId: Number(qId), studentAnswer: ans,
      }));
      await onlineExamStudentAPI.saveAnswers(activeExam.id, entries);
      showToast('Progress saved');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!activeExam || !attempt) return;
    setSubmitting(true);
    try {
      // Save all answers first
      const entries = Object.entries(answers).map(([qId, ans]) => ({
        questionId: Number(qId), studentAnswer: ans,
      }));
      if (entries.length > 0) {
        await onlineExamStudentAPI.saveAnswers(activeExam.id, entries);
      }
      await onlineExamStudentAPI.submitExam(activeExam.id);
      setShowConfirm(false);
      showToast('Exam submitted successfully!');
      await loadExams();
      setView('list');
      setActiveExam(null);
      setAttempt(null);
      setAnswers({});
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit exam', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const questions = activeExam?.questions ?? [];
  const answeredCount = Object.values(answers).filter(v => v && v.trim()).length;
  const dueDiff = activeExam?.dueDateTime ? msLeft(activeExam.dueDateTime) : Infinity;
  const nearDue = dueDiff > 0 && dueDiff < 600000;

  // ── Render list ────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <Layout pageTitle="Online Exams">
        <div className="page-header">
          <h1>Online Exams</h1>
          <p>View and take your scheduled online exams</p>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 10, animation: 'spin 1s linear infinite' }}>autorenew</span>
            Loading exams…
          </div>
        ) : exams.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <span className="material-icons" style={{ fontSize: 56, color: 'var(--border-strong)', display: 'block', marginBottom: 12 }}>quiz</span>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No exams available for your class right now.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {exams.map(exam => {
              const as = exam.attemptStatus;
              const btn = ATTEMPT_LABEL[as] ?? ATTEMPT_LABEL[null];
              const isPastDue = exam.dueDateTime && msLeft(exam.dueDateTime) <= 0;
              const canStart = !as && !isPastDue;
              const canResume = as === 'IN_PROGRESS' && !isPastDue;
              const canView = as === 'SUBMITTED' || as === 'GRADED';

              return (
                <div key={exam.id} style={{ border: '1px solid var(--border-strong)', borderRadius: 14, padding: 20, background: 'var(--surface)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span className="material-icons" style={{ fontSize: 20, color: '#0de1e8' }}>quiz</span>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{exam.title}</h3>
                      </div>
                      {exam.subject && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                          <span className="material-icons" style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 4 }}>book</span>
                          {exam.subject}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        <span className="material-icons" style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 4 }}>person</span>
                        {exam.teacherName || 'Teacher'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {as ? (
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                          background: as === 'GRADED' ? '#f0fff4' : as === 'SUBMITTED' ? '#faf5ff' : '#ebf8ff',
                          color: as === 'GRADED' ? '#276749' : as === 'SUBMITTED' ? '#6b46c1' : '#2b6cb0' }}>
                          {as === 'IN_PROGRESS' ? 'In Progress' : as === 'SUBMITTED' ? 'Submitted' : 'Graded'}
                        </span>
                      ) : (
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>
                          {isPastDue ? 'Missed' : 'Not Started'}
                        </span>
                      )}
                      {as === 'GRADED' && exam.totalScore !== null && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#276749' }}>
                          {exam.totalScore}/{exam.totalMarks}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="material-icons" style={{ fontSize: 13 }}>help_outline</span>
                      {exam.questionCount ?? 0} questions
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="material-icons" style={{ fontSize: 13 }}>grade</span>
                      {exam.totalMarks} marks
                    </div>
                    {exam.dueDateTime && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-icons" style={{ fontSize: 13 }}>schedule</span>
                        Due {formatDue(exam.dueDateTime)}
                      </div>
                    )}
                  </div>

                  {exam.dueDateTime && !isPastDue && (
                    <div style={{ marginBottom: 12 }}>
                      <CountdownBadge dueDateTime={exam.dueDateTime} compact />
                    </div>
                  )}

                  {exam.instructions && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 10px', background: 'var(--surface-alt)', borderRadius: 6, marginBottom: 12, lineHeight: 1.5 }}>
                      {exam.instructions.length > 120 ? exam.instructions.slice(0, 120) + '…' : exam.instructions}
                    </div>
                  )}

                  <button
                    onClick={() => canView ? handleViewResult(exam) : handleStartExam(exam)}
                    disabled={!canStart && !canResume && !canView}
                    style={{
                      width: '100%', padding: '9px', border: 'none', borderRadius: 8,
                      background: (!canStart && !canResume && !canView) ? '#edf2f7' : btn.bg,
                      color: (!canStart && !canResume && !canView) ? '#a0aec0' : btn.color,
                      fontWeight: 700, fontSize: 13, cursor: (!canStart && !canResume && !canView) ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                    <span className="material-icons" style={{ fontSize: 16 }}>
                      {canView ? 'assignment_turned_in' : canResume ? 'play_circle' : 'play_arrow'}
                    </span>
                    {isPastDue && !as ? 'Missed — Past Due' : btn.label}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Layout>
    );
  }

  // ── Result view ────────────────────────────────────────────────────────────
  if (view === 'result') {
    return (
      <Layout pageTitle="Exam Result">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
          <button onClick={() => setView('list')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#0de1e8', fontWeight: 600, fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-icons" style={{ fontSize: 15 }}>arrow_back</span> Back to Exams
          </button>
          {activeExam && <><span>|</span><span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{activeExam.title || activeExam.examTitle}</span></>}
        </div>

        {loadingResult ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="material-icons" style={{ fontSize: 36, display: 'block', marginBottom: 10, animation: 'spin 1s linear infinite' }}>autorenew</span>
            Loading result…
          </div>
        ) : resultData ? (
          <div>
            {/* Score card */}
            <div style={{ border: '1px solid var(--border-strong)', borderRadius: 14, padding: 24, marginBottom: 20, background: 'var(--surface)', textAlign: 'center' }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: resultData.isGraded ? '#276749' : '#2b6cb0', marginBottom: 6 }}>
                {resultData.totalScore !== null && resultData.totalScore !== undefined
                  ? `${resultData.totalScore} / ${resultData.totalMarks}`
                  : 'Pending'}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
                {resultData.isGraded ? 'Final Score' : 'Partial Score (Written answers pending grading)'}
              </div>
              <span style={{ padding: '4px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                background: resultData.status === 'GRADED' ? '#f0fff4' : '#ebf8ff',
                color: resultData.status === 'GRADED' ? '#276749' : '#2b6cb0' }}>
                {resultData.status}
              </span>
            </div>

            {/* Answer breakdown */}
            <div className="data-table-card">
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                Answer Breakdown
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(resultData.answers || []).map((ans, idx) => (
                  <div key={ans.questionId} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>{idx + 1}</span>
                          <span style={{ padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                            background: ans.questionType === 'MCQ' ? '#ebf8ff' : '#faf5ff',
                            color: ans.questionType === 'MCQ' ? '#2b6cb0' : '#6b46c1' }}>
                            {ans.questionType}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ans.marks} mark{ans.marks !== 1 ? 's' : ''}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>{ans.questionText}</div>

                        {ans.questionType === 'MCQ' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginBottom: 8 }}>
                            {[['A', ans.optionA], ['B', ans.optionB], ['C', ans.optionC], ['D', ans.optionD]].filter(([, v]) => v).map(([lbl, val]) => {
                              const isStudent = ans.studentAnswer?.toUpperCase() === lbl;
                              return (
                                <div key={lbl} style={{
                                  fontSize: 12, padding: '3px 8px', borderRadius: 4,
                                  background: isStudent && ans.isCorrect ? '#f0fff4' : isStudent ? '#fff5f5' : 'transparent',
                                  color: isStudent && ans.isCorrect ? '#276749' : isStudent ? '#c53030' : 'var(--text-secondary)',
                                  display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                  <strong>{lbl}.</strong> {val}
                                  {isStudent && ans.isCorrect && <span className="material-icons" style={{ fontSize: 12, color: '#38a169' }}>check_circle</span>}
                                  {isStudent && !ans.isCorrect && <span className="material-icons" style={{ fontSize: 12, color: '#c53030' }}>cancel</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {ans.questionType === 'WRITTEN' && (
                          <div style={{ fontSize: 12, padding: '6px 10px', background: 'var(--surface-alt)', borderRadius: 6, color: 'var(--text-secondary)' }}>
                            Your answer: <em>{ans.studentAnswer || <span style={{ color: 'var(--text-muted)' }}>No answer provided</span>}</em>
                          </div>
                        )}
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        {ans.marksAwarded !== null && ans.marksAwarded !== undefined ? (
                          <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                            background: ans.marksAwarded === ans.marks ? '#f0fff4' : ans.marksAwarded > 0 ? '#fffaf0' : '#fff5f5',
                            color: ans.marksAwarded === ans.marks ? '#276749' : ans.marksAwarded > 0 ? '#c05621' : '#c53030' }}>
                            {ans.marksAwarded}/{ans.marks}
                          </span>
                        ) : (
                          <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: '#faf5ff', color: '#6b46c1' }}>
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Layout>
    );
  }

  // ── Exam taking view ───────────────────────────────────────────────────────
  if (view === 'take' && activeExam) {
    const q = questions[currentQ];

    return (
      <Layout pageTitle={activeExam.title}>
        {/* Header bar */}
        <div style={{ border: '1px solid var(--border-strong)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 2 }}>{activeExam.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{activeExam.subject} · {activeExam.totalMarks} marks · {questions.length} questions</div>
          </div>
          {activeExam.dueDateTime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span className="material-icons" style={{ fontSize: 18, color: 'var(--text-secondary)' }}>timer</span>
              <CountdownTimer dueDateTime={activeExam.dueDateTime} />
            </div>
          )}
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>
            {answeredCount}/{questions.length} answered
          </div>
        </div>

        {/* Near-due warning */}
        {nearDue && (
          <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ color: '#c53030', fontSize: 18 }}>warning</span>
            <span style={{ fontSize: 13, color: '#c53030', fontWeight: 600 }}>
              Less than 10 minutes remaining! Submit your exam soon.
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'start' }}>
          {/* Question navigator */}
          <div style={{ border: '1px solid var(--border-strong)', borderRadius: 12, padding: 14, background: 'var(--surface)', position: 'sticky', top: 80 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>Questions</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {questions.map((qs, idx) => {
                const ans = answers[qs.id];
                const answered = ans && ans.trim();
                return (
                  <button key={qs.id}
                    onClick={() => setCurrentQ(idx)}
                    style={{
                      border: idx === currentQ ? '2px solid #0de1e8' : '1.5px solid var(--border-strong)',
                      background: idx === currentQ ? '#e0fffe' : answered ? '#f0fff4' : 'var(--surface-alt)',
                      color: idx === currentQ ? '#0de1e8' : answered ? '#276749' : 'var(--text-muted)',
                      borderRadius: 6, padding: '5px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, background: '#f0fff4', border: '1.5px solid #c6f6d5', borderRadius: 3 }} />
                Answered
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, background: 'var(--surface-alt)', border: '1.5px solid var(--border-strong)', borderRadius: 3 }} />
                Not answered
              </div>
            </div>
          </div>

          {/* Question area */}
          <div style={{ border: '1px solid var(--border-strong)', borderRadius: 12, background: 'var(--surface)', overflow: 'hidden' }}>
            {q ? (
              <>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)' }}>Question {currentQ + 1} of {questions.length}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                      background: q.questionType === 'MCQ' ? '#ebf8ff' : '#faf5ff',
                      color: q.questionType === 'MCQ' ? '#2b6cb0' : '#6b46c1' }}>
                      {q.questionType}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.6 }}>{q.questionText}</div>
                </div>

                <div style={{ padding: '18px 24px' }}>
                  {q.questionType === 'MCQ' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[['A', q.optionA], ['B', q.optionB], ['C', q.optionC], ['D', q.optionD]].filter(([, v]) => v).map(([lbl, val]) => {
                        const selected = answers[q.id] === lbl;
                        return (
                          <label key={lbl} style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                            border: selected ? '2px solid #0de1e8' : '1.5px solid var(--border-strong)',
                            borderRadius: 10, cursor: 'pointer',
                            background: selected ? '#e0fffe' : 'var(--surface)',
                            transition: 'all 0.1s',
                          }}>
                            <input type="radio" name={`q-${q.id}`} value={lbl}
                              checked={selected}
                              onChange={() => handleAnswer(q.id, lbl)}
                              style={{ width: 16, height: 16, accentColor: '#0de1e8', cursor: 'pointer' }} />
                            <span style={{ fontWeight: 700, color: selected ? '#0de1e8' : 'var(--text-secondary)', minWidth: 20 }}>{lbl}.</span>
                            <span style={{ fontSize: 14, color: selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{val}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea rows={6} className="form-control"
                      placeholder="Type your answer here…"
                      value={answers[q.id] || ''}
                      onChange={e => handleAnswer(q.id, e.target.value)}
                      style={{ resize: 'vertical', lineHeight: 1.6 }} />
                  )}
                </div>

                <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                    disabled={currentQ === 0}
                    style={{ padding: '8px 18px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', cursor: currentQ === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-icons" style={{ fontSize: 16 }}>chevron_left</span> Previous
                  </button>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleManualSave} disabled={saving}
                      style={{ padding: '8px 16px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {saving
                        ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#4a5568', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Saving…</>
                        : <><span className="material-icons" style={{ fontSize: 15 }}>save</span> Save Progress</>}
                    </button>
                    <button onClick={() => setShowConfirm(true)}
                      style={{ padding: '8px 18px', border: 'none', borderRadius: 8, background: '#e53e3e', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="material-icons" style={{ fontSize: 16 }}>assignment_turned_in</span> Submit Exam
                    </button>
                  </div>

                  <button onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))}
                    disabled={currentQ === questions.length - 1}
                    style={{ padding: '8px 18px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', cursor: currentQ === questions.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Next <span className="material-icons" style={{ fontSize: 16 }}>chevron_right</span>
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No questions available.</div>
            )}
          </div>
        </div>

        {/* Submit confirmation modal */}
        {showConfirm && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !submitting && setShowConfirm(false)}>
            <div className="modal-container" style={{ maxWidth: 400 }}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Submit Exam</h3>
                <button onClick={() => setShowConfirm(false)} disabled={submitting}
                  style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
              </div>
              <div className="modal-body" style={{ padding: '20px 24px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                  You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
                </p>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                  Once submitted, you cannot change your answers. Are you sure you want to submit?
                </p>
                {answeredCount < questions.length && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: '#fffaf0', border: '1px solid #fbd38d', borderRadius: 6, fontSize: 12, color: '#c05621' }}>
                    <span className="material-icons" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>warning</span>
                    {questions.length - answeredCount} question{questions.length - answeredCount !== 1 ? 's' : ''} left unanswered.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowConfirm(false)} disabled={submitting}
                  style={{ padding: '9px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', fontWeight: 600 }}>
                  Continue Exam
                </button>
                <button onClick={handleSubmit} disabled={submitting}
                  style={{ padding: '9px 20px', background: submitting ? '#a0aec0' : '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {submitting
                    ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Submitting…</>
                    : 'Submit Exam'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    );
  }

  return null;
}
