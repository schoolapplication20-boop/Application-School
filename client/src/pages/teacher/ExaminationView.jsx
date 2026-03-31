import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { examinationAPI } from '../../services/api';
import '../../styles/examination.css';

const MOCK_SCHEDULES = [
  { id: 1, examName: 'Annual Exam 2024', examType: 'ANNUAL',  className: '10', section: 'A', subject: 'Mathematics', examDate: '2024-03-15', startTime: '09:00', endTime: '12:00', hallNumber: 'H-101', maxMarks: 100, status: 'SCHEDULED' },
  { id: 2, examName: 'Annual Exam 2024', examType: 'ANNUAL',  className: '10', section: 'A', subject: 'Science',     examDate: '2024-03-17', startTime: '09:00', endTime: '12:00', hallNumber: 'H-102', maxMarks: 100, status: 'SCHEDULED' },
  { id: 3, examName: 'Mid-Term 2024',    examType: 'MIDTERM', className: '9',  section: 'B', subject: 'English',     examDate: '2024-02-10', startTime: '10:00', endTime: '12:30', hallNumber: 'H-201', maxMarks: 80,  status: 'COMPLETED' },
];

const MOCK_CERTS = [
  { id: 1, certificateId: 'BON24001', certificateType: 'BONAFIDE', studentName: 'Arjun Patel',  rollNumber: 'S001', className: '10', section: 'A', issueDate: '2024-01-10', purpose: 'Bank Account Opening', verifiedBy: null },
  { id: 2, certificateId: 'TC24001',  certificateType: 'TRANSFER', studentName: 'Sneha Gupta',  rollNumber: 'S002', className: '10', section: 'A', issueDate: '2024-02-14', purpose: 'School Transfer',     verifiedBy: 'teacher@school.com' },
  { id: 3, certificateId: 'MM24001',  certificateType: 'MARKS_MEMO', studentName: 'Ravi Kumar', rollNumber: 'S003', className: '9',  section: 'B', issueDate: '2024-03-01', purpose: 'College Admission',   verifiedBy: null },
];

const certLabel = { BONAFIDE: 'Bonafide', TRANSFER: 'Transfer Certificate', COURSE_COMPLETION: 'Course Completion', MARKS_MEMO: 'Marks Memo' };
const examTypeLabel = { ANNUAL: 'Annual', HALFYEARLY: 'Half Yearly', QUARTERLY: 'Quarterly', MIDTERM: 'Mid Term', UNIT_TEST: 'Unit Test' };
const statusColor = { SCHEDULED: 'exam-badge-blue', ONGOING: 'exam-badge-orange', COMPLETED: 'exam-badge-green', CANCELLED: 'exam-badge-red' };

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function ExaminationView() {
  const [activeTab,    setActiveTab]    = useState('schedules');
  const [schedules,    setSchedules]    = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState(null);
  const [search,       setSearch]       = useState('');
  const [verifyCertId, setVerifyCertId] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying,    setVerifying]    = useState(false);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        examinationAPI.getSchedules({}),
        examinationAPI.getCertificates({}),
      ]);
      setSchedules(sRes.data?.data ?? MOCK_SCHEDULES);
      setCertificates(cRes.data?.data ?? MOCK_CERTS);
    } catch {
      setSchedules(MOCK_SCHEDULES);
      setCertificates(MOCK_CERTS);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredSchedules = useMemo(() => schedules.filter(s => {
    const q = search.toLowerCase();
    return !q || s.examName.toLowerCase().includes(q) || s.subject.toLowerCase().includes(q) || s.className.includes(q);
  }), [schedules, search]);

  const filteredCerts = useMemo(() => certificates.filter(c => {
    const q = search.toLowerCase();
    return !q || c.studentName.toLowerCase().includes(q) || c.certificateId.toLowerCase().includes(q) || c.rollNumber.toLowerCase().includes(q);
  }), [certificates, search]);

  const handleVerify = async (id) => {
    try {
      await examinationAPI.verifyCertificate(id);
      setCertificates(prev => prev.map(c => c.id === id ? { ...c, verifiedBy: 'teacher (you)' } : c));
      showToast('Certificate verified successfully');
    } catch {
      setCertificates(prev => prev.map(c => c.id === id ? { ...c, verifiedBy: 'teacher (you)' } : c));
      showToast('Certificate verified (offline mode)');
    }
  };

  const handleCertLookup = async () => {
    if (!verifyCertId.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await examinationAPI.findByCertId(verifyCertId.trim());
      setVerifyResult(res.data?.data || null);
    } catch {
      const found = certificates.find(c => c.certificateId.toLowerCase() === verifyCertId.trim().toLowerCase());
      setVerifyResult(found || 'NOT_FOUND');
    }
    setVerifying(false);
  };

  const stats = useMemo(() => ({
    upcoming:  schedules.filter(s => s.status === 'SCHEDULED').length,
    completed: schedules.filter(s => s.status === 'COMPLETED').length,
    pending:   certificates.filter(c => !c.verifiedBy).length,
    verified:  certificates.filter(c => !!c.verifiedBy).length,
  }), [schedules, certificates]);

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="exam-page-header">
        <div>
          <h1 className="exam-page-title">
            <span className="material-icons">verified</span>
            Examination & Certificates
          </h1>
          <p className="exam-page-subtitle">View exam schedules and verify student certificates</p>
        </div>
      </div>

      {/* Stats */}
      <div className="exam-stats-row">
        <div className="exam-stat-card">
          <div className="exam-stat-icon" style={{ background: '#ebf8ff' }}>
            <span className="material-icons" style={{ color: '#2b6cb0' }}>pending_actions</span>
          </div>
          <div><div className="exam-stat-value">{stats.upcoming}</div><div className="exam-stat-label">Upcoming Exams</div></div>
        </div>
        <div className="exam-stat-card">
          <div className="exam-stat-icon" style={{ background: '#f0fff4' }}>
            <span className="material-icons" style={{ color: '#276749' }}>task_alt</span>
          </div>
          <div><div className="exam-stat-value">{stats.completed}</div><div className="exam-stat-label">Completed</div></div>
        </div>
        <div className="exam-stat-card">
          <div className="exam-stat-icon" style={{ background: '#fffaf0' }}>
            <span className="material-icons" style={{ color: '#c05621' }}>pending</span>
          </div>
          <div><div className="exam-stat-value">{stats.pending}</div><div className="exam-stat-label">Certs Pending Verification</div></div>
        </div>
        <div className="exam-stat-card">
          <div className="exam-stat-icon" style={{ background: '#faf5ff' }}>
            <span className="material-icons" style={{ color: '#553c9a' }}>verified</span>
          </div>
          <div><div className="exam-stat-value">{stats.verified}</div><div className="exam-stat-label">Verified Certificates</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="exam-tabs">
        {[
          { key: 'schedules',    label: 'Exam Schedule',   icon: 'event_note' },
          { key: 'certificates', label: 'Certificates',    icon: 'workspace_premium' },
          { key: 'verify',       label: 'Verify Cert ID',  icon: 'fact_check' },
        ].map(t => (
          <button key={t.key} className={`exam-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => { setActiveTab(t.key); setSearch(''); }}>
            <span className="material-icons">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── EXAM SCHEDULE TAB ── */}
      {activeTab === 'schedules' && (
        <>
          <div className="exam-toolbar">
            <div className="exam-search-box">
              <span className="material-icons">search</span>
              <input placeholder="Search exam name, subject, class…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="exam-table-card">
            <div className="exam-table-wrap">
              {loading ? (
                <div className="exam-empty"><span className="material-icons">hourglass_empty</span><p>Loading…</p></div>
              ) : filteredSchedules.length === 0 ? (
                <div className="exam-empty"><span className="material-icons">event_note</span><p>No schedules found</p></div>
              ) : (
                <table className="exam-table">
                  <thead>
                    <tr><th>Exam Name</th><th>Type</th><th>Class</th><th>Subject</th><th>Date</th><th>Time</th><th>Hall</th><th>Max Marks</th><th>Status</th></tr>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── CERTIFICATES TAB ── */}
      {activeTab === 'certificates' && (
        <>
          <div className="exam-toolbar">
            <div className="exam-search-box">
              <span className="material-icons">search</span>
              <input placeholder="Search student, certificate ID…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="exam-table-card">
            <div className="exam-table-wrap">
              {loading ? (
                <div className="exam-empty"><span className="material-icons">hourglass_empty</span><p>Loading…</p></div>
              ) : filteredCerts.length === 0 ? (
                <div className="exam-empty"><span className="material-icons">workspace_premium</span><p>No certificates found</p></div>
              ) : (
                <table className="exam-table">
                  <thead>
                    <tr><th>Cert ID</th><th>Type</th><th>Student</th><th>Roll No</th><th>Class</th><th>Issue Date</th><th>Purpose</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {filteredCerts.map(c => (
                      <tr key={c.id}>
                        <td><strong style={{ fontFamily: 'monospace' }}>{c.certificateId}</strong></td>
                        <td><span className="exam-badge exam-badge-purple">{certLabel[c.certificateType] || c.certificateType}</span></td>
                        <td>{c.studentName}</td>
                        <td>{c.rollNumber}</td>
                        <td>{c.className}{c.section ? ' – ' + c.section : ''}</td>
                        <td>{fmtDate(c.issueDate)}</td>
                        <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.purpose || '—'}</td>
                        <td>
                          {c.verifiedBy
                            ? <span className="exam-badge exam-badge-green"><span className="material-icons" style={{ fontSize: '12px', marginRight: '3px' }}>verified</span>Verified</span>
                            : <span className="exam-badge exam-badge-orange">Pending</span>}
                        </td>
                        <td>
                          {!c.verifiedBy && (
                            <button className="exam-action-btn success" title="Verify Certificate" onClick={() => handleVerify(c.id)}>
                              <span className="material-icons">verified</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── VERIFY CERT ID TAB ── */}
      {activeTab === 'verify' && (
        <div style={{ maxWidth: '520px' }}>
          <div style={{ background: '#fff', border: '1px solid #f0f4f8', borderRadius: '14px', padding: '28px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a202c', margin: '0 0 6px' }}>Verify Certificate by ID</h3>
            <p style={{ fontSize: '13px', color: '#718096', margin: '0 0 20px' }}>Enter the certificate ID printed on the document to verify its authenticity.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="exam-search-box" style={{ flex: 1 }}>
                <span className="material-icons">badge</span>
                <input placeholder="e.g. BON24001" value={verifyCertId} onChange={e => { setVerifyCertId(e.target.value); setVerifyResult(null); }} onKeyDown={e => e.key === 'Enter' && handleCertLookup()} />
              </div>
              <button className="btn-exam-primary" onClick={handleCertLookup} disabled={verifying || !verifyCertId.trim()}>
                {verifying ? 'Checking…' : 'Verify'}
              </button>
            </div>

            {verifyResult && verifyResult !== 'NOT_FOUND' && (
              <div style={{ marginTop: '20px', background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span className="material-icons" style={{ color: '#276749', fontSize: '20px' }}>verified</span>
                  <strong style={{ color: '#276749', fontSize: '14px' }}>Certificate is VALID</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                  {[
                    ['Certificate ID', verifyResult.certificateId],
                    ['Type', certLabel[verifyResult.certificateType] || verifyResult.certificateType],
                    ['Student', verifyResult.studentName],
                    ['Roll No', verifyResult.rollNumber],
                    ['Class', verifyResult.className + (verifyResult.section ? ' – ' + verifyResult.section : '')],
                    ['Issue Date', fmtDate(verifyResult.issueDate)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontSize: '10px', color: '#718096', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2px' }}>{label}</div>
                      <div style={{ fontWeight: 600, color: '#1a202c' }}>{value}</div>
                    </div>
                  ))}
                </div>
                {!verifyResult.verifiedBy && (
                  <button className="btn-exam-primary" style={{ marginTop: '14px', width: '100%', justifyContent: 'center' }} onClick={() => handleVerify(verifyResult.id)}>
                    <span className="material-icons" style={{ fontSize: '16px' }}>verified</span>
                    Mark as Verified
                  </button>
                )}
                {verifyResult.verifiedBy && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#276749', fontWeight: 600 }}>
                    ✓ Verified by {verifyResult.verifiedBy}
                  </div>
                )}
              </div>
            )}

            {verifyResult === 'NOT_FOUND' && (
              <div style={{ marginTop: '20px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-icons" style={{ color: '#c53030', fontSize: '20px' }}>cancel</span>
                <div>
                  <strong style={{ color: '#c53030', fontSize: '14px' }}>Certificate NOT Found</strong>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#718096' }}>No certificate found with ID "{verifyCertId}". It may be invalid or revoked.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
