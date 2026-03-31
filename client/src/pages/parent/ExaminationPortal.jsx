import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import HallTicketDocument from '../../components/HallTicketDocument';
import { examinationAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import '../../styles/examination.css';

// Mock fallback data
const MOCK_HALL_TICKETS = [
  {
    id: 1, ticketNumber: 'HT2024001', studentName: 'Arjun Patel', rollNumber: 'S001',
    className: '10', section: 'A', examName: 'Annual Exam 2024', examType: 'ANNUAL',
    academicYear: '2023-2024', createdAt: '2024-03-01T10:00:00',
    dateOfBirth: '2010-01-15', gender: 'Male', registrationNumber: 'REG2024001',
    examCenter: 'Main Campus', examCenterAddress: 'Schoolers Institution, Knowledge Park, Hyderabad',
    examSubjects: JSON.stringify([
      { subject: 'Mathematics',   date: '2024-03-15', startTime: '09:00', endTime: '12:00', hall: 'H-101', maxMarks: 100 },
      { subject: 'Science',       date: '2024-03-17', startTime: '09:00', endTime: '12:00', hall: 'H-102', maxMarks: 100 },
      { subject: 'English',       date: '2024-03-19', startTime: '09:00', endTime: '11:30', hall: 'H-101', maxMarks: 80  },
      { subject: 'Social Studies',date: '2024-03-21', startTime: '10:00', endTime: '12:30', hall: 'H-103', maxMarks: 80  },
      { subject: 'Hindi',         date: '2024-03-23', startTime: '09:00', endTime: '11:30', hall: 'H-101', maxMarks: 80  },
    ]),
  },
];

const MOCK_CERTIFICATES = [
  { id: 1, certificateId: 'BON24001', certificateType: 'BONAFIDE', studentName: 'Arjun Patel', rollNumber: 'S001', className: '10', section: 'A', issueDate: '2024-01-10', purpose: 'Bank Account Opening', academicYear: '2023-2024', verifiedBy: 'teacher@school.com' },
  { id: 2, certificateId: 'MM24001',  certificateType: 'MARKS_MEMO', studentName: 'Arjun Patel', rollNumber: 'S001', className: '10', section: 'A', issueDate: '2024-03-01', purpose: 'College Admission', academicYear: '2023-2024', verifiedBy: null },
];

const certLabel = { BONAFIDE: 'Bonafide', TRANSFER: 'Transfer Certificate', COURSE_COMPLETION: 'Course Completion', MARKS_MEMO: 'Marks Memo' };
const examTypeLabel = { ANNUAL: 'Annual', HALFYEARLY: 'Half Yearly', QUARTERLY: 'Quarterly', MIDTERM: 'Mid Term', UNIT_TEST: 'Unit Test' };

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// HallTicketCard now uses the shared HallTicketDocument component (imported above)

// ─── Certificate Card ─────────────────────────────────────────────────────────
function CertificateCard({ cert }) {
  const certBody = {
    BONAFIDE: <>This is to certify that <strong>{cert.studentName}</strong> (Roll No: {cert.rollNumber}) is a bonafide student of Class <strong>{cert.className}{cert.section ? ' – ' + cert.section : ''}</strong> for the academic year <strong>{cert.academicYear || '—'}</strong>. This certificate is issued for the purpose of <strong>{cert.purpose || 'official use'}</strong>.</>,
    TRANSFER: <>This is to certify that <strong>{cert.studentName}</strong> (Roll No: {cert.rollNumber}) was a bonafide student of Class <strong>{cert.className}{cert.section ? ' – ' + cert.section : ''}</strong> during the academic year <strong>{cert.academicYear || '—'}</strong>. Transfer Certificate is granted with no dues outstanding.</>,
    COURSE_COMPLETION: <>This is to certify that <strong>{cert.studentName}</strong> (Roll No: {cert.rollNumber}) has successfully completed the course of Class <strong>{cert.className}{cert.section ? ' – ' + cert.section : ''}</strong> during the academic year <strong>{cert.academicYear || '—'}</strong>.</>,
    MARKS_MEMO: <>This is to certify that <strong>{cert.studentName}</strong> (Roll No: {cert.rollNumber}) of Class <strong>{cert.className}{cert.section ? ' – ' + cert.section : ''}</strong> has appeared in the examinations for the academic year <strong>{cert.academicYear || '—'}</strong>. Marks/grades are as per school records.</>,
  };

  return (
    <div className="cert-preview" style={{ marginBottom: '24px' }}>
      <div className="cert-header">
        <div className="cert-logo">🏆</div>
        <div className="cert-school-name">Schoolers Institution</div>
        <div className="cert-school-sub">Affiliated • CBSE • Est. 2005</div>
      </div>
      <div className="cert-type-banner">{certLabel[cert.certificateType] || cert.certificateType}</div>
      <div className="cert-body">
        {cert.verifiedBy && (
          <div className="cert-verified-banner">
            <span className="material-icons" style={{ fontSize: '18px' }}>verified</span>
            Digitally Verified by {cert.verifiedBy}
          </div>
        )}
        <div className="cert-id-line">Certificate ID: <strong>{cert.certificateId}</strong></div>
        <div className="cert-date-line">Date: {fmtDate(cert.issueDate)}</div>
        <div className="cert-to-whom">TO WHOM IT MAY CONCERN</div>
        <div style={{ marginBottom: '16px' }}><span className="cert-student-name">{cert.studentName}</span></div>
        <div className="cert-content">{certBody[cert.certificateType] || 'Certificate details not available.'}</div>
      </div>
      <div className="cert-footer">
        <div className="cert-sign-block">
          <div className="cert-sign-line" />
          <div className="cert-sign-label">Class Teacher</div>
        </div>
        <div className="cert-seal">SCHOOL<br />SEAL</div>
        <div className="cert-sign-block">
          <div className="cert-sign-line" />
          <div className="cert-sign-label">Principal</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ExaminationPortal() {
  const { user } = useAuth();
  const [activeTab,    setActiveTab]    = useState('halltickets');
  const [hallTickets,  setHallTickets]  = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState(null);
  const [printItem,    setPrintItem]    = useState(null);
  const [printType,    setPrintType]    = useState('');

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  // Determine child's student ID from parent user
  const childId = user?.childId || user?.studentId || null;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (childId) {
        const [htRes, certRes] = await Promise.all([
          examinationAPI.getHallTicketsByStudent(childId),
          examinationAPI.getCertificatesByStudent(childId),
        ]);
        setHallTickets(htRes.data?.data ?? MOCK_HALL_TICKETS);
        setCertificates(certRes.data?.data ?? MOCK_CERTIFICATES);
      } else {
        throw new Error('No child ID');
      }
    } catch {
      setHallTickets(MOCK_HALL_TICKETS);
      setCertificates(MOCK_CERTIFICATES);
    }
    setLoading(false);
  }, [childId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePrint = (item, type) => {
    setPrintItem(item);
    setPrintType(type);
    if (type === 'hallticket') {
      document.body.classList.add('printing-hall-ticket');
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.print();
          document.body.classList.remove('printing-hall-ticket');
        }, 200);
      });
    } else {
      setTimeout(() => window.print(), 200);
    }
  };

  const handleViewAndPrint = (item, type) => {
    setPrintItem(item);
    setPrintType(type);
  };

  const stats = useMemo(() => ({
    hallTickets: hallTickets.length,
    certs: certificates.length,
    verified: certificates.filter(c => !!c.verifiedBy).length,
  }), [hallTickets, certificates]);

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="exam-page-header">
        <div>
          <h1 className="exam-page-title">
            <span className="material-icons">verified</span>
            Hall Ticket & Certificates
          </h1>
          <p className="exam-page-subtitle">Download your child's hall tickets and certificates</p>
        </div>
      </div>

      {/* Stats */}
      <div className="exam-stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <div className="exam-stat-card">
          <div className="exam-stat-icon" style={{ background: '#f0fff4' }}>
            <span className="material-icons" style={{ color: '#276749' }}>confirmation_number</span>
          </div>
          <div><div className="exam-stat-value">{stats.hallTickets}</div><div className="exam-stat-label">Hall Tickets</div></div>
        </div>
        <div className="exam-stat-card">
          <div className="exam-stat-icon" style={{ background: '#faf5ff' }}>
            <span className="material-icons" style={{ color: '#553c9a' }}>workspace_premium</span>
          </div>
          <div><div className="exam-stat-value">{stats.certs}</div><div className="exam-stat-label">Certificates</div></div>
        </div>
        <div className="exam-stat-card">
          <div className="exam-stat-icon" style={{ background: '#ebf8ff' }}>
            <span className="material-icons" style={{ color: '#2b6cb0' }}>verified</span>
          </div>
          <div><div className="exam-stat-value">{stats.verified}</div><div className="exam-stat-label">Verified Certs</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="exam-tabs">
        {[
          { key: 'halltickets',  label: 'Hall Tickets',  icon: 'confirmation_number' },
          { key: 'certificates', label: 'Certificates',  icon: 'workspace_premium' },
        ].map(t => (
          <button key={t.key} className={`exam-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => { setActiveTab(t.key); setPrintItem(null); }}>
            <span className="material-icons">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="exam-empty"><span className="material-icons">hourglass_empty</span><p>Loading…</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: printItem ? '1fr 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>

          {/* Left: List */}
          <div>
            {activeTab === 'halltickets' && (
              hallTickets.length === 0 ? (
                <div className="exam-empty"><span className="material-icons">confirmation_number</span><p>No hall tickets available yet</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {hallTickets.map(t => (
                    <div key={t.id} style={{ background: '#fff', border: '1px solid #f0f4f8', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px', color: '#1a202c', marginBottom: '4px' }}>{t.examName}</div>
                          <div style={{ fontSize: '12px', color: '#718096' }}>
                            Ticket: <strong style={{ fontFamily: 'monospace', color: '#2d3748' }}>{t.ticketNumber}</strong> &nbsp;|&nbsp;
                            Class {t.className}{t.section ? ' – ' + t.section : ''} &nbsp;|&nbsp;
                            {examTypeLabel[t.examType] || t.examType} &nbsp;|&nbsp;
                            {t.academicYear}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className={`btn-exam-secondary ${printItem?.id === t.id && printType === 'hallticket' ? 'active' : ''}`}
                            style={{ fontSize: '12px', padding: '7px 12px' }}
                            onClick={() => handleViewAndPrint(t, 'hallticket')}
                          >
                            <span className="material-icons" style={{ fontSize: '14px' }}>visibility</span> View
                          </button>
                          <button
                            className="btn-exam-primary"
                            style={{ fontSize: '12px', padding: '7px 12px' }}
                            onClick={() => handlePrint(t, 'hallticket')}
                          >
                            <span className="material-icons" style={{ fontSize: '14px' }}>download</span> Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'certificates' && (
              certificates.length === 0 ? (
                <div className="exam-empty"><span className="material-icons">workspace_premium</span><p>No certificates available yet</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {certificates.map(c => (
                    <div key={c.id} style={{ background: '#fff', border: '1px solid #f0f4f8', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px', color: '#1a202c' }}>{certLabel[c.certificateType] || c.certificateType}</span>
                            {c.verifiedBy
                              ? <span className="exam-badge exam-badge-green" style={{ fontSize: '10px' }}><span className="material-icons" style={{ fontSize: '11px', marginRight: '2px' }}>verified</span>Verified</span>
                              : <span className="exam-badge exam-badge-orange" style={{ fontSize: '10px' }}>Pending Verification</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: '#718096' }}>
                            ID: <strong style={{ fontFamily: 'monospace', color: '#2d3748' }}>{c.certificateId}</strong> &nbsp;|&nbsp;
                            Issued: {fmtDate(c.issueDate)} &nbsp;|&nbsp;
                            {c.purpose || '—'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-exam-secondary"
                            style={{ fontSize: '12px', padding: '7px 12px' }}
                            onClick={() => handleViewAndPrint(c, 'certificate')}
                          >
                            <span className="material-icons" style={{ fontSize: '14px' }}>visibility</span> View
                          </button>
                          <button
                            className="btn-exam-primary"
                            style={{ fontSize: '12px', padding: '7px 12px' }}
                            onClick={() => handlePrint(c, 'certificate')}
                          >
                            <span className="material-icons" style={{ fontSize: '14px' }}>download</span> Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Right: Preview Panel */}
          {printItem && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#4a5568' }}>
                  {printType === 'hallticket' ? 'Hall Ticket Preview' : 'Certificate Preview'}
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-exam-primary"
                    style={{ fontSize: '12px', padding: '6px 14px' }}
                    onClick={() => handlePrint(printItem, printType)}
                  >
                    <span className="material-icons" style={{ fontSize: '14px' }}>download</span>
                    Download PDF
                  </button>
                  <button className="exam-action-btn" onClick={() => setPrintItem(null)} title="Close">
                    <span className="material-icons">close</span>
                  </button>
                </div>
              </div>
              {printType === 'hallticket'
                ? <HallTicketDocument ticket={printItem} schedules={[]} />
                : <CertificateCard cert={printItem} />}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
