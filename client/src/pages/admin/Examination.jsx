import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import { examinationAPI, adminAPI } from '../../services/api';
import { useSchool } from '../../context/SchoolContext';
import { useToast } from '../../context/ToastContext';
import { sortClassNames, classOrder } from '../../utils/classOrder';
import { EXAM_TYPES, CERT_TYPES, certLabel, examTypeLabel, today, newSubjectRow } from './examination/constants';
import SchedulesTable from './examination/SchedulesTable';
import HallTicketsTable from './examination/HallTicketsTable';
import CertificatesTable from './examination/CertificatesTable';
import ScheduleModal from './examination/ScheduleModal';
import BulkGenerateModal from './examination/BulkGenerateModal';
import CertificateModal from './examination/CertificateModal';
import PreviewModal from './examination/PreviewModal';
import PrintTemplateModal from './examination/PrintTemplateModal';
import HallTicketDocument from '../../components/HallTicketDocument';
import CompactHallTicket from '../../components/CompactHallTicket';
import '../../styles/examination.css';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Examination() {
  const { school } = useSchool();
  const [activeTab,  setActiveTab]  = useState('schedules');
  const [schedules,  setSchedules]  = useState([]);
  const [hallTickets, setHallTickets] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [students,   setStudents]   = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading,    setLoading]    = useState(true);

  // DB-derived class/section lists (replaces hardcoded constants)
  const dbClasses  = [...new Set(classrooms.map(c => c.name))].sort(sortClassNames);
  const dbSections = [...new Set(classrooms.map(c => c.section).filter(Boolean))].sort();

  // Filters
  const [search,        setSearch]        = useState('');
  const [filterClass,   setFilterClass]   = useState('');
  const [filterType,    setFilterType]    = useState('');
  const [filterExamName, setFilterExamName] = useState(''); // exam-name tab, schedules tab only

  // Modals
  const [showSchedModal,  setShowSchedModal]  = useState(false);
  const [showBulkModal,   setShowBulkModal]   = useState(false);
  const [showCertModal,   setShowCertModal]   = useState(false);
  const [showPreview,     setShowPreview]     = useState(false);
  const [previewItem,     setPreviewItem]     = useState(null);
  const [previewType,     setPreviewType]     = useState(''); // 'hallticket' | 'certificate'
  const [editSched,       setEditSched]       = useState(null);

  // Multi-ticket "Download All" — N-per-page print template
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [printTemplate,     setPrintTemplate]     = useState('ONE_PER_PAGE');
  const [generatingBatchPdf, setGeneratingBatchPdf] = useState(false);
  const [batchExportTickets, setBatchExportTickets] = useState([]); // tickets currently mounted off-screen for capture

  // Forms
  const emptySchedForm = { examName: '', examType: 'ANNUAL', className: '', section: '', status: 'SCHEDULED', instructions: '' };
  const emptyBulkForm  = { className: '', section: '', examName: '', examType: 'ANNUAL', academicYear: '2023-2024' };
  const emptyCertForm  = { studentId: '', certificateType: 'BONAFIDE', purpose: '', academicYear: '2023-2024' };

  const [schedForm,    setSchedForm]    = useState(emptySchedForm);
  const [subjectRows,  setSubjectRows]  = useState([newSubjectRow()]);
  const [rowErrors,    setRowErrors]    = useState({});
  const [schedErrors,  setSchedErrors]  = useState({});
  const [bulkProgress, setBulkProgress] = useState(null); // { done, total }
  const [bulkForm,   setBulkForm]   = useState(emptyBulkForm);
  const [certForm,   setCertForm]   = useState(emptyCertForm);
  const [saving,     setSaving]     = useState(false);

  const showToast = useToast();

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
    try {
      const cRes = await adminAPI.getClasses();
      const cData = cRes.data?.data ?? cRes.data ?? [];
      setClassrooms(Array.isArray(cData) ? cData : []);
    } catch {
      setClassrooms([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Distinct exam names present in the schedules — powers the "group by exam" tab bar.
  // Free-text (FA-1, FA-2, Mid Term, Annual, ...) rather than the fixed examType enum,
  // since that's what schools actually name their exams.
  const examNameOptions = useMemo(
    () => [...new Set(schedules.map(s => s.examName).filter(Boolean))].sort(),
    [schedules]
  );

  // ─── Filtered Lists ─────────────────────────────────────────────────────────
  const filteredSchedules = useMemo(() => schedules.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || s.examName.toLowerCase().includes(q) || s.subject.toLowerCase().includes(q) || s.className.includes(q);
    const matchClass = !filterClass || s.className === filterClass;
    const matchType  = !filterType  || s.examType === filterType;
    const matchExamName = !filterExamName || s.examName === filterExamName;
    return matchQ && matchClass && matchType && matchExamName;
  }).sort((a, b) => {
    // Exam Type → Class → Date → Subject, so a school's timetable reads in a sensible order
    // instead of whatever order the API happened to return.
    const typeA = EXAM_TYPES.indexOf(a.examType), typeB = EXAM_TYPES.indexOf(b.examType);
    const typeDiff = (typeA === -1 ? 999 : typeA) - (typeB === -1 ? 999 : typeB);
    if (typeDiff !== 0) return typeDiff;
    const classDiff = classOrder(a.className) - classOrder(b.className);
    if (classDiff !== 0) return classDiff;
    const dateDiff = (a.examDate || '').localeCompare(b.examDate || '');
    if (dateDiff !== 0) return dateDiff;
    return (a.subject || '').localeCompare(b.subject || '');
  }), [schedules, search, filterClass, filterType, filterExamName]);

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
    setSchedErrors({});
    setRowErrors({});
    setBulkProgress(null);
    if (sched) {
      setSchedForm({ examName: sched.examName || '', examType: sched.examType || 'ANNUAL', className: sched.className || '', section: sched.section || '', status: sched.status || 'SCHEDULED', instructions: sched.instructions || '' });
      setSubjectRows([{ _id: 'edit', subject: sched.subject || '', examDate: sched.examDate || today(), startTime: sched.startTime || '09:00', endTime: sched.endTime || '12:00', hallNumber: sched.hallNumber || '', maxMarks: sched.maxMarks || 100 }]);
    } else {
      setSchedForm(emptySchedForm);
      setSubjectRows([newSubjectRow()]);
    }
    setShowSchedModal(true);
  };

  const handleSaveSchedule = async () => {
    // ── Validate common fields ──
    const ce = {};
    if (!schedForm.examName.trim()) ce.examName  = 'Required';
    if (!schedForm.className)       ce.className = 'Required';
    setSchedErrors(ce);

    // ── Validate each subject row ──
    const re = {};
    const seen = new Set();
    subjectRows.forEach(row => {
      const e = {};
      if (!row.subject)            e.subject    = 'Required';
      if (!row.examDate)           e.examDate   = 'Required';
      if (!row.startTime)          e.startTime  = 'Required';
      if (!row.endTime)            e.endTime    = 'Required';
      if (row.startTime && row.endTime && row.endTime <= row.startTime) e.endTime = 'Must be after start';
      if (!row.maxMarks || isNaN(row.maxMarks) || +row.maxMarks < 1) e.maxMarks = 'Invalid';
      if (row.subject && seen.has(row.subject)) e.subject = 'Duplicate subject';
      if (row.subject) seen.add(row.subject);
      if (Object.keys(e).length) re[row._id] = e;
    });
    setRowErrors(re);

    if (Object.keys(ce).length || Object.keys(re).length) {
      showToast('Please fix the errors highlighted below', 'error'); return;
    }

    setSaving(true);
    if (editSched) {
      // ── Single update ──
      const row = subjectRows[0];
      try {
        await examinationAPI.updateSchedule(editSched.id, { ...schedForm, subject: row.subject, examDate: row.examDate, startTime: row.startTime, endTime: row.endTime, hallNumber: row.hallNumber, maxMarks: Number(row.maxMarks) });
        showToast('Exam schedule updated');
        setShowSchedModal(false);
        loadAll();
      } catch {
        setSchedules(prev => prev.map(s => s.id === editSched.id ? { ...s, ...schedForm, subject: row.subject } : s));
        showToast('Schedule updated (offline mode)');
        setShowSchedModal(false);
      }
    } else {
      // ── Bulk create — one API call per subject row ──
      let succeeded = 0; let failed = 0;
      setBulkProgress({ done: 0, total: subjectRows.length });
      for (let i = 0; i < subjectRows.length; i++) {
        const row = subjectRows[i];
        try {
          await examinationAPI.createSchedule({ ...schedForm, subject: row.subject, examDate: row.examDate, startTime: row.startTime, endTime: row.endTime, hallNumber: row.hallNumber, maxMarks: Number(row.maxMarks) });
          succeeded++;
        } catch { failed++; }
        setBulkProgress({ done: i + 1, total: subjectRows.length });
      }
      if (failed === 0) {
        showToast(`${succeeded} exam schedule${succeeded > 1 ? 's' : ''} created successfully`);
        setShowSchedModal(false); loadAll();
      } else {
        showToast(`${succeeded} created, ${failed} failed`, 'error');
      }
      setBulkProgress(null);
    }
    setSaving(false);
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Delete this exam schedule?')) return;
    try {
      await examinationAPI.deleteSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      showToast('Schedule deleted');
    } catch {
      showToast('Failed to delete. Please try again.', 'error');
    }
  };

  // ─── Hall Ticket generation — always by class & section, never a single-student picker ────
  const handleBulkGenerate = async () => {
    if (!bulkForm.className || !bulkForm.examName) {
      showToast('Select class and exam name', 'error'); return;
    }
    setSaving(true);
    const bulkSubjectList = schedules
      .filter(s => s.examName === bulkForm.examName && s.className === bulkForm.className)
      .map(s => ({ subject: s.subject, date: s.examDate, startTime: s.startTime, endTime: s.endTime, hall: s.hallNumber, maxMarks: s.maxMarks }));
    if (bulkSubjectList.length === 0) {
      showToast(`No exam schedules found for "${bulkForm.examName}" in class ${bulkForm.className}. Add exam schedules first.`, 'error');
      setSaving(false); return;
    }
    const payload = {
      ...bulkForm,
      examSubjects: JSON.stringify(bulkSubjectList),
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
    try {
      await examinationAPI.deleteHallTicket(id);
      setHallTickets(prev => prev.filter(t => t.id !== id));
      showToast('Hall ticket deleted');
    } catch {
      showToast('Failed to delete. Please try again.', 'error');
    }
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
    try {
      await examinationAPI.deleteCertificate(id);
      setCertificates(prev => prev.filter(c => c.id !== id));
      showToast('Certificate deleted');
    } catch {
      showToast('Failed to delete. Please try again.', 'error');
    }
  };

  const handlePreview = (item, type) => {
    setPreviewItem(item);
    setPreviewType(type);
    setShowPreview(true);
  };

  // Hall tickets render to a single-page A4 PDF directly (html2canvas + jsPDF) instead of
  // going through window.print() — that guarantees exactly one page no matter how long the
  // ticket's content is, and there's no browser print dialog to inject a URL/date/page-number
  // header. Certificates still use the browser print dialog (unchanged, out of scope here).
  const handlePrint = (item, type) => {
    if (type === 'hallticket' && item) {
      setPreviewItem(item);
      setPreviewType('hallticket');
      setShowPreview(true);
      requestAnimationFrame(async () => {
        const root = document.getElementById('hall-ticket-print-root');
        const safeName = (item.studentName || item.rollNumber || 'ticket').replace(/[^a-z0-9]+/gi, '-');
        const filename = `HallTicket-${safeName}.pdf`;
        try {
          // Lazy-loaded: html2canvas + jsPDF are only needed once someone actually downloads
          // a hall ticket, so they shouldn't bloat every visit to this page.
          const { downloadElementAsSinglePagePdf } = await import('../../utils/hallTicketPdf');
          await downloadElementAsSinglePagePdf(root, filename);
        } catch (err) {
          console.error('Hall ticket PDF generation failed, falling back to the print dialog', err);
          showToast('Could not generate the PDF directly — opening the print dialog instead.', 'warning');
          document.body.classList.add('printing-hall-ticket');
          window.print();
          document.body.classList.remove('printing-hall-ticket');
        }
      });
    } else {
      window.print();
    }
  };

  // ─── "Download All" — N-per-page print template for the currently filtered ticket list ────
  // Mounts one off-screen ticket component per selected ticket (full HallTicketDocument for
  // ONE_PER_PAGE, the denser CompactHallTicket for 2/3/4-per-page — the full design is too
  // visually heavy to shrink into a fraction of a page and stay readable). Each is captured
  // individually and placed into its own grid cell, so a ticket can never split across pages.
  const handleDownloadAllTickets = async () => {
    if (filteredTickets.length === 0) return;
    setGeneratingBatchPdf(true);
    setBatchExportTickets(filteredTickets);
    // Two frames: one for React to commit the newly-mounted off-screen tickets, one for layout/paint.
    requestAnimationFrame(() => requestAnimationFrame(async () => {
      try {
        const isCompact = printTemplate !== 'ONE_PER_PAGE';
        const elements = filteredTickets
          .map(t => document.getElementById(`batch-ticket-${isCompact ? 'compact' : 'full'}-${t.id}`))
          .filter(Boolean);
        if (elements.length === 0) throw new Error('Tickets did not render for capture');
        const { downloadHallTicketsGroupPdf } = await import('../../utils/hallTicketPdf');
        await downloadHallTicketsGroupPdf(elements, printTemplate, `HallTickets-${filteredTickets.length}.pdf`);
        showToast(`Downloaded ${elements.length} hall ticket${elements.length !== 1 ? 's' : ''}`);
        setShowTemplateModal(false);
      } catch (err) {
        console.error('Batch hall ticket PDF generation failed', err);
        showToast('Could not generate the PDF. Please try again.', 'error');
      } finally {
        setGeneratingBatchPdf(false);
        setBatchExportTickets([]);
      }
    }));
  };

  const resetFilters = () => { setSearch(''); setFilterClass(''); setFilterType(''); setFilterExamName(''); };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
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
            <Button variant="exam-primary" onClick={() => handleOpenSchedModal()}>
              <span className="material-icons" style={{ fontSize: '16px' }}>add</span>
              Add Schedule
            </Button>
          )}
          {activeTab === 'halltickets' && (
            <>
              <Button variant="exam-secondary" onClick={() => setShowTemplateModal(true)} disabled={filteredTickets.length === 0}>
                <span className="material-icons" style={{ fontSize: '16px' }}>download</span>
                Download All
              </Button>
              <Button variant="exam-primary" onClick={() => setShowBulkModal(true)}>
                <span className="material-icons" style={{ fontSize: '16px' }}>group</span>
                Generate Hall Tickets
              </Button>
            </>
          )}
          {activeTab === 'certificates' && (
            <Button variant="exam-primary" onClick={() => setShowCertModal(true)}>
              <span className="material-icons" style={{ fontSize: '16px' }}>add</span>
              Issue Certificate
            </Button>
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
          {dbClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <select className="exam-filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {activeTab === 'certificates'
            ? CERT_TYPES.map(t => <option key={t} value={t}>{certLabel[t]}</option>)
            : EXAM_TYPES.map(t => <option key={t} value={t}>{examTypeLabel[t]}</option>)
          }
        </select>
        {(search || filterClass || filterType) && (
          <Button variant="exam-secondary" onClick={resetFilters}>Clear</Button>
        )}
      </div>

      {activeTab === 'schedules' && examNameOptions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 14px' }}>
          {['', ...examNameOptions].map(name => (
            <button
              key={name || 'all'}
              onClick={() => setFilterExamName(name)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                border: filterExamName === name ? '1.5px solid #2b6cb0' : '1.5px solid var(--border-strong)',
                background: filterExamName === name ? '#ebf8ff' : 'var(--surface)',
                color: filterExamName === name ? '#2b6cb0' : 'var(--text-secondary)',
              }}>
              {name || 'All'}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'schedules' && (
        <SchedulesTable loading={loading} schedules={filteredSchedules} onEdit={handleOpenSchedModal} onDelete={handleDeleteSchedule} />
      )}

      {activeTab === 'halltickets' && (
        <HallTicketsTable loading={loading} tickets={filteredTickets} onPreview={handlePreview} onPrint={handlePrint} onDelete={handleDeleteTicket} />
      )}

      {activeTab === 'certificates' && (
        <CertificatesTable loading={loading} certs={filteredCerts} onPreview={handlePreview} onDelete={handleDeleteCertificate} />
      )}

      {showSchedModal && (
        <ScheduleModal
          editSched={editSched}
          schedForm={schedForm} setSchedForm={setSchedForm} schedErrors={schedErrors}
          subjectRows={subjectRows} setSubjectRows={setSubjectRows} rowErrors={rowErrors}
          bulkProgress={bulkProgress} saving={saving}
          dbClasses={dbClasses} dbSections={dbSections}
          onClose={() => setShowSchedModal(false)} onSave={handleSaveSchedule}
        />
      )}

      {showBulkModal && (
        <BulkGenerateModal bulkForm={bulkForm} setBulkForm={setBulkForm} students={students} schedules={schedules}
          dbClasses={dbClasses} dbSections={dbSections} saving={saving}
          onClose={() => setShowBulkModal(false)} onSubmit={handleBulkGenerate} />
      )}

      {showCertModal && (
        <CertificateModal certForm={certForm} setCertForm={setCertForm} students={students} saving={saving}
          onClose={() => setShowCertModal(false)} onSubmit={handleCreateCertificate} />
      )}

      {showPreview && previewItem && (
        <PreviewModal previewItem={previewItem} previewType={previewType} schedules={schedules} school={school}
          onClose={() => setShowPreview(false)} onPrint={handlePrint} />
      )}

      {showTemplateModal && (
        <PrintTemplateModal
          count={filteredTickets.length} template={printTemplate} setTemplate={setPrintTemplate}
          generating={generatingBatchPdf}
          onClose={() => !generatingBatchPdf && setShowTemplateModal(false)}
          onDownload={handleDownloadAllTickets}
        />
      )}

      {/* Off-screen render target for the "Download All" batch capture — never visible, but must
          be real, laid-out DOM (not display:none) for html2canvas to capture each ticket. */}
      {batchExportTickets.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: '-9999px', zIndex: -1 }} aria-hidden="true">
          {printTemplate === 'ONE_PER_PAGE'
            ? batchExportTickets.map(t => (
                <HallTicketDocument key={t.id} id={`batch-ticket-full-${t.id}`} ticket={t} schedules={schedules} />
              ))
            : batchExportTickets.map(t => (
                <CompactHallTicket key={t.id} id={`batch-ticket-compact-${t.id}`} ticket={t} schedules={schedules} />
              ))
          }
        </div>
      )}
    </Layout>
  );
}
