import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import { examinationAPI, adminAPI } from '../../services/api';
import { useSchool } from '../../context/SchoolContext';
import { useToast } from '../../context/ToastContext';
import { sortClassNames } from '../../utils/classOrder';
import { EXAM_TYPES, CERT_TYPES, certLabel, examTypeLabel, today, newSubjectRow } from './examination/constants';
import SchedulesTable from './examination/SchedulesTable';
import HallTicketsTable from './examination/HallTicketsTable';
import CertificatesTable from './examination/CertificatesTable';
import ScheduleModal from './examination/ScheduleModal';
import HallTicketModal from './examination/HallTicketModal';
import BulkGenerateModal from './examination/BulkGenerateModal';
import CertificateModal from './examination/CertificateModal';
import PreviewModal from './examination/PreviewModal';
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
  const emptySchedForm = { examName: '', examType: 'ANNUAL', className: '', section: '', status: 'SCHEDULED', instructions: '' };
  const emptyHtForm    = { studentId: '', examName: '', examType: 'ANNUAL', academicYear: '2023-2024' };
  const emptyBulkForm  = { className: '', section: '', examName: '', examType: 'ANNUAL', academicYear: '2023-2024' };
  const emptyCertForm  = { studentId: '', certificateType: 'BONAFIDE', purpose: '', academicYear: '2023-2024' };

  const [schedForm,    setSchedForm]    = useState(emptySchedForm);
  const [subjectRows,  setSubjectRows]  = useState([newSubjectRow()]);
  const [rowErrors,    setRowErrors]    = useState({});
  const [schedErrors,  setSchedErrors]  = useState({});
  const [bulkProgress, setBulkProgress] = useState(null); // { done, total }
  const [htForm,     setHtForm]     = useState(emptyHtForm);
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
      if (!row.hallNumber.trim())  e.hallNumber = 'Required';
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

  // ─── Hall Ticket CRUD ───────────────────────────────────────────────────────
  const handleCreateHallTicket = async () => {
    if (!htForm.studentId || !htForm.examName) {
      showToast('Select student and exam', 'error'); return;
    }
    setSaving(true);
    const student = students.find(s => String(s.id) === String(htForm.studentId));
    if (!student) { showToast('Student not found', 'error'); setSaving(false); return; }

    // Fee eligibility check — warn (not block) if student has outstanding dues
    try {
      const feeRes = await adminAPI.getStudentFeeAssignment(student.id);
      const feeData = feeRes.data?.data;
      if (feeData && String(feeData.status || '').toUpperCase() !== 'PAID') {
        const due = Math.max(0, Number(feeData.totalFee || 0) - Number(feeData.paidAmount || 0));
        if (due > 0) {
          const proceed = window.confirm(
            `⚠️ ${student.name} has an outstanding fee of ₹${due.toLocaleString('en-IN')}.\n\nDo you still want to generate the hall ticket?`
          );
          if (!proceed) { setSaving(false); return; }
        }
      }
    } catch { /* fee check is advisory — don't block on API failure */ }

    const subjectList = schedules
      .filter(s => s.examName === htForm.examName && s.className === student.className)
      .map(s => ({ subject: s.subject, date: s.examDate, startTime: s.startTime, endTime: s.endTime, hall: s.hallNumber, maxMarks: s.maxMarks }));
    if (subjectList.length === 0) {
      showToast(`No exam schedules found for "${htForm.examName}" in class ${student.className}. Add exam schedules first.`, 'error');
      setSaving(false); return;
    }
    const payload = {
      studentId:   student.id,
      studentName: student.name,
      rollNumber:  student.rollNumber,
      className:   student.className,
      section:     student.section,
      examName:    htForm.examName,
      examType:    htForm.examType,
      academicYear: htForm.academicYear,
      examSubjects: JSON.stringify(subjectList),
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
              <Button variant="exam-secondary" onClick={() => setShowBulkModal(true)}>
                <span className="material-icons" style={{ fontSize: '16px' }}>group</span>
                Bulk Generate
              </Button>
              <Button variant="exam-primary" onClick={() => setShowHtModal(true)}>
                <span className="material-icons" style={{ fontSize: '16px' }}>add</span>
                Generate
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

      {showHtModal && (
        <HallTicketModal htForm={htForm} setHtForm={setHtForm} students={students} schedules={schedules} saving={saving}
          onClose={() => setShowHtModal(false)} onSubmit={handleCreateHallTicket} />
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
    </Layout>
  );
}
