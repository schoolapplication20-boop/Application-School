import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { adminAPI } from '../services/api';
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

const REQUIRED = ['fullName', 'rollNumber', 'className'];
const PHONE_RE  = /^\d{10}$/;
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = ['Upload', 'Preview', 'Results'];

/* ── Validate a single row ──────────────────────────────────────────── */
function validateRow(row, idx, seenAdmNos, seenRollKeys) {
  const errors = [];

  REQUIRED.forEach(f => {
    if (!row[f] || String(row[f]).trim() === '') {
      const label = f === 'fullName' ? 'Full Name' : f === 'rollNumber' ? 'Roll Number' : 'Class';
      errors.push(`${label} is required`);
    }
  });

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
  const headers = [
    'Admission Number', 'Full Name', 'Roll Number', 'Class', 'Section',
    'Student Email',
    "Father's Name", "Father's Phone", "Mother's Name", "Mother's Phone",
    'Permanent Address', 'ID Proof File Name',
  ];
  const sample = [
    'ADM001', 'Rahul Sharma', '1', 'Class 10', 'A',
    'rahul.sharma@email.com',
    'Raj Sharma', '9876543210', 'Priya Sharma', '9876543211',
    '123 Main Street, Hyderabad', 'aadhar.pdf',
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  ws['!cols'] = headers.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  XLSX.writeFile(wb, 'student_import_template.xlsx');
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
  const [step,        setStep]        = useState(0);   // 0=Upload 1=Preview 2=Results
  const [dragging,    setDragging]    = useState(false);
  const [parsing,     setParsing]     = useState(false);
  const [rows,        setRows]        = useState([]);
  const [importing,   setImporting]   = useState(false);
  const [result,      setResult]      = useState(null);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [filterTab,   setFilterTab]   = useState('all');  // all | valid | invalid
  const [history,     setHistory]     = useState(null);
  const [showHistory, setShowHistory] = useState(false);
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
          fatherName:      r.fatherName      || '',
          fatherPhone:     r.fatherPhone     || '',
          motherName:      r.motherName      || '',
          motherPhone:     r.motherPhone     || '',
          address:         r.address         || '',
          idProofFileName: r.idProofFileName || '',
        })),
        skipInvalid,
      };
      const res = await adminAPI.bulkImportStudents(payload);
      setResult(res.data.data);
      setStep(2);
      if (onImportDone) onImportDone();
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
              <button className="bim-btn-ghost" onClick={loadHistory}>
                <span className="material-icons" style={{ fontSize: 16 }}>history</span>
                History
              </button>
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
                    <button className="bim-btn-primary" style={{ marginTop: 16 }}
                      onClick={e => { e.stopPropagation(); fileRef.current.click(); }}>
                      <span className="material-icons">folder_open</span>
                      Choose File
                    </button>
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
                <button className="bim-btn-outline" onClick={downloadTemplate}>
                  <span className="material-icons" style={{ fontSize: 16 }}>download</span>
                  Download Template
                </button>
              </div>

              {/* Columns info */}
              <div className="bim-cols-box">
                <p className="bim-cols-title">Columns in your file:</p>
                <div className="bim-cols-grid">
                  {['Full Name ✱', 'Roll Number ✱', 'Class ✱', 'Admission Number',
                    'Student Email', 'Section', "Father's Name", "Father's Phone",
                    "Mother's Name", "Mother's Phone", 'Permanent Address', 'ID Proof File Name'].map(c => (
                    <span key={c} className={`bim-col-tag ${c.includes('✱') ? 'required' : ''}`}>{c}</span>
                  ))}
                </div>
                <p className="bim-cols-note">✱ Required &nbsp;|&nbsp; Student Email is optional — if provided, student gets a welcome email with login credentials. Without email, student can sign up later using their admission number.</p>
              </div>
            </div>
          )}

          {/* ════════ HISTORY PANEL ════════ */}
          {step === 0 && showHistory && (
            <div className="bim-history">
              <div className="bim-history-header">
                <button className="bim-btn-ghost" onClick={() => setShowHistory(false)}>
                  <span className="material-icons" style={{ fontSize: 16 }}>arrow_back</span>
                  Back
                </button>
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
                            <button className="bim-btn-xs" onClick={() => downloadServerFailed(h.id)}>
                              <span className="material-icons" style={{ fontSize: 13 }}>download</span>
                              Download
                            </button>
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
                  <button className="bim-btn-xs" style={{ marginLeft: 'auto' }}
                    onClick={() => downloadFailed(invalid.map(r => ({ ...r, reason: r.errors.join('; ') })))}>
                    <span className="material-icons" style={{ fontSize: 13 }}>download</span>
                    Download Invalid
                  </button>
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

              {result.failedRowDetails && result.failedRowDetails.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#dc2626' }}>
                      Failed Rows ({result.failedRowDetails.length})
                    </p>
                    <button className="bim-btn-outline"
                      onClick={() => downloadFailed(result.failedRowDetails)}>
                      <span className="material-icons" style={{ fontSize: 15 }}>download</span>
                      Download Failed Rows
                    </button>
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
            <button className="bim-btn-ghost" onClick={onClose}>Cancel</button>
          )}

          {step === 1 && (
            <>
              <button className="bim-btn-ghost" onClick={() => { setStep(0); setRows([]); setFilterTab('all'); }}>
                ← Back
              </button>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {(skipInvalid ? valid.length : rows.length) === 0 ? (
                  <span style={{ fontSize: 13, color: '#dc2626' }}>No valid rows to import</span>
                ) : (
                  <span style={{ fontSize: 13, color: '#6b7280' }}>
                    Will import <strong>{skipInvalid ? valid.length : rows.length}</strong> student{(skipInvalid ? valid.length : rows.length) > 1 ? 's' : ''}
                  </span>
                )}
                <button
                  className="bim-btn-primary"
                  disabled={importing || (skipInvalid ? valid.length : rows.length) === 0}
                  onClick={handleImport}
                >
                  {importing ? (
                    <><div className="bim-spinner-sm" /> Importing…</>
                  ) : (
                    <><span className="material-icons" style={{ fontSize: 18 }}>upload</span> Confirm Import</>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <button className="bim-btn-ghost" onClick={() => { setStep(0); setRows([]); setResult(null); setFilterTab('all'); }}>
                Import More
              </button>
              <button className="bim-btn-primary" onClick={onClose}>Done</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
