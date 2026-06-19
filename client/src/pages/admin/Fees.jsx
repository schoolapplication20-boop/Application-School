import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Layout from '../../components/Layout';
import { adminAPI } from '../../services/api';
import { sortClassNames } from '../../utils/classOrder';
import { useToast } from '../../context/ToastContext';

/* ── helpers ── */
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const getCurrentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
};
const CURRENT_YEAR = getCurrentAcademicYear();

const StatusBadge = ({ status }) => {
  const map = {
    PAID:    { bg: '#f0fff4', color: '#276749', label: 'Paid'    },
    PARTIAL: { bg: '#fffbeb', color: '#b45309', label: 'Partial' },
    PENDING: { bg: '#fff5f5', color: '#c53030', label: 'Pending' },
    OVERDUE: { bg: '#fff5f5', color: '#9b2c2c', label: 'Overdue' },
  };
  const s = map[status] || map.PENDING;
  return (
    <span style={{ padding: '3px 10px', background: s.bg, color: s.color, borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
};

const FeeInput = ({ label, value, onChange, required }) => (
  <div>
    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
      {label}{required && <span style={{ color: '#e53e3e' }}> *</span>}
    </label>
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13 }}>₹</span>
      <input
        type="number" min="0" value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={required ? '' : '0 (optional)'}
        style={{ width: '100%', padding: '8px 10px 8px 24px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════ */
export default function Fees() {
  const [tab, setTab] = useState('structure');

  /* class fee structure */
  const [structures, setStructures]   = useState([]);
  const [classList, setClassList]     = useState([]);
  const [structLoading, setStructLoading] = useState(true);

  /* student assignments */
  const [assignments, setAssignments] = useState([]);
  const [assignLoading, setAssignLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]           = useState('');

  /* payment history */
  const [payments, setPayments]       = useState([]);
  const [payLoading, setPayLoading]   = useState(true);

  /* modals */
  const [showFeeModal, setShowFeeModal]     = useState(false);
  const [feeModalClass, setFeeModalClass]   = useState(null); // ClassFeeStructure or null
  const [feeModalClassName, setFeeModalClassName] = useState('');
  const [feeForm, setFeeForm]               = useState({ tuitionFee: '', transportFee: '', labFee: '', examFee: '', sportsFee: '', otherFee: '' });
  const [termFees, setTermFees]             = useState([]); // class-level term-wise split: [{termName, amount}]

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget]       = useState(null); // existing assignment or null
  const [assignStudentSearch, setAssignStudentSearch]   = useState('');
  const [assignStudentResults, setAssignStudentResults] = useState([]);
  const [assignStudent, setAssignStudent]     = useState(null);
  const [assignForm, setAssignForm]           = useState({ tuitionFee: '', transportFee: '', labFee: '', examFee: '', sportsFee: '', otherFee: '', dueDate: '', remarks: '', academicYear: CURRENT_YEAR });
  const [assignSearching, setAssignSearching] = useState(false);

  // Installment schedule state
  const [installments, setInstallments] = useState([
    { id: crypto.randomUUID(), termName: 'Term 1', amount: '', dueDate: '' },
    { id: crypto.randomUUID(), termName: 'Term 2', amount: '', dueDate: '' },
    { id: crypto.randomUUID(), termName: 'Term 3', amount: '', dueDate: '' },
  ]);
  const addInstallment = () =>
    setInstallments(prev => [...prev, { id: crypto.randomUUID(), termName: `Term ${prev.length + 1}`, amount: '', dueDate: '' }]);
  const removeInstallment = (idx) =>
    setInstallments(prev => prev.filter((_, i) => i !== idx));
  const updateInstallment = (idx, field, value) =>
    setInstallments(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  // Class-level term-wise fee split (Set Fee Structure modal)
  const addTermFee = () =>
    setTermFees(prev => [...prev, { id: crypto.randomUUID(), termName: `Term ${prev.length + 1}`, amount: '' }]);
  const removeTermFee = (idx) =>
    setTermFees(prev => prev.filter((_, i) => i !== idx));
  const updateTermFee = (idx, field, value) =>
    setTermFees(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const [saving, setSaving]   = useState(false);
  const debounceRef           = useRef(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, studentName }
  const [deleting, setDeleting] = useState(false);

  const showToast = useToast();

  /* ── loaders ── */
  const loadStructures = useCallback(async () => {
    setStructLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([adminAPI.getClassFeeStructures(), adminAPI.getClasses()]);
      setStructures(sRes.data?.data ?? []);
      setClassList(cRes.data?.data ?? []);
    } catch { setStructures([]); } finally { setStructLoading(false); }
  }, []);

  const loadAssignments = useCallback(async () => {
    setAssignLoading(true);
    try {
      const res = await adminAPI.getAllStudentFeeAssignments();
      setAssignments(res.data?.data ?? []);
    } catch { setAssignments([]); } finally { setAssignLoading(false); }
  }, []);

  const loadPayments = useCallback(async () => {
    setPayLoading(true);
    try {
      const res = await adminAPI.getAllFeePayments();
      setPayments(res.data?.data ?? []);
    } catch { setPayments([]); } finally { setPayLoading(false); }
  }, []);

  useEffect(() => { loadStructures(); }, [loadStructures]);
  useEffect(() => { if (tab === 'students') loadAssignments(); }, [tab, loadAssignments]);
  useEffect(() => { if (tab === 'history') loadPayments(); }, [tab, loadPayments]);

  /* ── unique class names from created classes ── */
  const uniqueClasses = useMemo(() => [...new Set(classList.map(c => c.name))].sort(sortClassNames), [classList]);

  /* ── structure map: className → ClassFeeStructure ── */
  const structureMap = useMemo(() => {
    const m = {};
    structures.forEach(s => { m[s.className] = s; });
    return m;
  }, [structures]);

  /* ── filtered assignments ── */
  const filteredAssignments = useMemo(() => assignments.filter(a => {
    if (filterClass && a.className !== filterClass) return false;
    if (filterStatus && String(a.status || '').toUpperCase() !== filterStatus.toUpperCase()) return false;
    if (search && !a.studentName?.toLowerCase().includes(search.toLowerCase()) &&
        !a.rollNumber?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [assignments, filterClass, filterStatus, search]);

  /* ── stats ── */
  const stats = useMemo(() => {
    const totalBilled = assignments.reduce((s, a) => s + Number(a.totalFee || 0), 0);
    const totalPaid   = assignments.reduce((s, a) => s + Number(a.paidAmount || 0), 0);
    const totalDue    = totalBilled - totalPaid;
    const paid        = assignments.filter(a => String(a.status || '').toUpperCase() === 'PAID').length;
    return { totalBilled, totalPaid, totalDue, paid, total: assignments.length };
  }, [assignments]);

  /* ── auto-calculated total for assign modal ── */
  const assignTotal = useMemo(() =>
    ['tuitionFee','transportFee','labFee','examFee','sportsFee','otherFee']
      .reduce((sum, k) => sum + Number(assignForm[k] || 0), 0),
  [assignForm]);

  /* ── open fee structure modal ── */
  const openFeeModal = (className) => {
    const existing = structureMap[className];
    setFeeModalClassName(className);
    setFeeModalClass(existing || null);
    setFeeForm({
      tuitionFee:   existing?.tuitionFee   ?? '',
      transportFee: existing?.transportFee ?? '',
      labFee:       existing?.labFee       ?? '',
      examFee:      existing?.examFee      ?? '',
      sportsFee:    existing?.sportsFee    ?? '',
      otherFee:     existing?.otherFee     ?? '',
    });
    setTermFees(
      existing?.termFees?.length
        ? existing.termFees.map(t => ({ id: t.id ?? crypto.randomUUID(), termName: t.termName, amount: String(t.amount) }))
        : []
    );
    setShowFeeModal(true);
  };

  /* ── totals for the Set Fee Structure modal ── */
  const feeFormTotal = useMemo(() =>
    ['tuitionFee','transportFee','labFee','examFee','sportsFee','otherFee']
      .reduce((sum, k) => sum + Number(feeForm[k] || 0), 0),
  [feeForm]);

  const termFeesTotal = useMemo(() =>
    termFees.reduce((sum, t) => sum + Number(t.amount || 0), 0),
  [termFees]);

  const saveFeeStructure = async () => {
    if (!feeForm.tuitionFee || Number(feeForm.tuitionFee) <= 0) {
      showToast('Tuition Fee is required and must be greater than 0', 'error');
      return;
    }

    // Term-wise split is optional; validate amounts and total if provided.
    const filledTermFees = termFees.filter(t => t.termName?.trim() && t.amount !== '');
    for (const t of filledTermFees) {
      if (isNaN(Number(t.amount)) || Number(t.amount) < 0) {
        showToast(`Invalid amount for "${t.termName}". Term fee must be a non-negative number.`, 'error');
        return;
      }
    }
    if (filledTermFees.length > 0) {
      const termTotal = filledTermFees.reduce((s, t) => s + Number(t.amount || 0), 0);
      if (Math.round(termTotal * 100) > Math.round(feeFormTotal * 100)) {
        showToast(`Term-wise total ₹${fmt(termTotal)} cannot exceed the Total Annual Fee ₹${fmt(feeFormTotal)}.`, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await adminAPI.saveClassFeeStructure({
        className: feeModalClassName,
        academicYear: CURRENT_YEAR,
        ...feeForm,
        termFees: filledTermFees.map(t => ({ termName: t.termName.trim(), amount: Number(t.amount) })),
      });
      showToast(res.data?.message || 'Fee structure saved');
      setShowFeeModal(false);
      setFeeModalClassName('');
      setFeeForm({ tuitionFee: '', transportFee: '', labFee: '', examFee: '', sportsFee: '', otherFee: '' });
      setTermFees([]);
      loadStructures();
      loadAssignments();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to save fee structure';
      showToast(msg, 'error');
    } finally { setSaving(false); }
  };

  /* ── assign fee modal ── */
  const openAssignModal = async (assignment = null) => {
    setAssignTarget(assignment);
    setAssignStudent(assignment ? { id: assignment.studentId, name: assignment.studentName, rollNumber: assignment.rollNumber, className: assignment.className } : null);

    let breakup = { tuitionFee: '', transportFee: '', labFee: '', examFee: '', sportsFee: '', otherFee: '' };
    if (assignment) {
      const hasBreakup = ['tuitionFee','transportFee','labFee','examFee','sportsFee','otherFee']
        .some(k => Number(assignment[k] || 0) > 0);
      if (hasBreakup) {
        breakup = {
          tuitionFee:   assignment.tuitionFee   ?? '',
          transportFee: assignment.transportFee ?? '',
          labFee:       assignment.labFee       ?? '',
          examFee:      assignment.examFee      ?? '',
          sportsFee:    assignment.sportsFee    ?? '',
          otherFee:     assignment.otherFee     ?? '',
        };
      } else {
        // Old assignment with only totalFee — prefill breakup from class fee structure
        const cfs = structureMap[assignment.className];
        if (cfs) {
          breakup = {
            tuitionFee:   cfs.tuitionFee   ?? '',
            transportFee: cfs.transportFee ?? '',
            labFee:       cfs.labFee       ?? '',
            examFee:      cfs.examFee      ?? '',
            sportsFee:    cfs.sportsFee    ?? '',
            otherFee:     cfs.otherFee     ?? '',
          };
        }
      }
    }

    setAssignForm({
      ...breakup,
      dueDate:      assignment?.dueDate     ?? '',
      remarks:      assignment?.remarks     ?? '',
      academicYear: assignment?.academicYear ?? CURRENT_YEAR,
    });
    setAssignStudentSearch('');
    setAssignStudentResults([]);

    // Load existing installments when editing; otherwise reset to 3 blank rows
    if (assignment?.id) {
      try {
        const res = await adminAPI.getInstallments(assignment.id);
        const existing = res.data?.data ?? [];
        if (existing.length > 0) {
          setInstallments(existing.map(i => ({
            id:       i.id ?? crypto.randomUUID(),
            termName: i.termName,
            amount:   String(i.amount),
            dueDate:  i.dueDate || '',
            status:   i.status,
          })));
        } else {
          setInstallments([{ id: crypto.randomUUID(), termName: 'Term 1', amount: '', dueDate: '' }]);
        }
      } catch {
        // Don't reset installments — keep modal closed and alert user
        showToast('Failed to load existing installments. Please try again.', 'error');
        return;
      }
    } else {
      setInstallments([
        { id: crypto.randomUUID(), termName: 'Term 1', amount: '', dueDate: '' },
        { id: crypto.randomUUID(), termName: 'Term 2', amount: '', dueDate: '' },
        { id: crypto.randomUUID(), termName: 'Term 3', amount: '', dueDate: '' },
      ]);
    }
    setShowAssignModal(true);
  };

  /* ── auto-fill class fee when student selected ── */
  const handleStudentSelect = (s) => {
    setAssignStudent(s);
    setAssignStudentSearch(s.name);
    setAssignStudentResults([]);
    const cfs = structureMap[s.className];
    if (cfs) {
      const hasAny = ['tuitionFee','transportFee','labFee','examFee','sportsFee','otherFee']
        .some(k => Number(assignForm[k] || 0) > 0);
      if (!hasAny) {
        setAssignForm(f => ({
          ...f,
          tuitionFee:   cfs.tuitionFee   ?? '',
          transportFee: cfs.transportFee ?? '',
          labFee:       cfs.labFee       ?? '',
          examFee:      cfs.examFee      ?? '',
          sportsFee:    cfs.sportsFee    ?? '',
          otherFee:     cfs.otherFee     ?? '',
        }));

        // Prefill the installment schedule from the class's term-wise split,
        // but only if the admin hasn't already entered any installment amounts.
        const hasInstallmentAmounts = installments.some(i => i.amount && Number(i.amount) > 0);
        if (!hasInstallmentAmounts && cfs.termFees?.length > 0) {
          setInstallments(cfs.termFees.map(t => ({ id: t.id ?? crypto.randomUUID(), termName: t.termName, amount: String(t.amount), dueDate: '' })));
        }
      }
    }
  };

  const searchAssignStudents = async (q) => {
    if (!q || q.length < 2) { setAssignStudentResults([]); return; }
    setAssignSearching(true);
    try {
      const res = await adminAPI.searchStudentsForFee(q);
      setAssignStudentResults(res.data?.data ?? []);
    } catch { } finally { setAssignSearching(false); }
  };

  const saveAssignment = async () => {
    if (!assignStudent) { showToast('Select a student', 'error'); return; }
    if (!assignTotal) { showToast('Enter fee amounts', 'error'); return; }

    // Validate installments: if any are filled, their total must match assignTotal
    const filledInstallments = installments
      .filter(i => i.termName?.trim() && i.amount && Number(i.amount) > 0)
      .map(i => ({ termName: i.termName.trim(), amount: i.amount, dueDate: i.dueDate || null }));

    if (filledInstallments.length > 0) {
      const instTotal = filledInstallments.reduce((s, i) => s + Number(i.amount || 0), 0);
      if (Math.abs(Math.round(instTotal * 100) - Math.round(assignTotal * 100)) > 0) {
        showToast(
          `Installment total ₹${fmt(instTotal)} does not match total fee ₹${fmt(assignTotal)}. Please correct before saving.`,
          'error'
        );
        return;
      }
    }

    setSaving(true);
    try {
      await adminAPI.assignStudentFee({
        studentId: assignStudent.id,
        ...assignForm,
        totalFee: assignTotal,
        installments: filledInstallments.length > 0 ? filledInstallments : undefined,
      });
      showToast(assignTarget ? 'Fee updated' : 'Fee assigned');
      setShowAssignModal(false);
      // Reset form so next open starts clean
      setAssignTarget(null);
      setAssignStudent(null);
      setAssignForm({ tuitionFee: '', transportFee: '', labFee: '', examFee: '', sportsFee: '', otherFee: '', dueDate: '', remarks: '', academicYear: CURRENT_YEAR });
      setAssignStudentSearch('');
      setAssignStudentResults([]);
      setInstallments([{ id: crypto.randomUUID(), termName: 'Term 1', amount: '', dueDate: '' }, { id: crypto.randomUUID(), termName: 'Term 2', amount: '', dueDate: '' }, { id: crypto.randomUUID(), termName: 'Term 3', amount: '', dueDate: '' }]);
      loadAssignments();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to save assignment';
      showToast(msg, 'error');
    } finally { setSaving(false); }
  };

  /* ── delete assignment ── */
  const confirmDelete = (a) => setDeleteConfirm({ id: a.id, studentName: a.studentName });

  const deleteAssignment = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await adminAPI.deleteStudentFeeAssignment(deleteConfirm.id);
      showToast('Fee assignment deleted');
      setDeleteConfirm(null);
      loadAssignments();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to delete assignment';
      showToast(msg, 'error');
    } finally { setDeleting(false); }
  };

  /* ── tab bar ── */
  const TAB_STYLE = (active) => ({
    padding: '8px 20px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
    borderBottom: active ? '2.5px solid #0de1e8' : '2.5px solid transparent',
    color: active ? '#276749' : 'var(--text-secondary)', background: 'none',
  });

  /* ── stat card ── */
  const StatCard = ({ label, value, color, icon }) => (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 160 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-icons" style={{ color, fontSize: 22 }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );

  return (
    <Layout pageTitle="Fees & Payments">
      <div style={{ padding: '20px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Fees & Payments</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Manage class fee structures and student fee assignments</p>
          </div>
          {tab === 'students' && (
            <button onClick={() => openAssignModal()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#0de1e8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <span className="material-icons" style={{ fontSize: 18 }}>person_add</span> Assign Fee
            </button>
          )}
        </div>

        {/* Stats (students tab) */}
        {tab === 'students' && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <StatCard label="Total Billed"   value={`₹${fmt(stats.totalBilled)}`} color="#0de1e8" icon="receipt_long" />
            <StatCard label="Total Collected" value={`₹${fmt(stats.totalPaid)}`}  color="#3182ce" icon="payments"     />
            <StatCard label="Total Due"       value={`₹${fmt(stats.totalDue)}`}   color="#e53e3e" icon="pending"      />
            <StatCard label="Paid Students"   value={`${stats.paid}/${stats.total}`} color="#805ad5" icon="check_circle" />
          </div>
        )}

        {/* Tab bar */}
        <div style={{ borderBottom: '1px solid var(--border-strong)', marginBottom: 20 }}>
          <button style={TAB_STYLE(tab === 'structure')} onClick={() => setTab('structure')}>Fee Structure</button>
          <button style={TAB_STYLE(tab === 'students')}  onClick={() => setTab('students')}>Student Fees</button>
          <button style={TAB_STYLE(tab === 'history')}   onClick={() => setTab('history')}>Payment History</button>
        </div>

        {/* ── TAB 1: Fee Structure ── */}
        {tab === 'structure' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Class-wise Annual Fee Structure ({CURRENT_YEAR})</span>
            </div>
            {structLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : uniqueClasses.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No classes created yet. Add classes first.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-alt)' }}>
                      {['Class','Tuition','Transport','Lab','Exam','Sports','Other','Total Fee','Action'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Class' ? 'left' : 'right', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-strong)', whiteSpace: 'nowrap' }}>
                          {h === 'Action' ? '' : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueClasses.map(cls => {
                      const s = structureMap[cls];
                      const total = s
                        ? ['tuitionFee','transportFee','labFee','examFee','sportsFee','otherFee'].reduce((sum, k) => sum + Number(s[k] || 0), 0)
                        : 0;
                      return (
                        <tr key={cls} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>{cls}</td>
                          {['tuitionFee','transportFee','labFee','examFee','sportsFee','otherFee'].map(k => (
                            <td key={k} style={{ padding: '12px 14px', textAlign: 'right', color: s ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                              {s ? `₹${fmt(s[k])}` : '—'}
                            </td>
                          ))}
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#276749' }}>
                            {s ? `₹${fmt(total)}` : '—'}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <button onClick={() => openFeeModal(cls)} style={{ padding: '5px 14px', background: s ? '#0de1e818' : '#0de1e8', color: s ? '#276749' : '#fff', border: s ? '1px solid #0de1e840' : 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              {s ? 'Edit' : 'Set Fee'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: Student Fees ── */}
        {tab === 'students' && (
          <div>
            {/* Filters + Export */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                placeholder="Search student or roll no..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: '8px 14px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none' }}
              />
              <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none' }}>
                <option value="">All Classes</option>
                {uniqueClasses.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none' }}>
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
              <button
                onClick={() => {
                  const rows = filteredAssignments.map(a => ({
                    'Student Name':   a.studentName,
                    'Roll No':        a.rollNumber || '—',
                    'Class':          a.className,
                    'Academic Year':  a.academicYear,
                    'Total Fee (₹)':  Number(a.totalFee || 0).toFixed(2),
                    'Paid (₹)':       Number(a.paidAmount || 0).toFixed(2),
                    'Due (₹)':        Math.max(0, Number(a.totalFee || 0) - Number(a.paidAmount || 0)).toFixed(2),
                    'Status':         a.status || 'PENDING',
                    'Due Date':       a.dueDate || '—',
                    'Remarks':        a.remarks || '',
                  }));
                  const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url  = URL.createObjectURL(blob);
                  const a    = document.createElement('a');
                  a.href = url; a.download = `fee_report_${new Date().toISOString().slice(0,10)}.csv`; a.click();
                  URL.revokeObjectURL(url);
                  showToast('Fee report exported');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', background: '#0de1e8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                <span className="material-icons" style={{ fontSize: 16 }}>download</span>
                Export CSV
              </button>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 12, overflow: 'hidden' }}>
              {assignLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
              ) : filteredAssignments.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>payments</span>
                  {assignments.length === 0 ? 'No fee assignments yet. Click "Assign Fee" to get started.' : 'No matching records.'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-alt)' }}>
                        {['Student','Roll No','Class','Total Fee','Paid','Due Amount','Status','Actions'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: ['Total Fee','Paid','Due Amount'].includes(h) ? 'right' : 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-strong)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssignments.map(a => {
                        const due = Number(a.totalFee || 0) - Number(a.paidAmount || 0);
                        return (
                          <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>{a.studentName}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{a.rollNumber || '—'}</td>
                            <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{a.className}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>₹{fmt(a.totalFee)}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', color: '#276749', fontWeight: 600 }}>₹{fmt(a.paidAmount)}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', color: due > 0 ? '#e53e3e' : '#276749', fontWeight: 700 }}>₹{fmt(due)}</td>
                            <td style={{ padding: '12px 14px' }}><StatusBadge status={a.status} /></td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => openAssignModal(a)} title="Edit Assignment" style={{ border: 'none', background: '#0de1e818', color: '#276749', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                  Edit
                                </button>
                                <button onClick={() => confirmDelete(a)} title="Delete Assignment" style={{ border: 'none', background: '#fff5f5', color: '#e53e3e', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: Payment History ── */}
        {tab === 'history' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>All Payment Transactions</span>
            </div>
            {payLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : payments.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No payment transactions recorded yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-alt)' }}>
                      {['Date','Student','Class','Amount Paid','Receipt No','Mode','Received By','Remarks'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Amount Paid' ? 'right' : 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-strong)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{p.paymentDate || '—'}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>{p.studentName}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{p.className}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#276749' }}>₹{fmt(p.amountPaid)}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)' }}>{p.receiptNumber}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{p.paymentMode || '—'}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{p.receivedBy || '—'}</td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ Fee Structure Modal ══ */}
      {showFeeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
             onClick={e => e.target === e.currentTarget && setShowFeeModal(false)}>
          <div className="modal-card" style={{ background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>Set Fee Structure</h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{feeModalClassName} · {CURRENT_YEAR}</p>
              </div>
              <button onClick={() => setShowFeeModal(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {[['tuitionFee','Tuition Fee'],['transportFee','Transport Fee'],['labFee','Lab Fee'],['examFee','Exam Fee'],['sportsFee','Sports Fee'],['otherFee','Other Fee']].map(([k, label]) => (
                <FeeInput key={k} label={label} required={k === 'tuitionFee'} value={feeForm[k]} onChange={v => setFeeForm(f => ({ ...f, [k]: v }))} />
              ))}
            </div>
            {/* Total preview */}
            <div style={{ background: '#f0fff4', border: '1.5px solid #0de1e840', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#276749', fontSize: 14 }}>Total Annual Fee</span>
              <span style={{ fontWeight: 800, color: '#276749', fontSize: 18 }}>
                ₹{fmt(feeFormTotal)}
              </span>
            </div>

            {/* Term-wise fee split (optional) */}
            <div style={{ borderTop: '1px dashed var(--border-strong)', paddingTop: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Term-wise Fee
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>(optional)</span>
                </div>
                <button type="button" onClick={addTermFee}
                  style={{ fontSize: 12, color: '#0de1e8', background: 'none', border: '1px solid #0de1e8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                  + Add Term
                </button>
              </div>

              {termFees.map((t, idx) => (
                <div key={t.id ?? idx} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 30px', gap: 6, alignItems: 'end', marginBottom: 8 }}>
                  <div>
                    {idx === 0 && <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>Term Name</label>}
                    <input
                      value={t.termName}
                      onChange={e => updateTermFee(idx, 'termName', e.target.value)}
                      placeholder="e.g. Term 1"
                      style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--border-strong)', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    {idx === 0 && <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>Amount (₹)</label>}
                    <input
                      type="number" min="0"
                      value={t.amount}
                      onChange={e => updateTermFee(idx, 'amount', e.target.value)}
                      placeholder="0"
                      style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--border-strong)', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    {idx === 0 && <div style={{ height: 20 }} />}
                    <button type="button" onClick={() => removeTermFee(idx)}
                      style={{ width: 30, height: 32, border: 'none', background: '#fff5f5', borderRadius: 6, color: '#e53e3e', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                </div>
              ))}

              {termFees.some(t => t.amount !== '') && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>Term total: ₹{fmt(termFeesTotal)}</span>
                  {termFeesTotal > feeFormTotal && (
                    <span style={{ color: '#e53e3e' }}>⚠ Exceeds Total Annual Fee (₹{fmt(feeFormTotal)})</span>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowFeeModal(false)} style={{ padding: '9px 20px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={saveFeeStructure} disabled={saving} style={{ padding: '9px 22px', background: '#0de1e8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : 'Save Structure'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Assign Fee Modal ══ */}
      {showAssignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
             onClick={e => e.target === e.currentTarget && setShowAssignModal(false)}>
          <div className="modal-card" style={{ background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 460, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{assignTarget ? 'Edit Fee Assignment' : 'Assign Fee to Student'}</h3>
              <button onClick={() => setShowAssignModal(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
            </div>

            {/* Student search (hide if editing) */}
            {!assignTarget && (
              <div style={{ marginBottom: 16, position: 'relative' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Student *</label>
                <input
                  placeholder="Search by name, roll no, or phone..."
                  value={assignStudentSearch}
                  onChange={e => {
                    const q = e.target.value;
                    setAssignStudentSearch(q);
                    clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => searchAssignStudents(q), 300);
                  }}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
                {assignSearching && <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-25%)', color: 'var(--text-muted)', fontSize: 12 }}>Searching...</div>}
                {assignStudentResults.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                    {assignStudentResults.map(s => (
                      <div key={s.id} onClick={() => handleStudentSelect(s)}
                           style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                           onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                           onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8 }}>
                          <span>Class: <strong style={{ color: 'var(--text-secondary)' }}>{s.className}</strong></span>
                          {s.section && <span>Section: <strong style={{ color: 'var(--text-secondary)' }}>{s.section}</strong></span>}
                          {s.rollNumber && <span>Roll: <strong style={{ color: 'var(--text-secondary)' }}>{s.rollNumber}</strong></span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected student info */}
            {assignStudent && (
              <div style={{ background: 'var(--surface-alt)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{assignStudent.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>Class: <strong style={{ color: 'var(--text-primary)' }}>{assignStudent.className}</strong></span>
                    {assignStudent.section && <span>Section: <strong style={{ color: 'var(--text-primary)' }}>{assignStudent.section}</strong></span>}
                    {assignStudent.rollNumber && <span>Roll No: <strong style={{ color: 'var(--text-primary)' }}>{assignStudent.rollNumber}</strong></span>}
                  </div>
                </div>
                {/* Class fee hint */}
                {structureMap[assignStudent.className] && (
                  <div style={{ fontSize: 11, color: '#0de1e8', fontWeight: 600 }}>
                    Class fee: ₹{fmt(['tuitionFee','transportFee','labFee','examFee','sportsFee','otherFee'].reduce((s,k) => s + Number(structureMap[assignStudent.className][k]||0), 0))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <FeeInput label="Tuition Fee (₹)" value={assignForm.tuitionFee} onChange={v => setAssignForm(f => ({ ...f, tuitionFee: v }))} />
              <FeeInput label="Transport Fee (₹)" value={assignForm.transportFee} onChange={v => setAssignForm(f => ({ ...f, transportFee: v }))} />
              <FeeInput label="Lab Fee (₹)" value={assignForm.labFee} onChange={v => setAssignForm(f => ({ ...f, labFee: v }))} />
              <FeeInput label="Exam Fee (₹)" value={assignForm.examFee} onChange={v => setAssignForm(f => ({ ...f, examFee: v }))} />
              <FeeInput label="Sports Fee (₹)" value={assignForm.sportsFee} onChange={v => setAssignForm(f => ({ ...f, sportsFee: v }))} />
              <FeeInput label="Other Fee (₹)" value={assignForm.otherFee} onChange={v => setAssignForm(f => ({ ...f, otherFee: v }))} />
              <div style={{ gridColumn: '1/-1', background: '#f0fff4', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#276749' }}>Total Assigned Fee *</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#276749' }}>₹{fmt(assignTotal)}</span>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Due Date</label>
                <input type="date" value={assignForm.dueDate} onChange={e => setAssignForm(f => ({ ...f, dueDate: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Academic Year</label>
                <input value={assignForm.academicYear} onChange={e => setAssignForm(f => ({ ...f, academicYear: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Remarks</label>
                <textarea value={assignForm.remarks} onChange={e => setAssignForm(f => ({ ...f, remarks: e.target.value }))}
                  rows={2} maxLength={500} placeholder="Optional notes (e.g., scholarship, concession)"
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Dynamic installment schedule */}
              <div style={{ gridColumn: '1/-1', borderTop: '1px dashed var(--border-strong)', paddingTop: 14, marginTop: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Installment Schedule
                    <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>(optional)</span>
                  </div>
                  <button type="button" onClick={addInstallment}
                    style={{ fontSize: 12, color: '#0de1e8', background: 'none', border: '1px solid #0de1e8', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                    + Add Term
                  </button>
                </div>

                {installments.map((inst, idx) => (
                  <div key={inst.id ?? idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 30px', gap: 6, alignItems: 'end', marginBottom: 8 }}>
                    <div>
                      {idx === 0 && <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>Term Name</label>}
                      <input
                        value={inst.termName}
                        onChange={e => updateInstallment(idx, 'termName', e.target.value)}
                        placeholder="e.g. Term 1"
                        style={{ width: '100%', padding: '7px 10px', border: `1.5px solid ${String(inst.status || '').toUpperCase() === 'PAID' ? '#68d391' : 'var(--border-strong)'}`, borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: String(inst.status || '').toUpperCase() === 'PAID' ? '#f0fff4' : 'var(--surface)' }}
                      />
                    </div>
                    <div>
                      {idx === 0 && <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>Amount (₹)</label>}
                      <input
                        type="number" min="0"
                        value={inst.amount}
                        onChange={e => updateInstallment(idx, 'amount', e.target.value)}
                        placeholder="0"
                        disabled={String(inst.status || '').toUpperCase() === 'PAID'}
                        style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--border-strong)', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: String(inst.status || '').toUpperCase() === 'PAID' ? 'var(--surface-alt)' : 'var(--surface)' }}
                      />
                    </div>
                    <div>
                      {idx === 0 && <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>Due Date</label>}
                      <input
                        type="date"
                        value={inst.dueDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => updateInstallment(idx, 'dueDate', e.target.value)}
                        disabled={String(inst.status || '').toUpperCase() === 'PAID'}
                        style={{ width: '100%', padding: '7px 8px', border: '1.5px solid var(--border-strong)', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box', background: String(inst.status || '').toUpperCase() === 'PAID' ? 'var(--surface-alt)' : 'var(--surface)' }}
                      />
                    </div>
                    <div>
                      {idx === 0 && <div style={{ height: 20 }} />}
                      {String(inst.status || '').toUpperCase() === 'PAID' ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 32, fontSize: 16 }} title="Paid">✅</span>
                      ) : (
                        <button type="button" onClick={() => removeInstallment(idx)}
                          style={{ width: 30, height: 32, border: 'none', background: '#fff5f5', borderRadius: 6, color: '#e53e3e', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      )}
                    </div>
                  </div>
                ))}

                {installments.some(i => i.amount && Number(i.amount) > 0) && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>Installment total: ₹{fmt(installments.reduce((s, i) => s + Number(i.amount || 0), 0))}</span>
                    {assignTotal > 0 &&
                     Math.abs(Math.round(installments.reduce((s, i) => s + Number(i.amount || 0), 0) * 100) - Math.round(assignTotal * 100)) > 0 && (
                      <span style={{ color: '#e53e3e' }}>⚠ Does not match total fee (₹{fmt(assignTotal)})</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAssignModal(false)} style={{ padding: '9px 20px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={saveAssignment} disabled={saving} style={{ padding: '9px 22px', background: '#0de1e8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : assignTarget ? 'Update Assignment' : 'Assign Fee'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══ Delete Confirmation Modal ══ */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-card" style={{ background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 400, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <span className="material-icons" style={{ color: '#e53e3e', fontSize: 28 }}>delete_forever</span>
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>Delete Fee Assignment?</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                This will permanently delete the fee assignment for <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm.studentName}</strong>. This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting} style={{ flex: 1, padding: '10px 0', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={deleteAssignment} disabled={deleting} style={{ flex: 1, padding: '10px 0', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
