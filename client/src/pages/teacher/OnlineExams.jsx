import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import { onlineExamTeacherAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const STATUS_COLOR  = { DRAFT: '#718096', PUBLISHED: '#3182ce', CLOSED: '#a0aec0' };
const STATUS_BG     = { DRAFT: '#edf2f7', PUBLISHED: '#ebf8ff', CLOSED: '#f7fafc' };

const EMPTY_EXAM_FORM = {
  title: '', subject: '', className: '', section: '',
  dueDateTime: '', instructions: '',
};
const EMPTY_Q_FORM = {
  questionText: '', questionType: 'MCQ',
  optionA: '', optionB: '', optionC: '', optionD: '',
  correctAnswer: 'A', marks: 1,
};

function formatDue(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function DueCountdown({ dueDateTime }) {
  if (!dueDateTime) return null;
  const diff = new Date(dueDateTime) - Date.now();
  if (diff <= 0) return <span style={{ color: '#e53e3e', fontSize: 11 }}>Overdue</span>;
  const days = Math.floor(diff / 86400000);
  const hrs  = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return <span style={{ color: '#805ad5', fontSize: 11 }}>{days}d {hrs}h left</span>;
  if (hrs > 0)  return <span style={{ color: '#d69e2e', fontSize: 11 }}>{hrs}h {mins}m left</span>;
  return <span style={{ color: '#e53e3e', fontSize: 11 }}>{mins}m left</span>;
}

export default function OnlineExams() {
  const [tab,           setTab]           = useState('exams');  // 'exams' | 'questions' | 'results'
  const [exams,         setExams]         = useState([]);
  const [loading,       setLoading]       = useState(true);

  // Selected exam context
  const [selectedExam,  setSelectedExam]  = useState(null);  // full exam object with questions

  // Exam modal
  const [showExamModal, setShowExamModal] = useState(false);
  const [examForm,      setExamForm]      = useState(EMPTY_EXAM_FORM);
  const [savingExam,    setSavingExam]    = useState(false);

  // Due date update modal (for published exams)
  const [showDueModal,  setShowDueModal]  = useState(false);
  const [dueDateEdit,   setDueDateEdit]   = useState('');
  const [savingDue,     setSavingDue]     = useState(false);

  // Delete confirm
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleting,      setDeleting]      = useState(false);

  // Question form
  const [qForm,         setQForm]         = useState(EMPTY_Q_FORM);
  const [savingQ,       setSavingQ]       = useState(false);
  const [editingQ,      setEditingQ]      = useState(null);  // question id being edited
  const [deletingQId,   setDeletingQId]   = useState(null);

  // Results
  const [results,       setResults]       = useState([]);
  const [loadingRes,    setLoadingRes]    = useState(false);
  const [expandedAttempt, setExpandedAttempt] = useState(null);
  const [gradeEdits,    setGradeEdits]    = useState({});  // { questionId: marksAwarded }
  const [savingGrades,  setSavingGrades]  = useState(false);

  const showToast = useToast();

  // ── Load exams ─────────────────────────────────────────────────────────────
  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await onlineExamTeacherAPI.listExams();
      setExams(res.data?.data ?? []);
    } catch {
      showToast('Failed to load exams', 'error');
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadExams(); }, [loadExams]);

  // ── Load full exam with questions ──────────────────────────────────────────
  const loadExamDetail = async (id) => {
    try {
      const res = await onlineExamTeacherAPI.getExam(id);
      const data = res.data?.data ?? res.data;
      setSelectedExam(data);
      return data;
    } catch {
      showToast('Failed to load exam details', 'error');
      return null;
    }
  };

  // ── Load results ───────────────────────────────────────────────────────────
  const loadResults = async (examId) => {
    setLoadingRes(true);
    try {
      const res = await onlineExamTeacherAPI.getResults(examId);
      setResults(res.data?.data ?? []);
    } catch {
      showToast('Failed to load results', 'error');
      setResults([]);
    } finally {
      setLoadingRes(false);
    }
  };

  // ── Exam CRUD ──────────────────────────────────────────────────────────────
  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!examForm.title.trim()) { showToast('Title is required', 'error'); return; }
    setSavingExam(true);
    try {
      const payload = {
        title:       examForm.title.trim(),
        subject:     examForm.subject.trim(),
        className:   examForm.className.trim(),
        section:     examForm.section.trim(),
        dueDateTime: examForm.dueDateTime || null,
        instructions: examForm.instructions.trim(),
      };
      const res = await onlineExamTeacherAPI.createExam(payload);
      if (res.data?.success === false) {
        showToast(res.data.message || 'Failed to create exam', 'error');
        return;
      }
      setShowExamModal(false);
      setExamForm(EMPTY_EXAM_FORM);
      await loadExams();
      showToast('Exam created successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create exam', 'error');
    } finally {
      setSavingExam(false);
    }
  };

  const handlePublish = async (exam) => {
    try {
      await onlineExamTeacherAPI.publishExam(exam.id);
      await loadExams();
      if (selectedExam?.id === exam.id) await loadExamDetail(exam.id);
      showToast('Exam published');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to publish exam', 'error');
    }
  };

  const handleClose = async (exam) => {
    try {
      await onlineExamTeacherAPI.closeExam(exam.id);
      await loadExams();
      if (selectedExam?.id === exam.id) await loadExamDetail(exam.id);
      showToast('Exam closed');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to close exam', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onlineExamTeacherAPI.deleteExam(deleteTarget.id);
      if (selectedExam?.id === deleteTarget.id) {
        setSelectedExam(null);
        setTab('exams');
      }
      setDeleteTarget(null);
      await loadExams();
      showToast('Exam deleted', 'warning');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete exam', 'error');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateDue = async (e) => {
    e.preventDefault();
    if (!selectedExam) return;
    setSavingDue(true);
    try {
      await onlineExamTeacherAPI.updateExam(selectedExam.id, { dueDateTime: dueDateEdit || null });
      setShowDueModal(false);
      const updated = await loadExamDetail(selectedExam.id);
      if (updated) setSelectedExam(updated);
      await loadExams();
      showToast('Due date updated');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update due date', 'error');
    } finally {
      setSavingDue(false);
    }
  };

  // ── Question CRUD ──────────────────────────────────────────────────────────
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!qForm.questionText.trim()) { showToast('Question text is required', 'error'); return; }
    if (qForm.questionType === 'MCQ') {
      if (!qForm.optionA.trim() || !qForm.optionB.trim()) {
        showToast('MCQ requires at least options A and B', 'error'); return;
      }
    }
    setSavingQ(true);
    try {
      const payload = {
        questionText: qForm.questionText.trim(),
        questionType: qForm.questionType,
        marks: Number(qForm.marks) || 1,
        ...(qForm.questionType === 'MCQ' && {
          optionA: qForm.optionA.trim(),
          optionB: qForm.optionB.trim(),
          optionC: qForm.optionC.trim() || null,
          optionD: qForm.optionD.trim() || null,
          correctAnswer: qForm.correctAnswer,
        }),
      };

      if (editingQ) {
        await onlineExamTeacherAPI.updateQuestion(selectedExam.id, editingQ, payload);
        setEditingQ(null);
        showToast('Question updated');
      } else {
        await onlineExamTeacherAPI.addQuestion(selectedExam.id, payload);
        showToast('Question added');
      }
      setQForm(EMPTY_Q_FORM);
      const updated = await loadExamDetail(selectedExam.id);
      if (updated) {
        setSelectedExam(updated);
        setExams(prev => prev.map(ex => ex.id === updated.id
          ? { ...ex, questionCount: (updated.questions || []).length, totalMarks: updated.totalMarks }
          : ex
        ));
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save question', 'error');
    } finally {
      setSavingQ(false);
    }
  };

  const startEditQuestion = (q) => {
    setEditingQ(q.id);
    setQForm({
      questionText: q.questionText,
      questionType: q.questionType,
      optionA: q.optionA || '',
      optionB: q.optionB || '',
      optionC: q.optionC || '',
      optionD: q.optionD || '',
      correctAnswer: q.correctAnswer || 'A',
      marks: q.marks,
    });
  };

  const handleDeleteQuestion = async (qId) => {
    setDeletingQId(qId);
    try {
      await onlineExamTeacherAPI.deleteQuestion(selectedExam.id, qId);
      const updated = await loadExamDetail(selectedExam.id);
      if (updated) {
        setSelectedExam(updated);
        setExams(prev => prev.map(ex => ex.id === updated.id
          ? { ...ex, questionCount: (updated.questions || []).length, totalMarks: updated.totalMarks }
          : ex
        ));
      }
      showToast('Question deleted', 'warning');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete question', 'error');
    } finally {
      setDeletingQId(null);
    }
  };

  // ── Grading ────────────────────────────────────────────────────────────────
  const openAttempt = (attempt) => {
    setExpandedAttempt(attempt.attemptId);
    const initGrades = {};
    (attempt.answers || []).forEach(ans => {
      if (ans.questionType === 'WRITTEN') {
        initGrades[ans.questionId] = ans.marksAwarded ?? '';
      }
    });
    setGradeEdits(initGrades);
  };

  const handleSaveGrades = async (attempt) => {
    setSavingGrades(true);
    try {
      const grades = Object.entries(gradeEdits).map(([qId, marks]) => ({
        questionId: Number(qId),
        marksAwarded: Number(marks) || 0,
      }));
      await onlineExamTeacherAPI.gradeAttempt(selectedExam.id, attempt.attemptId, grades);
      showToast('Grades saved');
      await loadResults(selectedExam.id);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save grades', 'error');
    } finally {
      setSavingGrades(false);
    }
  };

  // ── Tab navigation ─────────────────────────────────────────────────────────
  const openQuestionsTab = async (exam) => {
    const detail = await loadExamDetail(exam.id);
    if (detail) {
      setSelectedExam(detail);
      setQForm(EMPTY_Q_FORM);
      setEditingQ(null);
      setTab('questions');
    }
  };

  const openResultsTab = async (exam) => {
    const detail = await loadExamDetail(exam.id);
    if (detail) {
      setSelectedExam(detail);
      setExpandedAttempt(null);
      setTab('results');
      await loadResults(exam.id);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout pageTitle="Online Exams">
      <div className="page-header">
        <h1>Online Exams</h1>
        <p>Create and manage online exams for your classes</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--border-strong)' }}>
        {[
          { key: 'exams',     label: 'My Exams',  icon: 'quiz' },
          { key: 'questions', label: selectedExam ? `Questions — ${selectedExam.title}` : 'Questions', icon: 'help_outline', disabled: !selectedExam },
          { key: 'results',   label: selectedExam ? `Results — ${selectedExam.title}`   : 'Results',   icon: 'bar_chart',   disabled: !selectedExam },
        ].map(t => (
          <button key={t.key}
            disabled={t.disabled}
            onClick={() => !t.disabled && setTab(t.key)}
            style={{
              border: 'none', background: 'none', padding: '10px 20px', cursor: t.disabled ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? '#0de1e8' : t.disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
              borderBottom: tab === t.key ? '2.5px solid #0de1e8' : '2.5px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s',
            }}>
            <span className="material-icons" style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MY EXAMS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'exams' && (
        <div className="data-table-card">
          <div className="search-filter-bar">
            <div style={{ flex: 1 }} />
            <Button variant="add" onClick={() => { setExamForm(EMPTY_EXAM_FORM); setShowExamModal(true); }}>
              <span className="material-icons">add</span> New Exam
            </Button>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="material-icons" style={{ fontSize: 36, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
              Loading exams…
            </div>
          ) : exams.length === 0 ? (
            <div className="empty-state" style={{ padding: 48, textAlign: 'center' }}>
              <span className="material-icons" style={{ fontSize: 48, color: 'var(--border-strong)', display: 'block', marginBottom: 12 }}>quiz</span>
              <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>No exams yet.</p>
              <Button variant="add" onClick={() => setShowExamModal(true)}>
                <span className="material-icons">add</span> Create First Exam
              </Button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-alt)' }}>
                    {['Title', 'Subject', 'Class', 'Due Date', 'Status', 'Questions', 'Marks', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exams.map(exam => (
                    <tr key={exam.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 12px', fontWeight: 600, color: 'var(--text-primary)', maxWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="material-icons" style={{ fontSize: 16, color: STATUS_COLOR[exam.status] || '#718096' }}>quiz</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exam.title}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 12px', color: 'var(--text-secondary)' }}>{exam.subject || '—'}</td>
                      <td style={{ padding: '12px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {exam.className}{exam.section ? ` – ${exam.section}` : ''}
                      </td>
                      <td style={{ padding: '12px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        <div>{formatDue(exam.dueDateTime)}</div>
                        <DueCountdown dueDateTime={exam.dueDateTime} />
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: STATUS_BG[exam.status] || '#edf2f7',
                          color: STATUS_COLOR[exam.status] || '#718096',
                        }}>{exam.status}</span>
                      </td>
                      <td style={{ padding: '12px 12px', color: 'var(--text-secondary)', textAlign: 'center' }}>{exam.questionCount ?? 0}</td>
                      <td style={{ padding: '12px 12px', color: 'var(--text-secondary)', textAlign: 'center' }}>{exam.totalMarks ?? 0}</td>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button onClick={() => openQuestionsTab(exam)}
                            title="Add/Edit Questions"
                            style={{ border: 'none', background: '#ebf8ff', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: '#2b6cb0', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span className="material-icons" style={{ fontSize: 13 }}>help_outline</span> Questions
                          </button>
                          {exam.status === 'DRAFT' && (
                            <button onClick={() => handlePublish(exam)}
                              title="Publish Exam"
                              style={{ border: 'none', background: '#ebfff4', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: '#276749', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span className="material-icons" style={{ fontSize: 13 }}>publish</span> Publish
                            </button>
                          )}
                          {exam.status === 'PUBLISHED' && (
                            <button onClick={() => handleClose(exam)}
                              title="Close Exam"
                              style={{ border: 'none', background: '#fffaf0', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: '#c05621', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span className="material-icons" style={{ fontSize: 13 }}>lock</span> Close
                            </button>
                          )}
                          <button onClick={() => openResultsTab(exam)}
                            title="View Results"
                            style={{ border: 'none', background: '#f0fff4', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: '#276749', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span className="material-icons" style={{ fontSize: 13 }}>bar_chart</span> Results
                          </button>
                          {exam.status === 'DRAFT' && (
                            <button onClick={() => setDeleteTarget(exam)}
                              title="Delete"
                              className="action-btn action-btn-delete">
                              <span className="material-icons" style={{ fontSize: 14 }}>delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── QUESTIONS TAB ─────────────────────────────────────────────────────── */}
      {tab === 'questions' && selectedExam && (
        <div>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            <button onClick={() => setTab('exams')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#0de1e8', fontWeight: 600, fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-icons" style={{ fontSize: 15 }}>arrow_back</span> Back to Exams
            </button>
            <span>|</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedExam.title}</span>
            <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
              background: STATUS_BG[selectedExam.status], color: STATUS_COLOR[selectedExam.status] }}>
              {selectedExam.status}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)' }}>
              Total Marks: <strong style={{ color: 'var(--text-primary)' }}>{selectedExam.totalMarks}</strong>
            </span>
            <button onClick={() => {
              setDueDateEdit(selectedExam.dueDateTime
                ? new Date(selectedExam.dueDateTime).toISOString().slice(0, 16)
                : '');
              setShowDueModal(true);
            }}
              style={{ border: '1.5px solid var(--border-strong)', background: 'var(--surface)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-icons" style={{ fontSize: 14 }}>edit_calendar</span> Update Due Date
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
            {/* Question list */}
            <div className="data-table-card">
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                Questions ({(selectedExam.questions || []).length})
              </div>
              {(selectedExam.questions || []).length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8, color: 'var(--border-strong)' }}>help_outline</span>
                  No questions yet. Add a question using the form.
                </div>
              ) : (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(selectedExam.questions || []).map((q, idx) => (
                    <div key={q.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>{idx + 1}</span>
                            <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                              background: q.questionType === 'MCQ' ? '#ebf8ff' : '#faf5ff',
                              color: q.questionType === 'MCQ' ? '#2b6cb0' : '#6b46c1' }}>
                              {q.questionType}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: q.questionType === 'MCQ' ? 8 : 0, lineHeight: 1.5 }}>
                            {q.questionText}
                          </div>
                          {q.questionType === 'MCQ' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginTop: 6 }}>
                              {[['A', q.optionA], ['B', q.optionB], ['C', q.optionC], ['D', q.optionD]].filter(([, v]) => v).map(([lbl, val]) => (
                                <div key={lbl} style={{
                                  fontSize: 12, color: q.correctAnswer === lbl ? '#276749' : 'var(--text-secondary)',
                                  background: q.correctAnswer === lbl ? '#f0fff4' : 'transparent',
                                  padding: '2px 6px', borderRadius: 4,
                                  display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                  <strong>{lbl}.</strong> {val}
                                  {q.correctAnswer === lbl && <span className="material-icons" style={{ fontSize: 12, color: '#38a169' }}>check_circle</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => startEditQuestion(q)}
                            style={{ border: 'none', background: '#ebf8ff', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#2b6cb0' }}>
                            <span className="material-icons" style={{ fontSize: 14 }}>edit</span>
                          </button>
                          <button onClick={() => handleDeleteQuestion(q.id)}
                            disabled={deletingQId === q.id}
                            style={{ border: 'none', background: '#fff5f5', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#e53e3e' }}>
                            {deletingQId === q.id
                              ? <span style={{ width: 14, height: 14, border: '2px solid rgba(229,83,62,0.3)', borderTopColor: '#e53e3e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                              : <span className="material-icons" style={{ fontSize: 14 }}>delete</span>}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add/Edit question form */}
            <div className="data-table-card" style={{ position: 'sticky', top: 80 }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {editingQ ? 'Edit Question' : 'Add Question'}
                {editingQ && (
                  <button onClick={() => { setEditingQ(null); setQForm(EMPTY_Q_FORM); }}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12 }}>
                    Cancel Edit
                  </button>
                )}
              </div>
              <form onSubmit={handleSaveQuestion} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
                    Question Text <span style={{ color: '#e53e3e' }}>*</span>
                  </label>
                  <textarea rows={3} className="form-control form-control-sm"
                    placeholder="Enter question text…"
                    value={qForm.questionText}
                    onChange={e => setQForm(f => ({ ...f, questionText: e.target.value }))} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Type</label>
                    <select className="filter-select" style={{ width: '100%' }}
                      value={qForm.questionType}
                      onChange={e => setQForm(f => ({ ...f, questionType: e.target.value }))}>
                      <option value="MCQ">MCQ</option>
                      <option value="WRITTEN">Written</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Marks</label>
                    <input type="number" className="form-control form-control-sm" min={1}
                      value={qForm.marks}
                      onChange={e => setQForm(f => ({ ...f, marks: e.target.value }))} />
                  </div>
                </div>

                {qForm.questionType === 'MCQ' && (
                  <>
                    {[['A', 'optionA'], ['B', 'optionB'], ['C', 'optionC'], ['D', 'optionD']].map(([lbl, key]) => (
                      <div key={key}>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
                          Option {lbl} {lbl === 'A' || lbl === 'B' ? <span style={{ color: '#e53e3e' }}>*</span> : null}
                        </label>
                        <input type="text" className="form-control form-control-sm"
                          placeholder={`Option ${lbl}`}
                          maxLength={500}
                          value={qForm[key]}
                          onChange={e => setQForm(f => ({ ...f, [key]: e.target.value }))} />
                      </div>
                    ))}
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
                        Correct Answer <span style={{ color: '#e53e3e' }}>*</span>
                      </label>
                      <select className="filter-select" style={{ width: '100%' }}
                        value={qForm.correctAnswer}
                        onChange={e => setQForm(f => ({ ...f, correctAnswer: e.target.value }))}>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                  </>
                )}

                <button type="submit" disabled={savingQ}
                  style={{ padding: '9px', background: savingQ ? '#a0aec0' : '#0de1e8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: savingQ ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {savingQ
                    ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Saving…</>
                    : <><span className="material-icons" style={{ fontSize: 16 }}>add</span> {editingQ ? 'Update Question' : 'Add Question'}</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS TAB ───────────────────────────────────────────────────────── */}
      {tab === 'results' && selectedExam && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            <button onClick={() => setTab('exams')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#0de1e8', fontWeight: 600, fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="material-icons" style={{ fontSize: 15 }}>arrow_back</span> Back to Exams
            </button>
            <span>|</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedExam.title}</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)' }}>
              Total Marks: <strong>{selectedExam.totalMarks}</strong>
            </span>
          </div>

          <div className="data-table-card">
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              Student Results ({results.length})
            </div>

            {loadingRes ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
                Loading results…
              </div>
            ) : results.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8, color: 'var(--border-strong)' }}>bar_chart</span>
                No submissions yet.
              </div>
            ) : (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.map(attempt => {
                  const statusClr = attempt.status === 'GRADED' ? '#276749' : attempt.status === 'SUBMITTED' ? '#2b6cb0' : '#a0aec0';
                  const isExpanded = expandedAttempt === attempt.attemptId;
                  return (
                    <div key={attempt.attemptId} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: attempt.status !== 'IN_PROGRESS' ? 'pointer' : 'default' }}
                        onClick={() => attempt.status !== 'IN_PROGRESS' && (isExpanded ? setExpandedAttempt(null) : openAttempt(attempt))}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="material-icons" style={{ fontSize: 18, color: 'var(--text-secondary)' }}>person</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{attempt.studentName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {attempt.className}{attempt.section ? ` – ${attempt.section}` : ''}
                            {attempt.submittedAt && ` · Submitted ${new Date(attempt.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: statusClr }}>
                            {attempt.totalScore !== null && attempt.totalScore !== undefined ? `${attempt.totalScore}/${selectedExam.totalMarks}` : '—'}
                          </div>
                          <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                            background: attempt.status === 'GRADED' ? '#f0fff4' : attempt.status === 'SUBMITTED' ? '#ebf8ff' : '#edf2f7',
                            color: statusClr }}>
                            {attempt.status}
                          </span>
                        </div>
                        {attempt.status !== 'IN_PROGRESS' && (
                          <span className="material-icons" style={{ fontSize: 18, color: 'var(--text-muted)' }}>
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        )}
                      </div>

                      {isExpanded && (
                        <div style={{ borderTop: '1px solid var(--border)', padding: 16, background: '#fafcff' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {(attempt.answers || []).map((ans, idx) => (
                              <div key={ans.questionId} style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Q{idx + 1}</span>
                                      <span style={{ padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                                        background: ans.questionType === 'MCQ' ? '#ebf8ff' : '#faf5ff',
                                        color: ans.questionType === 'MCQ' ? '#2b6cb0' : '#6b46c1' }}>
                                        {ans.questionType}
                                      </span>
                                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ans.marks} mark{ans.marks !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 6 }}>{ans.questionText}</div>
                                    {ans.questionType === 'MCQ' && ans.correctAnswer && (
                                      <div style={{ fontSize: 11, color: '#276749', marginBottom: 4 }}>
                                        Correct: <strong>{ans.correctAnswer}</strong>
                                      </div>
                                    )}
                                    <div style={{ fontSize: 12, padding: '6px 10px', background: 'var(--surface-alt)', borderRadius: 6, color: 'var(--text-secondary)' }}>
                                      Student: <strong>{ans.studentAnswer ?? <em style={{ color: 'var(--text-muted)' }}>No answer</em>}</strong>
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 100 }}>
                                    {ans.questionType === 'MCQ' ? (
                                      <div>
                                        {ans.isCorrect !== null && ans.isCorrect !== undefined ? (
                                          <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                                            background: ans.isCorrect ? '#f0fff4' : '#fff5f5',
                                            color: ans.isCorrect ? '#276749' : '#c53030' }}>
                                            {ans.isCorrect ? `+${ans.marksAwarded}` : '0'}
                                          </span>
                                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                                        <input type="number" min={0} max={ans.marks}
                                          placeholder={`/${ans.marks}`}
                                          value={gradeEdits[ans.questionId] ?? (ans.marksAwarded ?? '')}
                                          onChange={e => setGradeEdits(prev => ({ ...prev, [ans.questionId]: e.target.value }))}
                                          style={{ width: 70, padding: '4px 8px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, textAlign: 'center' }} />
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>of {ans.marks}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {(attempt.answers || []).some(a => a.questionType === 'WRITTEN') && (
                            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                              <button onClick={() => handleSaveGrades(attempt)} disabled={savingGrades}
                                style={{ padding: '8px 20px', background: savingGrades ? '#a0aec0' : '#0de1e8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: savingGrades ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {savingGrades
                                  ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Saving…</>
                                  : <><span className="material-icons" style={{ fontSize: 16 }}>save</span> Save Grades</>}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create Exam Modal ────────────────────────────────────────────────── */}
      {showExamModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !savingExam && setShowExamModal(false)}>
          <div className="modal-container" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Create New Exam</h3>
              <button onClick={() => setShowExamModal(false)} disabled={savingExam}
                style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <form onSubmit={handleSaveExam}>
              <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>
                    Title <span style={{ color: '#e53e3e' }}>*</span>
                  </label>
                  <input type="text" className="form-control form-control-sm"
                    placeholder="e.g. Mid-Term Mathematics Exam"
                    maxLength={200}
                    value={examForm.title}
                    onChange={e => setExamForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>Subject</label>
                    <input type="text" className="form-control form-control-sm"
                      placeholder="e.g. Mathematics"
                      maxLength={100}
                      value={examForm.subject}
                      onChange={e => setExamForm(f => ({ ...f, subject: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>Class</label>
                    <input type="text" className="form-control form-control-sm"
                      placeholder="e.g. Class 10"
                      maxLength={50}
                      value={examForm.className}
                      onChange={e => setExamForm(f => ({ ...f, className: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>Section</label>
                    <input type="text" className="form-control form-control-sm"
                      placeholder="e.g. A"
                      maxLength={20}
                      value={examForm.section}
                      onChange={e => setExamForm(f => ({ ...f, section: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>Due Date & Time</label>
                    <input type="datetime-local" className="form-control form-control-sm"
                      value={examForm.dueDateTime}
                      onChange={e => setExamForm(f => ({ ...f, dueDateTime: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>Instructions</label>
                  <textarea rows={3} className="form-control form-control-sm"
                    placeholder="Any instructions for students…"
                    value={examForm.instructions}
                    onChange={e => setExamForm(f => ({ ...f, instructions: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowExamModal(false)} disabled={savingExam}
                  style={{ padding: '9px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={savingExam}
                  style={{ padding: '9px 20px', background: savingExam ? '#a0aec0' : '#0de1e8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: savingExam ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {savingExam
                    ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Saving…</>
                    : 'Create Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Update Due Date Modal ────────────────────────────────────────────── */}
      {showDueModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !savingDue && setShowDueModal(false)}>
          <div className="modal-container" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Update Due Date</h3>
              <button onClick={() => setShowDueModal(false)} disabled={savingDue}
                style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <form onSubmit={handleUpdateDue}>
              <div className="modal-body" style={{ padding: '20px 24px' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Due Date &amp; Time</label>
                <input type="datetime-local" className="form-control form-control-sm"
                  value={dueDateEdit}
                  onChange={e => setDueDateEdit(e.target.value)} />
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                  Leave empty to remove the due date. This update applies even if the exam is published.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowDueModal(false)} disabled={savingDue}
                  style={{ padding: '9px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={savingDue}
                  style={{ padding: '9px 20px', background: savingDue ? '#a0aec0' : '#0de1e8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: savingDue ? 'not-allowed' : 'pointer' }}>
                  {savingDue ? 'Saving…' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !deleting && setDeleteTarget(null)}>
          <div className="modal-container" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Delete Exam</h3>
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Are you sure you want to delete <strong>"{deleteTarget.title}"</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}
                style={{ padding: '9px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ padding: '9px 20px', background: deleting ? '#a0aec0' : '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
