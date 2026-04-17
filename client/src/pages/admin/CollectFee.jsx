import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/* ── helpers ── */
const todayStr = () => new Date().toISOString().split('T')[0];
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const genReceipt = () => `RCP-${Date.now().toString().slice(-7)}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;
const isOverdue = (dueDateStr) => dueDateStr && new Date(dueDateStr) < new Date(todayStr());

const StatusBadge = ({ status }) => {
  const map = {
    PAID:    { bg: '#f0fff4', color: '#276749', label: 'Paid'    },
    PARTIAL: { bg: '#fffbeb', color: '#b45309', label: 'Partial' },
    PENDING: { bg: '#fff5f5', color: '#c53030', label: 'Pending' },
    OVERDUE: { bg: '#fff5f5', color: '#9b2c2c', label: 'Overdue' },
  };
  const s = map[status] || map.PENDING;
  return <span style={{ padding: '3px 10px', background: s.bg, color: s.color, borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{s.label}</span>;
};

/* ══════════════════════════════════════════════════════════════════ */
export default function CollectFee() {
  const { user } = useAuth();

  /* search */
  const [query, setQuery]               = useState('');
  const [suggestions, setSuggestions]   = useState([]);
  const [showDrop, setShowDrop]         = useState(false);
  const [searching, setSearching]       = useState(false);
  const [student, setStudent]           = useState(null);

  /* assignment data */
  const [assignment, setAssignment]     = useState(null);
  const [installments, setInstallments] = useState([]);
  const [payments, setPayments]         = useState([]);
  const [loadingFee, setLoadingFee]     = useState(false);

  /* selected installment (null = general payment mode) */
  const [selectedInstallment, setSelectedInstallment] = useState(null);

  /* payment form */
  const [amount, setAmount]             = useState('');
  const [payDate, setPayDate]           = useState(todayStr());
  const [receiptNo, setReceiptNo]       = useState(genReceipt());
  const [remarks, setRemarks]           = useState('');
  const [paying, setPaying]             = useState(false);

  /* receipt modal */
  const [receiptData, setReceiptData]   = useState(null);

  const [toast, setToast]               = useState(null);
  const searchRef                       = useRef(null);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  /* ── student search ── */
  useEffect(() => {
    if (!query || query.length < 2) { setSuggestions([]); setShowDrop(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await adminAPI.searchStudentsForFee(query);
        setSuggestions(res.data?.data ?? []);
        setShowDrop(true);
      } catch { } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  /* ── reload installments & payments ── */
  const reloadFeeData = useCallback(async (assignId) => {
    const [iRes, pRes] = await Promise.all([
      adminAPI.getInstallments(assignId),
      adminAPI.getAssignmentPayments(assignId),
    ]);
    setInstallments(iRes.data?.data ?? []);
    setPayments(pRes.data?.data ?? []);
  }, []);

  /* ── load assignment when student selected ── */
  const selectStudent = useCallback(async (s) => {
    setStudent(s);
    setQuery(s.name);
    setShowDrop(false);
    setAssignment(null);
    setInstallments([]);
    setPayments([]);
    setSelectedInstallment(null);
    setAmount('');
    setReceiptNo(genReceipt());
    setRemarks('');
    setReceiptData(null);
    setLoadingFee(true);
    try {
      const aRes = await adminAPI.getStudentFeeAssignment(s.id);
      const a = aRes.data?.data;
      setAssignment(a || null);
      if (a?.id) await reloadFeeData(a.id);
    } catch { setAssignment(null); } finally { setLoadingFee(false); }
  }, [reloadFeeData]);

  /* ── select an installment for payment ── */
  const pickInstallment = (inst) => {
    setSelectedInstallment(inst);
    setAmount(String(inst.amount));
    setReceiptNo(genReceipt());
    setRemarks('');
    setPayDate(todayStr());
  };

  const clearInstallmentSelection = () => {
    setSelectedInstallment(null);
    setAmount('');
    setReceiptNo(genReceipt());
    setRemarks('');
  };

  /* ── collect payment (installment-level) ── */
  const handleCollect = async () => {
    if (!assignment) { showToast('No fee assignment found for this student', 'error'); return; }
    if (!selectedInstallment) { showToast('Please select an installment to pay', 'error'); return; }

    const amt = Number(amount);
    if (!amt || amt <= 0) { showToast('Enter a valid amount', 'error'); return; }
    if (amt > Number(selectedInstallment.amount)) {
      showToast(`Amount exceeds installment amount ₹${fmt(selectedInstallment.amount)}`, 'error'); return;
    }

    setPaying(true);
    try {
      const res = await adminAPI.collectInstallmentFee(selectedInstallment.id, {
        amountPaid:    amt,
        paidDate:      payDate,
        receiptNumber: receiptNo,
        receivedBy:    user?.name || user?.email || 'Admin',
        term:          selectedInstallment.termName || null,
        remarks,
      });

      // refresh assignment summary
      const aRes = await adminAPI.getStudentFeeAssignment(student.id);
      const updatedAssignment = aRes.data?.data;
      setAssignment(updatedAssignment);

      const newPaid = Number(updatedAssignment?.paidAmount || 0);
      const newDue  = Number(updatedAssignment?.totalFee || 0) - newPaid;

      setReceiptData({
        receiptNo,
        date:        payDate,
        studentName: student.name,
        rollNo:      student.rollNumber,
        className:   student.className,
        totalFee:    updatedAssignment?.totalFee,
        amountPaid:  amt,
        paidSoFar:   newPaid,
        dueAmount:   newDue,
        status:      updatedAssignment?.status,
        receivedBy:  user?.name || user?.email || 'Admin',
        term:        selectedInstallment.termName || null,
        remarks,
      });

      await reloadFeeData(assignment.id);
      setSelectedInstallment(null);
      setAmount('');
      setReceiptNo(genReceipt());
      setRemarks('');
      showToast('Payment recorded successfully');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Payment failed', 'error');
    } finally { setPaying(false); }
  };

  /* ── print receipt ── */
  const printReceipt = () => {
    if (!receiptData) return;
    const w = window.open('', '_blank');
    const d = receiptData;
    w.document.write(`
      <!DOCTYPE html><html><head><title>Fee Receipt</title>
      <style>
        * { margin:0;padding:0;box-sizing:border-box; }
        body { font-family: 'Arial', sans-serif; padding: 30px; color: #1a202c; }
        .school-name { font-size:22px; font-weight:800; color:#276749; text-align:center; }
        .receipt-title { font-size:15px; font-weight:600; text-align:center; color:#718096; margin:4px 0 20px; }
        .divider { border:none; border-top:2px solid #e2e8f0; margin:14px 0; }
        .dashed { border-top:1px dashed #a0aec0; margin:14px 0; }
        .row { display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px; }
        .label { color:#718096; }
        .value { font-weight:600; color:#1a202c; }
        .amount-box { background:#f0fff4; border:2px solid #76C442; border-radius:8px; padding:14px 20px; margin:16px 0; text-align:center; }
        .amount-label { font-size:12px; color:#276749; text-transform:uppercase; letter-spacing:0.05em; }
        .amount-value { font-size:30px; font-weight:800; color:#276749; }
        .watermark { font-size:50px; font-weight:900; color:#76C44220; text-align:center; margin:10px 0; letter-spacing:8px; text-transform:uppercase; }
        .footer { margin-top:30px; display:flex; justify-content:space-between; font-size:12px; color:#718096; }
        .sig-line { border-top:1px solid #2d3748; padding-top:6px; width:180px; font-size:11px; color:#718096; }
        @media print { body { padding: 20px; } }
      </style>
      </head><body>
      <div class="school-name">SCHOOL MANAGEMENT SYSTEM</div>
      <div class="receipt-title">Fee Payment Receipt</div>
      <hr class="divider"/>
      <div class="row"><span class="label">Receipt No.</span><span class="value" style="font-family:monospace">${d.receiptNo}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${d.date}</span></div>
      <hr class="dashed"/>
      <div class="row"><span class="label">Student Name</span><span class="value">${d.studentName}</span></div>
      <div class="row"><span class="label">Roll Number</span><span class="value">${d.rollNo || '—'}</span></div>
      <div class="row"><span class="label">Class</span><span class="value">${d.className}</span></div>
      <hr class="dashed"/>
      <div class="row"><span class="label">Total Assigned Fee</span><span class="value">₹${fmt(d.totalFee)}</span></div>
      <div class="row"><span class="label">Previously Paid</span><span class="value">₹${fmt(Number(d.paidSoFar) - Number(d.amountPaid))}</span></div>
      <div class="watermark">${d.status === 'PAID' ? 'PAID' : ''}</div>
      <div class="amount-box">
        <div class="amount-label">Amount Received (Cash)</div>
        <div class="amount-value">₹${fmt(d.amountPaid)}</div>
      </div>
      <div class="row"><span class="label">Total Paid to Date</span><span class="value">₹${fmt(d.paidSoFar)}</span></div>
      <div class="row"><span class="label">Balance Due</span><span class="value" style="color:${d.dueAmount > 0 ? '#e53e3e':'#276749'}">${d.dueAmount > 0 ? '₹'+fmt(d.dueAmount) : 'NIL'}</span></div>
      <div class="row"><span class="label">Payment Mode</span><span class="value">Cash</span></div>
      ${d.term ? `<div class="row"><span class="label">Term / Installment</span><span class="value" style="color:#2b6cb0;font-weight:700">${d.term}</span></div>` : ''}
      ${d.remarks ? `<div class="row"><span class="label">Remarks</span><span class="value">${d.remarks}</span></div>` : ''}
      <div class="footer">
        <span>Generated: ${new Date().toLocaleString('en-IN')}</span>
        <div>
          <div class="sig-line">Received By: ${d.receivedBy}</div>
        </div>
      </div>
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  const due = assignment ? Math.max(0, Number(assignment.totalFee || 0) - Number(assignment.paidAmount || 0)) : 0;
  const paidPct = assignment && Number(assignment.totalFee) > 0
    ? Math.min(100, (Number(assignment.paidAmount || 0) / Number(assignment.totalFee)) * 100)
    : 0;

  const pendingInstallments = installments.filter(i => i.status !== 'PAID');
  const hasInstallments     = installments.length > 0;

  return (
    <Layout pageTitle="Collect Fee">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ padding: '20px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a202c' }}>Collect Fee</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#a0aec0' }}>Search a student, select an installment, and record cash payment</p>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', maxWidth: 560, marginBottom: 28 }}>
          <span className="material-icons" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0', fontSize: 20 }}>search</span>
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search student by name, roll number, or phone..."
            style={{ width: '100%', padding: '12px 14px 12px 40px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            onFocus={() => suggestions.length > 0 && setShowDrop(true)}
            onBlur={() => setTimeout(() => setShowDrop(false), 180)}
          />
          {searching && <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0', fontSize: 12 }}>Searching...</span>}
          {showDrop && suggestions.length > 0 && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 100, maxHeight: 240, overflowY: 'auto' }}>
              {suggestions.map(s => (
                <div key={s.id} onMouseDown={() => selectStudent(s)}
                     style={{ padding: '11px 16px', cursor: 'pointer', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                     onMouseEnter={e => e.currentTarget.style.background = '#f7fafc'}
                     onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#2d3748' }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#a0aec0' }}>{s.className} · Roll: {s.rollNumber}</div>
                  </div>
                  <span className="material-icons" style={{ color: '#76C442', fontSize: 18 }}>chevron_right</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main content */}
        {!student ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 56, display: 'block', marginBottom: 12, color: '#e2e8f0' }}>point_of_sale</span>
            <p style={{ fontSize: 15, fontWeight: 600 }}>Search for a student to begin fee collection</p>
          </div>
        ) : loadingFee ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#a0aec0' }}>Loading fee details...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>

            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Student card */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #76C442, #5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 800 }}>
                    {(student.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#1a202c' }}>{student.name}</div>
                    <div style={{ fontSize: 12, color: '#a0aec0' }}>{student.className} · Roll: {student.rollNumber}</div>
                  </div>
                </div>

                {!assignment ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#a0aec0' }}>
                    <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 6 }}>info</span>
                    <p style={{ fontSize: 13 }}>No fee assigned to this student yet.</p>
                    <p style={{ fontSize: 12 }}>Go to <strong>Fees &amp; Payments</strong> → <strong>Student Fees</strong> → <strong>Assign Fee</strong>.</p>
                  </div>
                ) : (
                  <>
                    {/* Fee summary */}
                    <div style={{ borderTop: '1px solid #f0f4f8', paddingTop: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: '#718096' }}>Total Fee</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#2d3748' }}>₹{fmt(assignment.totalFee)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: '#718096' }}>Paid</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#276749' }}>₹{fmt(assignment.paidAmount)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                        <span style={{ fontSize: 13, color: '#718096' }}>Due</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: due > 0 ? '#e53e3e' : '#276749' }}>₹{fmt(due)}</span>
                      </div>
                      <div style={{ background: '#f0f4f8', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{ width: `${paidPct}%`, height: '100%', background: paidPct >= 100 ? '#76C442' : '#f6ad55', borderRadius: 6, transition: 'width 0.4s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a0aec0' }}>
                        <span>{paidPct.toFixed(0)}% paid</span>
                        <StatusBadge status={assignment.status} />
                      </div>
                    </div>

                    {assignment.status === 'PAID' && (
                      <div style={{ marginTop: 14, padding: '12px', background: '#f0fff4', border: '1.5px solid #76C44240', borderRadius: 8, textAlign: 'center', color: '#276749', fontWeight: 700, fontSize: 13 }}>
                        ✓ Fee fully paid
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Installments panel */}
              {assignment && hasInstallments && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#2d3748' }}>Installments</span>
                    <span style={{ fontSize: 11, color: '#a0aec0' }}>{installments.filter(i => i.status === 'PAID').length}/{installments.length} paid</span>
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    {installments.map(inst => {
                      const isPaid    = inst.status === 'PAID';
                      const overdue   = !isPaid && isOverdue(inst.dueDate);
                      const selected  = selectedInstallment?.id === inst.id;
                      return (
                        <div key={inst.id}
                          onClick={() => !isPaid && pickInstallment(inst)}
                          style={{
                            padding: '10px 16px',
                            borderLeft: selected ? '3px solid #76C442' : '3px solid transparent',
                            background: selected ? '#f0fff4' : isPaid ? '#fafafa' : '#fff',
                            cursor: isPaid ? 'default' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            borderBottom: '1px solid #f7f7f7',
                            opacity: isPaid ? 0.7 : 1,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (!isPaid) e.currentTarget.style.background = selected ? '#f0fff4' : '#f7fdf2'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = selected ? '#f0fff4' : isPaid ? '#fafafa' : '#fff'; }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#2d3748' }}>{inst.termName}</div>
                            <div style={{ fontSize: 11, color: overdue ? '#e53e3e' : '#a0aec0' }}>
                              Due: {inst.dueDate}
                              {overdue && <span style={{ marginLeft: 4, fontWeight: 700 }}>· OVERDUE</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: isPaid ? '#276749' : '#2d3748' }}>₹{fmt(inst.amount)}</div>
                            {isPaid
                              ? <span style={{ fontSize: 10, color: '#276749', fontWeight: 700 }}>✓ PAID</span>
                              : <span style={{ fontSize: 10, color: selected ? '#276749' : '#f6ad55', fontWeight: 700 }}>
                                  {selected ? '▶ Selected' : 'Tap to pay'}
                                </span>
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment form */}
              {assignment && selectedInstallment && (
                <div style={{ background: '#fff', border: '2px solid #76C442', borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#276749' }}>
                      Collect: {selectedInstallment.termName}
                    </h4>
                    <button onClick={clearInstallmentSelection}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', fontSize: 13 }}>
                      ✕ Cancel
                    </button>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Amount (₹) *</label>
                    <input
                      type="number" min="1" max={selectedInstallment.amount} value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder={`Max ₹${fmt(selectedInstallment.amount)}`}
                      style={{ width: '100%', padding: '9px 12px', border: '2px solid #76C442', borderRadius: 8, fontSize: 15, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Payment Date *</label>
                    <input type="date" value={payDate} max={todayStr()} onChange={e => setPayDate(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Receipt No.</label>
                    <input value={receiptNo} readOnly
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', background: '#f7fafc', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Remarks</label>
                    <input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional"
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>

                  <button onClick={handleCollect} disabled={paying}
                    style={{ width: '100%', padding: '12px', background: '#76C442', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: paying ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span className="material-icons" style={{ fontSize: 18 }}>payments</span>
                    {paying ? 'Processing...' : `Collect ₹${amount ? fmt(amount) : '—'}`}
                  </button>
                </div>
              )}

              {/* No installments — show prompt */}
              {assignment && !hasInstallments && due > 0 && (
                <div style={{ background: '#fffbeb', border: '1.5px solid #f6ad5560', borderRadius: 10, padding: 14, fontSize: 13, color: '#b45309' }}>
                  <strong>No installments defined.</strong> Go to <strong>Fees &amp; Payments → Student Fees</strong> to set up installments for this student before collecting payment.
                </div>
              )}
            </div>

            {/* Right column: Receipt + Payment History */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Receipt card */}
              {receiptData && (
                <div style={{ background: '#fff', border: '2px solid #76C442', borderRadius: 12, padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#276749' }}>Payment Confirmed</h3>
                    <button onClick={printReceipt}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: '#276749', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                      <span className="material-icons" style={{ fontSize: 16 }}>print</span> Print Receipt
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                    {[
                      ['Receipt No', receiptData.receiptNo],
                      ['Date', receiptData.date],
                      ['Student', receiptData.studentName],
                      ['Class', receiptData.className],
                      ...(receiptData.term ? [['Term / Installment', receiptData.term]] : []),
                      ['Amount Paid', `₹${fmt(receiptData.amountPaid)}`],
                      ['Total Paid', `₹${fmt(receiptData.paidSoFar)}`],
                      ['Balance Due', receiptData.dueAmount > 0 ? `₹${fmt(receiptData.dueAmount)}` : 'NIL'],
                      ['Status', receiptData.status],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background: '#f7fafc', borderRadius: 6, padding: '8px 12px' }}>
                        <div style={{ fontSize: 11, color: '#a0aec0', fontWeight: 600 }}>{k}</div>
                        <div style={{ fontWeight: 700, color: k === 'Amount Paid' ? '#276749' : k === 'Balance Due' ? (receiptData.dueAmount > 0 ? '#e53e3e' : '#276749') : '#2d3748', fontFamily: k === 'Receipt No' ? 'monospace' : 'inherit', fontSize: k === 'Amount Paid' ? 15 : 13 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment history */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f4f8' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#2d3748' }}>Payment History</span>
                </div>
                {payments.length === 0 ? (
                  <div style={{ padding: 30, textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>No payments recorded yet.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f7fafc' }}>
                        {['Date','Term / Installment','Amount','Receipt No','Received By','Remarks'].map(h => (
                          <th key={h} style={{ padding: '9px 14px', textAlign: h === 'Amount' ? 'right' : 'left', fontWeight: 700, color: '#718096', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f0f4f8' }}>
                          <td style={{ padding: '10px 14px', color: '#4a5568', whiteSpace: 'nowrap' }}>{p.paymentDate}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {p.term ? (
                              <span style={{ padding: '2px 8px', background: '#ebf8ff', color: '#2b6cb0', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{p.term}</span>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#276749' }}>₹{fmt(p.amountPaid)}</td>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: '#718096' }}>{p.receiptNumber}</td>
                          <td style={{ padding: '10px 14px', color: '#4a5568' }}>{p.receivedBy || '—'}</td>
                          <td style={{ padding: '10px 14px', color: '#a0aec0' }}>{p.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
