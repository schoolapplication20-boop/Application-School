/**
 * CompactHallTicket
 *
 * A dense, small-footprint hall ticket card for the "Compact — 3 per A4 page"
 * print template. HallTicketDocument (the full design) is too visually heavy
 * to shrink into a third of an A4 page and stay legible, so this is a
 * genuinely simplified layout, not a scaled-down copy: smaller header, a
 * condensed exam-schedule list instead of an 8-column table, one short
 * instruction line instead of a full list, and a single signature row.
 *
 * Rendered off-screen (one instance per ticket) so it can be captured by
 * html2canvas and composited into a print-template PDF page — see
 * utils/hallTicketPdf.js. Must stay inside the same provider tree as the
 * rest of the app (uses useSchool()), so it's mounted as a normal React
 * child, never into a separate detached root.
 *
 * Props:
 *   id        – DOM id for this instance (must be unique per ticket on the page)
 *   ticket    – HallTicket object
 *   schedules – optional array of ExamSchedule objects
 */
import React, { useMemo } from 'react';
import { useSchool } from '../context/SchoolContext';
import { formatClassName } from '../utils/format';

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  // Guards against the literal string "Invalid Date" rendering for a missing/malformed value.
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const EXAM_TYPE_LABEL = {
  ANNUAL: 'Annual Exam', HALFYEARLY: 'Half-Yearly', QUARTERLY: 'Quarterly',
  MIDTERM: 'Mid-Term', UNIT_TEST: 'Unit Test',
};

const S = {
  card: {
    width: '420px',
    fontFamily: "'Arial', 'Helvetica', sans-serif",
    fontSize: '8px',
    color: '#111',
    background: '#fff',
    border: '1.5px solid #1a3c5e',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  header: {
    background: '#1a3c5e',
    color: '#fff',
    padding: '3.5px 7px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  logo: {
    width: '18px', height: '18px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '8px', fontWeight: 900, flexShrink: 0, overflow: 'hidden',
  },
  schoolName: { fontSize: '9.5px', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.1, letterSpacing: '0.2px' },
  headerRight: { marginLeft: 'auto', textAlign: 'right', fontSize: '6.5px', opacity: 0.85, lineHeight: 1.25 },
  titleBar: {
    background: '#c8a951', color: '#1a202c', textAlign: 'center', padding: '2px 8px',
    fontWeight: 900, fontSize: '8px', letterSpacing: '1.2px', textTransform: 'uppercase',
  },
  body: { padding: '5px 7px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5px 10px', marginBottom: '4px' },
  field: { display: 'flex', gap: '3px', borderBottom: '1px solid #edf2f7', paddingBottom: '1px' },
  label: { color: '#718096', fontWeight: 700, flexShrink: 0 },
  value: { color: '#1a202c', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sectionTitle: {
    fontSize: '7px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px',
    color: '#1a3c5e', background: '#ebf4ff', padding: '1.5px 6px', marginBottom: '2px', borderRadius: '3px',
  },
  schedList: { margin: '0 0 4px', padding: 0, listStyle: 'none' },
  schedRow: {
    display: 'flex', justifyContent: 'space-between', gap: '6px',
    padding: '1px 0', borderBottom: '1px dotted #d1dce8', fontSize: '7.5px',
  },
  instr: {
    fontSize: '6.5px', color: '#7c2d12', background: '#fffdf5', border: '1px solid #f6e2b3',
    borderRadius: '3px', padding: '2.5px 6px', marginBottom: '4px', lineHeight: 1.3,
  },
  sigRow: {
    display: 'flex', justifyContent: 'space-between', paddingTop: '3px',
    borderTop: '1px solid #c8a951', fontSize: '7px', color: '#4a5568', fontWeight: 700,
  },
};

export default function CompactHallTicket({ id, ticket, schedules = [] }) {
  const { school, logoVersion } = useSchool();
  const schoolName = school?.name || 'School';
  const schoolLogoUrl = school?.logoUrl ? `${school.logoUrl}?v=${logoVersion}` : null;
  const schoolInitials = schoolName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const examTypeFull = EXAM_TYPE_LABEL[ticket.examType] || ticket.examType || '—';

  const embeddedSubjects = useMemo(() => {
    try { return JSON.parse(ticket.examSubjects || '[]'); } catch { return []; }
  }, [ticket.examSubjects]);

  const scheduleRows = useMemo(() => {
    const live = schedules.filter(s => s.examName === ticket.examName && s.className === ticket.className);
    const rows = live.length > 0
      ? live.map(s => ({ subject: s.subject, date: s.examDate, hall: s.hallNumber }))
      : embeddedSubjects.map(s => ({ subject: s.subject, date: s.date, hall: s.hall }));
    return rows.slice(0, 6); // keep the card short — a 12-subject exam still fits the essentials
  }, [schedules, embeddedSubjects, ticket.examName, ticket.className]);

  const regNo = ticket.registrationNumber || ticket.rollNumber || '—';

  return (
    <div id={id} style={S.card}>
      <div style={S.header}>
        <div style={S.logo}>
          {schoolLogoUrl
            ? <img src={schoolLogoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : schoolInitials}
        </div>
        <div style={S.schoolName}>{schoolName}</div>
        <div style={S.headerRight}>
          {ticket.academicYear && <div>AY {ticket.academicYear}</div>}
          <div style={{ fontFamily: 'monospace' }}>{ticket.ticketNumber}</div>
        </div>
      </div>

      <div style={S.titleBar}>Hall Ticket — {ticket.examName || examTypeFull}</div>

      <div style={S.body}>
        <div style={S.grid}>
          <div style={{ ...S.field, gridColumn: '1 / -1' }}>
            <span style={S.label}>Name:</span>
            <span style={{ ...S.value, textTransform: 'uppercase' }}>{ticket.studentName || '—'}</span>
          </div>
          <div style={S.field}><span style={S.label}>Roll No:</span><span style={S.value}>{ticket.rollNumber || '—'}</span></div>
          <div style={S.field}><span style={S.label}>Adm No:</span><span style={S.value}>{regNo}</span></div>
          <div style={{ ...S.field, gridColumn: '1 / -1' }}>
            <span style={S.label}>Class:</span>
            <span style={S.value}>{ticket.className ? formatClassName(ticket.className, ticket.section) : '—'}</span>
          </div>
        </div>

        <div style={S.sectionTitle}>Exam Schedule</div>
        <ul style={S.schedList}>
          {scheduleRows.length > 0 ? scheduleRows.map((r, i) => (
            <li key={i} style={S.schedRow}>
              <span style={{ fontWeight: 700 }}>{r.subject}</span>
              <span>{fmtDate(r.date)} · Hall {r.hall || '—'}</span>
            </li>
          )) : <li style={{ ...S.schedRow, color: '#a0aec0', fontStyle: 'italic' }}>No schedule available</li>}
        </ul>

        <div style={S.instr}>
          Report 30 min early with this ticket &amp; School ID. No electronic devices. Malpractice = disqualification.
        </div>

        <div style={S.sigRow}>
          <span>Candidate Sign: ___________</span>
          <span>Class Teacher / Principal: ___________</span>
        </div>
      </div>
    </div>
  );
}
