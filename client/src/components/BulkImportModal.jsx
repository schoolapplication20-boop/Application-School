import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { adminAPI } from '../services/api';
import Button from './Button';
import './BulkImportModal.css';

/* ── Column mapping from Excel header → internal field ─────────────── */
const COL_MAP = {
  'admission number': 'admissionNumber', 'admission no': 'admissionNumber', 'adm no': 'admissionNumber',
  'full name': 'fullName', 'name': 'fullName', 'student name': 'fullName',
  'roll number': 'rollNumber', 'roll no': 'rollNumber', 'roll': 'rollNumber',
  'class': 'className', 'class name': 'className',
  'section': 'section',
  "father's name": 'fatherName', 'father name': 'fatherName', 'fathers name': 'fatherName',
  "father's phone": 'fatherPhone', 'father phone': 'fatherPhone', 'father mobile': 'fatherPhone',
  "mother's name": 'motherName', 'mother name': 'motherName', 'mothers name': 'motherName',
  "mother's phone": 'motherPhone', 'mother phone': 'motherPhone', 'mother mobile': 'motherPhone',
  'permanent address': 'address', 'address': 'address',
  'id proof file name': 'idProofFileName', 'id proof': 'idProofFileName',
  'student email': 'studentEmail', 'email': 'studentEmail', 'student email id': 'studentEmail',
};

const REQUIRED = ['fullName', 'className'];   // rollNumber is optional when admissionNumber present
const PHONE_RE  = /^\d{10}$/;
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = ['Upload', 'Preview', 'Results'];

/* ── Validate a single row ──────────────────────────────────────────── */
function validateRow(row, idx, seenAdmNos, seenRollKeys) {
  const errors = [];

  REQUIRED.forEach(f => {
    if (!row[f] || String(row[f]).trim() === '') {
      const label = f === 'fullName' ? 'Full Name' : 'Class';
      errors.push(`${label} is required`);
    }
  });

  // Roll number required only when no admission number is provided
  const hasAdmNo  = row.admissionNumber && String(row.admissionNumber).trim() !== '';
  const hasRollNo = row.rollNumber     && String(row.rollNumber).trim()     !== '';
  if (!hasRollNo && !hasAdmNo) {
    errors.push('Either Roll Number or Admission Number is required');
  }

  // Email is optional but must be valid if provided
  if (row.studentEmail && !EMAIL_RE.test(String(row.studentEmail).trim()))
    errors.push('Student email format is invalid');

  if (row.fatherPhone && !PHONE_RE.test(String(row.fatherPhone).replace(/\s/g, '')))
    errors.push("Father's phone must be 10 digits");
  if (row.motherPhone && !PHONE_RE.test(String(row.motherPhone).replace(/\s/g, '')))
    errors.push("Mother's phone must be 10 digits");

  let isDuplicate = false;
  if (row.admissionNumber) {
    const key = String(row.admissionNumber).trim().toLowerCase();
    if (seenAdmNos.has(key)) { errors.push('Duplicate admission number in file'); isDuplicate = true; }
    else seenAdmNos.add(key);
  }

  const rollKey = `${String(row.className || '').trim().toLowerCase()}|${String(row.section || '').trim().toLowerCase()}|${String(row.rollNumber || '').trim()}`;
  if (row.rollNumber && row.className) {
    if (seenRollKeys.has(rollKey)) { errors.push('Duplicate roll number in same class/section'); isDuplicate = true; }
    else seenRollKeys.add(rollKey);
  }

  return { ...row, rowNumber: idx + 2, errors, isDuplicate, isValid: errors.length === 0 };
}

/* ── Parse file using SheetJS ───────────────────────────────────────── */
function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb   = XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const raw  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (raw.length < 2) return resolve([]);

        const headers = raw[0].map(h => String(h).trim().toLowerCase());
        const seenAdmNos  = new Set();
        const seenRollKeys = new Set();

        const rows = raw.slice(1)
          .filter(r => r.some(c => String(c).trim() !== ''))
          .map((r, idx) => {
            const obj = {};
            headers.forEach((h, i) => {
              const field = COL_MAP[h];
              if (field) obj[field] = String(r[i] ?? '').trim();
            });
            return validateRow(obj, idx, seenAdmNos, seenRollKeys);
          });

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/* ── Download sample template ───────────────────────────────────────── */
function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1 (active/primary): Students data ──────────────────────────
  // Must be added FIRST so Excel opens directly to this sheet.
  // Column order must stay in sync with COL_MAP and the columns info list below.
  const headers = [
    'Admission Number', 'Full Name', 'Roll Number', 'Class', 'Section',
    'Student Email',
    "Father's Name", "Father's Phone",
    "Mother's Name", "Mother's Phone",
    'Permanent Address', 'ID Proof File Name',
  ];
  const samples = [
    ['ADM001', 'Rahul Sharma', '1', 'Class 10', 'A', 'rahul.sharma@email.com',
     'Raj Sharma', '9876543210', 'Priya Sharma', '9876543211',
     '123 Main Street, Hyderabad', 'aadhar.pdf'],
  ];
  const wsData = XLSX.utils.aoa_to_sheet([headers, ...samples]);
  wsData['!cols'] = [
    { wch: 16 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
    { wch: 28 },
    { wch: 20 }, { wch: 14 },
    { wch: 20 }, { wch: 14 },
    { wch: 30 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsData, 'Students');

  // ── Sheet 2 (reference): Instructions ───────────────────────────────
  const instructions = [
    ['STUDENT BULK IMPORT — FORMAT GUIDE'],
    [''],
    ['HOW TO USE THIS FILE:'],
    ['1. Fill in student data on the "Students" sheet starting from Row 2.'],
    ['2. Row 1 has the column headers — do not change them.'],
    ['3. Delete the sample row before uploading.'],
    ['4. Save as .xlsx, .xls, or .csv and upload via the Bulk Import button.'],
    ['5. "Create login accounts" is checked by default — credentials are auto-downloaded after import.'],
    [''],
    ['COLUMN REFERENCE:'],
    ['Column',            'Required?',  'Notes'],
    ['Admission Number',  'REQUIRED*',  'Used as the student login username. Required if Roll Number is not provided.'],
    ['Full Name',         'REQUIRED',   'Student\'s full name'],
    ['Roll Number',       'REQUIRED*',  'Required if Admission Number is not provided.'],
    ['Class',             'REQUIRED',   'e.g. "Class 10", "10", "10-A", "10 - A"'],
    ['Section',           'Optional',   'e.g. "A", "B". Can also be part of the Class column, e.g. "10-A".'],
    ['Student Email',     'Optional',   'If provided, welcome email with credentials is sent here.'],
    ["Father's Name",     'Optional',   'Parent / guardian name'],
    ["Father's Phone",    'Optional',   '10-digit mobile number'],
    ["Mother's Name",     'Optional',   ''],
    ["Mother's Phone",    'Optional',   '10-digit mobile number'],
    ['Permanent Address', 'Optional',   'Student\'s home address'],
    ['ID Proof File Name','Optional',   'e.g. "aadhar.pdf". Actual file can be uploaded later from the student profile.'],
    [''],
    ['LOGIN ACCOUNTS (auto-generated when "Create login accounts" is checked):'],
    ['  • Username   = Admission Number'],
    ['  • Password   = Temporary password generated by the system'],
    ['  • After import, credentials are auto-downloaded as an Excel file.'],
    ['  • Students log in with Admission Number + Temp Password, then must change password.'],
    [''],
    ['TIPS:'],
    ['  • Maximum 5000 rows per upload.'],
    ['  • Duplicate admission numbers in the same school are skipped automatically.'],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
  wsInstr['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

  XLSX.writeFile(wb, 'student_import_template.xlsx');
}

/* ── Download student credentials as Excel ──────────────────────────── */
function downloadCredentials(credentials) {
  const LOGIN_URL = 'https://my-skoolz.com/login';
  const INSTRUCTION = 'Select Student role → enter Admission Number as username → enter Temp Password → change password on first login';

  const headers = [
    'S.No', 'Student Name', 'Admission Number', 'Class', 'Section',
    'Father Name', 'Father Phone',
    'Login Username', 'Temporary Password', 'Login URL', 'First Login Instructions',
  ];
  const data = credentials.map((c, idx) => [
    idx + 1,
    c.studentName     || '',
    c.admissionNumber || '',
    c.className       || '',
    c.section         || '',
    c.fatherName      || '',
    c.fatherPhone     || '',
    c.username        || c.admissionNumber || '',
    c.tempPassword    || '',
    LOGIN_URL,
    INSTRUCTION,
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  // Force all cells to text so Excel never interprets @#$! passwords as formulas
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[addr]) ws[addr].t = 's';
    }
  }
  ws['!cols'] = [
    { wch: 6 }, { wch: 22 }, { wch: 16 }, { wch: 10 }, { wch: 8 },
    { wch: 20 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 55 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Student Credentials');
  XLSX.writeFile(wb, 'student_credentials.xlsx');
}

/* ── Download failed rows as Excel ─────────────────────────────────── */
function downloadFailed(failedRows) {
  const data = failedRows.map(r => ({
    'Row #':            r.rowNumber,
    'Full Name':        r.fullName        || '',
    'Admission Number': r.admissionNumber || '',
    'Roll Number':      r.rollNumber      || '',
    'Class':            r.className       || '',
    'Error Reason':     Array.isArray(r.errors) ? r.errors.join('; ') : (r.reason || ''),
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 50 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Failed Rows');
  XLSX.writeFile(wb, 'failed_import_rows.xlsx');
}

/* ─────────────────────────────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────────────────────────────── */
export default function BulkImportModal({ onClose, onImportDone }) {
  const [step,           setStep]           = useState(0);  // 0=Upload 1=Preview 2=Results
  const [dragging,       setDragging]       = useState(false);
  const [parsing,        setParsing]        = useState(false);
  const [rows,           setRows]           = useState([]);
  const [importing,      setImporting]      = useState(false);
  const [result,         setResult]         = useState(null);
  const [skipInvalid,    setSkipInvalid]    = useState(true);
  const [createAccounts, setCreateAccounts] = useState(true);
  const [filterTab,      setFilterTab]      = useState('all');  // all | valid | invalid
  const [history,        setHistory]        = useState(null);
  const [showHistory,    setShowHistory]    = useState(false);
  const fileRef = useRef(null);

  /* ── derived counts ── */
  const valid    = rows.filter(r => r.isValid);
  const invalid  = rows.filter(r => !r.isValid);
  const dups     = rows.filter(r => r.isDuplicate);
  const filtered = filterTab === 'valid' ? valid : filterTab === 'invalid' ? invalid : rows;

  /* ── file handling ── */
  const handleFile = useCallback(async file => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      alert('Only .xlsx, .xls, or .csv files are supported');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be under 10MB');
      return;
    }
    setParsing(true);
    try {
      const parsed = await parseFile(file);
      setRows(parsed);
      setStep(1);
    } catch (e) {
      alert('Failed to parse file: ' + e.message);
    } finally {
      setParsing(false);
    }
  }, []);

  const onDrop = useCallback(e => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  /* ── import ── */
  const handleImport = async () => {
    const toSend = skipInvalid ? valid : rows;
    if (toSend.length === 0) return;
    setImporting(true);
    try {
      const payload = {
        rows: toSend.map(r => ({
          rowNumber:       r.rowNumber,
          admissionNumber: r.admissionNumber || '',
          fullName:        r.fullName        || '',
          rollNumber:      r.rollNumber      || '',
          className:       r.className       || '',
          section:         r.section         || '',
          studentEmail:    r.studentEmail    || '',
          fatherName:      r.fatherName      || '',
          fatherPhone:     r.fatherPhone     || '',
          motherName:      r.motherName      || '',
          motherPhone:     r.motherPhone     || '',
          address:         r.address         || '',
          idProofFileName: r.idProofFileName || '',
        })),
        skipInvalid,
        createAccounts,
      };
      const res = await adminAPI.bulkImportStudents(payload);
      const importResult = res.data.data;
      setResult(importResult);
      setStep(2);
      if (onImportDone) onImportDone();
      // Auto-download credentials immediately so admins don't miss them
      if (createAccounts && importResult?.credentials?.length > 0) {
        setTimeout(() => downloadCredentials(importResult.credentials), 500);
      }
    } catch (e) {
      alert('Import failed: ' + (e.response?.data?.message || e.message));
    } finally {
      setImporting(false);
    }
  };

  /* ── history ── */
  const loadHistory = async () => {
    try {
      const res = await adminAPI.getImportHistory();
      setHistory(res.data.data);
      setShowHistory(true);
    } catch { setHistory([]); setShowHistory(true); }
  };

  const downloadServerFailed = async logId => {
    try {
      const res = await adminAPI.getImportFailedRows(logId);
      downloadFailed(res.data.data);
    } catch { alert('Could not download failed rows'); }
  };

  /* ─── RENDER ─────────────────────────────────────────────────────── */
  return (
    <div className="bim-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bim-modal">
        {/* ── Header ── */}
        <div className="bim-header">
          <div className="bim-header-left">
            <span className="material-icons bim-header-icon">upload_file</span>
            <div>
              <h2 className="bim-title">Bulk Student Import</h2>
              <p className="bim-subtitle">Upload Excel or CSV to import multiple students at once</p>
            </div>
          </div>
          <div className="bim-header-right">
            {step === 0 && (
              <Button variant="bim-ghost" onClick={loadHistory}>
                <span className="material-icons" style={{ fontSize: 16 }}>history</span>
                History
              </Button>
            )}
            <button className="bim-close" onClick={onClose}>
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>

        {/* ── Step indicator ── */}
        <div className="bim-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`bim-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
              <div className="bim-step-dot">
                {i < step ? <span className="material-icons">check</span> : i + 1}
              </div>
              <span className="bim-step-label">{s}</span>
              {i < STEPS.length - 1 && <div className="bim-step-line" />}
            </div>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="bim-body">

          {/* ════════ STEP 0 — UPLOAD ════════ */}
          {step === 0 && !showHistory && (
            <div className="bim-upload-screen">
              {/* Drop zone */}
              <div
                className={`bim-dropzone ${dragging ? 'dragging' : ''} ${parsing ? 'parsing' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => !parsing && fileRef.current.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])}
                />
                {parsing ? (
                  <>
                    <div className="bim-spinner" />
                    <p className="bim-drop-title">Parsing file…</p>
                  </>
                ) : (
                  <>
                    <span className="material-icons bim-drop-icon">cloud_upload</span>
                    <p className="bim-drop-title">
                      {dragging ? 'Drop file here' : 'Drag & drop or click to upload'}
                    </p>
                    <p className="bim-drop-sub">Supports .xlsx, .xls, .csv · Max 10 MB · Up to 5000 rows</p>
                    <Button variant="bim-primary" style={{ marginTop: 16 }}
                      onClick={e => { e.stopPropagation(); fileRef.current.click(); }}>
                      <span className="material-icons">folder_open</span>
                      Choose File
                    </Button>
                  </>
                )}
              </div>

              {/* Template download */}
              <div className="bim-template-box">
                <span className="material-icons" style={{ color: '#3b82f6', fontSize: 20 }}>description</span>
                <div>
                  <p className="bim-template-title">Need a template?</p>
                  <p className="bim-template-sub">Download the sample Excel file with correct column headers and a sample row.</p>
                </div>
                <Button variant="bim-outline" onClick={downloadTemplate}>
                  <span className="material-icons" style={{ fontSize: 16 }}>download</span>
                  Download Template
                </Button>
              </div>

              {/* Columns info */}
              <div className="bim-cols-box">
                <p className="bim-cols-title">Columns in your file:</p>
                <div className="bim-cols-grid">
                  {[
                    { label: 'Full Name',          req: true  },
                    { label: 'Class',              req: true  },
                    { label: 'Admission Number',   req: '★'   },
                    { label: 'Roll Number',        req: '★'   },
                    { label: 'Section',            req: false },
                    { label: 'Student Email',      req: false },
                    { label: "Father's Name",      req: false },
                    { label: "Father's Phone",     req: false },
                    { label: "Mother's Name",      req: false },
                    { label: "Mother's Phone",     req: false },
                    { label: 'Permanent Address',  req: false },
                    { label: 'ID Proof File Name', req: false },
                  ].map(({ label, req }) => (
                    <span key={label} className={`bim-col-tag ${req === true ? 'required' : req === '★' ? 'semi-required' : ''}`}>
                      {label}{req === true ? ' ✱' : req === '★' ? ' ★' : ''}
                    </span>
                  ))}
                </div>
                <p className="bim-cols-note">
                  ✱ Always required &nbsp;·&nbsp;
                  ★ At least one of Admission Number or Roll Number must be provided &nbsp;·&nbsp;
                  All other columns are optional.
                  See the <strong>Instructions</strong> sheet in the downloaded template for full details.
                </p>
              {/* Account creation toggle */}
              <label className="bim-checkbox-label" style={{ marginTop: 10 }}>
                <input
                  type="checkbox"
                  checked={createAccounts}
                  onChange={e => setCreateAccounts(e.target.checked)}
                />
                <span>
                  <strong>Create login accounts for all students</strong>
                  <br />
                  <span style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>
                    Accounts are created using admission number as username. Students without email
                    get an auto-generated login email. Download credentials from the results screen.
                  </span>
                </span>
              </label>
              </div>
            </div>
          )}

          {/* ════════ HISTORY PANEL ════════ */}
          {step === 0 && showHistory && (
            <div className="bim-history">
              <div className="bim-history-header">
                <Button variant="bim-ghost" onClick={() => setShowHistory(false)}>
                  <span className="material-icons" style={{ fontSize: 16 }}>arrow_back</span>
                  Back
                </Button>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Recent Imports</h3>
              </div>
              {!history ? (
                <div className="bim-center"><div className="bim-spinner" /></div>
              ) : history.length === 0 ? (
                <div className="bim-empty">No import history yet</div>
              ) : (
                <table className="bim-hist-table">
                  <thead>
                    <tr>
                      <th>Date</th><th>Total</th><th>Imported</th><th>Failed</th><th>Status</th><th>Failed Rows</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id}>
                        <td>{new Date(h.importedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{h.totalRows}</td>
                        <td style={{ color: '#16a34a', fontWeight: 600 }}>{h.importedRows}</td>
                        <td style={{ color: h.failedRows > 0 ? '#dc2626' : '#6b7280' }}>{h.failedRows}</td>
                        <td><span className={`bim-status-badge ${h.status.toLowerCase()}`}>{h.status}</span></td>
                        <td>
                          {h.failedRows > 0 && (
                            <Button variant="bim-xs" onClick={() => downloadServerFailed(h.id)}>
                              <span className="material-icons" style={{ fontSize: 13 }}>download</span>
                              Download
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ════════ STEP 1 — PREVIEW ════════ */}
          {step === 1 && (
            <div className="bim-preview">
              {/* Summary cards */}
              <div className="bim-summary">
                <div className="bim-card total">
                  <span className="bim-card-num">{rows.length}</span>
                  <span className="bim-card-label">Total Rows</span>
                </div>
                <div className="bim-card valid">
                  <span className="bim-card-num">{valid.length}</span>
                  <span className="bim-card-label">Valid</span>
                </div>
                <div className="bim-card invalid">
                  <span className="bim-card-num">{invalid.length}</span>
                  <span className="bim-card-label">Invalid</span>
                </div>
                <div className="bim-card dup">
                  <span className="bim-card-num">{dups.length}</span>
                  <span className="bim-card-label">Duplicates</span>
                </div>
              </div>

              {/* Options */}
              {invalid.length > 0 && (
                <div className="bim-options">
                  <label className="bim-checkbox-label">
                    <input
                      type="checkbox"
                      checked={skipInvalid}
                      onChange={e => setSkipInvalid(e.target.checked)}
                    />
                    <span>Skip invalid rows and import only valid rows ({valid.length})</span>
                  </label>
                </div>
              )}

              {/* Filter tabs */}
              <div className="bim-filter-tabs">
                {[['all', `All (${rows.length})`], ['valid', `Valid (${valid.length})`], ['invalid', `Invalid (${invalid.length})`]].map(([k, l]) => (
                  <button
                    key={k}
                    className={`bim-filter-tab ${filterTab === k ? 'active' : ''}`}
                    onClick={() => setFilterTab(k)}
                  >{l}</button>
                ))}
                {invalid.length > 0 && (
                  <Button variant="bim-xs" style={{ marginLeft: 'auto' }}
                    onClick={() => downloadFailed(invalid.map(r => ({ ...r, reason: r.errors.join('; ') })))}>
                    <span className="material-icons" style={{ fontSize: 13 }}>download</span>
                    Download Invalid
                  </Button>
                )}
              </div>

              {/* Preview table */}
              <div className="bim-table-wrap">
                <table className="bim-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Full Name</th>
                      <th>Adm No</th>
                      <th>Roll</th>
                      <th>Class</th>
                      <th>Sec</th>
                      <th>Father's Name</th>
                      <th>Father's Phone</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.rowNumber} className={r.isValid ? '' : 'row-error'}>
                        <td className="bim-row-num">{r.rowNumber}</td>
                        <td>{r.fullName || <span className="bim-missing">missing</span>}</td>
                        <td>{r.admissionNumber || '—'}</td>
                        <td>{r.rollNumber || <span className="bim-missing">missing</span>}</td>
                        <td>{r.className || <span className="bim-missing">missing</span>}</td>
                        <td>{r.section || '—'}</td>
                        <td>{r.fatherName || '—'}</td>
                        <td>{r.fatherPhone || '—'}</td>
                        <td>
                          {r.isValid ? (
                            <span className="bim-badge valid">✓ Valid</span>
                          ) : (
                            <span className="bim-badge invalid" title={r.errors.join('\n')}>
                              ✕ {r.errors[0]}{r.errors.length > 1 ? ` +${r.errors.length - 1}` : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════ STEP 2 — RESULTS ════════ */}
          {step === 2 && result && (
            <div className="bim-results">
              <div className={`bim-result-icon ${result.importedRows > 0 ? 'success' : 'error'}`}>
                <span className="material-icons">
                  {result.importedRows > 0 ? 'check_circle' : 'error'}
                </span>
              </div>
              <h3 className="bim-result-title">
                {result.importedRows > 0
                  ? `${result.importedRows} student${result.importedRows > 1 ? 's' : ''} imported successfully!`
                  : 'Import failed'}
              </h3>

              <div className="bim-summary" style={{ marginTop: 24 }}>
                <div className="bim-card total">
                  <span className="bim-card-num">{result.totalRows}</span>
                  <span className="bim-card-label">Total</span>
                </div>
                <div className="bim-card valid">
                  <span className="bim-card-num">{result.importedRows}</span>
                  <span className="bim-card-label">Imported</span>
                </div>
                <div className="bim-card invalid">
                  <span className="bim-card-num">{result.failedRows}</span>
                  <span className="bim-card-label">Failed</span>
                </div>
                <div className="bim-card dup">
                  <span className="bim-card-num">{result.duplicateRows}</span>
                  <span className="bim-card-label">Duplicates</span>
                </div>
              </div>

              {/* Credentials download — shown when createAccounts was true */}
              {result.credentials && result.credentials.length > 0 && (
                <div style={{ marginTop: 20, padding: '14px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#15803d' }}>
                      <span className="material-icons" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>key</span>
                      {result.credentials.length} student account{result.credentials.length > 1 ? 's' : ''} created
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#166534' }}>
                      Download the credentials file and distribute login details to students. Passwords are temporary — students must change on first login.
                    </p>
                  </div>
                  <Button variant="bim-primary" onClick={() => downloadCredentials(result.credentials)}>
                    <span className="material-icons" style={{ fontSize: 16 }}>download</span>
                    Download Credentials
                  </Button>
                </div>
              )}

              {result.failedRowDetails && result.failedRowDetails.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#dc2626' }}>
                      Failed Rows ({result.failedRowDetails.length})
                    </p>
                    <Button variant="bim-outline"
                      onClick={() => downloadFailed(result.failedRowDetails)}>
                      <span className="material-icons" style={{ fontSize: 15 }}>download</span>
                      Download Failed Rows
                    </Button>
                  </div>
                  <div className="bim-table-wrap" style={{ maxHeight: 200 }}>
                    <table className="bim-table">
                      <thead>
                        <tr><th>Row</th><th>Name</th><th>Adm No</th><th>Reason</th></tr>
                      </thead>
                      <tbody>
                        {result.failedRowDetails.map(f => (
                          <tr key={f.rowNumber} className="row-error">
                            <td className="bim-row-num">{f.rowNumber}</td>
                            <td>{f.fullName}</td>
                            <td>{f.admissionNumber || '—'}</td>
                            <td style={{ color: '#dc2626', fontSize: 12 }}>{f.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="bim-footer">
          {step === 0 && !showHistory && (
            <Button variant="bim-ghost" onClick={onClose}>Cancel</Button>
          )}

          {step === 1 && (
            <>
              <Button variant="bim-ghost" onClick={() => { setStep(0); setRows([]); setFilterTab('all'); }}>
                ← Back
              </Button>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {(skipInvalid ? valid.length : rows.length) === 0 ? (
                  <span style={{ fontSize: 13, color: '#dc2626' }}>No valid rows to import</span>
                ) : (
                  <span style={{ fontSize: 13, color: '#6b7280' }}>
                    Will import <strong>{skipInvalid ? valid.length : rows.length}</strong> student{(skipInvalid ? valid.length : rows.length) > 1 ? 's' : ''}
                  </span>
                )}
                <Button
                  variant="bim-primary"
                  disabled={importing || (skipInvalid ? valid.length : rows.length) === 0}
                  onClick={handleImport}
                >
                  {importing ? (
                    <><div className="bim-spinner-sm" /> Importing…</>
                  ) : (
                    <><span className="material-icons" style={{ fontSize: 18 }}>upload</span> Confirm Import</>
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <Button variant="bim-ghost" onClick={() => { setStep(0); setRows([]); setResult(null); setFilterTab('all'); }}>
                Import More
              </Button>
              <Button variant="bim-primary" onClick={onClose}>Done</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
