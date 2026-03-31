/**
 * HallTicketDocument
 *
 * A fully self-contained, print-ready Hall Ticket component.
 * All styles are inlined so they survive @media print exactly.
 * Use window.print() to produce a PDF-quality output.
 *
 * Props:
 *   ticket  – HallTicket object from backend / mock
 *   schedules – optional array of ExamSchedule objects (used to
 *               enrich the exam table when ticket.examSubjects is empty)
 */
import React, { useMemo } from 'react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDay(dateStr) {
  if (!dateStr) return '';
  return DAYS[new Date(dateStr).getDay()] || '';
}

const EXAM_TYPE_LABEL = {
  ANNUAL:      'Annual Examination',
  HALFYEARLY:  'Half-Yearly Examination',
  QUARTERLY:   'Quarterly Examination',
  MIDTERM:     'Mid-Term Examination',
  UNIT_TEST:   'Unit Test',
};

// ─── Inline style objects (survive @media print) ──────────────────────────────
const S = {
  page: {
    fontFamily: "'Arial', 'Helvetica', sans-serif",
    fontSize: '12px',
    color: '#111',
    background: '#fff',
    maxWidth: '780px',
    margin: '0 auto',
    border: '2px solid #1a3c5e',
    borderRadius: '6px',
    overflow: 'hidden',
    pageBreakInside: 'avoid',
  },

  // ── Top decorative bar ──
  topBar: {
    height: '6px',
    background: 'linear-gradient(90deg, #1a3c5e, #2d6a4f, #c8a951)',
  },

  // ── School header ──
  header: {
    background: 'linear-gradient(135deg, #1a3c5e 0%, #14345a 100%)',
    color: '#fff',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
  },
  logoBox: {
    width: '64px',
    height: '64px',
    background: 'rgba(255,255,255,0.15)',
    border: '2px solid rgba(255,255,255,0.4)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    flexShrink: 0,
  },
  schoolName: {
    fontSize: '20px',
    fontWeight: '900',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    margin: 0,
    lineHeight: 1.2,
  },
  schoolAddr: {
    fontSize: '11px',
    opacity: 0.85,
    marginTop: '3px',
    lineHeight: 1.5,
  },
  schoolContact: {
    fontSize: '10px',
    opacity: 0.75,
    marginTop: '2px',
  },
  headerRight: {
    marginLeft: 'auto',
    textAlign: 'right',
    flexShrink: 0,
  },
  affiliationBadge: {
    display: 'inline-block',
    background: 'rgba(200,169,81,0.25)',
    border: '1px solid rgba(200,169,81,0.6)',
    borderRadius: '4px',
    padding: '3px 8px',
    fontSize: '10px',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },

  // ── Title bar ──
  titleBar: {
    background: '#c8a951',
    color: '#1a202c',
    textAlign: 'center',
    padding: '8px 24px',
    fontWeight: '900',
    fontSize: '14px',
    letterSpacing: '4px',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ── Meta row ──
  metaRow: {
    background: '#f0f4f8',
    borderBottom: '1px solid #d1dce8',
    padding: '8px 24px',
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
    fontSize: '11px',
  },
  metaItem: { display: 'flex', flexDirection: 'column', gap: '1px' },
  metaLabel: { color: '#718096', fontSize: '9px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' },
  metaValue: { color: '#1a202c', fontWeight: '700', fontSize: '12px' },

  // ── Body ──
  body: { padding: '16px 24px' },

  // ── Student section ──
  studentSection: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    border: '1.5px solid #c8a951',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  studentInfo: { flex: 1, padding: '14px 16px' },
  studentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px 16px',
  },
  fieldBlock: { display: 'flex', flexDirection: 'column', gap: '2px' },
  fieldLabel: {
    fontSize: '9px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#718096',
    fontWeight: '700',
  },
  fieldValue: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#1a202c',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '3px',
    minHeight: '18px',
  },

  // ── Photo box ──
  photoBox: {
    width: '110px',
    minHeight: '130px',
    background: '#f8fafc',
    borderLeft: '1.5px solid #c8a951',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  photoImg: {
    width: '90px',
    height: '110px',
    objectFit: 'cover',
    border: '1.5px solid #d1dce8',
  },
  photoPlaceholder: {
    width: '90px',
    height: '110px',
    border: '1.5px dashed #a0aec0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    color: '#a0aec0',
    background: '#f0f4f8',
  },
  photoLabel: {
    fontSize: '9px',
    color: '#718096',
    marginTop: '4px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },

  // ── Section heading ──
  sectionHeading: {
    fontSize: '10px',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#1a3c5e',
    background: '#ebf4ff',
    border: '1px solid #bee3f8',
    borderRadius: '4px',
    padding: '5px 10px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },

  // ── Schedule table ──
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11px',
    marginBottom: '14px',
  },
  th: {
    background: '#1a3c5e',
    color: '#fff',
    padding: '7px 10px',
    textAlign: 'left',
    fontWeight: '700',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    border: '1px solid #14345a',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '7px 10px',
    border: '1px solid #d1dce8',
    color: '#1a202c',
    verticalAlign: 'middle',
  },
  tdAlt: {
    padding: '7px 10px',
    border: '1px solid #d1dce8',
    color: '#1a202c',
    verticalAlign: 'middle',
    background: '#f8fafc',
  },
  tdCenter: {
    padding: '7px 10px',
    border: '1px solid #d1dce8',
    color: '#1a202c',
    verticalAlign: 'middle',
    textAlign: 'center',
    fontWeight: '700',
  },

  // ── Instructions ──
  instructionsBox: {
    border: '1.5px solid #e2e8f0',
    borderRadius: '6px',
    padding: '12px 14px',
    marginBottom: '16px',
    background: '#fffdf5',
  },
  instrTitle: {
    fontSize: '10px',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: '#c05621',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  instrList: {
    margin: 0,
    paddingLeft: '18px',
    lineHeight: 1.8,
    color: '#2d3748',
    fontSize: '11px',
  },

  // ── Signatures ──
  signaturesRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: '14px 24px 16px',
    borderTop: '1.5px solid #c8a951',
    background: '#fafaf6',
    gap: '12px',
  },
  sigBlock: { textAlign: 'center', flex: 1 },
  sigLine: {
    width: '100%',
    maxWidth: '130px',
    margin: '0 auto 6px',
    borderTop: '1.5px solid #4a5568',
  },
  sigLabel: {
    fontSize: '10px',
    color: '#4a5568',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  sigSub: { fontSize: '9px', color: '#718096', marginTop: '2px' },
  stampBox: {
    width: '80px',
    height: '80px',
    border: '2px dashed #c8a951',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    fontSize: '9px',
    color: '#c8a951',
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    lineHeight: 1.3,
  },

  // ── Bottom bar ──
  bottomBar: {
    height: '6px',
    background: 'linear-gradient(90deg, #c8a951, #2d6a4f, #1a3c5e)',
  },
  bottomNote: {
    background: '#1a3c5e',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontSize: '9px',
    padding: '5px',
    letterSpacing: '0.5px',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function HallTicketDocument({ ticket, schedules = [] }) {
  // Parse embedded exam subjects (JSON stored in HallTicket.examSubjects)
  const embeddedSubjects = useMemo(() => {
    try { return JSON.parse(ticket.examSubjects || '[]'); } catch { return []; }
  }, [ticket.examSubjects]);

  // Build the final schedule rows:
  // Priority 1 — live ExamSchedule records matching examName + className
  // Priority 2 — embedded JSON subjects stored on the ticket
  const scheduleRows = useMemo(() => {
    const live = schedules.filter(
      s => s.examName === ticket.examName && s.className === ticket.className
    );
    if (live.length > 0) {
      return live.map(s => ({
        subject:   s.subject,
        date:      s.examDate,
        startTime: s.startTime,
        endTime:   s.endTime,
        hall:      s.hallNumber,
        maxMarks:  s.maxMarks,
      }));
    }
    // fallback to embedded
    return embeddedSubjects.map(s => ({
      subject:   s.subject,
      date:      s.date,
      startTime: s.startTime,
      endTime:   s.endTime,
      hall:      s.hall,
      maxMarks:  s.maxMarks,
    }));
  }, [schedules, embeddedSubjects, ticket.examName, ticket.className]);

  const issueDate = fmtDate(ticket.createdAt || ticket.issueDate || new Date().toISOString());
  const examTypeFull = EXAM_TYPE_LABEL[ticket.examType] || ticket.examType || '—';

  // Parse extra student data (DOB, gender, regNo, examCenter) stored in ticket.extraData
  const extra = useMemo(() => {
    try { return JSON.parse(ticket.extraData || '{}'); } catch { return {}; }
  }, [ticket.extraData]);

  const dob        = ticket.dateOfBirth   || extra.dateOfBirth   || '—';
  const gender     = ticket.gender        || extra.gender        || '—';
  const regNo      = ticket.registrationNumber || extra.registrationNumber || ticket.rollNumber || '—';
  const examCenter = ticket.examCenter    || extra.examCenter    || 'Main Campus';
  const examCenterAddr = ticket.examCenterAddress || extra.examCenterAddress || 'Schoolers Institution, Main Road';

  return (
    <div id="hall-ticket-print-root" style={S.page}>
      {/* Top color bar */}
      <div style={S.topBar} />

      {/* ── SCHOOL HEADER ──────────────────────────────────────────── */}
      <div style={S.header}>
        <div style={S.logoBox}>🏆</div>
        <div style={{ flex: 1 }}>
          <div style={S.schoolName}>Schoolers Institution</div>
          <div style={S.schoolAddr}>
            123, Knowledge Park, Education Nagar, Hyderabad – 500 001, Telangana, India
          </div>
          <div style={S.schoolContact}>
            ☎ +91-40-1234-5678 &nbsp;|&nbsp; ✉ info@schoolers.edu &nbsp;|&nbsp; 🌐 www.schoolers.edu
          </div>
        </div>
        <div style={S.headerRight}>
          <div style={S.affiliationBadge}>CBSE Affiliated</div>
          <div style={{ fontSize: '10px', opacity: 0.75 }}>Affil. No: 1234567</div>
          <div style={{ fontSize: '10px', opacity: 0.75 }}>School Code: 56789</div>
        </div>
      </div>

      {/* ── TITLE BAR ──────────────────────────────────────────────── */}
      <div style={S.titleBar}>
        <span style={{ fontSize: '11px', letterSpacing: '1px', opacity: 0.8 }}>
          {ticket.academicYear ? `Academic Year: ${ticket.academicYear}` : ''}
        </span>
        <span>⬥ HALL TICKET ⬥</span>
        <span style={{ fontSize: '11px', letterSpacing: '1px', opacity: 0.8 }}>
          {examTypeFull}
        </span>
      </div>

      {/* ── META ROW ───────────────────────────────────────────────── */}
      <div style={S.metaRow}>
        <div style={S.metaItem}>
          <span style={S.metaLabel}>Hall Ticket No.</span>
          <span style={{ ...S.metaValue, fontFamily: 'monospace', color: '#1a3c5e' }}>
            {ticket.ticketNumber || '—'}
          </span>
        </div>
        <div style={S.metaItem}>
          <span style={S.metaLabel}>Exam Name</span>
          <span style={S.metaValue}>{ticket.examName || '—'}</span>
        </div>
        <div style={S.metaItem}>
          <span style={S.metaLabel}>Exam Center</span>
          <span style={S.metaValue}>{examCenter}</span>
        </div>
        <div style={S.metaItem}>
          <span style={S.metaLabel}>Center Address</span>
          <span style={{ ...S.metaValue, fontSize: '10px', fontWeight: '600' }}>{examCenterAddr}</span>
        </div>
        <div style={{ ...S.metaItem, marginLeft: 'auto' }}>
          <span style={S.metaLabel}>Issue Date</span>
          <span style={S.metaValue}>{issueDate}</span>
        </div>
      </div>

      {/* ── BODY ───────────────────────────────────────────────────── */}
      <div style={S.body}>

        {/* ── STUDENT DETAILS ── */}
        <div style={S.sectionHeading}>
          ▶ &nbsp;CANDIDATE DETAILS
        </div>

        <div style={S.studentSection}>
          {/* Info grid */}
          <div style={S.studentInfo}>
            <div style={S.studentGrid}>
              <div style={S.fieldBlock}>
                <span style={S.fieldLabel}>Full Name</span>
                <span style={{ ...S.fieldValue, fontSize: '14px', textTransform: 'uppercase', fontWeight: '900' }}>
                  {ticket.studentName || '—'}
                </span>
              </div>
              <div style={S.fieldBlock}>
                <span style={S.fieldLabel}>Hall Ticket / Roll Number</span>
                <span style={{ ...S.fieldValue, fontFamily: 'monospace', color: '#1a3c5e', fontSize: '14px' }}>
                  {ticket.ticketNumber || ticket.rollNumber || '—'}
                </span>
              </div>
              <div style={S.fieldBlock}>
                <span style={S.fieldLabel}>Registration Number</span>
                <span style={{ ...S.fieldValue, fontFamily: 'monospace' }}>{regNo}</span>
              </div>
              <div style={S.fieldBlock}>
                <span style={S.fieldLabel}>Class & Section</span>
                <span style={S.fieldValue}>
                  {ticket.className ? `Class ${ticket.className}` : '—'}
                  {ticket.section ? ` – ${ticket.section}` : ''}
                </span>
              </div>
              <div style={S.fieldBlock}>
                <span style={S.fieldLabel}>Date of Birth</span>
                <span style={S.fieldValue}>{fmtDate(dob) !== '—' ? fmtDate(dob) : dob}</span>
              </div>
              <div style={S.fieldBlock}>
                <span style={S.fieldLabel}>Gender</span>
                <span style={S.fieldValue}>{gender}</span>
              </div>
              <div style={S.fieldBlock}>
                <span style={S.fieldLabel}>School Roll Number</span>
                <span style={{ ...S.fieldValue, fontFamily: 'monospace' }}>{ticket.rollNumber || '—'}</span>
              </div>
              <div style={S.fieldBlock}>
                <span style={S.fieldLabel}>Exam Type</span>
                <span style={S.fieldValue}>{examTypeFull}</span>
              </div>
            </div>
          </div>

          {/* Photo */}
          <div style={S.photoBox}>
            {ticket.photoUrl
              ? <img src={ticket.photoUrl} alt="Candidate" style={S.photoImg} />
              : (
                <div style={S.photoPlaceholder}>
                  <span style={{ fontSize: '32px' }}>👤</span>
                  <span style={{ fontSize: '9px', color: '#a0aec0', marginTop: '4px', textAlign: 'center' }}>Affix<br/>Photo</span>
                </div>
              )
            }
            <div style={S.photoLabel}>Candidate Photo</div>
          </div>
        </div>

        {/* ── EXAM SCHEDULE ── */}
        <div style={S.sectionHeading}>
          ▶ &nbsp;EXAMINATION SCHEDULE
        </div>

        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: '36px', textAlign: 'center' }}>S.No</th>
              <th style={S.th}>Subject</th>
              <th style={S.th}>Date</th>
              <th style={S.th}>Day</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Start Time</th>
              <th style={{ ...S.th, textAlign: 'center' }}>End Time</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Exam Hall</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Max Marks</th>
            </tr>
          </thead>
          <tbody>
            {scheduleRows.length > 0 ? scheduleRows.map((row, i) => {
              const isAlt = i % 2 === 1;
              return (
                <tr key={i}>
                  <td style={{ ...(isAlt ? S.tdAlt : S.td), textAlign: 'center', fontWeight: '700', color: '#718096' }}>
                    {i + 1}
                  </td>
                  <td style={{ ...(isAlt ? S.tdAlt : S.td), fontWeight: '700' }}>{row.subject}</td>
                  <td style={isAlt ? S.tdAlt : S.td}>{fmtDate(row.date)}</td>
                  <td style={{ ...(isAlt ? S.tdAlt : S.td), color: '#4a5568' }}>{getDay(row.date)}</td>
                  <td style={{ ...(isAlt ? S.tdAlt : S.td), textAlign: 'center', fontWeight: '700' }}>
                    {row.startTime || '—'}
                  </td>
                  <td style={{ ...(isAlt ? S.tdAlt : S.td), textAlign: 'center', fontWeight: '700' }}>
                    {row.endTime || '—'}
                  </td>
                  <td style={{ ...S.tdCenter, background: isAlt ? '#f8fafc' : '#fff', color: '#1a3c5e' }}>
                    {row.hall || '—'}
                  </td>
                  <td style={{ ...S.tdCenter, background: isAlt ? '#f8fafc' : '#fff' }}>
                    {row.maxMarks ?? '—'}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={8} style={{ ...S.td, textAlign: 'center', color: '#a0aec0', padding: '20px', fontStyle: 'italic' }}>
                  No exam schedule entries available
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── INSTRUCTIONS ── */}
        <div style={S.instructionsBox}>
          <div style={S.instrTitle}>
            ⚠ &nbsp;IMPORTANT INSTRUCTIONS FOR CANDIDATES
          </div>
          <ol style={S.instrList}>
            <li>Candidates must report to the examination hall at least <strong>30 minutes</strong> before the commencement of the examination.</li>
            <li>This Hall Ticket must be produced on demand by the invigilator / examination authority. Failure to produce it may result in denial of entry.</li>
            <li>Mobile phones, smartwatches, Bluetooth devices, and any electronic gadgets are <strong>strictly prohibited</strong> inside the examination hall.</li>
            <li>Candidates must carry a valid School ID card along with this Hall Ticket.</li>
            <li>No candidate shall be permitted to enter the hall after <strong>15 minutes</strong> of the commencement of the examination.</li>
            <li>Candidates must write their Hall Ticket Number on every answer sheet; no other identification is permitted.</li>
            <li>Malpractice of any kind will lead to immediate disqualification and disciplinary action.</li>
            <li>Candidates must occupy only the seat allotted to them as per the seating arrangement displayed outside the hall.</li>
            <li>All writing materials (pen, pencil, ruler, etc.) must be carried by the candidate; sharing is not allowed.</li>
            <li>Candidates must maintain silence and discipline throughout the examination duration.</li>
          </ol>
        </div>
      </div>

      {/* ── SIGNATURES ─────────────────────────────────────────────── */}
      <div style={S.signaturesRow}>
        {/* Candidate signature */}
        <div style={S.sigBlock}>
          <div style={{ ...S.sigLine, maxWidth: '140px' }} />
          <div style={S.sigLabel}>Candidate's Signature</div>
          <div style={S.sigSub}>To be signed at exam hall</div>
        </div>

        {/* Class Teacher */}
        <div style={S.sigBlock}>
          <div style={{ ...S.sigLine, maxWidth: '140px' }} />
          <div style={S.sigLabel}>Class Teacher</div>
          <div style={S.sigSub}>&nbsp;</div>
        </div>

        {/* School Stamp */}
        <div style={{ ...S.sigBlock, flex: 0.8 }}>
          <div style={S.stampBox}>
            SCHOOL<br />SEAL &amp;<br />STAMP
          </div>
        </div>

        {/* Principal */}
        <div style={S.sigBlock}>
          <div style={{ ...S.sigLine, maxWidth: '140px' }} />
          <div style={S.sigLabel}>Principal</div>
          <div style={S.sigSub}>Schoolers Institution</div>
        </div>

        {/* Exam Controller */}
        <div style={S.sigBlock}>
          <div style={{ ...S.sigLine, maxWidth: '140px' }} />
          <div style={S.sigLabel}>Exam Controller</div>
          <div style={S.sigSub}>&nbsp;</div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={S.bottomNote}>
        This is a computer-generated Hall Ticket. &nbsp;|&nbsp; Verify authenticity at schoolers.edu/verify &nbsp;|&nbsp; Hall Ticket No: {ticket.ticketNumber}
      </div>
      <div style={S.bottomBar} />
    </div>
  );
}
