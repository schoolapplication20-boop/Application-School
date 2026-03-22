/**
 * excelExport.js
 * Generates a styled .xlsx file from student data using SheetJS.
 */
import * as XLSX from 'xlsx';

const ACADEMIC_YEARS = ['2024-25', '2025-26', '2026-27'];

/** Derive academic year from DOB-based enrollment heuristic (falls back to current) */
const getCurrentAY = () => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-based
  const year  = now.getFullYear();
  return month >= 6
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
};

/**
 * Build a flat row object from a student record.
 * All fields mapped to human-readable column headers.
 */
const toRow = (s, idx) => ({
  'S.No':                  idx + 1,
  'Student Name':          s.name           || '',
  'Roll Number':           s.rollNo         || '',
  'Class':                 s.class          ? `Class ${s.class}` : '',
  'Section':               s.section        || '',
  'Date of Birth':         s.dob            || '',
  'Blood Group':           s.bloodGroup     || '',
  'Status':                s.status         || 'Active',
  "Father's Name":         s.fatherName     || s.parent  || '',
  "Father's Phone":        s.fatherPhone    || s.mobile  || '',
  "Mother's Name":         s.motherName     || '',
  "Mother's Phone":        s.motherPhone    || '',
  'Guardian Name':         s.guardianName   || '',
  'Guardian Phone':        s.guardianPhone  || '',
  'Permanent Address':     s.permanentAddress || s.address || '',
  'Alternate Address':     s.alternateAddress || '',
});

/**
 * Download an .xlsx file.
 * @param {object[]} students - Filtered student array
 * @param {object}   opts     - { className, section, academicYear, fileName }
 */
export const exportStudentsToExcel = (students, opts = {}) => {
  const { className = 'All', section = 'All', academicYear = getCurrentAY(), fileName } = opts;

  const rows = students.map((s, i) => toRow(s, i));

  // Create workbook + sheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // ── Column widths ──────────────────────────────────────────────────────────
  ws['!cols'] = [
    { wch: 6  }, // S.No
    { wch: 24 }, // Student Name
    { wch: 12 }, // Roll Number
    { wch: 10 }, // Class
    { wch: 9  }, // Section
    { wch: 14 }, // DOB
    { wch: 12 }, // Blood Group
    { wch: 10 }, // Status
    { wch: 22 }, // Father's Name
    { wch: 15 }, // Father's Phone
    { wch: 22 }, // Mother's Name
    { wch: 15 }, // Mother's Phone
    { wch: 20 }, // Guardian Name
    { wch: 15 }, // Guardian Phone
    { wch: 32 }, // Permanent Address
    { wch: 28 }, // Alternate Address
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Students');

  // ── Meta sheet ──────────────────────────────────────────────────────────────
  const metaRows = [
    ['Schoolers - Student Data Export'],
    ['Generated On',  new Date().toLocaleString('en-IN')],
    ['Academic Year', academicYear],
    ['Class Filter',  className],
    ['Section Filter',section],
    ['Total Records', students.length],
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(metaRows);
  wsMeta['!cols'] = [{ wch: 18 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Export Info');

  // ── Download ────────────────────────────────────────────────────────────────
  const safeName = fileName
    || `Students_${className !== 'All' ? `Class${className}_` : ''}${section !== 'All' ? `Sec${section}_` : ''}${academicYear}_${new Date().toISOString().slice(0,10)}.xlsx`;

  XLSX.writeFile(wb, safeName);
  return safeName;
};

export { ACADEMIC_YEARS, getCurrentAY };
