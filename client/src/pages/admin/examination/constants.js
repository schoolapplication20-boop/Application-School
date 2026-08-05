export const EXAM_TYPES = ['ANNUAL', 'HALFYEARLY', 'QUARTERLY', 'MIDTERM', 'UNIT_TEST'];
export const CERT_TYPES = ['BONAFIDE', 'TRANSFER', 'COURSE_COMPLETION', 'MARKS_MEMO'];

export const certLabel = { BONAFIDE: 'Bonafide', TRANSFER: 'Transfer Certificate', COURSE_COMPLETION: 'Course Completion', MARKS_MEMO: 'Marks Memo' };
export const examTypeLabel = { ANNUAL: 'Annual', HALFYEARLY: 'Half Yearly', QUARTERLY: 'Quarterly', MIDTERM: 'Mid Term', UNIT_TEST: 'Unit Test' };
export const statusColor = { SCHEDULED: 'exam-badge-blue', ONGOING: 'exam-badge-orange', COMPLETED: 'exam-badge-green', CANCELLED: 'exam-badge-red' };

export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const today = () => new Date().toISOString().split('T')[0];

export const newSubjectRow = () => ({ _id: Math.random().toString(36).slice(2), subject: '', examDate: today(), startTime: '09:00', endTime: '12:00', hallNumber: '', maxMarks: 100 });

// Kept separate from utils/hallTicketPdf.js (which pulls in html2canvas/jsPDF) so the
// template picker UI doesn't drag those heavy libs into the main Examination bundle —
// see TEMPLATE_TICKETS_PER_PAGE in hallTicketPdf.js for the matching per-page counts.
export const PRINT_TEMPLATES = [
  { value: 'ONE_PER_PAGE',   label: '1 per page', description: 'One full hall ticket per A4 sheet' },
  { value: 'TWO_PER_PAGE',   label: '2 per page', description: 'Two compact tickets, stacked' },
  { value: 'THREE_PER_PAGE', label: '3 per page', description: 'Three compact tickets, stacked' },
  { value: 'FOUR_PER_PAGE',  label: '4 per page', description: 'Four compact tickets, 2x2 grid' },
];
