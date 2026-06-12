export const EXAM_TYPES = ['ANNUAL', 'HALFYEARLY', 'QUARTERLY', 'MIDTERM', 'UNIT_TEST'];
export const CERT_TYPES = ['BONAFIDE', 'TRANSFER', 'COURSE_COMPLETION', 'MARKS_MEMO'];

export const certLabel = { BONAFIDE: 'Bonafide', TRANSFER: 'Transfer Certificate', COURSE_COMPLETION: 'Course Completion', MARKS_MEMO: 'Marks Memo' };
export const examTypeLabel = { ANNUAL: 'Annual', HALFYEARLY: 'Half Yearly', QUARTERLY: 'Quarterly', MIDTERM: 'Mid Term', UNIT_TEST: 'Unit Test' };
export const statusColor = { SCHEDULED: 'exam-badge-blue', ONGOING: 'exam-badge-orange', COMPLETED: 'exam-badge-green', CANCELLED: 'exam-badge-red' };

export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const today = () => new Date().toISOString().split('T')[0];

export const newSubjectRow = () => ({ _id: Math.random().toString(36).slice(2), subject: '', examDate: today(), startTime: '09:00', endTime: '12:00', hallNumber: '', maxMarks: 100 });
