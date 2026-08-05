export const EXAM_TYPES = ['ANNUAL', 'HALFYEARLY', 'QUARTERLY', 'MIDTERM', 'UNIT_TEST'];
export const CERT_TYPES = ['BONAFIDE', 'TRANSFER', 'COURSE_COMPLETION', 'MARKS_MEMO'];

export const certLabel = { BONAFIDE: 'Bonafide', TRANSFER: 'Transfer Certificate', COURSE_COMPLETION: 'Course Completion', MARKS_MEMO: 'Marks Memo' };
export const examTypeLabel = { ANNUAL: 'Annual', HALFYEARLY: 'Half Yearly', QUARTERLY: 'Quarterly', MIDTERM: 'Mid Term', UNIT_TEST: 'Unit Test' };
export const statusColor = { SCHEDULED: 'exam-badge-blue', ONGOING: 'exam-badge-orange', COMPLETED: 'exam-badge-green', CANCELLED: 'exam-badge-red' };

// Guards against "Invalid Date" text — new Date() on a missing/malformed value (e.g. an
// empty-but-truthy string, or a DOB that was never actually set) still produces a Date
// object, and toLocaleDateString() on it silently renders the literal string "Invalid Date"
// rather than throwing, unless we explicitly check isNaN(dt.getTime()) first.
export const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const today = () => new Date().toISOString().split('T')[0];

// Matches getCurrentAcademicYear() in ExaminationService.java: June-onward belongs to the
// academic year starting this calendar year, Jan-May belongs to the one that started last year.
export const currentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 5 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

export const newSubjectRow = () => ({ _id: Math.random().toString(36).slice(2), subject: '', examDate: today(), startTime: '09:00', endTime: '12:00', hallNumber: '', maxMarks: 100 });

// Kept separate from utils/hallTicketPdf.js (which pulls in html2canvas/jsPDF) so the
// template picker UI doesn't drag those heavy libs into the main Examination bundle —
// see TEMPLATE_TICKETS_PER_PAGE in hallTicketPdf.js for the matching per-page counts.
export const PRINT_TEMPLATES = [
  { value: 'ONE_PER_PAGE',   label: 'Full Hall Ticket',    description: '1 per A4 page' },
  { value: 'THREE_PER_PAGE', label: 'Compact Hall Ticket', description: '3 per A4 page' },
];
