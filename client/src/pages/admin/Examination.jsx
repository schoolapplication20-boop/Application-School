import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import HallTicketDocument from '../../components/HallTicketDocument';
import { examinationAPI } from '../../services/api';
import { adminAPI } from '../../services/api';
import '../../styles/examination.css';

const EXAM_TYPES   = ['ANNUAL', 'HALFYEARLY', 'QUARTERLY', 'MIDTERM', 'UNIT_TEST'];
const CERT_TYPES   = ['BONAFIDE', 'TRANSFER', 'COURSE_COMPLETION', 'MARKS_MEMO'];
const CLASSES      = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const SECTIONS     = ['A','B','C','D'];

const certLabel = { BONAFIDE: 'Bonafide', TRANSFER: 'Transfer Certificate', COURSE_COMPLETION: 'Course Completion', MARKS_MEMO: 'Marks Memo' };
const examTypeLabel = { ANNUAL: 'Annual', HALFYEARLY: 'Half Yearly', QUARTERLY: 'Quarterly', MIDTERM: 'Mid Term', UNIT_TEST: 'Unit Test' };
const statusColor = { SCHEDULED: 'exam-badge-blue', ONGOING: 'exam-badge-orange', COMPLETED: 'exam-badge-green', CANCELLED: 'exam-badge-red' };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const today   = () => new Date().toISOString().split('T')[0];

// HallTicketPrint is now the shared HallTicketDocument component (imported above)

// ─── Certificate Print Preview ───────────────────────────────────────────────
function CertificatePrint({ cert }) {
  const type = cert.certificateType;

  const body = {
    BONAFIDE: <>This is to certify that <strong>{cert.studentName}</strong> (Roll No: {cert.rollNumber}) is a bonafide student of Class <strong>{cert.className}{cert.section ? ' – ' + cert.section : ''}</strong> for the academic year <strong>{cert.academicYear || '—'}</strong>. This certificate is issued for the purpose of <strong>{cert.purpose || 'official use'}</strong>.</>,
    TRANSFER: <>This is to certify that <strong>{cert.studentName}</strong> (Roll No: {cert.rollNumber}) was a bonafide student of Class <strong>{cert.className}{cert.section ? ' – ' + cert.section : ''}</strong> during the academic year <strong>{cert.academicYear || '—'}</strong>. The student has been granted Transfer Certificate and no dues are outstanding against the student.</>,
    COURSE_COMPLETION: <>This is to certify that <strong>{cert.studentName}</strong> (Roll No: {cert.rollNumber}) has successfully completed the course of Class <strong>{cert.className}{cert.section ? ' – ' + cert.section : ''}</strong> during the academic year <strong>{cert.academicYear || '—'}</strong> and has fulfilled all academic requirements.</>,
    MARKS_MEMO: <>This is to certify that <strong>{cert.studentName}</strong> (Roll No: {cert.rollNumber}) of Class <strong>{cert.className}{cert.section ? ' – ' + cert.section : ''}</strong> has appeared in the examinations during the academic year <strong>{cert.academicYear || '—'}</strong>. The marks/grades obtained are as recorded in the official school register.</>,
  };

  return (
    <div className="cert-preview">
      <div className="cert-header">
        <div className="cert-logo">🏆</div>
        <div className="cert-school-name">Schoolers Institution</div>
        <div className="cert-school-sub">Affiliated • CBSE • Est. 2005</div>
      </div>
      <div className="cert-type-banner">{certLabel[type] || type}</div>
      <div className="cert-body">
        {cert.verifiedBy && (
          <div className="cert-verified-banner">
            <span className="material-icons" style={{ fontSize: '18px' }}>verified</span>
            Verified by {cert.verifiedBy}
          </div>
        )}
        <div className="cert-id-line">Certificate ID: <strong>{cert.certificateId}</strong></div>
        <div className="cert-date-line">Date: {fmtDate(cert.issueDate)}</div>
        <div className="cert-to-whom">TO WHOM IT MAY CONCERN</div>
        <div style={{ marginBottom: '16px' }}><span className="cert-student-name">{cert.studentName}</span></div>
        <div className="cert-content">{body[type] || 'Certificate details not available.'}</div>
      </div>
      <div className="cert-footer">
        <div className="cert-sign-block">
          <div className="cert-sign-line" />
          <div className="cert-sign-label">Class Teacher</div>
        </div>
        <div className="cert-seal">SCHOOL<br/>SEAL</div>
        <div className="cert-sign-block">
          <div className="cert-sign-line" />
          <div className="cert-sign-label">Principal</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Examination() {
  const [activeTab,  setActiveTab]  = useState('schedules');
  const [schedules,  setSchedules]  = useState([]);
  const [hallTickets, setHallTickets] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [students,   setStudents]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState(null);

  // Filters
  const [search,      setSearch]      = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterType,  setFilterType]  = useState('');

  // Modals
  const [showSchedModal,  setShowSchedModal]  = useState(false);
  const [showHtModal,     setShowHtModal]     = useState(false);
  const [showBulkModal,   setShowBulkModal]   = useState(false);
  const [showCertModal,   setShowCertModal]   = useState(false);
  const [showPreview,     setShowPreview]     = useState(false);
  const [previewItem,     setPreviewItem]     = useState(null);
  const [previewType,     setPreviewType]     = useState(''); // 'hallticket' | 'certificate'
  const [editSched,       setEditSched]       = useState(null);

  // Forms
  const emptySchedForm = { examName: '', examType: 'ANNUAL', className: '', section: '', subject: '', examDate: today(), startTime: '09:00', endTime: '12:00', hallNumber: '', maxMarks: 100, instructions: '' };
  const emptyHtForm    = { studentId: '', examName: '', examType: 'ANNUAL', academicYear: '2023-2024' };
  const emptyBulkForm  = { className: '', section: '', examName: '', examType: 'ANNUAL', academicYear: '2023-2024' };
  const emptyCertForm  = { studentId: '', certificateType: 'BONAFIDE', purpose: '', academicYear: '2023-2024' };

  const [schedForm,  setSchedForm]  = useState(emptySchedForm);
  const [htForm,     setHtForm]     = useState(emptyHtForm);
  const [bulkForm,   setBulkForm]   = useState(emptyBulkForm);
  const [certForm,   setCertForm]   = useState(emptyCertForm);
  const [saving,     setSaving]     = useState(false);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  // ─── Load Data ─────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, htRes, certRes] = await Promise.all([
        examinationAPI.getSchedules({}),
        examinationAPI.getHallTickets({}),
        examinationAPI.getCertificates({}),
      ]);
      setSchedules(sRes.data?.data ?? []);
      setHallTickets(htRes.data?.data ?? []);
      setCertificates(certRes.data?.data ?? []);
    } catch {
      setSchedules([]);
      setHallTickets([]);
      setCertificates([]);
    }
    try {
      const sRes = await adminAPI.getStudents({});
      const raw = sRes.data?.data;
      const arr = raw?.content ?? raw ?? [];
      setStudents(Array.isArray(arr) ? arr : []);
    } catch {
      setStudents([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Filtered Lists ─────────────────────────────────────────────────────────
  const filteredSchedules = useMemo(() => schedules.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || s.examName.toLowerCase().includes(q) || s.subject.toLowerCase().includes(q) || s.className.includes(q);
    const matchClass = !filterClass || s.className === filterClass;
    const matchType  = !filterType  || s.examType === filterType;
    return matchQ && matchClass && matchType;
  }), [schedules, search, filterClass, filterType]);

  const filteredTickets = useMemo(() => hallTickets.filter(t => {
    const q = search.toLowerCase();
    const matchQ = !q || t.studentName.toLowerCase().includes(q) || t.ticketNumber.toLowerCase().includes(q) || t.rollNumber.toLowerCase().includes(q);
    const matchClass = !filterClass || t.className === filterClass;
    const matchType  = !filterType  || t.examType === filterType;
    return matchQ && matchClass && matchType;
  }), [hallTickets, search, filterClass, filterType]);

  const filteredCerts = useMemo(() => certificates.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || c.studentName.toLowerCase().includes(q) || c.certificateId.toLowerCase().includes(q) || c.rollNumber.toLowerCase().includes(q);
    const matchClass = !filterClass || c.className === filterClass;
    const matchType  = !filterType  || c.certificateType === filterType;
    return matchQ && matchClass && matchType;
  }), [certificates, search, filterClass, filterType]);

  const stats = useMemo(() => ({
    totalSchedules:  schedules.length,
    upcoming:        schedules.filter(s => s.status === 'SCHEDULED').length,
    totalTickets:    hallTickets.length,
    totalCerts:      certificates.length,
  }), [schedules, hallTickets, certificates]);

  // ─── Schedule CRUD ──────────────────────────────────────────────────────────
  const handleOpenSchedModal = (sched = null) => {
    setEditSched(sched);
    setSchedForm(sched ? { ...sched } : emptySchedForm);
    setShowSchedModal(true);
  };

  const handleSaveSchedule = async () => {
    if (!schedForm.examName || !schedForm.className || !schedForm.subject) {
      showToast('Please fill all required fields', 'error'); return;
    }
    setSaving(true);
    try {
      if (editSched) {
        await examinationAPI.updateSchedule(editSched.id, schedForm);
        showToast('Exam schedule updated');
      } else {
        await examinationAPI.createSchedule(schedForm);
        showToast('Exam schedule created');
      }
      setShowSchedModal(false);
      loadAll();
    } catch {
      // Optimistic local update for demo
      if (editSched) {
        setSchedules(prev => prev.map(s => s.id === editSched.id ? { ...s, ...schedForm } : s));
        showToast('Schedule updated (offline mode)');
      } else {
        setSchedules(prev => [...prev, { id: Date.now(), ...schedForm, status: 'SCHEDULED' }]);
        showToast('Schedule added (offline mode)');
      }
      setShowSchedModal(false);
    }
    setSaving(false);
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Delete this exam schedule?')) return;
    try { await examinationAPI.deleteSchedule(id); } catch { /* offline */ }
    setSchedules(prev => prev.filter(s => s.id !== id));
    showToast('Schedule deleted');
  };

  // ─── Hall Ticket CRUD ───────────────────────────────────────────────────────
  const handleCreateHallTicket = async () => {
    if (!htForm.studentId || !htForm.examName) {
      showToast('Select student and exam', 'error'); return;
    }
    setSaving(true);
    const student = students.find(s => String(s.id) === String(htForm.studentId));
    if (!student) { showToast('Student not found', 'error'); setSaving(false); return; }
    const payload = {
      studentId:   student.id,
      studentName: student.name,
      rollNumber:  student.rollNumber,
      className:   student.className,
      section:     student.section,
      examName:    htForm.examName,
      examType:    htForm.examType,
      academicYear: htForm.academicYear,
      examSubjects: JSON.stringify(
        schedules.filter(s => s.examName === htForm.examName && s.className === student.className)
          .map(s => ({ subject: s.subject, date: s.examDate, startTime: s.startTime, endTime: s.endTime, hall: s.hallNumber, maxMarks: s.maxMarks }))
      ),
    };
    try {
      await examinationAPI.createHallTicket(payload);
      showToast('Hall ticket generated');
      setShowHtModal(false);
      loadAll();
    } catch {
      const ticket = { id: Date.now(), ticketNumber: 'HT' + Date.now().toString().slice(5), ...payload, createdAt: new Date().toISOString() };
      setHallTickets(prev => [ticket, ...prev]);
      showToast('Hall ticket generated (offline mode)');
      setShowHtModal(false);
    }
    setSaving(false);
  };

  const handleBulkGenerate = async () => {
    if (!bulkForm.className || !bulkForm.examName) {
      showToast('Select class and exam name', 'error'); return;
    }
    setSaving(true);
    const payload = {
      ...bulkForm,
      examSubjects: JSON.stringify(
        schedules.filter(s => s.examName === bulkForm.examName && s.className === bulkForm.className)
          .map(s => ({ subject: s.subject, date: s.examDate, startTime: s.startTime, endTime: s.endTime, hall: s.hallNumber, maxMarks: s.maxMarks }))
      ),
    };
    try {
      const res = await examinationAPI.generateBulkHallTickets(payload);
      showToast(res.data?.message || 'Bulk hall tickets generated');
      setShowBulkModal(false);
      loadAll();
    } catch {
      const classStudents = students.filter(s => s.className === bulkForm.className && (!bulkForm.section || s.section === bulkForm.section));
      const newTickets = classStudents.map(s => ({
        id: Date.now() + Math.random(), ticketNumber: 'HT' + Date.now().toString().slice(5) + Math.floor(Math.random()*100),
        studentId: s.id, studentName: s.name, rollNumber: s.rollNumber,
        className: s.className, section: s.section,
        examName: bulkForm.examName, examType: bulkForm.examType, academicYear: bulkForm.academicYear,
        examSubjects: payload.examSubjects, createdAt: new Date().toISOString(),
      }));
      setHallTickets(prev => [...newTickets, ...prev]);
      showToast(`Generated ${newTickets.length} hall tickets (offline mode)`);
      setShowBulkModal(false);
    }
    setSaving(false);
  };

  const handleDeleteTicket = async (id) => {
    if (!window.confirm('Delete this hall ticket?')) return;
    try { await examinationAPI.deleteHallTicket(id); } catch { /* offline */ }
    setHallTickets(prev => prev.filter(t => t.id !== id));
    showToast('Hall ticket deleted');
  };

  // ─── Certificate CRUD ────────────────────────────────────────────────────────
  const handleCreateCertificate = async () => {
    if (!certForm.studentId || !certForm.certificateType) {
      showToast('Select student and certificate type', 'error'); return;
    }
    setSaving(true);
    const student = students.find(s => String(s.id) === String(certForm.studentId));
    if (!student) { showToast('Student not found', 'error'); setSaving(false); return; }
    const payload = {
      studentId:       student.id,
      studentName:     student.name,
      rollNumber:      student.rollNumber,
      className:       student.className,
      section:         student.section,
      certificateType: certForm.certificateType,
      purpose:         certForm.purpose,
      academicYear:    certForm.academicYear,
    };
    try {
      await examinationAPI.createCertificate(payload);
      showToast('Certificate generated');
      setShowCertModal(false);
      loadAll();
    } catch {
      const prefix = { BONAFIDE: 'BON', TRANSFER: 'TC', COURSE_COMPLETION: 'CC', MARKS_MEMO: 'MM' };
      const cert = {
        id: Date.now(),
        certificateId: (prefix[certForm.certificateType] || 'CERT') + Date.now().toString().slice(7),
        ...payload, issueDate: today(), verifiedBy: null, createdAt: new Date().toISOString(),
      };
      setCertificates(prev => [cert, ...prev]);
      showToast('Certificate generated (offline mode)');
      setShowCertModal(false);
    }
    setSaving(false);
  };

  const handleDeleteCertificate = async (id) => {
    if (!window.confirm('Delete this certificate?')) return;
    try { await examinationAPI.deleteCertificate(id); } catch { /* offline */ }
    setCertificates(prev => prev.filter(c => c.id !== id));
    showToast('Certificate deleted');
  };

  const handlePreview = (item, type) => {
    setPreviewItem(item);
    setPreviewType(type);
    setShowPreview(true);
  };

  // Isolated print: injects only the hall ticket into the print stream
  const handlePrint = (item, type) => {
    if (type === 'hallticket' && item) {
      document.body.classList.add('printing-hall-ticket');
      // Temporarily render the ticket DOM so the ID exists
      setPreviewItem(item);
      setPreviewType('hallticket');
      setShowPreview(true);
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.print();
          document.body.classList.remove('printing-hall-ticket');
        }, 180);
      });
    } else {
      window.print();
    }
  };

  const resetFilters = () => { setSearch(''); setFilterClass(''); setFilterType(''); };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="exam-page-header">
        <div>
          <h1 className="exam-page-title">
            <span className="material-icons">verified</span>
            Examination & Certificates
          </h1>
          <p className="exam-page-subtitle">Manage exam schedules, hall tickets, and student certificates</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'schedules' && (
            <button className="btn-exam-primary" onClick={() => handleOpenSchedModal()}>
              <span className="material-icons" style={{ fontSize: '16px' }}>add</span>
              Add Schedule
            </button>
          )}
          {activeTab === 'halltickets' && (
            <>
              <button className="btn-exam-secondary" onClick={() => setShowBulkModal(true)}>
                <span className="material-icons" style={{ fontSize: '16px' }}>group</span>
                Bulk Generate
              </button>
              <button className="btn-exam-primary" onClick={() => setShowHtModal(true)}>
                <span className="material-icons" style={{ fontSize: '16px' }}>add</span>
                Generate
              </button>
            </>
          )}
          {activeTab === 'certificates' && (
            <button className="btn-exam-primary" onClick={() => setShowCertModal(true)}>
              <span className="material-icons" style={{ fontSize: '16px' }}>add</span>
              Issue Certificate
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="exam-stats-row">
        <div className="exam-stat-card">
          <div className="exam-stat-icon" style={{ background: '#ebf8ff' }}>
            <span className="material-icons" style={{ color: '#2b6cb0' }}>event_note</span>
          </div>
          <div><div className="exam-stat-value">{stats.totalSchedules}</div><div className="exam-stat-label">Total Schedules</div></div>
        </div>
        <div className="exam-stat-card">
          <div className="exam-stat-icon" style={{ background: '#fffaf0' }}>
            <span className="material-icons" style={{ color: '#c05621' }}>pending_actions</span>
          </div>
          <div><div className="exam-stat-value">{stats.upcoming}</div><div className="exam-stat-label">Upcoming Exams</div></div>
        </div>
        <div className="exam-stat-card">
          <div className="exam-stat-icon" style={{ background: '#f0fff4' }}>
            <span className="material-icons" style={{ color: '#276749' }}>confirmation_number</span>
          </div>
          <div><div className="exam-stat-value">{stats.totalTickets}</div><div className="exam-stat-label">Hall Tickets</div></div>
        </div>
        <div className="exam-stat-card">
          <div className="exam-stat-icon" style={{ background: '#faf5ff' }}>
            <span className="material-icons" style={{ color: '#553c9a' }}>workspace_premium</span>
          </div>
          <div><div className="exam-stat-value">{stats.totalCerts}</div><div className="exam-stat-label">Certificates</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="exam-tabs">
        {[
          { key: 'schedules',    label: 'Exam Schedules',  icon: 'event_note' },
          { key: 'halltickets',  label: 'Hall Tickets',    icon: 'confirmation_number' },
          { key: 'certificates', label: 'Certificates',    icon: 'workspace_premium' },
        ].map(t => (
          <button key={t.key} className={`exam-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => { setActiveTab(t.key); resetFilters(); }}>
            <span className="material-icons">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="exam-toolbar">
        <div className="exam-search-box">
          <span className="material-icons">search</span>
          <input placeholder={activeTab === 'schedules' ? 'Search exam, subject…' : activeTab === 'halltickets' ? 'Search student, ticket no…' : 'Search student, cert ID…'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="exam-filter-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <select className="exam-filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {activeTab === 'certificates'
            ? CERT_TYPES.map(t => <option key={t} value={t}>{certLabel[t]}</option>)
            : EXAM_TYPES.map(t => <option key={t} value={t}>{examTypeLabel[t]}</option>)
          }
        </select>
        {(search || filterClass || filterType) && (
          <button className="btn-exam-secondary" onClick={resetFilters}>Clear</button>
        )}
      </div>

      {/* ── SCHEDULES TAB ── */}
      {activeTab === 'schedules' && (
        <div className="exam-table-card">
          <div className="exam-table-wrap">
            {loading ? (
              <div className="exam-empty"><span className="material-icons">hourglass_empty</span><p>Loading schedules…</p></div>
            ) : filteredSchedules.length === 0 ? (
              <div className="exam-empty"><span className="material-icons">event_note</span><p>No exam schedules found</p></div>
            ) : (
              <table className="exam-table">
                <thead>
                  <tr><th>Exam Name</th><th>Type</th><th>Class</th><th>Subject</th><th>Date</th><th>Time</th><th>Hall</th><th>Max Marks</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredSchedules.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.examName}</strong></td>
                      <td><span className="exam-badge exam-badge-blue">{examTypeLabel[s.examType] || s.examType}</span></td>
                      <td>{s.className}{s.section ? ' – ' + s.section : ''}</td>
                      <td>{s.subject}</td>
                      <td>{fmtDate(s.examDate)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{s.startTime} – {s.endTime}</td>
                      <td>{s.hallNumber}</td>
                      <td style={{ textAlign: 'center' }}>{s.maxMarks}</td>
                      <td><span className={`exam-badge ${statusColor[s.status] || 'exam-badge-gray'}`}>{s.status}</span></td>
                      <td>
                        <button className="exam-action-btn" title="Edit" onClick={() => handleOpenSchedModal(s)}><span className="material-icons">edit</span></button>
                        <button className="exam-action-btn danger" title="Delete" onClick={() => handleDeleteSchedule(s.id)}><span className="material-icons">delete</span></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── HALL TICKETS TAB ── */}
      {activeTab === 'halltickets' && (
        <div className="exam-table-card">
          <div className="exam-table-wrap">
            {loading ? (
              <div className="exam-empty"><span className="material-icons">hourglass_empty</span><p>Loading hall tickets…</p></div>
            ) : filteredTickets.length === 0 ? (
              <div className="exam-empty"><span className="material-icons">confirmation_number</span><p>No hall tickets found</p></div>
            ) : (
              <table className="exam-table">
                <thead>
                  <tr><th>Ticket No</th><th>Student</th><th>Roll No</th><th>Class</th><th>Exam</th><th>Type</th><th>Academic Year</th><th>Generated On</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredTickets.map(t => (
                    <tr key={t.id}>
                      <td><strong style={{ fontFamily: 'monospace' }}>{t.ticketNumber}</strong></td>
                      <td>{t.studentName}</td>
                      <td>{t.rollNumber}</td>
                      <td>{t.className}{t.section ? ' – ' + t.section : ''}</td>
                      <td>{t.examName}</td>
                      <td><span className="exam-badge exam-badge-blue">{examTypeLabel[t.examType] || t.examType}</span></td>
                      <td>{t.academicYear}</td>
                      <td>{fmtDate(t.createdAt)}</td>
                      <td>
                        <button className="exam-action-btn primary" title="Preview" onClick={() => handlePreview(t, 'hallticket')}><span className="material-icons">visibility</span></button>
                        <button className="exam-action-btn success" title="Download PDF" onClick={() => handlePrint(t, 'hallticket')}><span className="material-icons">download</span></button>
                        <button className="exam-action-btn danger" title="Delete" onClick={() => handleDeleteTicket(t.id)}><span className="material-icons">delete</span></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── CERTIFICATES TAB ── */}
      {activeTab === 'certificates' && (
        <div className="exam-table-card">
          <div className="exam-table-wrap">
            {loading ? (
              <div className="exam-empty"><span className="material-icons">hourglass_empty</span><p>Loading certificates…</p></div>
            ) : filteredCerts.length === 0 ? (
              <div className="exam-empty"><span className="material-icons">workspace_premium</span><p>No certificates found</p></div>
            ) : (
              <table className="exam-table">
                <thead>
                  <tr><th>Cert ID</th><th>Type</th><th>Student</th><th>Roll No</th><th>Class</th><th>Issue Date</th><th>Purpose</th><th>Verified</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredCerts.map(c => (
                    <tr key={c.id}>
                      <td><strong style={{ fontFamily: 'monospace' }}>{c.certificateId}</strong></td>
                      <td><span className={`exam-badge ${c.certificateType === 'TRANSFER' ? 'exam-badge-orange' : c.certificateType === 'MARKS_MEMO' ? 'exam-badge-purple' : 'exam-badge-green'}`}>{certLabel[c.certificateType] || c.certificateType}</span></td>
                      <td>{c.studentName}</td>
                      <td>{c.rollNumber}</td>
                      <td>{c.className}{c.section ? ' – ' + c.section : ''}</td>
                      <td>{fmtDate(c.issueDate)}</td>
                      <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.purpose || '—'}</td>
                      <td>
                        {c.verifiedBy
                          ? <span className="exam-badge exam-badge-green"><span className="material-icons" style={{ fontSize: '12px', marginRight: '4px' }}>verified</span>Yes</span>
                          : <span className="exam-badge exam-badge-gray">Pending</span>}
                      </td>
                      <td>
                        <button className="exam-action-btn primary" title="Preview & Print" onClick={() => handlePreview(c, 'certificate')}><span className="material-icons">print</span></button>
                        <button className="exam-action-btn danger" title="Delete" onClick={() => handleDeleteCertificate(c.id)}><span className="material-icons">delete</span></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── SCHEDULE MODAL ── */}
      {showSchedModal && (
        <div className="exam-modal-overlay" onClick={e => e.target === e.currentTarget && setShowSchedModal(false)}>
          <div className="exam-modal">
            <div className="exam-modal-header">
              <h2><span className="material-icons">event_note</span>{editSched ? 'Edit' : 'Add'} Exam Schedule</h2>
              <button className="exam-modal-close" onClick={() => setShowSchedModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="exam-modal-body">
              <div className="exam-form-grid">
                <div className="exam-form-group span-2">
                  <label>Exam Name *</label>
                  <input placeholder="e.g. Annual Exam 2024" value={schedForm.examName} onChange={e => setSchedForm(f => ({ ...f, examName: e.target.value }))} />
                </div>
                <div className="exam-form-group">
                  <label>Exam Type *</label>
                  <select value={schedForm.examType} onChange={e => setSchedForm(f => ({ ...f, examType: e.target.value }))}>
                    {EXAM_TYPES.map(t => <option key={t} value={t}>{examTypeLabel[t]}</option>)}
                  </select>
                </div>
                <div className="exam-form-group">
                  <label>Class *</label>
                  <select value={schedForm.className} onChange={e => setSchedForm(f => ({ ...f, className: e.target.value }))}>
                    <option value="">Select Class</option>
                    {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                </div>
                <div className="exam-form-group">
                  <label>Section</label>
                  <select value={schedForm.section} onChange={e => setSchedForm(f => ({ ...f, section: e.target.value }))}>
                    <option value="">All Sections</option>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="exam-form-group">
                  <label>Subject *</label>
                  <input placeholder="e.g. Mathematics" value={schedForm.subject} onChange={e => setSchedForm(f => ({ ...f, subject: e.target.value }))} />
                </div>
                <div className="exam-form-group">
                  <label>Exam Date *</label>
                  <input type="date" value={schedForm.examDate} onChange={e => setSchedForm(f => ({ ...f, examDate: e.target.value }))} />
                </div>
                <div className="exam-form-group">
                  <label>Start Time *</label>
                  <input type="time" value={schedForm.startTime} onChange={e => setSchedForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div className="exam-form-group">
                  <label>End Time *</label>
                  <input type="time" value={schedForm.endTime} onChange={e => setSchedForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
                <div className="exam-form-group">
                  <label>Hall Number *</label>
                  <input placeholder="e.g. H-101" value={schedForm.hallNumber} onChange={e => setSchedForm(f => ({ ...f, hallNumber: e.target.value }))} />
                </div>
                <div className="exam-form-group">
                  <label>Max Marks</label>
                  <input type="number" min="1" max="200" value={schedForm.maxMarks} onChange={e => setSchedForm(f => ({ ...f, maxMarks: e.target.value }))} />
                </div>
                {editSched && (
                  <div className="exam-form-group">
                    <label>Status</label>
                    <select value={schedForm.status} onChange={e => setSchedForm(f => ({ ...f, status: e.target.value }))}>
                      {['SCHEDULED','ONGOING','COMPLETED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <div className="exam-form-group span-2">
                  <label>Instructions</label>
                  <textarea placeholder="Special instructions for students…" value={schedForm.instructions} onChange={e => setSchedForm(f => ({ ...f, instructions: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="exam-modal-footer">
              <button className="btn-exam-secondary" onClick={() => setShowSchedModal(false)}>Cancel</button>
              <button className="btn-exam-primary" onClick={handleSaveSchedule} disabled={saving}>
                {saving ? 'Saving…' : editSched ? 'Update Schedule' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HALL TICKET MODAL ── */}
      {showHtModal && (
        <div className="exam-modal-overlay" onClick={e => e.target === e.currentTarget && setShowHtModal(false)}>
          <div className="exam-modal" style={{ maxWidth: '480px' }}>
            <div className="exam-modal-header">
              <h2><span className="material-icons">confirmation_number</span>Generate Hall Ticket</h2>
              <button className="exam-modal-close" onClick={() => setShowHtModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="exam-modal-body">
              <div className="exam-form-grid full">
                <div className="exam-form-group">
                  <label>Student *</label>
                  <select value={htForm.studentId} onChange={e => setHtForm(f => ({ ...f, studentId: e.target.value }))}>
                    <option value="">Select Student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rollNumber}) — Class {s.className}{s.section ? ' ' + s.section : ''}</option>)}
                  </select>
                </div>
                <div className="exam-form-group">
                  <label>Exam Name *</label>
                  <input placeholder="e.g. Annual Exam 2024" value={htForm.examName} onChange={e => setHtForm(f => ({ ...f, examName: e.target.value }))} list="exam-names-list" />
                  <datalist id="exam-names-list">
                    {[...new Set(schedules.map(s => s.examName))].map(n => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div className="exam-form-group">
                  <label>Exam Type</label>
                  <select value={htForm.examType} onChange={e => setHtForm(f => ({ ...f, examType: e.target.value }))}>
                    {EXAM_TYPES.map(t => <option key={t} value={t}>{examTypeLabel[t]}</option>)}
                  </select>
                </div>
                <div className="exam-form-group">
                  <label>Academic Year</label>
                  <input placeholder="2023-2024" value={htForm.academicYear} onChange={e => setHtForm(f => ({ ...f, academicYear: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="exam-modal-footer">
              <button className="btn-exam-secondary" onClick={() => setShowHtModal(false)}>Cancel</button>
              <button className="btn-exam-primary" onClick={handleCreateHallTicket} disabled={saving}>
                {saving ? 'Generating…' : 'Generate Hall Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK GENERATE MODAL ── */}
      {showBulkModal && (
        <div className="exam-modal-overlay" onClick={e => e.target === e.currentTarget && setShowBulkModal(false)}>
          <div className="exam-modal" style={{ maxWidth: '480px' }}>
            <div className="exam-modal-header">
              <h2><span className="material-icons">group</span>Bulk Generate Hall Tickets</h2>
              <button className="exam-modal-close" onClick={() => setShowBulkModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="exam-modal-body">
              <div style={{ background: '#fffaf0', border: '1px solid #fbd38d', borderRadius: '9px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#c05621' }}>
                <span className="material-icons" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>info</span>
                This will generate hall tickets for all students in the selected class.
              </div>
              <div className="exam-form-grid">
                <div className="exam-form-group">
                  <label>Class *</label>
                  <select value={bulkForm.className} onChange={e => setBulkForm(f => ({ ...f, className: e.target.value }))}>
                    <option value="">Select Class</option>
                    {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                </div>
                <div className="exam-form-group">
                  <label>Section</label>
                  <select value={bulkForm.section} onChange={e => setBulkForm(f => ({ ...f, section: e.target.value }))}>
                    <option value="">All Sections</option>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="exam-form-group span-2">
                  <label>Exam Name *</label>
                  <input placeholder="e.g. Annual Exam 2024" value={bulkForm.examName} onChange={e => setBulkForm(f => ({ ...f, examName: e.target.value }))} list="bulk-exam-names" />
                  <datalist id="bulk-exam-names">
                    {[...new Set(schedules.map(s => s.examName))].map(n => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div className="exam-form-group">
                  <label>Exam Type</label>
                  <select value={bulkForm.examType} onChange={e => setBulkForm(f => ({ ...f, examType: e.target.value }))}>
                    {EXAM_TYPES.map(t => <option key={t} value={t}>{examTypeLabel[t]}</option>)}
                  </select>
                </div>
                <div className="exam-form-group">
                  <label>Academic Year</label>
                  <input placeholder="2023-2024" value={bulkForm.academicYear} onChange={e => setBulkForm(f => ({ ...f, academicYear: e.target.value }))} />
                </div>
              </div>
              {bulkForm.className && (
                <div style={{ marginTop: '12px', fontSize: '13px', color: '#4a5568' }}>
                  Students in Class {bulkForm.className}{bulkForm.section ? ' – ' + bulkForm.section : ''}: <strong>{students.filter(s => s.className === bulkForm.className && (!bulkForm.section || s.section === bulkForm.section)).length}</strong>
                </div>
              )}
            </div>
            <div className="exam-modal-footer">
              <button className="btn-exam-secondary" onClick={() => setShowBulkModal(false)}>Cancel</button>
              <button className="btn-exam-primary" onClick={handleBulkGenerate} disabled={saving}>
                {saving ? 'Generating…' : 'Generate All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CERTIFICATE MODAL ── */}
      {showCertModal && (
        <div className="exam-modal-overlay" onClick={e => e.target === e.currentTarget && setShowCertModal(false)}>
          <div className="exam-modal" style={{ maxWidth: '480px' }}>
            <div className="exam-modal-header">
              <h2><span className="material-icons">workspace_premium</span>Issue Certificate</h2>
              <button className="exam-modal-close" onClick={() => setShowCertModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="exam-modal-body">
              <div className="exam-form-grid full">
                <div className="exam-form-group">
                  <label>Student *</label>
                  <select value={certForm.studentId} onChange={e => setCertForm(f => ({ ...f, studentId: e.target.value }))}>
                    <option value="">Select Student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rollNumber}) — Class {s.className}{s.section ? ' ' + s.section : ''}</option>)}
                  </select>
                </div>
                <div className="exam-form-group">
                  <label>Certificate Type *</label>
                  <select value={certForm.certificateType} onChange={e => setCertForm(f => ({ ...f, certificateType: e.target.value }))}>
                    {CERT_TYPES.map(t => <option key={t} value={t}>{certLabel[t]}</option>)}
                  </select>
                </div>
                <div className="exam-form-group">
                  <label>Academic Year</label>
                  <input placeholder="2023-2024" value={certForm.academicYear} onChange={e => setCertForm(f => ({ ...f, academicYear: e.target.value }))} />
                </div>
                <div className="exam-form-group">
                  <label>Purpose / Reason</label>
                  <input placeholder="e.g. Bank account opening" value={certForm.purpose} onChange={e => setCertForm(f => ({ ...f, purpose: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="exam-modal-footer">
              <button className="btn-exam-secondary" onClick={() => setShowCertModal(false)}>Cancel</button>
              <button className="btn-exam-primary" onClick={handleCreateCertificate} disabled={saving}>
                {saving ? 'Issuing…' : 'Issue Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW MODAL ── */}
      {showPreview && previewItem && (
        <div className="exam-modal-overlay" onClick={e => e.target === e.currentTarget && setShowPreview(false)}>
          <div className="exam-modal" style={{ maxWidth: previewType === 'hallticket' ? '820px' : '680px' }}>
            <div className="exam-modal-header">
              <h2>
                <span className="material-icons">{previewType === 'hallticket' ? 'confirmation_number' : 'workspace_premium'}</span>
                {previewType === 'hallticket' ? 'Hall Ticket Preview' : 'Certificate Preview'}
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-exam-primary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                  onClick={() => handlePrint(previewItem, previewType)}
                >
                  <span className="material-icons" style={{ fontSize: '15px' }}>download</span>
                  Download PDF
                </button>
                <button className="exam-modal-close" onClick={() => setShowPreview(false)}>
                  <span className="material-icons">close</span>
                </button>
              </div>
            </div>
            <div className="exam-modal-body" style={{ padding: previewType === 'hallticket' ? '16px' : '20px 24px' }}>
              {previewType === 'hallticket'
                ? <HallTicketDocument ticket={previewItem} schedules={schedules} />
                : <CertificatePrint cert={previewItem} />
              }
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
