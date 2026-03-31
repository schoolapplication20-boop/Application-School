import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import {
  fetchFees as apiFetchFees,
  createFee as apiCreateFee,
  updateFee as apiUpdateFee,
  deleteFee as apiDeleteFee,
} from '../../services/feeService';
import { adminAPI } from '../../services/api';

// ─── Normalize backend field names → frontend field names ──────────────────
const normFee = (f) => ({
  ...f,
  student:    f.studentName  ?? f.student    ?? '',
  rollNo:     f.rollNumber   ?? f.rollNo     ?? '',
  class:      f.className    ?? f.class      ?? '',
  type:       f.feeType      ?? f.type       ?? '',
  amount:     parseFloat(f.amount      ?? 0),
  paidAmount: parseFloat(f.paidAmount  ?? 0),
});

// ─── Fee structure ─────────────────────────────────────────────────────────────
const FEE_STRUCTURE = [
  { id: 1, class: 'Class 6–7',  tuition: 10000, transport: 3500, lab: 1500, exam: 1000, sports: 500 },
  { id: 2, class: 'Class 8–9',  tuition: 12000, transport: 3500, lab: 2000, exam: 1000, sports: 500 },
  { id: 3, class: 'Class 10',   tuition: 15000, transport: 3500, lab: 2000, exam: 1500, sports: 500 },
  { id: 4, class: 'Class 11–12',tuition: 18000, transport: 3500, lab: 3000, exam: 2000, sports: 500 },
];

const FEE_TYPES    = ['Tuition Fee', 'Transport Fee', 'Lab Fee', 'Exam Fee', 'Library Fee', 'Sports Fee'];
const PAY_METHODS  = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Online'];
const PERIOD_VIEWS = [
  { key: 'day',   label: 'Day-wise'   },
  { key: 'week',  label: 'Week-wise'  },
  { key: 'month', label: 'Month-wise' },
  { key: 'year',  label: 'Year-wise'  },
];

// ─── Date helpers ──────────────────────────────────────────────────────────────
const fmt   = (iso) => { if (!iso) return '—'; return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
const inr   = (n)   => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const TODAY = new Date().toISOString().split('T')[0];

const weekStart = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); // Monday
  return d.toISOString().split('T')[0];
};

const periodKey = (iso, view) => {
  if (!iso) return null;
  switch (view) {
    case 'day':   return iso;
    case 'week':  return weekStart(iso);
    case 'month': return iso.slice(0, 7);           // YYYY-MM
    case 'year':  return iso.slice(0, 4);            // YYYY
    default:      return iso;
  }
};

const periodLabel = (key, view) => {
  switch (view) {
    case 'day': {
      const d = new Date(key + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    }
    case 'week': {
      const ws = new Date(key + 'T00:00:00');
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      return `${fmt(key)} – ${fmt(we.toISOString().split('T')[0])}`;
    }
    case 'month': {
      const [y, m] = key.split('-');
      return new Date(+y, +m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
    case 'year': return `FY ${key}`;
    default: return key;
  }
};

const getInitials = (name) => (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const STATUS_STYLE = {
  PAID:    { cls: 'status-paid',    bg: '#f0fff4', text: '#276749' },
  PENDING: { cls: 'status-pending', bg: '#fffaf0', text: '#c05621' },
  OVERDUE: { cls: 'status-overdue', bg: '#fff5f5', text: '#c53030' },
};

const EMPTY_FORM = { studentId: null, student: '', rollNo: '', class: '', type: 'Tuition Fee', amount: '', month: '', dueDate: '', status: 'PENDING', paymentMethod: '', paidDate: '' };

// ─── Mark-Paid mini-dialog (inline popover per row) ───────────────────────────
function PayDialog({ fee, onConfirm, onCancel }) {
  const [method, setMethod] = useState('Cash');
  const [date,   setDate]   = useState(TODAY);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fff4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-icons" style={{ color: '#76C442', fontSize: 22 }}>payments</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#2d3748' }}>Confirm Payment</div>
            <div style={{ fontSize: 12, color: '#718096' }}>{fee.student} — {fee.type}</div>
          </div>
        </div>

        <div style={{ background: 'linear-gradient(135deg,#76C442,#5fa832)', borderRadius: 10, padding: '14px 18px', marginBottom: 18, color: '#fff' }}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 2 }}>Amount Receiving</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{inr(fee.amount)}</div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className="form-label fw-medium small">Payment Method</label>
            <select className="form-select form-select-sm" value={method} onChange={e => setMethod(e.target.value)}>
              {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label fw-medium small">Payment Date</label>
            <input type="date" className="form-control form-control-sm" value={date} max={TODAY} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#f7fafc', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(method, date)} style={{ flex: 1, padding: '10px', background: '#76C442', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(118,196,66,0.35)' }}>
            ✓ Confirm Paid
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Fees() {
  const [fees, setFees]               = useState([]);
  const [activeTab, setActiveTab]     = useState('payments');
  const [periodView, setPeriodView]   = useState('month');
  const [searchTerm, setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType]   = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [histFrom, setHistFrom]       = useState('');
  const [histTo, setHistTo]           = useState(TODAY);
  const [showModal, setShowModal]     = useState(false);
  const [formData, setFormData]       = useState(EMPTY_FORM);
  const [payTarget, setPayTarget]     = useState(null); // fee being paid
  const [expandedPeriod, setExpandedPeriod] = useState(null);
  const [toast, setToast]             = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // modal student search
  const [modalQuery,       setModalQuery]       = useState('');
  const [modalSuggestions, setModalSuggestions] = useState([]);
  const [modalSearching,   setModalSearching]   = useState(false);
  const modalTimerRef = useRef();

  const showToast = (msg, type = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3500); };

  const persist = (updated) => { setFees(updated); };

  useEffect(() => {
    apiFetchFees().then(data => { if (data) setFees(data.map(normFee)); });
  }, []);

  const searchStudentsForModal = useCallback(async (q) => {
    if (!q.trim()) { setModalSuggestions([]); return; }
    setModalSearching(true);
    try {
      const res = await adminAPI.searchStudentsForFee(q);
      const data = res.data?.data ?? res.data ?? [];
      setModalSuggestions(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch { setModalSuggestions([]); }
    finally { setModalSearching(false); }
  }, []);

  const handleModalQuery = (val) => {
    setModalQuery(val);
    setFormData(prev => ({ ...prev, studentId: null, student: val, rollNo: '', class: '' }));
    clearTimeout(modalTimerRef.current);
    modalTimerRef.current = setTimeout(() => searchStudentsForModal(val), 350);
  };

  const selectModalStudent = (s) => {
    setFormData(prev => ({
      ...prev,
      studentId: s.id,
      student:   s.name || s.studentName || '',
      rollNo:    s.admissionNumber || s.rollNumber || s.rollNo || String(s.id),
      class:     `${s.className || s.class || ''}${s.section ? `-${s.section}` : ''}`,
    }));
    setModalQuery(s.name || s.studentName || '');
    setModalSuggestions([]);
  };

  // ── Stats (live from fees state) ───────────────────────────────────────────
  const stats = useMemo(() => {
    const totalBilled    = fees.reduce((s, f) => s + (f.amount || 0), 0);
    const totalCollected = fees.filter(f => f.status === 'PAID').reduce((s, f) => s + (f.paidAmount || f.amount || 0), 0);
    const totalPending   = fees.filter(f => f.status === 'PENDING').reduce((s, f) => s + (f.amount || 0), 0);
    const totalOverdue   = fees.filter(f => f.status === 'OVERDUE').reduce((s, f) => s + (f.amount || 0), 0);
    const balance        = totalBilled - totalCollected;
    const collectionRate = totalBilled ? Math.round((totalCollected / totalBilled) * 100) : 0;
    return { totalBilled, totalCollected, totalPending, totalOverdue, balance, collectionRate };
  }, [fees]);

  // ── Filtered list for All Fees tab ────────────────────────────────────────
  const filteredFees = useMemo(() => fees.filter(f => {
    const q = searchTerm.toLowerCase();
    if (q && !f.student.toLowerCase().includes(q) && !f.rollNo.toLowerCase().includes(q)) return false;
    if (filterStatus && f.status !== filterStatus) return false;
    if (filterType   && f.type   !== filterType)   return false;
    if (filterMonth  && f.month  !== filterMonth)   return false;
    return true;
  }), [fees, searchTerm, filterStatus, filterType, filterMonth]);

  // ── Payment history: only PAID fees, grouped by chosen period ─────────────
  const paidInRange = useMemo(() => fees.filter(f => {
    if (f.status !== 'PAID' || !f.paidDate) return false;
    if (histFrom && f.paidDate < histFrom) return false;
    if (histTo   && f.paidDate > histTo)   return false;
    return true;
  }), [fees, histFrom, histTo]);

  const historyGroups = useMemo(() => {
    const map = {};
    paidInRange.forEach(f => {
      const key = periodKey(f.paidDate, periodView);
      if (!key) return;
      if (!map[key]) map[key] = { key, label: periodLabel(key, periodView), items: [], total: 0, count: 0 };
      map[key].items.push(f);
      map[key].total += f.paidAmount || f.amount || 0;
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
  }, [paidInRange, periodView]);

  const historyTotal = useMemo(() => paidInRange.reduce((s, f) => s + (f.paidAmount || f.amount || 0), 0), [paidInRange]);

  // ── Unique months for filter dropdown ─────────────────────────────────────
  const uniqueMonths = useMemo(() => [...new Set(fees.map(f => f.month).filter(Boolean))].sort().reverse(), [fees]);

  // ── Mark Paid ─────────────────────────────────────────────────────────────
  const confirmPaid = async (method, date) => {
    const updates = {
      status:        'PAID',
      paidDate:      date,
      paidAmount:    payTarget.amount,
      paymentMethod: method,
    };
    const result = await apiUpdateFee(payTarget.id, updates);
    if (result.success) {
      const saved = normFee(result.data ?? { ...payTarget, ...updates });
      persist(fees.map(f => f.id === payTarget.id ? saved : f));
      showToast(`Payment of ${inr(payTarget.amount)} recorded for ${payTarget.student}`);
    } else {
      showToast(result.message || 'Failed to record payment', 'error');
    }
    setPayTarget(null);
  };

  // ── Add fee ────────────────────────────────────────────────────────────────
  const handleAddFee = async (e) => {
    e.preventDefault();
    if (!formData.studentId) { showToast('Please search and select a student', 'warning'); return; }
    if (!formData.amount)    { showToast('Amount is required', 'warning'); return; }
    const isPaid = formData.status === 'PAID';
    const payload = {
      studentId:     formData.studentId,
      feeType:       formData.type,
      amount:        parseFloat(formData.amount),
      paidAmount:    isPaid ? parseFloat(formData.amount) : 0,
      dueDate:       formData.dueDate  || null,
      status:        formData.status,
      paidDate:      isPaid ? (formData.paidDate || TODAY) : null,
      paymentMethod: isPaid ? (formData.paymentMethod || null) : null,
    };
    const result = await apiCreateFee(payload);
    if (result.success) {
      persist([...fees, normFee(result.data)]);
      setShowModal(false);
      setModalQuery('');
      setModalSuggestions([]);
      showToast('Fee record added successfully');
    } else {
      showToast(result.message || 'Failed to add fee record', 'error');
    }
  };

  // ── Delete fee ─────────────────────────────────────────────────────────────
  const handleDeleteFee = async (id) => {
    const result = await apiDeleteFee(id);
    if (result.success) {
      persist(fees.filter(f => f.id !== id));
      showToast('Fee record deleted');
    } else {
      showToast(result.message || 'Delete failed', 'error');
    }
    setDeleteTarget(null);
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const exportCSV = (rows, filename) => {
    if (!rows.length) return;
    const h = Object.keys(rows[0]);
    const csv = [h.join(','), ...rows.map(r => h.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    Object.assign(document.createElement('a'), { href: url, download: filename }).click();
    URL.revokeObjectURL(url);
    showToast('Report downloaded');
  };

  const exportAllFees = () => exportCSV(
    filteredFees.map(f => ({ Student: f.student, 'Roll No': f.rollNo, Class: f.class, Type: f.type, 'Amount Billed': f.amount, 'Amount Paid': f.paidAmount || 0, Month: f.month, 'Due Date': fmt(f.dueDate), 'Paid Date': fmt(f.paidDate), Status: f.status, Method: f.paymentMethod || '' })),
    `fees_report_${TODAY}.csv`
  );

  const exportHistory = () => exportCSV(
    paidInRange.map(f => ({ Student: f.student, 'Roll No': f.rollNo, Class: f.class, Type: f.type, Amount: f.paidAmount || f.amount, Month: f.month, 'Paid Date': fmt(f.paidDate), Method: f.paymentMethod })),
    `payment_history_${TODAY}.csv`
  );

  const TABS = [
    { key: 'payments', label: 'All Fees',        icon: 'receipt_long'   },
    { key: 'history',  label: 'Payment History', icon: 'manage_history' },
    { key: 'pending',  label: 'Pending / Overdue', icon: 'pending_actions', badge: fees.filter(f => f.status !== 'PAID').length },
    { key: 'structure',label: 'Fee Structure',   icon: 'account_balance' },
  ];

  const pendingFees = fees.filter(f => f.status !== 'PAID');

  return (
    <Layout pageTitle="Fees & Payments">
      {toast     && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {payTarget && <PayDialog fee={payTarget} onConfirm={confirmPaid} onCancel={() => setPayTarget(null)} />}

      {/* ── Delete confirm dialog ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-icons" style={{ color: '#e53e3e', fontSize: 22 }}>delete</span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#2d3748' }}>Delete Fee Record</div>
                <div style={{ fontSize: 12, color: '#718096' }}>{deleteTarget.student} — {deleteTarget.type}</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#718096', marginBottom: 20 }}>
              This will permanently delete the fee record of <strong>{inr(deleteTarget.amount)}</strong>. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '10px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#f7fafc', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => handleDeleteFee(deleteTarget.id)} style={{ flex: 1, padding: '10px', background: '#e53e3e', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <h1>Fee Management</h1>
        <p>Track student fee payments, dues and complete payment history</p>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {/* Collected – large gradient card */}
        <div style={{ background: 'linear-gradient(135deg,#76C442,#5fa832)', borderRadius: 16, padding: '24px 28px', color: '#fff', position: 'relative', overflow: 'hidden', gridRow: '1/3' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <span className="material-icons" style={{ fontSize: 28, opacity: 0.85, marginBottom: 8, display: 'block' }}>payments</span>
          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>Total Collected</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 10 }}>{inr(stats.totalCollected)}</div>
          {/* collection rate bar */}
          <div style={{ height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 3, marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${stats.collectionRate}%`, background: '#fff', borderRadius: 3, transition: 'width 0.5s' }} />
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{stats.collectionRate}% collection rate of {inr(stats.totalBilled)} billed</div>
        </div>

        {[
          { label: 'Pending',       value: inr(stats.totalPending),  icon: 'pending',  color: '#ed8936', bg: '#fffaf0' },
          { label: 'Overdue',       value: inr(stats.totalOverdue),  icon: 'warning',  color: '#e53e3e', bg: '#fff5f5' },
          { label: 'Total Billed',  value: inr(stats.totalBilled),   icon: 'receipt',  color: '#3182ce', bg: '#ebf8ff' },
          { label: 'Balance Due',   value: inr(stats.balance),       icon: 'account_balance', color: '#805ad5', bg: '#faf5ff' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, border: `1.5px solid ${c.color}25`, borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: c.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-icons" style={{ color: c.color, fontSize: 22 }}>{c.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#2d3748' }}>{c.value}</div>
              <div style={{ fontSize: 12, color: c.color, fontWeight: 600, marginTop: 2 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', borderRadius: 12, padding: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
            background: activeTab === t.key ? '#76C442' : 'transparent',
            color:      activeTab === t.key ? '#fff'    : '#718096',
            transition: 'all 0.2s',
          }}>
            <span className="material-icons" style={{ fontSize: 17 }}>{t.icon}</span>
            {t.label}
            {t.badge > 0 && (
              <span style={{ background: activeTab === t.key ? 'rgba(255,255,255,0.3)' : '#e53e3e', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 800, padding: '1px 6px' }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════ ALL FEES TAB ══════════════════ */}
      {activeTab === 'payments' && (
        <div className="data-table-card">
          <div className="search-filter-bar">
            <div className="search-input-wrapper">
              <span className="material-icons">search</span>
              <input type="text" className="search-input" placeholder="Search student or roll no…"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {FEE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select className="filter-select" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              <option value="">All Months</option>
              {uniqueMonths.map(m => <option key={m}>{m}</option>)}
            </select>
            <button onClick={exportAllFees} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', background: '#276749', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              <span className="material-icons" style={{ fontSize: 15 }}>download</span> CSV
            </button>
            <button className="btn-add" onClick={() => { setFormData(EMPTY_FORM); setShowModal(true); }}>
              <span className="material-icons">add</span> Add Fee
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th><th>Class</th><th>Fee Type</th><th>Month</th>
                  <th>Amount</th><th>Paid</th><th>Balance</th>
                  <th>Due Date</th><th>Paid Date</th><th>Method</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFees.length === 0 ? (
                  <tr><td colSpan={12}><div className="empty-state"><span className="material-icons">search_off</span><h3>No records found</h3></div></td></tr>
                ) : filteredFees.map(f => {
                  const balance = (f.amount || 0) - (f.paidAmount || 0);
                  return (
                    <tr key={f.id} style={{ background: f.status === 'PAID' ? '#fafffe' : f.status === 'OVERDUE' ? '#fff8f8' : 'transparent' }}>
                      <td>
                        <div className="student-cell">
                          <div className="student-avatar-sm" style={{ background: f.status === 'PAID' ? '#76C442' : f.status === 'OVERDUE' ? '#e53e3e' : '#ed8936' }}>
                            {getInitials(f.student)}
                          </div>
                          <div>
                            <div className="student-name">{f.student}</div>
                            <div className="student-class">{f.rollNo}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 600 }}>{f.class}</td>
                      <td style={{ fontSize: 12, color: '#718096' }}>{f.type}</td>
                      <td style={{ fontSize: 12, color: '#718096' }}>{f.month || '—'}</td>
                      <td style={{ fontWeight: 700, color: '#2d3748' }}>{inr(f.amount)}</td>
                      <td style={{ fontWeight: 700, color: '#76C442' }}>{f.paidAmount ? inr(f.paidAmount) : '—'}</td>
                      <td>
                        {balance > 0
                          ? <span style={{ fontWeight: 700, color: '#e53e3e', fontSize: 13 }}>{inr(balance)}</span>
                          : <span style={{ color: '#76C442', fontSize: 13 }}>✓ Nil</span>
                        }
                      </td>
                      <td style={{ fontSize: 12, color: f.status === 'OVERDUE' ? '#e53e3e' : '#718096', fontWeight: f.status === 'OVERDUE' ? 600 : 400 }}>{fmt(f.dueDate)}</td>
                      <td style={{ fontSize: 12, color: '#76C442' }}>{fmt(f.paidDate)}</td>
                      <td style={{ fontSize: 11 }}>
                        {f.paymentMethod
                          ? <span style={{ background: '#ebf8ff', color: '#2b6cb0', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{f.paymentMethod}</span>
                          : <span style={{ color: '#cbd5e0' }}>—</span>}
                      </td>
                      <td><span className={`status-badge ${STATUS_STYLE[f.status]?.cls}`}>{f.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {f.status !== 'PAID' && (
                            <button onClick={() => setPayTarget(f)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#76C44215', border: '1px solid #76C44240', borderRadius: 7, color: '#276749', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              <span className="material-icons" style={{ fontSize: 14 }}>payments</span> Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(f)}
                            title="Delete fee record"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 7, color: '#e53e3e', cursor: 'pointer', flexShrink: 0 }}
                          >
                            <span className="material-icons" style={{ fontSize: 16 }}>delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals footer */}
          {filteredFees.length > 0 && (
            <div style={{ display: 'flex', gap: 24, padding: '14px 12px 0', borderTop: '1px solid #f0f4f8', marginTop: 8, flexWrap: 'wrap' }}>
              {[
                ['Records', filteredFees.length, '#4a5568'],
                ['Total Billed',    inr(filteredFees.reduce((s,f) => s+(f.amount||0), 0)),      '#3182ce'],
                ['Total Collected', inr(filteredFees.filter(f=>f.status==='PAID').reduce((s,f)=>s+(f.paidAmount||f.amount||0),0)), '#76C442'],
                ['Balance Due',     inr(filteredFees.filter(f=>f.status!=='PAID').reduce((s,f)=>s+(f.amount||0),0)), '#e53e3e'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ fontSize: 13 }}>
                  <span style={{ color: '#a0aec0' }}>{l}: </span>
                  <span style={{ fontWeight: 700, color: c }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ PAYMENT HISTORY TAB ══════════════════ */}
      {activeTab === 'history' && (
        <div>
          {/* Period picker + date filters */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 20px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label className="form-label fw-medium small mb-1">View By</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {PERIOD_VIEWS.map(v => (
                  <button key={v.key} onClick={() => { setPeriodView(v.key); setExpandedPeriod(null); }} style={{
                    padding: '7px 14px', border: `1.5px solid ${periodView === v.key ? '#76C442' : '#e2e8f0'}`,
                    borderRadius: 8, background: periodView === v.key ? '#76C442' : '#fafafa',
                    color: periodView === v.key ? '#fff' : '#718096', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  }}>{v.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label fw-medium small mb-1">From</label>
              <input type="date" className="filter-select" value={histFrom} onChange={e => setHistFrom(e.target.value)} />
            </div>
            <div>
              <label className="form-label fw-medium small mb-1">To</label>
              <input type="date" className="filter-select" value={histTo} max={TODAY} onChange={e => setHistTo(e.target.value)} />
            </div>
            <button onClick={exportHistory} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#276749', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              <span className="material-icons" style={{ fontSize: 16 }}>download</span> Export CSV
            </button>
          </div>

          {/* Summary banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
            {[
              { label: 'Total Payments',    value: paidInRange.length,      color: '#3182ce', icon: 'receipt_long' },
              { label: 'Amount Collected',  value: inr(historyTotal),       color: '#76C442', icon: 'payments'     },
              { label: 'Periods Shown',     value: historyGroups.length,    color: '#805ad5', icon: 'date_range'   },
            ].map(c => (
              <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: c.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-icons" style={{ color: c.color, fontSize: 20 }}>{c.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#2d3748' }}>{c.value}</div>
                  <div style={{ fontSize: 12, color: '#a0aec0' }}>{c.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Period group table */}
          <div className="data-table-card">
            {historyGroups.length === 0 ? (
              <div className="empty-state"><span className="material-icons">manage_history</span><h3>No payments in this range</h3></div>
            ) : (
              <>
                {historyGroups.map(group => (
                  <div key={group.key} style={{ marginBottom: 4 }}>
                    {/* Period header row — click to expand/collapse */}
                    <div
                      onClick={() => setExpandedPeriod(expandedPeriod === group.key ? null : group.key)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: expandedPeriod === group.key ? '#f0fff4' : '#f7fafc', borderRadius: expandedPeriod === group.key ? '12px 12px 0 0' : 12, cursor: 'pointer', border: `1.5px solid ${expandedPeriod === group.key ? '#9ae6b4' : '#f0f4f8'}`, transition: 'all 0.15s', userSelect: 'none' }}
                    >
                      <span className="material-icons" style={{ color: '#76C442', fontSize: 20 }}>
                        {expandedPeriod === group.key ? 'expand_less' : 'expand_more'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <span className="material-icons" style={{ color: '#76C442', fontSize: 18 }}>date_range</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#2d3748' }}>{group.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: '#a0aec0' }}>Payments</div>
                          <div style={{ fontWeight: 700, color: '#3182ce', fontSize: 16 }}>{group.count}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: '#a0aec0' }}>Total Collected</div>
                          <div style={{ fontWeight: 800, color: '#76C442', fontSize: 18 }}>{inr(group.total)}</div>
                        </div>
                        <div style={{ width: 100, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: historyTotal ? `${(group.total / historyTotal) * 100}%` : '0%', background: '#76C442', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#76C442', minWidth: 36 }}>
                          {historyTotal ? Math.round((group.total / historyTotal) * 100) : 0}%
                        </span>
                      </div>
                    </div>

                    {/* Expanded rows */}
                    {expandedPeriod === group.key && (
                      <div style={{ border: '1.5px solid #9ae6b4', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                        <table className="data-table" style={{ marginBottom: 0 }}>
                          <thead>
                            <tr>
                              <th>Student</th><th>Class</th><th>Fee Type</th><th>Month</th>
                              <th>Amount</th><th>Paid Date</th><th>Method</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.sort((a,b) => b.paidDate?.localeCompare(a.paidDate)).map(f => (
                              <tr key={f.id}>
                                <td>
                                  <div className="student-cell">
                                    <div className="student-avatar-sm" style={{ background: '#76C442' }}>{getInitials(f.student)}</div>
                                    <div>
                                      <div className="student-name">{f.student}</div>
                                      <div className="student-class">{f.rollNo}</div>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ fontWeight: 600, fontSize: 13 }}>{f.class}</td>
                                <td style={{ fontSize: 12, color: '#718096' }}>{f.type}</td>
                                <td style={{ fontSize: 12, color: '#718096' }}>{f.month}</td>
                                <td style={{ fontWeight: 800, color: '#76C442', fontSize: 14 }}>{inr(f.paidAmount || f.amount)}</td>
                                <td style={{ fontSize: 12, color: '#4a5568' }}>{fmt(f.paidDate)}</td>
                                <td>
                                  <span style={{ background: '#ebf8ff', color: '#2b6cb0', padding: '2px 8px', borderRadius: 10, fontWeight: 600, fontSize: 11 }}>
                                    {f.paymentMethod || '—'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {/* Period subtotal */}
                        <div style={{ background: '#f0fff4', padding: '10px 16px', display: 'flex', gap: 24 }}>
                          <span style={{ fontSize: 13, color: '#718096' }}>Period total:</span>
                          <span style={{ fontWeight: 700, color: '#76C442', fontSize: 14 }}>{inr(group.total)}</span>
                          <span style={{ fontSize: 13, color: '#718096' }}>across {group.count} payment{group.count > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Grand total row */}
                <div style={{ marginTop: 16, padding: '14px 18px', background: 'linear-gradient(90deg,#76C44215,#5fa83215)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1.5px solid #9ae6b430' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-icons" style={{ color: '#76C442', fontSize: 20 }}>summarize</span>
                    <span style={{ fontWeight: 700, color: '#2d3748', fontSize: 14 }}>Grand Total — {PERIOD_VIEWS.find(v => v.key === periodView)?.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#a0aec0' }}>Total Payments</div>
                      <div style={{ fontWeight: 700, color: '#3182ce', fontSize: 16 }}>{paidInRange.length}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#a0aec0' }}>Grand Total</div>
                      <div style={{ fontWeight: 800, color: '#76C442', fontSize: 20 }}>{inr(historyTotal)}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════ PENDING & OVERDUE TAB ══════════════════ */}
      {activeTab === 'pending' && (
        <div className="data-table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="data-table-title">Pending & Overdue Fees</span>
              <span style={{ background: '#fff5f5', color: '#c53030', padding: '3px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>
                {pendingFees.length} unpaid
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#e53e3e' }}>
                Total Due: {inr(pendingFees.reduce((s,f) => s + (f.amount||0), 0))}
              </div>
            </div>
          </div>

          {pendingFees.length === 0 ? (
            <div className="empty-state">
              <span className="material-icons" style={{ color: '#76C442' }}>check_circle</span>
              <h3 style={{ color: '#76C442' }}>All fees are cleared!</h3>
              <p>No pending or overdue records</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Student</th><th>Class</th><th>Fee Type</th><th>Month</th><th>Amount Due</th><th>Due Date</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {pendingFees.sort((a,b) => a.dueDate?.localeCompare(b.dueDate)).map(f => (
                    <tr key={f.id} style={{ background: f.status === 'OVERDUE' ? '#fff8f8' : 'transparent' }}>
                      <td>
                        <div className="student-cell">
                          <div className="student-avatar-sm" style={{ background: f.status === 'OVERDUE' ? '#e53e3e' : '#ed8936' }}>{getInitials(f.student)}</div>
                          <div>
                            <div className="student-name">{f.student}</div>
                            <div className="student-class">{f.rollNo}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{f.class}</td>
                      <td style={{ fontSize: 12, color: '#718096' }}>{f.type}</td>
                      <td style={{ fontSize: 12, color: '#718096' }}>{f.month}</td>
                      <td style={{ fontWeight: 800, color: f.status === 'OVERDUE' ? '#e53e3e' : '#ed8936', fontSize: 14 }}>{inr(f.amount)}</td>
                      <td style={{ fontSize: 12, color: f.status === 'OVERDUE' ? '#e53e3e' : '#718096', fontWeight: f.status === 'OVERDUE' ? 700 : 400 }}>{fmt(f.dueDate)}</td>
                      <td><span className={`status-badge ${STATUS_STYLE[f.status]?.cls}`}>{f.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button onClick={() => setPayTarget(f)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#76C442', border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            <span className="material-icons" style={{ fontSize: 14 }}>payments</span> Collect Now
                          </button>
                          <button
                            onClick={() => setDeleteTarget(f)}
                            title="Delete fee record"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 7, color: '#e53e3e', cursor: 'pointer', flexShrink: 0 }}
                          >
                            <span className="material-icons" style={{ fontSize: 16 }}>delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ FEE STRUCTURE TAB ══════════════════ */}
      {activeTab === 'structure' && (
        <div className="data-table-card">
          <div className="data-table-header" style={{ marginBottom: 16 }}>
            <span className="data-table-title">Annual Fee Structure — 2025–26</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Class</th><th>Tuition Fee</th><th>Transport Fee</th><th>Lab Fee</th><th>Exam Fee</th><th>Sports Fee</th><th style={{ color: '#76C442', fontWeight: 800 }}>Total / Year</th></tr>
              </thead>
              <tbody>
                {FEE_STRUCTURE.map(row => {
                  const total = row.tuition + row.transport + row.lab + row.exam + row.sports;
                  return (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 700 }}>{row.class}</td>
                      <td>{inr(row.tuition)}</td>
                      <td>{inr(row.transport)}</td>
                      <td>{inr(row.lab)}</td>
                      <td>{inr(row.exam)}</td>
                      <td>{inr(row.sports)}</td>
                      <td style={{ fontWeight: 800, color: '#76C442', fontSize: 15 }}>{inr(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════ ADD FEE MODAL ══════════════════ */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Fee Record</h5>
                <button className="btn-close" onClick={() => { setShowModal(false); setModalQuery(''); setModalSuggestions([]); }} />
              </div>
              <form onSubmit={handleAddFee}>
                <div className="modal-body">
                  <div className="row g-3">
                    {/* Student search */}
                    <div className="col-12">
                      <label className="form-label small fw-medium">Student <span style={{ color: '#e53e3e' }}>*</span></label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Type name, admission no., or phone to search…"
                          value={modalQuery}
                          onChange={e => handleModalQuery(e.target.value)}
                          autoComplete="off"
                        />
                        {modalSearching && (
                          <span className="material-icons" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#a0aec0' }}>hourglass_empty</span>
                        )}
                        {modalSuggestions.length > 0 && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 20px rgba(0,0,0,0.1)', zIndex: 3000, maxHeight: 220, overflowY: 'auto' }}>
                            {modalSuggestions.map((s, i) => (
                              <div key={s.id || i}
                                onClick={() => selectModalStudent(s)}
                                style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: i < modalSuggestions.length - 1 ? '1px solid #f7fafc' : 'none', fontSize: 13 }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f0fff4'}
                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                              >
                                <strong>{s.name || s.studentName}</strong>
                                <span style={{ color: '#a0aec0', marginLeft: 8, fontSize: 12 }}>
                                  {s.admissionNumber || s.rollNumber || s.rollNo} · {s.className || s.class}{s.section ? `-${s.section}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {formData.studentId && (
                        <div style={{ marginTop: 4, fontSize: 12, color: '#276749', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-icons" style={{ fontSize: 14 }}>check_circle</span>
                          Selected: <strong>{formData.student}</strong> · {formData.rollNo} · {formData.class}
                        </div>
                      )}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-medium">Fee Type</label>
                      <select className="form-select form-select-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                        {FEE_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-medium">Month</label>
                      <input type="text" className="form-control form-control-sm" placeholder="e.g., April 2026"
                        value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-medium">Amount (₹) *</label>
                      <input type="number" className="form-control form-control-sm" placeholder="Fee amount"
                        value={formData.amount} min="1" onChange={e => setFormData({...formData, amount: e.target.value})} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-medium">Due Date</label>
                      <input type="date" className="form-control form-control-sm"
                        value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-medium">Status</label>
                      <select className="form-select form-select-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                        <option value="PENDING">Pending</option>
                        <option value="PAID">Paid</option>
                        <option value="OVERDUE">Overdue</option>
                      </select>
                    </div>
                    {formData.status === 'PAID' && (
                      <>
                        <div className="col-md-4">
                          <label className="form-label small fw-medium">Payment Method</label>
                          <select className="form-select form-select-sm" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})}>
                            <option value="">Select</option>
                            {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small fw-medium">Paid Date</label>
                          <input type="date" className="form-control form-control-sm" value={formData.paidDate || TODAY}
                            max={TODAY} onChange={e => setFormData({...formData, paidDate: e.target.value})} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#76C442', border: 'none' }}>Add Fee Record</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
