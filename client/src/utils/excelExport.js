/**
 * excelExport.js
 * Generates a styled .xlsx file from student data using SheetJS.
 */
import * as XLSX from 'xlsx';
import { formatClassName } from './format';

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
  'Class':                 formatClassName(s.class),
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
    ['My-Skoolz - Student Data Export'],
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

/**
 * Build a flat row object for one fee-export record.
 * `concessionAmount` is a single waiver field in the backend — it's duplicated into both
 * the "Concession Amount" and "Condonation Amount" columns since this app treats them as
 * the same amount (see FeeExportRowDTO).
 */
const toFeeRow = (r, idx) => ({
  'S.No':                idx + 1,
  'Student Name':        r.studentName      || '',
  'Admission Number':    r.admissionNumber  || '',
  'Roll Number':         r.rollNumber       || '',
  'Class':               formatClassName(r.className),
  'Section':             r.section          || '',
  "Father's Name":       r.fatherName       || '',
  "Father's Phone":      r.fatherPhone      || '',
  'Total Fee':           Number(r.totalFee || 0),
  'Paid Amount':         Number(r.paidAmount || 0),
  'Due Amount':          Number(r.dueAmount || 0),
  'Concession Amount':   Number(r.concessionAmount || 0),
  'Condonation Amount':  Number(r.concessionAmount || 0),
  'Payment Status':      r.paymentStatus    || 'Not Paid',
  'Last Paid Date':      r.lastPaidDate     || '—',
});

/**
 * Download a class/section fee-details .xlsx file.
 * @param {object[]} rows - FeeExportRowDTO[] from adminAPI.getFeeExportRows
 * @param {object}   opts - { className, section }
 */
export const exportFeeDetailsToExcel = (rows, opts = {}) => {
  const { className, section } = opts;

  const sheetRows = rows.map((r, i) => toFeeRow(r, i));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetRows);

  ws['!cols'] = [
    { wch: 6  }, // S.No
    { wch: 24 }, // Student Name
    { wch: 16 }, // Admission Number
    { wch: 12 }, // Roll Number
    { wch: 10 }, // Class
    { wch: 9  }, // Section
    { wch: 22 }, // Father's Name
    { wch: 15 }, // Father's Phone
    { wch: 12 }, // Total Fee
    { wch: 12 }, // Paid Amount
    { wch: 12 }, // Due Amount
    { wch: 14 }, // Concession Amount
    { wch: 15 }, // Condonation Amount
    { wch: 13 }, // Payment Status
    { wch: 14 }, // Last Paid Date
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Fee Details');

  const safeClass = String(className).replace(/[^a-zA-Z0-9]+/g, '_');
  const safeSection = section ? String(section).replace(/[^a-zA-Z0-9]+/g, '_') : '';
  const fileName = `Class_${safeClass}${safeSection ? `_${safeSection}` : ''}_Fee_Details.xlsx`;

  XLSX.writeFile(wb, fileName);
  return fileName;
};

export { ACADEMIC_YEARS, getCurrentAY };
