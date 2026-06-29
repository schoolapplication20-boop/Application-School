import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { teacherAPI, examTypeAPI, gradeScaleAPI, reportCardAPI } from '../../services/api';
import { sortClasses } from '../../utils/classOrder';
import { useToast } from '../../context/ToastContext';

const FALLBACK_EXAM_TYPES = ['Unit Test 1', 'Unit Test 2', 'Mid Term', 'Final Exam', 'Annual Exam'];
const SUBJECTS = [
  'Mathematics', 'Science', 'English', 'Social Studies', 'Hindi',
  'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Physical Education',
  'History', 'Geography', 'Economics',
];

const DEFAULT_SCALE = [
  { grade: 'O',  minPercentage: 90 },
  { grade: 'A+', minPercentage: 80 },
  { grade: 'A',  minPercentage: 70 },
  { grade: 'B+', minPercentage: 60 },
  { grade: 'B',  minPercentage: 50 },
  { grade: 'B-', minPercentage: 40 },
  { grade: 'C',  minPercentage: 33 },
  { grade: 'F',  minPercentage:  0 },
];

const buildGetGrade = (scale) => {
  const sorted = [...scale].sort((a, b) => b.minPercentage - a.minPercentage);
  return (marks, max) => {
    if (!max || max <= 0) return '—';
    const pct = (marks / max) * 100;
    const entry = sorted.find(s => pct >= s.minPercentage);
    return entry ? entry.grade : sorted[sorted.length - 1]?.grade || 'F';
  };
};

// Fallback used before API resolves — stored in a module-level ref-like pattern
// but replaced per-component via useRef so multiple instances don't share state
const _defaultGetGrade = buildGetGrade(DEFAULT_SCALE);


// Colours by tier: top 25% = green, middle 50% = blue/yellow, bottom 25% = red
const getGradeColor = (grade, scale = DEFAULT_SCALE) => {
  const sorted = [...scale].sort((a, b) => b.minPercentage - a.minPercentage);
  const idx = sorted.findIndex(s => s.grade === grade);
  const ratio = sorted.length > 1 ? idx / (sorted.length - 1) : 0;
  if (ratio < 0.25) return { color: '#276749', bg: '#f0fff4' };
  if (ratio < 0.5)  return { color: '#2b6cb0', bg: '#ebf8ff' };
  if (ratio < 0.75) return { color: '#c05621', bg: '#fffaf0' };
  return { color: '#c53030', bg: '#fff5f5' };
};

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const sel = (extra = {}) => ({
  padding: '8px 10px', fontSize: 12, border: '1.5px solid var(--border-strong)',
  borderRadius: 7, outline: 'none', background: 'var(--surface)', boxSizing: 'border-box', ...extra,
});

export default function Marks() {
  const { user } = useAuth();
  // Per-component grade function — updated when school grade scale loads from API
  const getGradeRef = useRef(_defaultGetGrade);
  const getGrade = (...args) => getGradeRef.current(...args);

  // ── Main data ─────────────────────────────────────────────────────────────────
  const [classes, setClasses]           = useState([]);
  const [students, setStudents]         = useState([]);
  const [allMarks, setAllMarks]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [loadingMarks, setLoadingMarks] = useState(false);

  // ── Filters ───────────────────────────────────────────────────────────────────
  const [filterClassId, setFilterClassId] = useState('');
  const [filterExam, setFilterExam]       = useState('');

  const showToast = useToast();

  // ── Exam types (school-defined or fallback) ────────────────────────────────────
  const [examTypes, setExamTypes] = useState(FALLBACK_EXAM_TYPES);

  useEffect(() => {
    examTypeAPI.listForTeacher()
      .then(r => {
        const types = (r.data?.data || []).map(et => et.name);
        if (types.length > 0) setExamTypes(types);
      })
      .catch(() => {});
  }, []);

  // ── Grade scale (school-defined or default) ───────────────────────────────────
  const [gradeScale,        setGradeScale]        = useState(DEFAULT_SCALE);
  const [gradeScaleWarning, setGradeScaleWarning] = useState(false);

  useEffect(() => {
    gradeScaleAPI.forTeacher()
      .then(r => {
        const data = r.data?.data || [];
        if (data.length > 0) {
          setGradeScale(data);
          getGradeRef.current = buildGetGrade(data);
          setGradeScaleWarning(false);
        } else {
          setGradeScaleWarning(true); // no custom scale — using default
        }
      })
      .catch(() => setGradeScaleWarning(true));
  }, []);

  // ── Bulk modal state ──────────────────────────────────────────────────────────
  const [showModal, setShowModal]             = useState(false);
  const [bulkClassId, setBulkClassId]         = useState('');
  const [bulkExamType, setBulkExamType]       = useState('');
  const [bulkDate, setBulkDate]               = useState('');
  // subjectMaxMarks[subject] = string — per-subject configurable maximum marks
  const [subjectMaxMarks, setSubjectMaxMarks] = useState({});
  const [bulkSubjects, setBulkSubjects]       = useState([SUBJECTS[0]]);
  const [bulkStudents, setBulkStudents]       = useState([]);
  const [loadingBulkStudents, setLoadingBulkStudents] = useState(false);
  // grid[studentId][subject] = marks string value (NORMAL mode)
  const [grid, setGrid]                       = useState({});
  const [saving, setSaving]                   = useState(false);
  // ── Internal + External mode per subject ─────────────────────────────────────
  // subjectMode[subject] = 'NORMAL' | 'IE'
  const [subjectMode,     setSubjectMode]     = useState({});
  // ieInternalMax[subject] = string (internal component max marks)
  const [ieInternalMax,   setIeInternalMax]   = useState({});
  // ieExternalMax[subject] = string (external component max marks)
  const [ieExternalMax,   setIeExternalMax]   = useState({});
  // ieGrid[studentId][subject] = { int: string, ext: string }
  const [ieGrid,          setIeGrid]          = useState({});
  // ── Attendance fields ─────────────────────────────────────────────────────────
  // totalWorkingDays: one value for the whole class/exam period
  // attendanceGrid[studentId] = present days string
  const [totalWorkingDays, setTotalWorkingDays]   = useState('');
  const [attendanceGrid, setAttendanceGrid]       = useState({});
  // ── Custom subject support (persisted per school in localStorage) ─────────────
  // Initialise to [] then load from localStorage only after schoolId is confirmed
  // to prevent writing to a shared 'default' key during the auth-hydration gap.
  const [customSubjects, setCustomSubjects]   = useState([]);
  useEffect(() => {
    if (!user?.schoolId) return;
    try {
      const stored = JSON.parse(localStorage.getItem(`custom_subjects_${user.schoolId}`) || '[]');
      setCustomSubjects(stored);
    } catch { /* ignore corrupt entries */ }
  }, [user?.schoolId]);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  // ── Edit marks state ─────────────────────────────────────────────────────────
  const [editingMark, setEditingMark]         = useState(null);
  const [editSubject, setEditSubject]         = useState('');
  const [editExamType, setEditExamType]       = useState('');
  const [editExamDate, setEditExamDate]       = useState('');
  const [editMarks, setEditMarks]             = useState('');
  const [editMaxMarks, setEditMaxMarks]       = useState('');
  const [editSubjectCustomInput, setEditSubjectCustomInput] = useState('');
  const [editShowAddSubject, setEditShowAddSubject]         = useState(false);
  const [editSaving, setEditSaving]           = useState(false);

  // ── CSV Import state ────────────────────────────────────────────────────────
  const [showCsvModal,  setShowCsvModal]  = useState(false);
  const [csvExamType,   setCsvExamType]   = useState('');
  const [csvDate,       setCsvDate]       = useState('');
  const [csvRows,       setCsvRows]       = useState([]); // parsed rows
  const [csvErrors,     setCsvErrors]     = useState([]);
  const [csvImporting,  setCsvImporting]  = useState(false);
  const [csvResults,    setCsvResults]    = useState(null);
  const csvFileRef = useRef(null);

  const SAMPLE_CSV = `AdmissionNumber,StudentName,MaxMarks,Mathematics,Science,English
ADM001,Alice Johnson,100,85,78,90
ADM002,Bob Smith,100
ADM001,Science,78,100
ADM002,Mathematics,92,100`;

  const downloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'marks_import_sample.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Class teacher assignment ────────────────────────────────────────────────
  const [myClassAssignment, setMyClassAssignment] = useState(null); // { isClassTeacher, classId, className, section, label }

  useEffect(() => {
    if (user?.role !== 'TEACHER') return;
    teacherAPI.getClassTeacherAssignment()
      .then(res => setMyClassAssignment(res.data?.data ?? null))
      .catch(() => {});
  }, [user?.role]);

  const isClassTeacher = myClassAssignment?.isClassTeacher === true;

  // Opens the Bulk Entry modal pre-set to the class teacher's assigned class.
  // The Bulk Entry modal has a "Download Template" button that generates the
  // correct dynamic Excel format — the old separate draft-CSV modal is removed.
  const openBulkEntryForClass = () => {
    if (!myClassAssignment?.classId) { showToast('No class assigned to you as class teacher', 'error'); return; }
    const clsId = String(myClassAssignment.classId);
    const initialSubject = allSubjects[0] || SUBJECTS[0];
    setBulkClassId(clsId);
    setBulkExamType(examTypes[0] || '');
    setBulkDate('');
    setBulkSubjects([initialSubject]);
    setSubjectMaxMarks({ [initialSubject]: '100' });
    setNewSubjectInput('');
    setGrid({});
    setSubjectMode({});
    setIeInternalMax({});
    setIeExternalMax({});
    setIeGrid({});
    setTotalWorkingDays('');
    setAttendanceGrid({});
    setShowModal(true);
  };

  const parseCsvFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let content = e.target.result;
        // Strip UTF-8 BOM (added by Excel when saving as CSV — causes admIdx to be -1)
        if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          setCsvErrors(['CSV file is empty or has no data rows.']);
          setCsvRows([]); setCsvResults(null); return;
        }

        // Strip BOM from individual header chars as fallback, then lowercase
        // Strip BOM from individual headers too (some tools emit one per cell)
        const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^﻿/, ''));

        // normalize(h): strip ALL non-alphanumeric chars, lowercase.
        // "Admission Number", "AdmissionNumber", "admission_number", "admissionnumber"
        // all normalize to "admissionnumber" — so any header variant works.
        const normalize = h => h.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

        // normIdx: normalized key → column index
        const normIdx = {};
        rawHeaders.forEach((h, i) => { normIdx[normalize(h)] = i; });

        const rows   = [];
        const errors = [];

        // ── Look up fixed columns ──────────────────────────────────────────────
        const admIdx = normIdx['admissionnumber'] ?? normIdx['admno'] ?? -1;
        if (admIdx === -1) {
          setCsvErrors([
            `"Admission Number" column not found.`,
            `Headers detected: ${rawHeaders.join(', ')}`,
            `Tip: Download a fresh template from the Bulk Entry modal and use it directly.`,
          ]);
          setCsvRows([]); setCsvResults(null); return;
        }
        const wdIdx  = normIdx['totalworkingdays'] ?? -1;
        const pdIdx  = normIdx['presentdays']      ?? -1;

        // ── Detect format ──────────────────────────────────────────────────────
        // New format: has per-subject "{Sub} Max Marks" / "{Sub} Marks" columns
        //   (generated by downloadBulkEntryTemplate).
        // Old wide format: has a shared "MaxMarks" column followed by bare subject names.
        // Old narrow format: has a "subject" column.
        const hasSubjectCol  = normIdx['subject']   !== undefined;
        const legacyMaxIdx   = normIdx['maxmarks']  ?? normIdx['maxmarks'] ?? -1;

        // Detect new-format subject columns via suffix matching.
        // Process suffixes longest-first so "internal max marks" wins over "max marks".
        // Each entry carries `orig`: the human-readable suffix string (with spaces) so we
        // can slice the subject name from the ORIGINAL header using the original suffix length
        // instead of the normalized length — which caused "Mathematics In" instead of "Mathematics".
        const SUFFIXES = [
          { s: 'internalmaxmarks', orig: 'Internal Max Marks', field: 'intMaxIdx',  isIE: true  },
          { s: 'externalmaxmarks', orig: 'External Max Marks', field: 'extMaxIdx',  isIE: true  },
          { s: 'totalmaxmarks',    orig: 'Total Max Marks',    field: 'totMaxIdx',  isIE: true  },
          { s: 'maxmarks',         orig: 'Max Marks',          field: 'maxIdx',     isIE: false },
          { s: 'internalmarks',    orig: 'Internal Marks',     field: 'intIdx',     isIE: true  },
          { s: 'externalmarks',    orig: 'External Marks',     field: 'extIdx',     isIE: true  },
          { s: 'totalmarks',       orig: 'Total Marks',        field: 'totIdx',     isIE: true  },
          { s: 'marks',            orig: 'Marks',              field: 'marksIdx',   isIE: false },
        ];
        // subjects: { normalizedName → { name, isIE, intMaxIdx, intIdx, extMaxIdx, extIdx, totMaxIdx, totIdx, maxIdx, marksIdx } }
        const subjects = {};

        rawHeaders.forEach((h, idx) => {
          const hn = normalize(h);
          for (const { s, orig, field, isIE } of SUFFIXES) {
            if (hn.endsWith(s) && hn.length > s.length) {
              const subNorm = hn.slice(0, hn.length - s.length);
              if (!subNorm) break;
              if (!subjects[subNorm]) {
                // Extract proper-cased subject name using the ORIGINAL (spaced) suffix string.
                // e.g. "Mathematics Internal Max Marks".lastIndexOf("Internal Max Marks") = 13
                //      → slice(0, 13).trim() = "Mathematics"   ✓
                // Wrong old approach: h.trim().length - s.length (normalized) = 30 - 16 = 14
                //      → slice(0, 14).trim() = "Mathematics In"  ✗
                const origH   = h.trim();
                const sfxPos  = origH.toLowerCase().lastIndexOf(orig.toLowerCase());
                const origSub = sfxPos >= 0
                  ? origH.slice(0, sfxPos).trim()
                  : subNorm.charAt(0).toUpperCase() + subNorm.slice(1);
                subjects[subNorm] = { name: origSub, isIE: false };
              }
              if (isIE) subjects[subNorm].isIE = true;
              subjects[subNorm][field] = idx;
              break; // longest-match wins
            }
          }
        });

        const isNewFormat = Object.keys(subjects).length > 0;

        // Auto-fill exam type from CSV if the column exists and the form is still empty
        const etColIdx = normIdx['examtype'] ?? -1;
        if (etColIdx >= 0 && lines.length > 1) {
          const firstVals = lines[1].split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
          const csvEt = etColIdx < firstVals.length ? firstVals[etColIdx] : '';
          if (csvEt) setCsvExamType(csvEt);
        }

        // ── Parse each data row ────────────────────────────────────────────────
        for (let i = 1; i < lines.length; i++) {
          // RFC 4180: quoted fields may contain commas; split naively handles simple CSVs,
          // but our template values never contain commas, so this is safe.
          const vals   = lines[i].split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
          const admNum = vals[admIdx] || '';
          if (!admNum) { errors.push(`Row ${i + 1}: missing admission number — skipped`); continue; }

          const totalWd = wdIdx >= 0 ? (vals[wdIdx] || '') : '';
          const presDay = pdIdx >= 0 ? (vals[pdIdx] || '') : '';

          if (isNewFormat) {
            // ── New format: per-subject columns ──────────────────────────────
            let rowHadMarks = false;
            Object.values(subjects).forEach(sub => {
              if (sub.isIE) {
                const intMax = sub.intMaxIdx !== undefined ? (vals[sub.intMaxIdx] || '') : '';
                const intObt = sub.intIdx    !== undefined ? (vals[sub.intIdx]    || '') : '';
                const extMax = sub.extMaxIdx !== undefined ? (vals[sub.extMaxIdx] || '') : '';
                const extObt = sub.extIdx    !== undefined ? (vals[sub.extIdx]    || '') : '';
                const totMax = sub.totMaxIdx !== undefined ? (vals[sub.totMaxIdx] || '') : '';
                const totObt = sub.totIdx    !== undefined ? (vals[sub.totIdx]    || '') : '';
                if (!intObt && !extObt && !totObt) return; // all blank → skip
                const computedTotal = (parseFloat(intObt)||0) + (parseFloat(extObt)||0);
                const computedMax   = (parseFloat(intMax)||0) + (parseFloat(extMax)||0);
                rowHadMarks = true;
                rows.push({
                  admissionNumber:      admNum,
                  subject:              sub.name,
                  marks:                totObt || String(computedTotal),
                  maxMarks:             totMax || String(computedMax) || '100',
                  marksType:            'INTERNAL_EXTERNAL',
                  internalMaxMarks:     intMax,
                  internalMarksObtained:intObt,
                  externalMaxMarks:     extMax,
                  externalMarksObtained:extObt,
                  presentDays:          presDay,
                  totalWorkingDays:     totalWd,
                });
              } else {
                const maxStr   = sub.maxIdx   !== undefined ? (vals[sub.maxIdx]   || '') : '';
                const marksStr = sub.marksIdx !== undefined ? (vals[sub.marksIdx] || '') : '';
                if (!marksStr) return; // blank → skip
                rowHadMarks = true;
                rows.push({
                  admissionNumber:  admNum,
                  subject:          sub.name,
                  marks:            marksStr,
                  maxMarks:         maxStr || '100',
                  marksType:        'NORMAL',
                  presentDays:      presDay,
                  totalWorkingDays: totalWd,
                });
              }
            });
            if (!rowHadMarks) errors.push(`Row ${i + 1}: no marks entered — skipped`);

          } else if (!hasSubjectCol && legacyMaxIdx >= 0) {
            // ── Legacy wide format: AdmissionNumber, StudentName, MaxMarks, Sub1, Sub2 ───
            const maxStr        = vals[legacyMaxIdx] || '100';
            const subjectCols   = rawHeaders.slice(legacyMaxIdx + 1);
            let rowHadMarks = false;
            subjectCols.forEach((sub, si) => {
              const marksStr = vals[legacyMaxIdx + 1 + si] || '';
              if (!marksStr) return;
              rowHadMarks = true;
              rows.push({ admissionNumber: admNum, subject: sub.trim(), marks: marksStr, maxMarks: maxStr, marksType: 'NORMAL' });
            });
            if (!rowHadMarks) errors.push(`Row ${i + 1}: no marks entered — skipped`);

          } else if (hasSubjectCol) {
            // ── Legacy narrow format: one row = one subject record ──────────────
            const row = {};
            rawHeaders.forEach((h, idx) => { row[normalize(h)] = vals[idx] || ''; });
            const r = {
              admissionNumber:  admNum,
              subject:          row['subject'] || '',
              marks:            row['marks']   || '',
              maxMarks:         row['maxmarks'] || row['maxmarks'] || '100',
              marksType:        'NORMAL',
            };
            if (!r.subject) { errors.push(`Row ${i + 1}: missing subject`); continue; }
            if (!r.marks)   { errors.push(`Row ${i + 1}: missing marks`);   continue; }
            rows.push(r);
          }
        }

        if (rows.length === 0 && errors.length === 0)
          errors.push('No valid rows found. Check the CSV format and ensure marks are filled in.');

        setCsvRows(rows);
        setCsvErrors(errors);
        setCsvResults(null);
      } catch (err) {
        setCsvErrors([`Failed to parse CSV: ${err.message || 'Unknown error'}`]);
        setCsvRows([]); setCsvResults(null);
      }
    };
    reader.onerror = () => {
      setCsvErrors(['Failed to read the file. Please try again.']);
      setCsvRows([]); setCsvResults(null);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!csvRows.length) return;
    if (!csvExamType.trim()) { showToast('Please enter an exam type', 'error'); return; }
    setCsvImporting(true);
    try {
      const res = await reportCardAPI.bulkImportMarksCsv({ rows: csvRows, examType: csvExamType.trim(), examDate: csvDate || null });
      const importResult = res.data?.data;
      setCsvResults(importResult);
      setCsvRows([]);
      const saved = importResult?.saved || 0;
      showToast(`${saved} of ${importResult?.total || 0} marks imported successfully`);
      if (saved > 0) {
        // Set filters so imported marks are immediately visible in the table
        setFilterExam(csvExamType.trim());
        if (myClassAssignment?.classId) setFilterClassId(String(myClassAssignment.classId));
        await loadAllData(classes);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Import failed', 'error');
    } finally { setCsvImporting(false); }
  };


  // ── Load teacher's classes on mount ───────────────────────────────────────────
  useEffect(() => {
    teacherAPI.getMyClasses(user.id)
      .then(r => {
        const cls = r?.data?.data ?? r?.data ?? [];
        setClasses(Array.isArray(cls) ? cls.slice().sort(sortClasses) : []);
      })
      .catch(() => showToast('Failed to load classes', 'error'))
      .finally(() => setLoading(false));
  }, [user.id, showToast]);

  // ── Load all students + marks ─────────────────────────────────────────────────
  const loadAllData = useCallback(async (classList) => {
    if (!classList.length) return;
    setLoadingMarks(true);
    try {
      // Load students per class (small number of classes, parallel is fine)
      const studentArrays = await Promise.all(
        classList.map(cls =>
          teacherAPI.getClassStudents(cls.id)
            .then(r => (r?.data?.data ?? r?.data ?? []).map(s => ({
              ...s,
              classId:    cls.id,
              classLabel: cls.section ? `${cls.name}-${cls.section}` : cls.name,
            })))
            .catch(() => [])
        )
      );
      const allStudents = studentArrays.flat();
      setStudents(allStudents);

      // One bulk request per class instead of one per student (eliminates N+1)
      const studentMap = Object.fromEntries(allStudents.map(s => [s.id, s]));
      const marksArrays = await Promise.all(
        classList.map(cls =>
          teacherAPI.getMarksByClass(cls.id)
            .then(r => (r?.data?.data ?? r?.data ?? []).map(m => {
              const s = studentMap[m.studentId] || {};
              return {
                ...m,
                studentName: m.studentName || s.name || '',
                rollNumber:  m.rollNumber  || s.rollNumber || '',
                classLabel:  s.classLabel  || (cls.section ? `${cls.name}-${cls.section}` : cls.name),
                classId:     s.classId     || cls.id,
              };
            }))
            .catch(() => [])
        )
      );
      setAllMarks(marksArrays.flat());
    } catch {
      showToast('Failed to load data', 'error');
    } finally {
      setLoadingMarks(false);
    }
  }, [showToast]);

  useEffect(() => { if (classes.length) loadAllData(classes); }, [classes, loadAllData]);

  // ── Load students for bulk modal when class changes ───────────────────────────
  useEffect(() => {
    if (!bulkClassId) { setBulkStudents([]); setGrid({}); setAttendanceGrid({}); return; }
    const cls = classes.find(c => String(c.id) === bulkClassId);
    setLoadingBulkStudents(true);
    teacherAPI.getClassStudents(Number(bulkClassId))
      .then(r => {
        const studs = (r?.data?.data ?? r?.data ?? []).map(s => ({
          ...s,
          classLabel: cls ? (cls.section ? `${cls.name}-${cls.section}` : cls.name) : '',
        }));
        setBulkStudents(studs);
        const g = {};
        studs.forEach(s => { g[s.id] = {}; });
        setGrid(g);
        const ie = {};
        studs.forEach(s => { ie[s.id] = {}; });
        setIeGrid(ie);
        const ag = {};
        studs.forEach(s => { ag[s.id] = ''; });
        setAttendanceGrid(ag);
      })
      .catch(() => showToast('Failed to load students', 'error'))
      .finally(() => setLoadingBulkStudents(false));
  }, [bulkClassId, classes]);

  // ── Load existing attendance when class + examType both set ──────────────────
  useEffect(() => {
    if (!bulkClassId || !bulkExamType) return;
    const cls = classes.find(c => String(c.id) === bulkClassId);
    if (!cls) return;
    const params = { className: cls.name, section: cls.section || '', examType: bulkExamType };
    teacherAPI.getReportAttendance(params)
      .then(r => {
        const data = r?.data?.data;
        if (!data) return;
        if (data.totalWorkingDays > 0) setTotalWorkingDays(String(data.totalWorkingDays));
        if (data.students?.length > 0) {
          setAttendanceGrid(prev => {
            const next = { ...prev };
            data.students.forEach(s => { next[s.studentId] = String(s.presentDays); });
            return next;
          });
        }
      })
      .catch(() => {});
  }, [bulkClassId, bulkExamType, classes]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const allSubjects = [...SUBJECTS, ...customSubjects.filter(s => !SUBJECTS.includes(s))];

  const persistCustomSubjects = (list) => {
    if (!user?.schoolId) return; // never write to the shared 'default' key
    try { localStorage.setItem(`custom_subjects_${user.schoolId}`, JSON.stringify(list)); } catch {}
  };

  const toggleSubject = (sub) => {
    setBulkSubjects(prev => {
      if (prev.includes(sub)) return prev.filter(s => s !== sub);
      // Ensure subjectMaxMarks has an entry for this subject
      setSubjectMaxMarks(sm => sm[sub] !== undefined ? sm : { ...sm, [sub]: '100' });
      return [...prev, sub];
    });
  };

  const addCustomSubject = () => {
    const trimmed = newSubjectInput.trim();
    if (!trimmed) return;
    const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (allSubjects.some(s => s.toLowerCase() === normalized.toLowerCase())) {
      if (!bulkSubjects.includes(normalized)) {
        setBulkSubjects(prev => [...prev, normalized]);
        setSubjectMaxMarks(sm => sm[normalized] !== undefined ? sm : { ...sm, [normalized]: '100' });
      }
    } else {
      const next = [...customSubjects, normalized];
      setCustomSubjects(next);
      persistCustomSubjects(next);
      setBulkSubjects(prev => [...prev, normalized]);
      setSubjectMaxMarks(sm => ({ ...sm, [normalized]: '100' }));
    }
    setNewSubjectInput('');
  };

  // ── Edit marks handlers ───────────────────────────────────────────────────────
  const openEdit = (m) => {
    setEditingMark(m);
    setEditSubject(m.subject);
    setEditExamType(m.examType || '');
    setEditExamDate(m.examDate ? m.examDate.toString().slice(0, 10) : '');
    setEditMarks(String(m.marks));
    setEditMaxMarks(String(m.maxMarks));
    setEditSubjectCustomInput('');
    setEditShowAddSubject(false);
  };

  const saveEdit = async () => {
    if (!editingMark) return;
    const subjectTrimmed = editSubject.trim();
    const examTypeFinal  = editExamType.trim() || editingMark.examType;
    const marksNum       = parseFloat(editMarks);
    const maxNum         = parseFloat(editMaxMarks);
    if (!subjectTrimmed)                            { showToast('Enter a subject name',  'error'); return; }
    if (!examTypeFinal)                             { showToast('Enter an exam type',    'error'); return; }
    if (isNaN(marksNum) || marksNum < 0)            { showToast('Enter valid marks',     'error'); return; }
    if (isNaN(maxNum)   || maxNum   <= 0)            { showToast('Enter valid max marks', 'error'); return; }
    if (marksNum > maxNum)                           { showToast('Marks exceed max marks','error'); return; }
    // Duplicate check: same student + same subject + new examType (excluding this record)
    const duplicate = allMarks.find(m =>
      m.id !== editingMark.id &&
      String(m.studentId) === String(editingMark.studentId) &&
      m.examType === examTypeFinal &&
      m.subject.toLowerCase() === subjectTrimmed.toLowerCase()
    );
    if (duplicate) { showToast(`${subjectTrimmed} already recorded for ${examTypeFinal}`, 'error'); return; }

    // Persist brand-new custom subjects for future use
    if (!allSubjects.some(s => s.toLowerCase() === subjectTrimmed.toLowerCase())) {
      const next = [...customSubjects, subjectTrimmed];
      setCustomSubjects(next);
      persistCustomSubjects(next);
    }

    setEditSaving(true);
    try {
      const computedGrade = getGrade(marksNum, maxNum);
      const payload = {
        subject:  subjectTrimmed,
        examType: examTypeFinal,
        examDate: editExamDate || editingMark.examDate || null,
        marks:    marksNum,
        maxMarks: maxNum,
        grade:    computedGrade,
      };
      const res = await teacherAPI.updateMarks(editingMark.id, payload);
      const updated = res?.data?.data;
      if (updated) {
        setAllMarks(prev => prev.map(m => m.id === editingMark.id ? {
          ...m,
          subject:  updated.subject  ?? subjectTrimmed,
          examType: updated.examType ?? examTypeFinal,
          examDate: updated.examDate ?? editExamDate ?? editingMark.examDate,
          marks:    updated.marks,
          maxMarks: updated.maxMarks,
          grade:    updated.grade    ?? computedGrade,
        } : m));
        showToast('Marks updated');
      }
      setEditingMark(null);
    } catch { showToast('Failed to update marks', 'error'); }
    finally   { setEditSaving(false); }
  };

  const updateCell = (studentId, subject, value) =>
    setGrid(prev => ({ ...prev, [studentId]: { ...prev[studentId], [subject]: value } }));

  const updateIeCell = (studentId, subject, field, value) =>
    setIeGrid(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subject]: { ...(prev[studentId]?.[subject] || {}), [field]: value },
      },
    }));

  // ── Filtered marks list ───────────────────────────────────────────────────────
  const filtered = allMarks.filter(m => {
    const matchClass = !filterClassId || String(m.classId) === String(filterClassId);
    const matchExam  = !filterExam    || m.examType === filterExam;
    return matchClass && matchExam;
  });

  const avgPct = filtered.length > 0
    ? Math.round(filtered.reduce((a, m) => a + (m.marks / m.maxMarks) * 100, 0) / filtered.length)
    : 0;

  // ── Open modal ────────────────────────────────────────────────────────────────
  const openModal = () => {
    const initialSubject = allSubjects[0] || SUBJECTS[0];
    setBulkClassId(filterClassId || (classes[0] ? String(classes[0].id) : ''));
    setBulkExamType(examTypes[0] || '');
    setBulkDate('');
    setBulkSubjects([initialSubject]);
    setSubjectMaxMarks({ [initialSubject]: '100' });
    setNewSubjectInput('');
    setGrid({});
    setSubjectMode({});
    setIeInternalMax({});
    setIeExternalMax({});
    setIeGrid({});
    setTotalWorkingDays('');
    setAttendanceGrid({});
    setShowModal(true);
  };

  // ── Save all marks ────────────────────────────────────────────────────────────
  const handleBulkSave = async () => {
    if (!bulkClassId) { showToast('Select a class', 'error'); return; }
    if (bulkSubjects.length === 0) { showToast('Select at least one subject', 'error'); return; }
    // Validate per-subject max marks
    for (const sub of bulkSubjects) {
      const mx = parseFloat(subjectMaxMarks[sub] || '');
      if (isNaN(mx) || mx <= 0) { showToast(`Enter valid max marks for ${sub}`, 'error'); return; }
    }

    const date = bulkDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const cls  = classes.find(c => String(c.id) === bulkClassId);

    const entries = [];
    for (const student of bulkStudents) {
      for (const subject of bulkSubjects) {
        const isIE = subjectMode[subject] === 'IE';

        if (isIE) {
          const ie     = ieGrid[student.id]?.[subject] || {};
          const intVal = ie.int !== undefined && ie.int !== '' ? parseFloat(ie.int) : null;
          const extVal = ie.ext !== undefined && ie.ext !== '' ? parseFloat(ie.ext) : null;
          if (intVal === null && extVal === null) continue;  // nothing entered
          const intMax = parseFloat(ieInternalMax[subject] || '0');
          const extMax = parseFloat(ieExternalMax[subject] || '0');
          const intObt = intVal !== null && !isNaN(intVal) ? Math.max(0, Math.min(intVal, intMax)) : 0;
          const extObt = extVal !== null && !isNaN(extVal) ? Math.max(0, Math.min(extVal, extMax)) : 0;
          const total  = intObt + extObt;
          const maxTot = intMax + extMax;
          if (maxTot <= 0) continue;
          entries.push({
            studentId:              student.id,
            studentName:            student.name,
            subject,
            examType:               bulkExamType,
            marks:                  total,
            maxMarks:               maxTot,
            grade:                  getGrade(total, maxTot),
            teacherId:              user.id,
            examDate:               date,
            marksType:              'INTERNAL_EXTERNAL',
            internalMaxMarks:       intMax,
            internalMarksObtained:  intObt,
            externalMaxMarks:       extMax,
            externalMarksObtained:  extObt,
          });
        } else {
          const val    = grid[student.id]?.[subject];
          if (val === undefined || val === '') continue;
          const marksNum = parseFloat(val);
          const maxNum   = parseFloat(subjectMaxMarks[subject] || '100');
          if (isNaN(marksNum) || marksNum < 0 || marksNum > maxNum) continue;
          entries.push({
            studentId:   student.id,
            studentName: student.name,
            subject,
            examType:    bulkExamType,
            marks:       marksNum,
            maxMarks:    maxNum,
            grade:       getGrade(marksNum, maxNum),
            teacherId:   user.id,
            examDate:    date,
            marksType:   'NORMAL',
          });
        }
      }
    }

    if (entries.length === 0) { showToast('No marks entered', 'error'); return; }

    // Validate attendance
    const wdNum = parseFloat(totalWorkingDays);
    const hasWorkingDays = !isNaN(wdNum) && wdNum > 0;
    if (hasWorkingDays) {
      for (const student of bulkStudents) {
        const pd = attendanceGrid[student.id];
        if (pd !== '' && pd !== undefined) {
          const pdNum = parseFloat(pd);
          if (!isNaN(pdNum) && pdNum > wdNum) {
            showToast(`Present days for ${student.name} cannot exceed total working days (${wdNum})`, 'error');
            return;
          }
        }
      }
    }

    setSaving(true);
    try {
      const results = await Promise.all(entries.map(e => teacherAPI.addMarks(e)));
      const classLabel = cls ? (cls.section ? `${cls.name}-${cls.section}` : cls.name) : '';
      const saved = results
        .map((r, i) => {
          const data = r?.data?.data ?? r?.data;
          if (!data) return null;
          const student = bulkStudents.find(s => s.id === entries[i].studentId);
          return {
            ...data,
            studentName: student?.name || data.studentName,
            rollNumber:  student?.rollNumber || '',
            classLabel,
            classId:     Number(bulkClassId),
          };
        })
        .filter(Boolean);

      // Save attendance if working days were entered
      if (hasWorkingDays) {
        const attendanceStudents = bulkStudents
          .map(s => {
            const pd = parseFloat(attendanceGrid[s.id]);
            return { studentId: s.id, presentDays: isNaN(pd) ? 0 : Math.max(0, Math.min(pd, wdNum)) };
          });
        try {
          await teacherAPI.saveReportAttendance({
            className:        cls?.name || '',
            section:          cls?.section || '',
            examType:         bulkExamType,
            academicYear:     '',
            totalWorkingDays: wdNum,
            students:         attendanceStudents,
          });
        } catch {
          showToast('Marks saved, but attendance (working/present days) failed to save. Please re-open and save again.', 'error');
        }
      }

      setAllMarks(prev => [...prev, ...saved]);
      showToast(`${saved.length} record${saved.length !== 1 ? 's' : ''} saved successfully`);
      setShowModal(false);
    } catch {
      showToast('Failed to save some marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Download dynamic marks template (Excel) ──────────────────────────────────
  // Generates an Excel file using the current Bulk Entry modal selections:
  //   - student list pre-filled from bulkStudents
  //   - columns vary per subject based on NORMAL vs IE mode
  //   - max marks pre-filled; marks/present-days left blank for teacher entry
  const downloadBulkEntryTemplate = () => {
    if (!bulkClassId)          { showToast('Please select a class before downloading the template.', 'error'); return; }
    if (!bulkSubjects.length)  { showToast('Please select at least one subject before downloading the template.', 'error'); return; }
    if (!bulkStudents.length)  { showToast('No students loaded. Please wait and try again.', 'error'); return; }

    const cls      = classes.find(c => String(c.id) === bulkClassId);
    const clsName  = cls?.name    || '';
    const section  = cls?.section || '';
    const examDate = bulkDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const wDays    = totalWorkingDays || '';

    // ── Build headers ─────────────────────────────────────────────────────────
    const headers = [
      'Student Name', 'Admission Number', 'Roll Number',
      'Class', 'Section', 'Exam Type', 'Exam Date',
      'Total Working Days', 'Present Days',
    ];
    bulkSubjects.forEach(sub => {
      if (subjectMode[sub] === 'IE') {
        const iMax = ieInternalMax[sub] || '';
        const eMax = ieExternalMax[sub] || '';
        const tMax = ((parseFloat(iMax)||0) + (parseFloat(eMax)||0)) || '';
        headers.push(
          `${sub} Internal Max Marks`,  `${sub} Internal Marks`,
          `${sub} External Max Marks`,  `${sub} External Marks`,
          `${sub} Total Max Marks`,     `${sub} Total Marks`,
        );
      } else {
        headers.push(`${sub} Max Marks`, `${sub} Marks`);
      }
    });

    // ── Build rows — one per student, marks/present-days blank ────────────────
    const rows = bulkStudents.map(s => {
      const row = [
        s.name || '', s.admissionNumber || '', s.rollNumber || '',
        clsName, section, bulkExamType || '', examDate,
        wDays, '',   // Present Days blank
      ];
      bulkSubjects.forEach(sub => {
        if (subjectMode[sub] === 'IE') {
          const iMax = ieInternalMax[sub] || '';
          const eMax = ieExternalMax[sub] || '';
          const tMax = ((parseFloat(iMax)||0) + (parseFloat(eMax)||0)) || '';
          row.push(iMax, '', eMax, '', String(tMax), '');
        } else {
          row.push(subjectMaxMarks[sub] || '100', '');
        }
      });
      return row;
    });

    // ── Build CSV string ──────────────────────────────────────────────────────
    // Escape a single cell value: wrap in quotes if it contains comma, quote, or newline
    const esc = v => {
      const s = String(v ?? '');
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csvLines = [
      headers.map(esc).join(','),
      ...rows.map(row => row.map(esc).join(',')),
    ];
    // UTF-8 BOM so Excel opens the file with correct encoding without conversion dialog
    const BOM = '﻿';
    const csvContent = BOM + csvLines.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const label = (clsName + (section ? `_${section}` : '')).replace(/\s+/g, '_');
    const exam  = (bulkExamType || 'marks').replace(/\s+/g, '_');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${label}_${exam}_marks_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV template downloaded. Fill in marks and Present Days, then import.', 'success');
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  // deleteTarget = { markIds: number[], studentName: string, subject: string, isGroup: bool }
  // null = no confirmation dialog open
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openDeleteConfirm = (markIds, studentName, subject, isGroup = false) =>
    setDeleteTarget({ markIds, studentName, subject, isGroup });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { markIds } = deleteTarget;
    setDeleteTarget(null);
    setDeleting(true);
    try {
      await Promise.all(markIds.map(id => teacherAPI.deleteMarks(id)));
      setAllMarks(prev => prev.filter(m => !markIds.includes(m.id)));
      showToast(
        `${markIds.length} mark record${markIds.length !== 1 ? 's' : ''} deleted`,
        'warning'
      );
    } catch {
      showToast('Failed to delete — please try again', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Count valid (filled and within max) cells ─────────────────────────────────
  const filledCount = bulkStudents.reduce((acc, s) =>
    acc + bulkSubjects.filter(sub => {
      const val = grid[s.id]?.[sub] ?? '';
      if (val === '') return false;
      const num = parseFloat(val);
      const max = parseFloat(subjectMaxMarks[sub] || '100');
      return !isNaN(num) && num >= 0 && num <= max;
    }).length, 0);

  // ── Expanded students in grouped view ────────────────────────────────────────
  const [expandedStudents, setExpandedStudents] = useState(new Set());
  const toggleStudent = (studentId) =>
    setExpandedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });

  // Group filtered marks by student
  const groupedByStudent = (() => {
    const map = new Map();
    for (const m of filtered) {
      const key = String(m.studentId);
      if (!map.has(key)) map.set(key, { studentId: key, studentName: m.studentName, rollNumber: m.rollNumber, classLabel: m.classLabel, classId: m.classId, rows: [] });
      map.get(key).rows.push(m);
    }
    return [...map.values()].sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
  })();

  // ── Loading / empty states ────────────────────────────────────────────────────
  if (loading) return (
    <Layout pageTitle="Marks">
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
        <span className="material-icons" style={{ fontSize: 48 }}>hourglass_empty</span>
        <p style={{ marginTop: 8 }}>Loading your classes...</p>
      </div>
    </Layout>
  );

  if (!classes.length) return (
    <Layout pageTitle="Marks">
      <div className="page-header"><h1>Marks &amp; Grades</h1></div>
      <div style={{ textAlign: 'center', padding: 80 }}>
        <span className="material-icons" style={{ fontSize: 56, color: 'var(--border-strong)' }}>school</span>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 12 }}>No classes assigned</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Contact admin to get assigned to a class.</div>
      </div>
    </Layout>
  );

  return (
    <Layout pageTitle="Marks">
      {gradeScaleWarning && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e' }}>
          <span className="material-icons" style={{ fontSize: 18, color: '#d97706' }}>warning</span>
          <span>Custom grade scale not found — using default grading scale. Ask your admin to configure a grade scale for accurate grades.</span>
          <button onClick={() => setGradeScaleWarning(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
      )}

      <div className="page-header">
        <h1>Marks &amp; Grades</h1>
        <p>Record and manage student marks for your assigned classes</p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Records', value: allMarks.length, icon: 'grade', color: '#0de1e8' },
          { label: 'Avg Score',     value: avgPct + '%',    icon: 'bar_chart', color: '#3182ce' },
          { label: 'O / A+',        value: allMarks.filter(m => m.grade === 'O' || m.grade === 'A+').length, icon: 'star', color: '#ed8936' },
          { label: 'Failing',       value: allMarks.filter(m => m.grade === 'F').length, icon: 'warning', color: '#e53e3e' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: c.color + '15' }}>
              <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Marks table ── */}
      <div className="data-table-card">
        <div className="search-filter-bar">
          <select className="filter-select" value={filterClassId} onChange={e => setFilterClassId(e.target.value)}>
            <option value="">All My Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.section ? `${cls.name}-${cls.section}` : cls.name}</option>
            ))}
          </select>
          <select className="filter-select" value={filterExam} onChange={e => setFilterExam(e.target.value)}>
            <option value="">All Exams</option>
            {examTypes.map(et => <option key={et} value={et}>{et}</option>)}
          </select>
          {isClassTeacher && myClassAssignment?.classId && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 12, color: '#16a34a', fontWeight: 600, marginRight: 6 }}>
                <span className="material-icons" style={{ fontSize: 14 }}>class</span>
                {myClassAssignment.label}
              </div>
              <button onClick={openBulkEntryForClass}
                title="Open Bulk Entry for your class — then use the green Download Template button"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, color: '#2563eb', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginRight: 4 }}>
                <span className="material-icons" style={{ fontSize: 16 }}>download</span> Download Template
              </button>
              <button onClick={() => { setShowCsvModal(true); setCsvRows([]); setCsvErrors([]); setCsvResults(null); setCsvExamType(''); setCsvDate(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 8, color: '#16a34a', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginRight: 6 }}>
                <span className="material-icons" style={{ fontSize: 16 }}>upload_file</span> Import CSV
              </button>
            </>
          )}
          <Button variant="add" onClick={openModal}>
            <span className="material-icons">add</span> Add Marks
          </Button>
        </div>

        {loadingMarks ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <span className="material-icons" style={{ fontSize: 40 }}>hourglass_empty</span>
            <p style={{ marginTop: 8 }}>Loading marks...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <span className="material-icons" style={{ fontSize: 48, color: 'var(--border-strong)' }}>grade</span>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 12 }}>No marks records yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Click "Add Marks" to record student performance.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Subjects</th>
                  <th>Avg Score</th>
                  <th>Overall Grade</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedByStudent.map((group, idx) => {
                  const isExpanded   = expandedStudents.has(group.studentId);
                  const totalObt     = group.rows.reduce((a, m) => a + Number(m.marks),    0);
                  const totalMax     = group.rows.reduce((a, m) => a + Number(m.maxMarks), 0);
                  const avgPctGroup  = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
                  const overallGrade = getGrade(avgPctGroup, 100);
                  return (
                    <React.Fragment key={group.studentId}>
                      {/* ── Summary row ── */}
                      <tr style={{ background: isExpanded ? '#f0fdf4' : undefined }}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                        <td>
                          <div className="student-cell">
                            <div className="student-avatar-sm">{getInitials(group.studentName)}</div>
                            <div>
                              <div className="student-name">{group.studentName || '—'}</div>
                              <div className="student-class">{group.rollNumber}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 600 }}>{group.classLabel || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {[...new Set(group.rows.map(r => r.subject))].map(sub => (
                              <span key={sub} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#4361ee15', color: '#4361ee' }}>{sub}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 54 }}>
                              <div className="progress-bar-custom">
                                <div className="progress-fill" style={{ width: `${avgPctGroup}%`, background: avgPctGroup >= 80 ? '#0de1e8' : avgPctGroup >= 60 ? '#3182ce' : avgPctGroup >= 50 ? '#ed8936' : '#e53e3e' }} />
                              </div>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{avgPctGroup}%</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: getGradeColor(overallGrade, gradeScale).bg, color: getGradeColor(overallGrade, gradeScale).color }}>
                            {overallGrade}
                          </span>
                        </td>
                        <td>
                          <div className="action-btns">
                            <button
                              title={isExpanded ? 'Hide subject marks' : 'View subject marks'}
                              onClick={() => toggleStudent(group.studentId)}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', background: isExpanded ? '#0de1e820' : '#4361ee15', cursor: 'pointer' }}
                            >
                              <span className="material-icons" style={{ fontSize: 18, color: isExpanded ? '#0de1e8' : '#4361ee' }}>
                                {isExpanded ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>
                            {/* Delete All — one-click delete all subjects for this student (admin only) */}
                            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                              <button
                                title="Delete all subject marks for this student"
                                onClick={() => openDeleteConfirm(
                                  group.rows.map(r => r.id),
                                  group.studentName,
                                  `all ${group.rows.length} subject${group.rows.length !== 1 ? 's' : ''}`,
                                  true
                                )}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', background: '#fff5f5', cursor: 'pointer' }}
                              >
                                <span className="material-icons" style={{ fontSize: 16, color: '#e53e3e' }}>delete_sweep</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded subject rows ── */}
                      {isExpanded && group.rows.map((m, rIdx) => {
                        const pct = Math.round((m.marks / m.maxMarks) * 100);
                        return (
                          <tr key={m.id} style={{ background: rIdx % 2 === 0 ? '#fafffe' : '#f0fdf4' }}>
                            <td style={{ color: 'var(--text-muted)', fontSize: 11, paddingLeft: 32 }}>{rIdx + 1}</td>
                            <td style={{ paddingLeft: 32 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="material-icons" style={{ fontSize: 14, color: 'var(--text-muted)' }}>subdirectory_arrow_right</span>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{m.subject}</span>
                              </div>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.examType}</td>
                            <td style={{ fontWeight: 700, fontSize: 13 }}>{m.marks}/{m.maxMarks}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 54 }}>
                                  <div className="progress-bar-custom">
                                    <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 80 ? '#0de1e8' : pct >= 60 ? '#3182ce' : pct >= 50 ? '#ed8936' : '#e53e3e' }} />
                                  </div>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: getGradeColor(m.grade, gradeScale).bg, color: getGradeColor(m.grade, gradeScale).color }}>
                                {m.grade}
                              </span>
                            </td>
                            <td>
                              <div className="action-btns">
                                <button title="Edit marks" onClick={() => openEdit(m)}
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', background: '#eff6ff', cursor: 'pointer' }}>
                                  <span className="material-icons" style={{ fontSize: 16, color: '#2563eb' }}>edit</span>
                                </button>
                                <Button variant="delete"
                                  onClick={() => openDeleteConfirm([m.id], group.studentName, m.subject, false)} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          BULK MARKS ENTRY MODAL
          ══════════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => !saving && setShowModal(false)}
        >
          <div
            className="modal-card" style={{ background: 'var(--surface)', borderRadius: 16, width: '96vw', maxWidth: 1200, maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.20)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >

            {/* ── Modal header ── */}
            <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--border-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--surface)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Add Marks — Bulk Entry</h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                  Select class, subjects &amp; enter marks for multiple students at once
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'var(--surface-alt)', borderRadius: 8, cursor: 'pointer', padding: '6px 8px', display: 'flex' }}>
                <span className="material-icons" style={{ fontSize: 20, color: 'var(--text-secondary)' }}>close</span>
              </button>
            </div>

            {/* ── Config row ── */}
            <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--border-strong)', background: 'var(--surface-alt)', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end', flexShrink: 0 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Class *</label>
                <select value={bulkClassId} onChange={e => setBulkClassId(e.target.value)} style={sel({ width: 150 })}>
                  <option value="">Select</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={String(cls.id)}>
                      {cls.section ? `${cls.name}-${cls.section}` : cls.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Exam Type *</label>
                <select value={bulkExamType} onChange={e => setBulkExamType(e.target.value)} style={sel({ width: 150 })}>
                  <option value="">Select exam…</option>
                  {examTypes.map(et => <option key={et} value={et}>{et}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Exam Date</label>
                <input type="date" value={bulkDate} onChange={e => setBulkDate(e.target.value)} style={sel({ width: 155 })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  Total Working Days
                </label>
                <input
                  type="number" min="1" placeholder="e.g. 220"
                  value={totalWorkingDays}
                  onChange={e => setTotalWorkingDays(e.target.value)}
                  style={sel({ width: 130 })}
                />
              </div>
            </div>

            {/* ── Subject selector ── */}
            <div style={{ padding: '12px 28px', borderBottom: '1px solid var(--border-strong)', background: 'var(--surface-alt)', flexShrink: 0 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                Select Subjects * &nbsp;
                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({bulkSubjects.length} selected)</span>
                &nbsp;
                <button type="button" onClick={() => {
                  setBulkSubjects([...allSubjects]);
                  setSubjectMaxMarks(prev => {
                    const next = { ...prev };
                    allSubjects.forEach(sub => { if (next[sub] === undefined) next[sub] = '100'; });
                    return next;
                  });
                }} style={{ fontSize: 10, color: '#4361ee', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Select All</button>
                &nbsp;·&nbsp;
                <button type="button" onClick={() => setBulkSubjects([])} style={{ fontSize: 10, color: '#e53e3e', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Clear</button>
              </label>
              {/* Subject chips — each selected chip shows its own max-marks input inline */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {allSubjects.map(sub => {
                  const checked  = bulkSubjects.includes(sub);
                  const isCustom = !SUBJECTS.includes(sub);
                  return (
                    <div key={sub} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      {/* Checkbox chip */}
                      <div
                        onClick={() => toggleSubject(sub)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                          border: `1.5px solid ${checked ? '#0de1e8' : isCustom ? '#d69e2e' : 'var(--border-strong)'}`,
                          background: checked ? '#f0fff4' : isCustom ? '#fffbeb' : 'var(--surface)',
                          fontSize: 12, fontWeight: checked ? 700 : 400,
                          color: checked ? '#276749' : isCustom ? '#b45309' : 'var(--text-secondary)',
                          userSelect: 'none', transition: 'all 0.15s',
                        }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSubject(sub)}
                          onClick={e => e.stopPropagation()}
                          style={{ accentColor: '#0de1e8', cursor: 'pointer', width: 13, height: 13 }} />
                        {sub}{isCustom && <span style={{ fontSize: 9, marginLeft: 2 }}>✦</span>}
                      </div>
                      {/* Per-subject config — only shown when checked */}
                      {checked && (() => {
                        const isIE = subjectMode[sub] === 'IE';
                        const intMax = ieInternalMax[sub] ?? '';
                        const extMax = ieExternalMax[sub] ?? '';
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            {!isIE && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <span style={{ fontSize: 10, color: '#6b7280' }}>out of</span>
                                <input
                                  type="number" min="1"
                                  value={subjectMaxMarks[sub] ?? '100'}
                                  onChange={e => setSubjectMaxMarks(prev => ({ ...prev, [sub]: e.target.value }))}
                                  style={{ width: 52, padding: '2px 5px', fontSize: 11, fontWeight: 700, border: '1.5px solid #0de1e8', borderRadius: 6, outline: 'none', textAlign: 'center', background: '#f0fff4', color: '#276749' }}
                                />
                              </div>
                            )}
                            {isIE && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <span style={{ fontSize: 9, color: '#7c3aed' }}>Int/</span>
                                  <input type="number" min="0" placeholder="20" value={intMax}
                                    onChange={e => {
                                      setIeInternalMax(prev => ({ ...prev, [sub]: e.target.value }));
                                      const total = (parseFloat(e.target.value)||0) + (parseFloat(extMax)||0);
                                      setSubjectMaxMarks(prev => ({ ...prev, [sub]: String(total) }));
                                    }}
                                    style={{ width: 40, padding: '2px 4px', fontSize: 11, fontWeight: 700, border: '1.5px solid #7c3aed', borderRadius: 5, outline: 'none', textAlign: 'center', background: '#f5f3ff', color: '#4c1d95' }}
                                  />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <span style={{ fontSize: 9, color: '#0369a1' }}>Ext/</span>
                                  <input type="number" min="1" placeholder="80" value={extMax}
                                    onChange={e => {
                                      setIeExternalMax(prev => ({ ...prev, [sub]: e.target.value }));
                                      const total = (parseFloat(intMax)||0) + (parseFloat(e.target.value)||0);
                                      setSubjectMaxMarks(prev => ({ ...prev, [sub]: String(total) }));
                                    }}
                                    style={{ width: 40, padding: '2px 4px', fontSize: 11, fontWeight: 700, border: '1.5px solid #0369a1', borderRadius: 5, outline: 'none', textAlign: 'center', background: '#eff6ff', color: '#1e3a5f' }}
                                  />
                                </div>
                                {(parseFloat(intMax)||0) + (parseFloat(extMax)||0) > 0 && (
                                  <span style={{ fontSize: 9, color: '#374151' }}>={((parseFloat(intMax)||0)+(parseFloat(extMax)||0))}</span>
                                )}
                              </div>
                            )}
                            {/* IE mode toggle */}
                            <button type="button"
                              onClick={() => {
                                const next = isIE ? 'NORMAL' : 'IE';
                                setSubjectMode(prev => ({ ...prev, [sub]: next }));
                                if (next === 'NORMAL') {
                                  setIeInternalMax(prev => { const n = { ...prev }; delete n[sub]; return n; });
                                  setIeExternalMax(prev => { const n = { ...prev }; delete n[sub]; return n; });
                                }
                              }}
                              style={{
                                padding: '2px 8px', fontSize: 9, fontWeight: 700, border: 'none', borderRadius: 10, cursor: 'pointer',
                                background: isIE ? '#7c3aed' : '#e5e7eb', color: isIE ? '#fff' : '#374151',
                              }}
                            >{isIE ? '✓ Int+Ext' : 'Int+Ext?'}</button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>

              {/* Add custom/new subject */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  value={newSubjectInput}
                  onChange={e => setNewSubjectInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSubject(); } }}
                  placeholder="Add custom subject (e.g. Sanskrit, Drawing)…"
                  style={{ flex: 1, padding: '6px 10px', border: '1.5px dashed #d69e2e', borderRadius: 7, fontSize: 12, outline: 'none', background: '#fffbeb' }}
                />
                <button type="button" onClick={addCustomSubject}
                  disabled={!newSubjectInput.trim()}
                  style={{ padding: '6px 14px', background: newSubjectInput.trim() ? '#b45309' : '#e2e8f0', color: newSubjectInput.trim() ? '#fff' : '#a0aec0', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: newSubjectInput.trim() ? 'pointer' : 'default' }}>
                  + Add
                </button>
              </div>
            </div>

            {/* ── Entry grid ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 16px' }}>
              {!bulkClassId ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <span className="material-icons" style={{ fontSize: 44 }}>class</span>
                  <p style={{ marginTop: 8 }}>Select a class above to see students</p>
                </div>
              ) : loadingBulkStudents ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <span className="material-icons" style={{ fontSize: 44 }}>hourglass_empty</span>
                  <p style={{ marginTop: 8 }}>Loading students...</p>
                </div>
              ) : bulkStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <span className="material-icons" style={{ fontSize: 44 }}>person_off</span>
                  <p style={{ marginTop: 8 }}>No students in this class</p>
                </div>
              ) : bulkSubjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <span className="material-icons" style={{ fontSize: 44 }}>subject</span>
                  <p style={{ marginTop: 8 }}>Select at least one subject above</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', marginTop: 14 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-alt)', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border-strong)', whiteSpace: 'nowrap', minWidth: 200, position: 'sticky', left: 0, background: 'var(--surface-alt)', zIndex: 2 }}>
                          Student
                        </th>
                        <th style={{ padding: '10px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border-strong)', whiteSpace: 'nowrap', minWidth: 110, background: '#ede9fe20' }}>
                          Present Days
                          <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 400, marginTop: 2, textTransform: 'none', letterSpacing: 0 }}>
                            {totalWorkingDays ? `out of ${totalWorkingDays}` : 'optional'}
                          </div>
                        </th>
                        {bulkSubjects.flatMap(sub => {
                          const isIE = subjectMode[sub] === 'IE';
                          const thBase = { padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border-strong)', whiteSpace: 'nowrap', minWidth: 90 };
                          if (isIE) {
                            const iMax = ieInternalMax[sub] || '?';
                            const eMax = ieExternalMax[sub] || '?';
                            return [
                              <th key={sub+'_int'} style={{ ...thBase, color: '#7c3aed', background: '#f5f3ff30' }}>
                                {sub}<br/><span style={{ fontWeight: 400, fontSize: 10, textTransform: 'none' }}>Internal /{iMax}</span>
                              </th>,
                              <th key={sub+'_ext'} style={{ ...thBase, color: '#0369a1', background: '#eff6ff30' }}>
                                {sub}<br/><span style={{ fontWeight: 400, fontSize: 10, textTransform: 'none' }}>External /{eMax}</span>
                              </th>,
                              <th key={sub+'_tot'} style={{ ...thBase, color: '#059669' }}>
                                {sub}<br/><span style={{ fontWeight: 400, fontSize: 10, textTransform: 'none' }}>Total /{(parseFloat(iMax)||0)+(parseFloat(eMax)||0) || '?'}</span>
                              </th>,
                            ];
                          }
                          return [
                            <th key={sub} style={{ ...thBase, color: 'var(--text-secondary)' }}>
                              {sub}
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2, textTransform: 'none', letterSpacing: 0 }}>out of {subjectMaxMarks[sub] || '100'}</div>
                            </th>
                          ];
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {bulkStudents.map((student, idx) => (
                        <tr key={student.id} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)' }}>
                          {/* Student name (sticky left) */}
                          <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', position: 'sticky', left: 0, background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#0de1e820', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#0de1e8', flexShrink: 0 }}>
                                {getInitials(student.name)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{student.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{student.rollNumber || student.admissionNumber || '—'}</div>
                              </div>
                            </div>
                          </td>

                          {/* Present Days input */}
                          {(() => {
                            const pd     = attendanceGrid[student.id] ?? '';
                            const pdNum  = parseFloat(pd);
                            const wdNum  = parseFloat(totalWorkingDays);
                            const isOver = pd !== '' && !isNaN(pdNum) && !isNaN(wdNum) && pdNum > wdNum;
                            const isNeg  = pd !== '' && !isNaN(pdNum) && pdNum < 0;
                            const isErr  = isOver || isNeg;
                            return (
                              <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'center', verticalAlign: 'middle', background: idx % 2 === 0 ? '#faf5ff' : '#f3e8ff20' }}>
                                <input
                                  type="number" min="0"
                                  max={totalWorkingDays || undefined}
                                  placeholder="—"
                                  value={pd}
                                  onChange={e => setAttendanceGrid(prev => ({ ...prev, [student.id]: e.target.value }))}
                                  style={{
                                    width: 78, padding: '6px 8px', fontSize: 13, fontWeight: 600,
                                    textAlign: 'center',
                                    border: `1.5px solid ${isErr ? '#e53e3e' : pd ? '#7c3aed' : 'var(--border-strong)'}`,
                                    borderRadius: 8, outline: 'none',
                                    background: isErr ? '#fff5f5' : pd ? '#f5f3ff' : 'var(--surface)',
                                    color: isErr ? '#e53e3e' : 'var(--text-primary)',
                                  }}
                                />
                                {isOver && <div style={{ fontSize: 10, color: '#e53e3e', marginTop: 3 }}>exceeds max</div>}
                              </td>
                            );
                          })()}

                          {/* One or three inputs per subject depending on mode */}
                          {bulkSubjects.flatMap(sub => {
                            const isIE = subjectMode[sub] === 'IE';
                            if (isIE) {
                              const ie     = ieGrid[student.id]?.[sub] || {};
                              const intMax = parseFloat(ieInternalMax[sub] || '0');
                              const extMax = parseFloat(ieExternalMax[sub] || '0');
                              const intVal = ie.int ?? '';
                              const extVal = ie.ext ?? '';
                              const intNum = parseFloat(intVal);
                              const extNum = parseFloat(extVal);
                              const intOver = intVal !== '' && !isNaN(intNum) && intNum > intMax;
                              const extOver = extVal !== '' && !isNaN(extNum) && extNum > extMax;
                              const total   = (isNaN(intNum) ? 0 : Math.max(0, intNum)) + (isNaN(extNum) ? 0 : Math.max(0, extNum));
                              const totMax  = intMax + extMax;
                              const grade   = totMax > 0 ? getGrade(total, totMax) : '';
                              const inputSt = (val, over, border) => ({
                                width: 68, padding: '5px 6px', fontSize: 12, fontWeight: 600, textAlign: 'center',
                                border: `1.5px solid ${over ? '#e53e3e' : val ? border : 'var(--border-strong)'}`,
                                borderRadius: 7, outline: 'none',
                                background: over ? '#fff5f5' : val ? '#fafafa' : 'var(--surface)',
                                color: over ? '#e53e3e' : 'var(--text-primary)',
                              });
                              return [
                                <td key={sub+'_int'} style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center', background: idx%2===0?'#faf5ff30':'#f3e8ff20' }}>
                                  <input type="number" min="0" max={intMax||undefined} placeholder="—" value={intVal}
                                    onChange={e => updateIeCell(student.id, sub, 'int', e.target.value)}
                                    style={inputSt(intVal, intOver, '#7c3aed')} />
                                  {intOver && <div style={{ fontSize: 9, color: '#e53e3e' }}>exceeds max</div>}
                                </td>,
                                <td key={sub+'_ext'} style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                                  <input type="number" min="0" max={extMax||undefined} placeholder="—" value={extVal}
                                    onChange={e => updateIeCell(student.id, sub, 'ext', e.target.value)}
                                    style={inputSt(extVal, extOver, '#0369a1')} />
                                  {extOver && <div style={{ fontSize: 9, color: '#e53e3e' }}>exceeds max</div>}
                                </td>,
                                <td key={sub+'_tot'} style={{ padding: '7px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center', background: '#f0fdf430' }}>
                                  <div style={{ fontSize: 14, fontWeight: 800, color: '#059669' }}>{total}</div>
                                  {grade && <div style={{ fontSize: 10, fontWeight: 700, color: getGradeColor(grade, gradeScale).color }}>{grade} · {totMax>0?Math.round((total/totMax)*100):0}%</div>}
                                </td>,
                              ];
                            }
                            const val    = grid[student.id]?.[sub] ?? '';
                            const numVal = parseFloat(val);
                            const maxNum = parseFloat(subjectMaxMarks[sub] || '100');
                            const isOver = val !== '' && !isNaN(numVal) && numVal > maxNum;
                            const grade  = val !== '' && !isNaN(numVal) && !isOver ? getGrade(numVal, maxNum) : '';
                            return [
                              <td key={sub} style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', textAlign: 'center', verticalAlign: 'middle' }}>
                                <input type="number" min="0" max={subjectMaxMarks[sub] || '100'} placeholder="—" value={val}
                                  onChange={e => updateCell(student.id, sub, e.target.value)}
                                  style={{ width: 78, padding: '6px 8px', fontSize: 13, fontWeight: 600, textAlign: 'center', border: `1.5px solid ${isOver ? '#e53e3e' : val ? '#0de1e8' : 'var(--border-strong)'}`, borderRadius: 8, outline: 'none', background: isOver ? '#fff5f5' : val ? '#f0fff4' : 'var(--surface)', color: isOver ? '#e53e3e' : 'var(--text-primary)', transition: 'border-color 0.15s, background 0.15s' }}
                                />
                                {grade && <div style={{ fontSize: 10, fontWeight: 700, marginTop: 3, color: getGradeColor(grade, gradeScale).color }}>{grade} · {Math.round((numVal/maxNum)*100)}%</div>}
                                {isOver && <div style={{ fontSize: 10, color: '#e53e3e', marginTop: 3 }}>exceeds max</div>}
                              </td>
                            ];
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Modal footer ── */}
            <div style={{ padding: '14px 28px', borderTop: '1px solid var(--border-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--surface)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {bulkStudents.length > 0 && bulkSubjects.length > 0 ? (
                  <span>
                    <strong style={{ color: '#4361ee' }}>{filledCount}</strong> of {bulkStudents.length * bulkSubjects.length} cells filled
                    &nbsp;·&nbsp; {bulkStudents.length} student{bulkStudents.length !== 1 ? 's' : ''} × {bulkSubjects.length} subject{bulkSubjects.length !== 1 ? 's' : ''}
                  </span>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '9px 22px', border: '1.5px solid var(--border-strong)', borderRadius: 9, background: 'var(--surface)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                {/* Download Template — generates Excel based on current selections */}
                <button
                  type="button"
                  onClick={downloadBulkEntryTemplate}
                  disabled={!bulkClassId || bulkSubjects.length === 0 || loadingBulkStudents}
                  title="Download Excel template pre-filled with student list and subject columns"
                  style={{
                    padding: '9px 18px',
                    background: (!bulkClassId || bulkSubjects.length === 0 || loadingBulkStudents) ? '#e5e7eb' : '#f0fdf4',
                    color: (!bulkClassId || bulkSubjects.length === 0 || loadingBulkStudents) ? '#9ca3af' : '#16a34a',
                    border: `1.5px solid ${(!bulkClassId || bulkSubjects.length === 0 || loadingBulkStudents) ? '#e5e7eb' : '#86efac'}`,
                    borderRadius: 9, fontWeight: 700, fontSize: 12,
                    cursor: (!bulkClassId || bulkSubjects.length === 0 || loadingBulkStudents) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <span className="material-icons" style={{ fontSize: 15 }}>download</span>
                  Download Template
                </button>
                <button
                  type="button"
                  onClick={handleBulkSave}
                  disabled={saving || !bulkClassId || bulkSubjects.length === 0 || filledCount === 0}
                  style={{
                    padding: '9px 24px',
                    background: (saving || !bulkClassId || bulkSubjects.length === 0 || filledCount === 0) ? '#a0aec0' : '#0de1e8',
                    color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13,
                    cursor: (saving || !bulkClassId || bulkSubjects.length === 0 || filledCount === 0) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span className="material-icons" style={{ fontSize: 17 }}>save</span>
                  {saving ? `Saving ${filledCount} records...` : `Save ${filledCount > 0 ? filledCount + ' Records' : 'All Marks'}`}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
      {/* ── CSV Import Modal ─────────────────────────────────────────────── */}
      {showCsvModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCsvModal(false)}>
          <div className="modal-container" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <span className="modal-title">Import Marks via CSV</span>
              <button className="modal-close" onClick={() => setShowCsvModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body">
              {/* Config */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Exam Type *</label>
                  <input value={csvExamType} onChange={e => setCsvExamType(e.target.value)} placeholder="e.g. Unit Test 1"
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Exam Date</label>
                  <input type="date" value={csvDate} onChange={e => setCsvDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Sample + upload */}
              <div style={{ background: '#f8faff', border: '1.5px dashed #c7d2fe', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', marginBottom: 8 }}>CSV Format</div>
                <code style={{ fontSize: 10, color: '#374151', display: 'block', background: '#fff', padding: 10, borderRadius: 6, marginBottom: 10, lineHeight: 1.8 }}>
                  Student Name | Admission Number | Roll Number | Class | Section<br/>
                  | Exam Type | Exam Date | Total Working Days | Present Days<br/>
                  | Mathematics Internal Max Marks | Mathematics Internal Marks<br/>
                  | Mathematics External Max Marks | Mathematics External Marks<br/>
                  | Mathematics Total Max Marks | Mathematics Total Marks<br/>
                  | English Max Marks | English Marks
                </code>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                  The Excel template has <strong>one row per student</strong> and columns based on the selected subjects and marks structure.
                  Download the template from the <strong>Bulk Entry modal</strong> (green Download Template button) — it is pre-filled with your class, exam type, and subject configuration.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {isClassTeacher && myClassAssignment?.classId && (
                    <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, marginBottom: 6 }}>
                      📚 Importing for: <strong>{myClassAssignment.label}</strong> — only students from this class will be accepted
                    </div>
                  )}
                  <button
                    onClick={() => { setShowCsvModal(false); openBulkEntryForClass(); }}
                    title="Open Bulk Entry → configure subjects → click Download Template"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid #bfdbfe', borderRadius: 7, background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <span className="material-icons" style={{ fontSize: 15 }}>download</span>Download Template
                  </button>
                  <button onClick={() => csvFileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1px solid #d1fae5', borderRadius: 7, background: '#ecfdf5', color: '#16a34a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    <span className="material-icons" style={{ fontSize: 15 }}>upload_file</span>Select CSV File
                  </button>
                  <input ref={csvFileRef} type="file" accept=".csv" style={{ display: 'none' }}
                    onChange={e => { if (e.target.files?.[0]) parseCsvFile(e.target.files[0]); e.target.value = ''; }} />
                </div>
              </div>

              {/* Parse errors */}
              {csvErrors.length > 0 && (
                <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                  {csvErrors.map((e, i) => <div key={i} style={{ fontSize: 12, color: '#dc2626' }}>{e}</div>)}
                </div>
              )}

              {/* Preview */}
              {csvRows.length > 0 && !csvResults && (
                <div style={{ overflowX: 'auto', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{csvRows.length} mark records parsed (ready to import)</div>
                  <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ background: '#f8faff' }}>
                      {['Admission No.','Subject','Marks','Max Marks'].map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid var(--border-strong)', whiteSpace: 'nowrap' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {csvRows.slice(0, 10).map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                          <td style={{ padding: '5px 10px' }}>{r.admissionNumber}</td>
                          <td style={{ padding: '5px 10px', fontWeight: 600, color: '#4f46e5' }}>{r.subject}</td>
                          <td style={{ padding: '5px 10px' }}>{r.marks}</td>
                          <td style={{ padding: '5px 10px' }}>{r.maxMarks}</td>
                        </tr>
                      ))}
                      {csvRows.length > 10 && <tr><td colSpan={4} style={{ padding: '5px 10px', color: '#94a3b8', fontSize: 11 }}>…and {csvRows.length - 10} more mark records</td></tr>}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}

              {/* Results */}
              {csvResults && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>✓ Import complete: {csvResults.saved}/{csvResults.total} saved</div>
                  {csvResults.results?.filter(r => r.status === 'error').map((r, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#dc2626' }}>• {r.admissionNumber} ({r.subject}): {r.message}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowCsvModal(false)} style={{ padding: '9px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Close</button>
              {csvRows.length > 0 && !csvResults && (
                <button onClick={handleCsvImport} disabled={csvImporting || !csvExamType.trim()}
                  style={{ padding: '9px 24px', background: (csvImporting || !csvExamType.trim()) ? '#a0aec0' : '#4f46e5', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-icons" style={{ fontSize: 16 }}>upload</span>
                  {csvImporting ? 'Importing…' : `Import ${csvRows.length} Rows`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Marks Modal ── */}
      {editingMark && (() => {
        const marksN = Number(editMarks);
        const maxN   = Number(editMaxMarks);
        const pct    = maxN > 0 ? Math.round((marksN / maxN) * 100) : 0;
        const isOver = marksN > maxN;
        return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !editSaving && setEditingMark(null)}>
          <div className="modal-container" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ margin: 0 }}>Edit Marks</h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  {editingMark.studentName || '—'} · updating record #{editingMark.id}
                </p>
              </div>
              <button onClick={() => !editSaving && setEditingMark(null)} className="modal-close">✕</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Row 1: Exam Type + Exam Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Exam Type *</label>
                  <select value={editExamType} onChange={e => setEditExamType(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, fontWeight: 600, outline: 'none', background: 'var(--surface)', boxSizing: 'border-box' }}>
                    <option value="">— select —</option>
                    {examTypes.map(et => <option key={et} value={et}>{et}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Exam Date</label>
                  <input type="date" value={editExamDate} onChange={e => setEditExamDate(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Row 2: Subject */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Subject *</label>
                {!editShowAddSubject ? (
                  <select value={editSubject} onChange={e => {
                    if (e.target.value === '__add__') { setEditShowAddSubject(true); setEditSubjectCustomInput(''); }
                    else setEditSubject(e.target.value);
                  }} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, fontWeight: 600, outline: 'none', background: 'var(--surface)', boxSizing: 'border-box' }}>
                    {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="__add__">＋ Add New Subject…</option>
                  </select>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input autoFocus value={editSubjectCustomInput}
                      onChange={e => setEditSubjectCustomInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && editSubjectCustomInput.trim()) { setEditSubject(editSubjectCustomInput.trim()); setEditShowAddSubject(false); } }}
                      placeholder="New subject name…"
                      style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #d69e2e', borderRadius: 8, fontSize: 13, fontWeight: 600, outline: 'none', background: '#fffbeb', boxSizing: 'border-box' }} />
                    <button type="button" disabled={!editSubjectCustomInput.trim()}
                      onClick={() => { setEditSubject(editSubjectCustomInput.trim()); setEditShowAddSubject(false); }}
                      style={{ padding: '9px 14px', background: editSubjectCustomInput.trim() ? '#b45309' : '#e2e8f0', color: editSubjectCustomInput.trim() ? '#fff' : '#a0aec0', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      Use
                    </button>
                    <button type="button" onClick={() => setEditShowAddSubject(false)}
                      style={{ padding: '9px 14px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', fontSize: 12, cursor: 'pointer' }}>
                      Back
                    </button>
                  </div>
                )}
              </div>

              {/* Row 3: Marks Obtained + Max Marks */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Marks Obtained *</label>
                  <input type="number" min="0" max={editMaxMarks} value={editMarks}
                    onChange={e => setEditMarks(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${isOver ? '#dc2626' : 'var(--border-strong)'}`, borderRadius: 8, fontSize: 16, fontWeight: 800, outline: 'none', boxSizing: 'border-box', color: isOver ? '#dc2626' : 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Maximum Marks *</label>
                  <input type="number" min="1" value={editMaxMarks}
                    onChange={e => setEditMaxMarks(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 16, fontWeight: 800, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Live result preview */}
              {editMarks !== '' && editMaxMarks !== '' && maxN > 0 && (
                <div style={{ borderRadius: 8, padding: '10px 14px', fontSize: 13, background: isOver ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isOver ? '#fecaca' : '#bbf7d0'}` }}>
                  {isOver ? (
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠ Marks ({marksN}) exceed max ({maxN})</span>
                  ) : (
                    <span>
                      <strong style={{ color: 'var(--text-primary)' }}>{editSubject || editingMark.subject}</strong>
                      {' '}{marksN}/{maxN} → <strong style={{ color: '#16a34a' }}>{pct}%</strong>
                      {' '}· Grade: <strong style={{ color: '#1d4ed8' }}>{getGrade(marksN, maxN)}</strong>
                      <span style={{ color: '#6b7280', marginLeft: 6 }}>· will recalculate everywhere on save</span>
                    </span>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button onClick={() => setEditingMark(null)} disabled={editSaving}
                  style={{ padding: '9px 20px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  Cancel
                </button>
                <button onClick={saveEdit} disabled={editSaving || isOver}
                  style={{ padding: '9px 24px', background: (editSaving || isOver) ? '#a0aec0' : '#4361ee', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: (editSaving || isOver) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-icons" style={{ fontSize: 16 }}>save</span>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ── Delete Confirmation Dialog ─────────────────────────────────────────── */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999,
        }} onClick={() => setDeleteTarget(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '32px 28px', maxWidth: 420,
            width: 'calc(100% - 40px)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg,#e53e3e,#c53030)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <span className="material-icons" style={{ color: '#fff', fontSize: 28 }}>
                  {deleteTarget.isGroup ? 'delete_sweep' : 'delete'}
                </span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a202c', marginBottom: 8 }}>
                Confirm Delete
              </h3>
              <p style={{ fontSize: 14, color: '#4a5568', lineHeight: 1.6, marginBottom: 8 }}>
                {deleteTarget.isGroup
                  ? <>Delete <strong>{deleteTarget.subject}</strong> for <strong>{deleteTarget.studentName}</strong>?</>
                  : <>Delete <strong>{deleteTarget.subject}</strong> marks for <strong>{deleteTarget.studentName}</strong>?</>
                }
              </p>
              {user?.role === 'TEACHER' && (
                <p style={{ fontSize: 12, color: '#718096', background: '#f7fafc', borderRadius: 8, padding: '8px 12px' }}>
                  Only marks for subjects assigned to you will be deleted.
                </p>
              )}
              {deleteTarget.isGroup && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                <p style={{ fontSize: 12, color: '#c53030', background: '#fff5f5', borderRadius: 8, padding: '8px 12px' }}>
                  This will delete marks for {deleteTarget.subject}. This action cannot be undone.
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: '10px 0', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: '#4a5568' }}>
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 9, background: deleting ? '#a0aec0' : 'linear-gradient(135deg,#e53e3e,#c53030)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
