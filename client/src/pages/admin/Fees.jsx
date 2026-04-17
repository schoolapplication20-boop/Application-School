import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { adminAPI } from '../../services/api';

/* ── helpers ── */
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const currentYear = new Date().getFullYear();
const CURRENT_YEAR = `${currentYear}-${String(currentYear + 1).slice(-2)}`;

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

const FeeInput = ({ label, value, onChange }) => (
  <div>
    <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>{label}</label>
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0', fontSize: 13 }}>₹</span>
      <input
        type="number" min="0" value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '8px 10px 8px 24px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
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

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTarget, setAssignTarget]       = useState(null); // existing assignment or null
  const [assignStudentSearch, setAssignStudentSearch]   = useState('');
  const [assignStudentResults, setAssignStudentResults] = useState([]);
  const [assignStudent, setAssignStudent]     = useState(null);
  const [assignForm, setAssignForm]           = useState({ totalFee: '', dueDate: '', remarks: '', academicYear: CURRENT_YEAR });
  const [assignSearching, setAssignSearching] = useState(false);

  // Installment schedule state
  const [installments, setInstallments] = useState([
    { termName: 'Term 1', amount: '', dueDate: '' },
    { termName: 'Term 2', amount: '', dueDate: '' },
    { termName: 'Term 3', amount: '', dueDate: '' },
  ]);
  const addInstallment = () =>
    setInstallments(prev => [...prev, { termName: `Term ${prev.length + 1}`, amount: '', dueDate: '' }]);
  const removeInstallment = (idx) =>
    setInstallments(prev => prev.filter((_, i) => i !== idx));
  const updateInstallment = (idx, field, value) =>
    setInstallments(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type, id }

  const showToast = (message, type = 'success') => setToast({ message, type });

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
  const uniqueClasses = useMemo(() => [...new Set(classList.map(c => c.name))].sort(), [classList]);

  /* ── structure map: className → ClassFeeStructure ── */
  const structureMap = useMemo(() => {
    const m = {};
    structures.forEach(s => { m[s.className] = s; });
    return m;
  }, [structures]);

  /* ── filtered assignments ── */
  const filteredAssignments = useMemo(() => assignments.filter(a => {
    if (filterClass && a.className !== filterClass) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (search && !a.studentName?.toLowerCase().includes(search.toLowerCase()) &&
        !a.rollNumber?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [assignments, filterClass, filterStatus, search]);

  /* ── stats ── */
  const stats = useMemo(() => {
    const totalBilled = assignments.reduce((s, a) => s + Number(a.totalFee || 0), 0);
    const totalPaid   = assignments.reduce((s, a) => s + Number(a.paidAmount || 0), 0);
    const totalDue    = totalBilled - totalPaid;
    const paid        = assignments.filter(a => a.status === 'PAID').length;
    return { totalBilled, totalPaid, totalDue, paid, total: assignments.length };
  }, [assignments]);

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
    setShowFeeModal(true);
  };

  const saveFeeStructure = async () => {
    setSaving(true);
    try {
      await adminAPI.saveClassFeeStructure({ className: feeModalClassName, academicYear: CURRENT_YEAR, ...feeForm });
      showToast('Fee structure saved');
      setShowFeeModal(false);
      loadStructures();
    } catch { showToast('Failed to save fee structure', 'error'); } finally { setSaving(false); }
  };

  /* ── assign fee modal ── */
  const openAssignModal = async (assignment = null) => {
    setAssignTarget(assignment);
    setAssignStudent(assignment ? { id: assignment.studentId, name: assignment.studentName, rollNumber: assignment.rollNumber, className: assignment.className } : null);
    setAssignForm({
      totalFee:     assignment?.totalFee    ?? '',
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
            termName: i.termName,
            amount:   String(i.amount),
            dueDate:  i.dueDate || '',
            status:   i.status,
          })));
        } else {
          setInstallments([{ termName: 'Term 1', amount: '', dueDate: '' }]);
        }
      } catch {
        setInstallments([{ termName: 'Term 1', amount: '', dueDate: '' }]);
      }
    } else {
      setInstallments([
        { termName: 'Term 1', amount: '', dueDate: '' },
        { termName: 'Term 2', amount: '', dueDate: '' },
        { termName: 'Term 3', amount: '', dueDate: '' },
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
    if (cfs && !assignForm.totalFee) {
      const total = ['tuitionFee','transportFee','labFee','examFee','sportsFee','otherFee']
        .reduce((sum, k) => sum + Number(cfs[k] || 0), 0);
      setAssignForm(f => ({ ...f, totalFee: total }));
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
    if (!assignForm.totalFee) { showToast('Enter total fee', 'error'); return; }
    setSaving(true);
    try {
      // Only send installments that have both a name and an amount
      const filledInstallments = installments
        .filter(i => i.termName?.trim() && i.amount && Number(i.amount) > 0)
        .map(i => ({ termName: i.termName.trim(), amount: i.amount, dueDate: i.dueDate || null }));

      await adminAPI.assignStudentFee({
        studentId: assignStudent.id,
        ...assignForm,
        installments: filledInstallments.length > 0 ? filledInstallments : undefined,
      });
      showToast(assignTarget ? 'Fee updated' : 'Fee assigned');
      setShowAssignModal(false);
      loadAssignments();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to save assignment';
      showToast(msg, 'error');
    } finally { setSaving(false); }
  };

  /* ── tab bar ── */
  const TAB_STYLE = (active) => ({
    padding: '8px 20px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
    borderBottom: active ? '2.5px solid #76C442' : '2.5px solid transparent',
    color: active ? '#276749' : '#718096', background: 'none',
  });

  /* ── stat card ── */
  const StatCard = ({ label, value, color, icon }) => (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 160 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-icons" style={{ color, fontSize: 22 }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#2d3748', marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );

  return (
    <Layout pageTitle="Fees & Payments">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ padding: '20px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a202c' }}>Fees & Payments</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#a0aec0' }}>Manage class fee structures and student fee assignments</p>
          </div>
          {tab === 'students' && (
            <button onClick={() => openAssignModal()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#76C442', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <span className="material-icons" style={{ fontSize: 18 }}>person_add</span> Assign Fee
            </button>
          )}
        </div>

        {/* Stats (students tab) */}
        {tab === 'students' && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <StatCard label="Total Billed"   value={`₹${fmt(stats.totalBilled)}`} color="#76C442" icon="receipt_long" />
            <StatCard label="Total Collected" value={`₹${fmt(stats.totalPaid)}`}  color="#3182ce" icon="payments"     />
            <StatCard label="Total Due"       value={`₹${fmt(stats.totalDue)}`}   color="#e53e3e" icon="pending"      />
            <StatCard label="Paid Students"   value={`${stats.paid}/${stats.total}`} color="#805ad5" icon="check_circle" />
          </div>
        )}

        {/* Tab bar */}
        <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
          <button style={TAB_STYLE(tab === 'structure')} onClick={() => setTab('structure')}>Fee Structure</button>
          <button style={TAB_STYLE(tab === 'students')}  onClick={() => setTab('students')}>Student Fees</button>
          <button style={TAB_STYLE(tab === 'history')}   onClick={() => setTab('history')}>Payment History</button>
        </div>

        {/* ── TAB 1: Fee Structure ── */}
        {tab === 'structure' && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#2d3748' }}>Class-wise Annual Fee Structure ({CURRENT_YEAR})</span>
            </div>
            {structLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>Loading...</div>
            ) : uniqueClasses.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>No classes created yet. Add classes first.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f7fafc' }}>
                      {['Class','Tuition','Transport','Lab','Exam','Sports','Other','Total Fee','Action'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Class' ? 'left' : 'right', fontWeight: 700, color: '#718096', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
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
                        <tr key={cls} style={{ borderBottom: '1px solid #f0f4f8' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2d3748' }}>{cls}</td>
                          {['tuitionFee','transportFee','labFee','examFee','sportsFee','otherFee'].map(k => (
                            <td key={k} style={{ padding: '12px 14px', textAlign: 'right', color: s ? '#4a5568' : '#cbd5e0' }}>
                              {s ? `₹${fmt(s[k])}` : '—'}
                            </td>
                          ))}
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#276749' }}>
                            {s ? `₹${fmt(total)}` : '—'}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <button onClick={() => openFeeModal(cls)} style={{ padding: '5px 14px', background: s ? '#76C44218' : '#76C442', color: s ? '#276749' : '#fff', border: s ? '1px solid #76C44240' : 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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
            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                placeholder="Search student or roll no..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: '8px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}
              />
              <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}>
                <option value="">All Classes</option>
                {uniqueClasses.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}>
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              {assignLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>Loading...</div>
              ) : filteredAssignments.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>
                  <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>payments</span>
                  {assignments.length === 0 ? 'No fee assignments yet. Click "Assign Fee" to get started.' : 'No matching records.'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f7fafc' }}>
                        {['Student','Roll No','Class','Total Fee','Paid','Due Amount','Status','Actions'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: ['Total Fee','Paid','Due Amount'].includes(h) ? 'right' : 'left', fontWeight: 700, color: '#718096', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssignments.map(a => {
                        const due = Number(a.totalFee || 0) - Number(a.paidAmount || 0);
                        return (
                          <tr key={a.id} style={{ borderBottom: '1px solid #f0f4f8' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2d3748' }}>{a.studentName}</td>
                            <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: '#718096' }}>{a.rollNumber || '—'}</td>
                            <td style={{ padding: '12px 14px', color: '#4a5568' }}>{a.className}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#2d3748' }}>₹{fmt(a.totalFee)}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', color: '#276749', fontWeight: 600 }}>₹{fmt(a.paidAmount)}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', color: due > 0 ? '#e53e3e' : '#276749', fontWeight: 700 }}>₹{fmt(due)}</td>
                            <td style={{ padding: '12px 14px' }}><StatusBadge status={a.status} /></td>
                            <td style={{ padding: '12px 14px' }}>
                              <button onClick={() => openAssignModal(a)} title="Edit Assignment" style={{ border: 'none', background: '#76C44218', color: '#276749', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                Edit
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
          </div>
        )}

        {/* ── TAB 3: Payment History ── */}
        {tab === 'history' && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f4f8' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#2d3748' }}>All Payment Transactions</span>
            </div>
            {payLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>Loading...</div>
            ) : payments.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>No payment transactions recorded yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f7fafc' }}>
                      {['Date','Student','Class','Amount Paid','Receipt No','Mode','Received By','Remarks'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Amount Paid' ? 'right' : 'left', fontWeight: 700, color: '#718096', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f0f4f8' }}>
                        <td style={{ padding: '12px 14px', color: '#4a5568', whiteSpace: 'nowrap' }}>{p.paymentDate || '—'}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2d3748' }}>{p.studentName}</td>
                        <td style={{ padding: '12px 14px', color: '#4a5568' }}>{p.className}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#276749' }}>₹{fmt(p.amountPaid)}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#718096' }}>{p.receiptNumber}</td>
                        <td style={{ padding: '12px 14px', color: '#4a5568' }}>{p.paymentMode || '—'}</td>
                        <td style={{ padding: '12px 14px', color: '#4a5568' }}>{p.receivedBy || '—'}</td>
                        <td style={{ padding: '12px 14px', color: '#a0aec0', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.remarks || '—'}</td>
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
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1a202c' }}>Set Fee Structure</h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#a0aec0' }}>{feeModalClassName} · {CURRENT_YEAR}</p>
              </div>
              <button onClick={() => setShowFeeModal(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#a0aec0' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {[['tuitionFee','Tuition Fee'],['transportFee','Transport Fee'],['labFee','Lab Fee'],['examFee','Exam Fee'],['sportsFee','Sports Fee'],['otherFee','Other Fee']].map(([k, label]) => (
                <FeeInput key={k} label={label} value={feeForm[k]} onChange={v => setFeeForm(f => ({ ...f, [k]: v }))} />
              ))}
            </div>
            {/* Total preview */}
            <div style={{ background: '#f0fff4', border: '1.5px solid #76C44240', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#276749', fontSize: 14 }}>Total Annual Fee</span>
              <span style={{ fontWeight: 800, color: '#276749', fontSize: 18 }}>
                ₹{fmt(Object.values(feeForm).reduce((sum, v) => sum + Number(v || 0), 0))}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowFeeModal(false)} style={{ padding: '9px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#4a5568', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={saveFeeStructure} disabled={saving} style={{ padding: '9px 22px', background: '#76C442', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
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
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 460, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1a202c' }}>{assignTarget ? 'Edit Fee Assignment' : 'Assign Fee to Student'}</h3>
              <button onClick={() => setShowAssignModal(false)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#a0aec0' }}>×</button>
            </div>

            {/* Student search (hide if editing) */}
            {!assignTarget && (
              <div style={{ marginBottom: 16, position: 'relative' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Student *</label>
                <input
                  placeholder="Search by name, roll no, or phone..."
                  value={assignStudentSearch}
                  onChange={e => { setAssignStudentSearch(e.target.value); searchAssignStudents(e.target.value); }}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
                {assignSearching && <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-25%)', color: '#a0aec0', fontSize: 12 }}>Searching...</div>}
                {assignStudentResults.length > 0 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                    {assignStudentResults.map(s => (
                      <div key={s.id} onClick={() => handleStudentSelect(s)}
                           style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f4f8' }}
                           onMouseEnter={e => e.currentTarget.style.background = '#f7fafc'}
                           onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                        <div style={{ fontWeight: 700, color: '#2d3748', fontSize: 13 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2, display: 'flex', gap: 8 }}>
                          <span>Class: <strong style={{ color: '#4a5568' }}>{s.className}</strong></span>
                          {s.section && <span>Section: <strong style={{ color: '#4a5568' }}>{s.section}</strong></span>}
                          {s.rollNumber && <span>Roll: <strong style={{ color: '#4a5568' }}>{s.rollNumber}</strong></span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected student info */}
            {assignStudent && (
              <div style={{ background: '#f7fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#2d3748' }}>{assignStudent.name}</div>
                  <div style={{ fontSize: 12, color: '#718096', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>Class: <strong style={{ color: '#2d3748' }}>{assignStudent.className}</strong></span>
                    {assignStudent.section && <span>Section: <strong style={{ color: '#2d3748' }}>{assignStudent.section}</strong></span>}
                    {assignStudent.rollNumber && <span>Roll No: <strong style={{ color: '#2d3748' }}>{assignStudent.rollNumber}</strong></span>}
                  </div>
                </div>
                {/* Class fee hint */}
                {structureMap[assignStudent.className] && (
                  <div style={{ fontSize: 11, color: '#76C442', fontWeight: 600 }}>
                    Class fee: ₹{fmt(['tuitionFee','transportFee','labFee','examFee','sportsFee','otherFee'].reduce((s,k) => s + Number(structureMap[assignStudent.className][k]||0), 0))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Assigned Total Fee (₹) *</label>
                <input
                  type="number" min="0"
                  value={assignForm.totalFee}
                  onChange={e => setAssignForm(f => ({ ...f, totalFee: e.target.value }))}
                  placeholder="Enter negotiated/final fee"
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                />
                <p style={{ fontSize: 11, color: '#a0aec0', margin: '4px 0 0' }}>You can override the class fee with a negotiated amount.</p>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Due Date</label>
                <input type="date" value={assignForm.dueDate} onChange={e => setAssignForm(f => ({ ...f, dueDate: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Academic Year</label>
                <input value={assignForm.academicYear} onChange={e => setAssignForm(f => ({ ...f, academicYear: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Remarks</label>
                <textarea value={assignForm.remarks} onChange={e => setAssignForm(f => ({ ...f, remarks: e.target.value }))}
                  rows={2} placeholder="Optional notes (e.g., scholarship, concession)"
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Dynamic installment schedule */}
              <div style={{ gridColumn: '1/-1', borderTop: '1px dashed #e2e8f0', paddingTop: 14, marginTop: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Installment Schedule
                    <span style={{ fontSize: 11, fontWeight: 400, color: '#a0aec0', textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>(optional)</span>
                  </div>
                  <button type="button" onClick={addInstallment}
                    style={{ fontSize: 12, color: '#76C442', background: 'none', border: '1px solid #76C442', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                    + Add Term
                  </button>
                </div>

                {installments.map((inst, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 30px', gap: 6, alignItems: 'end', marginBottom: 8 }}>
                    <div>
                      {idx === 0 && <label style={{ fontSize: 11, fontWeight: 600, color: '#718096', display: 'block', marginBottom: 3 }}>Term Name</label>}
                      <input
                        value={inst.termName}
                        onChange={e => updateInstallment(idx, 'termName', e.target.value)}
                        placeholder="e.g. Term 1"
                        style={{ width: '100%', padding: '7px 10px', border: `1.5px solid ${inst.status === 'PAID' ? '#68d391' : '#e2e8f0'}`, borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: inst.status === 'PAID' ? '#f0fff4' : '#fff' }}
                      />
                    </div>
                    <div>
                      {idx === 0 && <label style={{ fontSize: 11, fontWeight: 600, color: '#718096', display: 'block', marginBottom: 3 }}>Amount (₹)</label>}
                      <input
                        type="number" min="0"
                        value={inst.amount}
                        onChange={e => updateInstallment(idx, 'amount', e.target.value)}
                        placeholder="0"
                        disabled={inst.status === 'PAID'}
                        style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 13, outline: 'none', boxSizing: 'border-box', background: inst.status === 'PAID' ? '#f7fafc' : '#fff' }}
                      />
                    </div>
                    <div>
                      {idx === 0 && <label style={{ fontSize: 11, fontWeight: 600, color: '#718096', display: 'block', marginBottom: 3 }}>Due Date</label>}
                      <input
                        type="date"
                        value={inst.dueDate}
                        onChange={e => updateInstallment(idx, 'dueDate', e.target.value)}
                        disabled={inst.status === 'PAID'}
                        style={{ width: '100%', padding: '7px 8px', border: '1.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, outline: 'none', boxSizing: 'border-box', background: inst.status === 'PAID' ? '#f7fafc' : '#fff' }}
                      />
                    </div>
                    <div>
                      {idx === 0 && <div style={{ height: 20 }} />}
                      {inst.status === 'PAID' ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 32, fontSize: 16 }} title="Paid">✅</span>
                      ) : (
                        <button type="button" onClick={() => removeInstallment(idx)}
                          style={{ width: 30, height: 32, border: 'none', background: '#fff5f5', borderRadius: 6, color: '#e53e3e', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      )}
                    </div>
                  </div>
                ))}

                {installments.some(i => i.amount && Number(i.amount) > 0) && (
                  <div style={{ fontSize: 12, color: '#718096', marginTop: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>Installment total: ₹{fmt(installments.reduce((s, i) => s + Number(i.amount || 0), 0))}</span>
                    {Number(assignForm.totalFee) > 0 &&
                     Math.abs(installments.reduce((s, i) => s + Number(i.amount || 0), 0) - Number(assignForm.totalFee)) > 0.01 && (
                      <span style={{ color: '#e53e3e' }}>⚠ Does not match total fee (₹{fmt(assignForm.totalFee)})</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAssignModal(false)} style={{ padding: '9px 20px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#4a5568', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={saveAssignment} disabled={saving} style={{ padding: '9px 22px', background: '#76C442', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : assignTarget ? 'Update Assignment' : 'Assign Fee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
