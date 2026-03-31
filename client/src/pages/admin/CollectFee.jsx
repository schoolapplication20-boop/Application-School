import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/* ── helpers ── */
const todayStr = () => new Date().toISOString().split('T')[0];

const genReceiptNo = () => {
  const ts  = Date.now().toString().slice(-7);
  const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `RCP-${ts}-${rnd}`;
};

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

const StatusBadge = ({ status }) => {
  const map = {
    PAID:    { bg: '#f0fff4', color: '#276749', label: 'Paid'    },
    PARTIAL: { bg: '#fffbeb', color: '#b45309', label: 'Partial' },
    PENDING: { bg: '#fff5f5', color: '#c53030', label: 'Pending' },
    OVERDUE: { bg: '#fff5f5', color: '#9b2c2c', label: 'Overdue' },
  };
  const s = map[status] || map.PENDING;
  return (
    <span style={{ padding: '3px 10px', background: s.bg, color: s.color, borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
      {s.label}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════════════ */
const CollectFee = () => {
  const { user } = useAuth();

  /* search */
  const [query, setQuery]           = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDrop, setShowDrop]     = useState(false);
  const [searching, setSearching]   = useState(false);
  const [student, setStudent]       = useState(null);

  /* fee list */
  const [fees, setFees]             = useState([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);

  /* payment form */
  const [amountPaid, setAmountPaid] = useState('');
  const [payDate, setPayDate]       = useState(todayStr());
  const [receiptNo, setReceiptNo]   = useState(genReceiptNo());
  const [remarks, setRemarks]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* success */
  const [lastPayment, setLastPayment] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  /* toast */
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  const searchTimerRef = useRef(null);
  const receivedByVal  = user?.name || 'Admin';

  /* ── live search ── */
  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setSuggestions([]); setShowDrop(false); return; }
    setSearching(true);
    try {
      const res  = await adminAPI.searchStudentsForFee(q.trim());
      const list = res.data?.data ?? res.data ?? [];
      setSuggestions(Array.isArray(list) ? list.slice(0, 10) : []);
      setShowDrop(true);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setStudent(null);
    setSelectedFee(null);
    setLastPayment(null);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => doSearch(val), 300);
  };

  /* ── select student ── */
  const selectStudent = async (s) => {
    setStudent(s);
    setQuery(s.name);
    setShowDrop(false);
    setSuggestions([]);
    setSelectedFee(null);
    setLastPayment(null);
    setFeesLoading(true);
    try {
      const res = await adminAPI.getFeesByStudent(s.id);
      setFees(res.data?.data ?? res.data ?? []);
    } catch {
      showToast('Failed to load fee records.', 'error');
      setFees([]);
    } finally {
      setFeesLoading(false);
    }
  };

  /* ── select fee ── */
  const handleSelectFee = (fee) => {
    if (fee.status === 'PAID') return;
    setSelectedFee(fee);
    setLastPayment(null);
    const pending = Number(fee.amount || 0) - Number(fee.paidAmount || 0);
    setAmountPaid(pending > 0 ? String(pending) : '');
    setPayDate(todayStr());
    setReceiptNo(genReceiptNo());
    setRemarks('');
  };

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFee) return;
    const amt = parseFloat(amountPaid);
    if (!amt || amt <= 0) { showToast('Amount must be greater than 0.', 'error'); return; }
    const pending = Number(selectedFee.amount || 0) - Number(selectedFee.paidAmount || 0);
    if (amt > pending + 0.001) {
      showToast(`Amount ₹${fmt(amt)} exceeds pending balance ₹${fmt(pending)}.`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const rno = receiptNo;
      const res = await adminAPI.collectFee(selectedFee.id, {
        amountPaid:    amt,
        paidDate:      payDate,
        receiptNumber: rno,
        receivedBy:    receivedByVal,
        remarks:       remarks || null,
      });
      const updated = res.data?.data ?? res.data;
      setLastPayment({ ...updated, justPaid: amt, receiptNo: rno });
      showToast(`₹${fmt(amt)} collected. Receipt: ${rno}`);

      /* refresh fees */
      const feeRes  = await adminAPI.getFeesByStudent(student.id);
      const newFees = feeRes.data?.data ?? feeRes.data ?? [];
      setFees(newFees);
      setSelectedFee(newFees.find(f => f.id === selectedFee.id) || null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Payment failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* close dropdown on outside click */
  useEffect(() => {
    const h = (e) => { if (!e.target.closest('.cf-search-wrap')) setShowDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pendingAmt = selectedFee
    ? Math.max(0, Number(selectedFee.amount || 0) - Number(selectedFee.paidAmount || 0))
    : 0;

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <Layout pageTitle="Collect Fee">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Fee Collection</h1>
        <p>Cash-only · Search student → select fee → collect</p>
      </div>

      {/* ── Search bar ── */}
      <div style={{ maxWidth: student ? '100%' : '640px', margin: student ? '0' : '0 auto' }}>
        <div className="chart-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="cf-search-wrap" style={{ position: 'relative', flex: 1 }}>
              <span className="material-icons"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0', fontSize: '20px', pointerEvents: 'none' }}>
                search
              </span>
              <input
                type="text"
                value={query}
                onChange={handleQueryChange}
                onFocus={() => suggestions.length > 0 && setShowDrop(true)}
                placeholder="Search by name, admission no., or phone…"
                autoFocus
                style={{ width: '100%', padding: '12px 12px 12px 44px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box' }}
              />

              {showDrop && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, marginTop: '4px', overflow: 'hidden' }}>
                  {searching && (
                    <div style={{ padding: '14px', textAlign: 'center', color: '#a0aec0', fontSize: '13px' }}>Searching…</div>
                  )}
                  {!searching && query.trim() && suggestions.length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#a0aec0', fontSize: '13px' }}>
                      <span className="material-icons" style={{ display: 'block', fontSize: '26px', marginBottom: '4px' }}>search_off</span>
                      No students found for "{query}"
                    </div>
                  )}
                  {!searching && suggestions.map((s, i) => (
                    <div key={s.id || i}
                      onClick={() => selectStudent(s)}
                      style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid #f7fafc' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0fff4'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                        {s.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#2d3748' }}>{s.name}</div>
                        <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                          Adm: {s.rollNumber} · Class {s.className}{s.section ? `-${s.section}` : ''}
                          {s.parentMobile && <> · {s.parentMobile}</>}
                        </div>
                      </div>
                      <span className="material-icons" style={{ color: '#76C442', fontSize: '18px' }}>chevron_right</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {student && (
              <button
                onClick={() => { setStudent(null); setQuery(''); setSelectedFee(null); setLastPayment(null); setFees([]); }}
                style={{ padding: '11px 16px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                <span className="material-icons" style={{ fontSize: '16px' }}>close</span> Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Main grid (shown after student selected) ── */}
        {student && (
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', alignItems: 'start' }}>

            {/* ══ LEFT: student info + fee list ══ */}
            <div>
              {/* Student info */}
              <div className="chart-card" style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', fontWeight: 700, flexShrink: 0 }}>
                    {student.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#2d3748' }}>{student.name}</div>
                    <div style={{ fontSize: '12px', color: '#718096' }}>
                      Adm: {student.rollNumber} · Class {student.className}{student.section ? `-${student.section}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                  {[
                    ['Name',     student.name],
                    ['Adm. No.', student.rollNumber],
                    ['Class',    student.className],
                    ['Section',  student.section || '—'],
                    ['Parent',   student.parentName || '—'],
                    ['Phone',    student.parentMobile || '—'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ padding: '7px 9px', background: '#f7fafc', borderRadius: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#a0aec0', textTransform: 'uppercase', marginBottom: '2px' }}>{k}</div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#2d3748' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fee records list */}
              <div className="chart-card">
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#2d3748', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-icons" style={{ color: '#76C442', fontSize: '18px' }}>receipt_long</span>
                  Fee Records
                  {fees.length > 0 && (
                    <span style={{ marginLeft: 'auto', background: '#76C44220', color: '#276749', padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
                      {fees.length}
                    </span>
                  )}
                </div>

                {feesLoading && (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#a0aec0', fontSize: '13px' }}>Loading…</div>
                )}
                {!feesLoading && fees.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#a0aec0', fontSize: '13px' }}>
                    <span className="material-icons" style={{ display: 'block', fontSize: '28px', marginBottom: '6px' }}>inbox</span>
                    No fee records found
                  </div>
                )}

                {!feesLoading && fees.map(fee => {
                  const total   = Number(fee.amount || 0);
                  const paid    = Number(fee.paidAmount || 0);
                  const pending = total - paid;
                  const isSel   = selectedFee?.id === fee.id;
                  return (
                    <div key={fee.id}
                      onClick={() => handleSelectFee(fee)}
                      style={{
                        padding: '11px', marginBottom: '8px', borderRadius: '10px',
                        border: `1.5px solid ${isSel ? '#76C442' : '#e2e8f0'}`,
                        background: isSel ? '#f0fff4' : '#fafafa',
                        cursor: fee.status !== 'PAID' ? 'pointer' : 'default',
                        transition: 'border-color 0.15s, background 0.15s',
                        opacity: fee.status === 'PAID' ? 0.75 : 1,
                      }}
                      onMouseEnter={e => { if (fee.status !== 'PAID' && !isSel) e.currentTarget.style.borderColor = '#76C44270'; }}
                      onMouseLeave={e => { if (!isSel) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#2d3748' }}>{fee.feeType || 'Fee'}</span>
                        <StatusBadge status={fee.status} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '5px' }}>
                        {[['Total', total], ['Paid', paid], ['Pending', pending]].map(([k, v]) => (
                          <div key={k} style={{ textAlign: 'center', padding: '5px', background: '#fff', borderRadius: '6px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#2d3748' }}>₹{fmt(v)}</div>
                            <div style={{ fontSize: '10px', color: '#a0aec0' }}>{k}</div>
                          </div>
                        ))}
                      </div>
                      {fee.dueDate && (
                        <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '6px' }}>Due: {fee.dueDate}</div>
                      )}
                      {isSel && fee.status !== 'PAID' && (
                        <div style={{ fontSize: '11px', color: '#76C442', fontWeight: 600, marginTop: '6px', textAlign: 'center' }}>
                          ✓ Selected · fill payment form →
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ══ RIGHT: payment form / success / history ══ */}
            <div>

              {/* No fee selected placeholder */}
              {!lastPayment && !selectedFee && !feesLoading && fees.length > 0 && (
                <div className="chart-card" style={{ textAlign: 'center', padding: '48px 24px', marginBottom: '20px' }}>
                  <span className="material-icons" style={{ fontSize: '52px', color: '#e2e8f0', display: 'block', marginBottom: '12px' }}>point_of_sale</span>
                  <div style={{ fontSize: '14px', color: '#a0aec0' }}>Select a pending fee record on the left to collect payment</div>
                </div>
              )}

              {/* Fully paid fee selected */}
              {!lastPayment && selectedFee?.status === 'PAID' && (
                <div className="chart-card" style={{ textAlign: 'center', padding: '32px 24px', marginBottom: '20px' }}>
                  <span className="material-icons" style={{ fontSize: '48px', color: '#76C442', display: 'block', marginBottom: '12px' }}>check_circle</span>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#276749' }}>This fee is fully paid</div>
                  <div style={{ fontSize: '13px', color: '#a0aec0', marginTop: '6px' }}>Select another pending fee record</div>
                </div>
              )}

              {/* Payment form */}
              {!lastPayment && selectedFee && selectedFee.status !== 'PAID' && (
                <div className="chart-card" style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <span className="material-icons" style={{ color: '#76C442', fontSize: '20px' }}>payments</span>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748' }}>
                      Payment — {selectedFee.feeType || 'Fee'}
                    </span>
                    {/* Cash badge */}
                    <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '8px' }}>
                      <span className="material-icons" style={{ fontSize: '15px', color: '#76C442' }}>payments</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#276749' }}>CASH</span>
                    </div>
                  </div>

                  {/* Pending summary banner */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '10px', marginBottom: '20px' }}>
                    {[
                      ['Total Fee',   selectedFee.amount],
                      ['Paid So Far', selectedFee.paidAmount],
                      ['Pending',     pendingAmt],
                    ].map(([k, v]) => (
                      <div key={k} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: k === 'Pending' ? '#c53030' : '#2d3748' }}>₹{fmt(v)}</div>
                        <div style={{ fontSize: '10px', color: '#a0aec0', marginTop: '2px' }}>{k}</div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      {/* Amount paid */}
                      <div>
                        <label className="form-label">Amount Paid (₹) <span style={{ color: '#e53e3e' }}>*</span></label>
                        <input
                          type="number" min="1" max={pendingAmt} step="0.01"
                          value={amountPaid}
                          onChange={e => setAmountPaid(e.target.value)}
                          required
                          style={{ padding: '11px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', width: '100%', outline: 'none', fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box', fontWeight: 700 }}
                        />
                        <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '4px' }}>Max: ₹{fmt(pendingAmt)}</div>
                      </div>

                      {/* Payment date */}
                      <div>
                        <label className="form-label">Payment Date <span style={{ color: '#e53e3e' }}>*</span></label>
                        <input
                          type="date" value={payDate}
                          onChange={e => setPayDate(e.target.value)}
                          required
                          style={{ padding: '11px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      {/* Receipt No (read-only) */}
                      <div>
                        <label className="form-label">Receipt No. (auto-generated)</label>
                        <input type="text" value={receiptNo} readOnly
                          style={{ padding: '11px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', width: '100%', background: '#f7fafc', color: '#718096', fontFamily: 'monospace', boxSizing: 'border-box', cursor: 'not-allowed' }} />
                      </div>

                      {/* Received by (read-only) */}
                      <div>
                        <label className="form-label">Received By (auto-filled)</label>
                        <input type="text" value={receivedByVal} readOnly
                          style={{ padding: '11px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', width: '100%', background: '#f7fafc', color: '#718096', fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box', cursor: 'not-allowed' }} />
                      </div>
                    </div>

                    {/* Remarks */}
                    <div style={{ marginBottom: '20px' }}>
                      <label className="form-label">Remarks (optional)</label>
                      <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
                        placeholder="Any notes about this payment…" rows={2}
                        style={{ padding: '11px 12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', width: '100%', outline: 'none', fontFamily: 'Poppins, sans-serif', resize: 'vertical', boxSizing: 'border-box' }} />
                    </div>

                    <button type="submit" disabled={submitting}
                      style={{ width: '100%', padding: '14px', background: submitting ? '#a0aec0' : '#76C442', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span className="material-icons">{submitting ? 'hourglass_empty' : 'payments'}</span>
                      {submitting ? 'Processing…' : `Collect ₹${fmt(amountPaid || 0)} in CASH`}
                    </button>
                  </form>
                </div>
              )}

              {/* ── Success card ── */}
              {lastPayment && (
                <div className="chart-card no-print" style={{ marginBottom: '20px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f0fff4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <span className="material-icons" style={{ color: '#76C442', fontSize: '32px' }}>check_circle</span>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#2d3748', margin: '0 0 6px' }}>Payment Successful!</h3>
                    <p style={{ fontSize: '13px', color: '#718096', margin: '0 0 4px' }}>
                      ₹{fmt(lastPayment.justPaid)} collected in CASH · {lastPayment.paidDate || payDate}
                    </p>
                    <p style={{ fontSize: '12px', color: '#a0aec0', margin: 0 }}>
                      Receipt: <strong style={{ color: '#76C442', fontFamily: 'monospace' }}>{lastPayment.receiptNo}</strong>
                    </p>
                  </div>

                  {/* Updated fee summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
                    {[
                      { label: 'Total',   value: lastPayment.amount,      color: '#3182ce' },
                      { label: 'Paid',    value: lastPayment.paidAmount,   color: '#76C442' },
                      { label: 'Pending', value: Number(lastPayment.amount || 0) - Number(lastPayment.paidAmount || 0), color: '#e53e3e' },
                    ].map(item => (
                      <div key={item.label} style={{ padding: '10px', background: '#f7fafc', borderRadius: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: item.color }}>₹{fmt(item.value)}</div>
                        <div style={{ fontSize: '10px', color: '#a0aec0', marginTop: '2px' }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => window.print()}
                      style={{ flex: 1, minWidth: '120px', padding: '11px', background: '#76C442', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}>
                      <span className="material-icons" style={{ fontSize: '17px' }}>print</span> Print Receipt
                    </button>
                    <button onClick={() => setShowHistory(h => !h)}
                      style={{ flex: 1, minWidth: '120px', padding: '11px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}>
                      <span className="material-icons" style={{ fontSize: '17px' }}>history</span>
                      {showHistory ? 'Hide' : 'View'} History
                    </button>
                    <button onClick={() => { setLastPayment(null); setSelectedFee(null); setAmountPaid(''); setReceiptNo(genReceiptNo()); setRemarks(''); }}
                      style={{ flex: 1, minWidth: '120px', padding: '11px', border: '1.5px solid #76C442', borderRadius: '10px', background: '#f0fff4', color: '#276749', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}>
                      <span className="material-icons" style={{ fontSize: '17px' }}>add_circle_outline</span> New Payment
                    </button>
                  </div>
                </div>
              )}

              {/* ── Payment history table ── */}
              {(showHistory || (!lastPayment && !selectedFee && fees.length > 0)) && !feesLoading && fees.length > 0 && (
                <div className="chart-card">
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#2d3748', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-icons" style={{ color: '#76C442', fontSize: '18px' }}>history</span>
                    Payment History — {student.name}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Fee Type</th>
                          <th>Total</th>
                          <th>Paid</th>
                          <th>Pending</th>
                          <th>Status</th>
                          <th>Due Date</th>
                          <th>Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fees.map(f => (
                          <tr key={f.id}>
                            <td style={{ fontWeight: 600, fontSize: '13px' }}>{f.feeType || '—'}</td>
                            <td>₹{fmt(f.amount)}</td>
                            <td style={{ color: '#76C442', fontWeight: 600 }}>₹{fmt(f.paidAmount)}</td>
                            <td style={{ color: '#e53e3e', fontWeight: 600 }}>
                              ₹{fmt(Math.max(0, Number(f.amount || 0) - Number(f.paidAmount || 0)))}
                            </td>
                            <td><StatusBadge status={f.status} /></td>
                            <td style={{ fontSize: '12px', color: '#a0aec0' }}>{f.dueDate || '—'}</td>
                            <td style={{ fontSize: '11px', fontFamily: 'monospace', color: '#718096' }}>{f.receiptNumber || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Print receipt (print-only) ── */}
      {lastPayment && (
        <div className="print-only" style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '580px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px', position: 'relative' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#2d3748', margin: 0 }}>School Management System</h1>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#76C442', margin: '8px 0 0' }}>CASH FEE RECEIPT</h2>
            <div style={{ position: 'absolute', top: '8px', right: '8px', width: '68px', height: '68px', border: '4px solid #76C44240', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#76C44260', fontWeight: 800, fontSize: '14px', transform: 'rotate(-20deg)', display: 'inline-block' }}>PAID</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', marginBottom: '18px' }}>
            {[
              ['Receipt No',  lastPayment.receiptNo || lastPayment.receiptNumber],
              ['Date',        lastPayment.paidDate || payDate],
              ['Student',     student?.name],
              ['Adm. No.',    student?.rollNumber],
              ['Class',       `${student?.className || ''}${student?.section ? '-' + student.section : ''}`],
              ['Section',     student?.section || '—'],
              ['Received By', lastPayment.receivedBy || receivedByVal],
              ['Mode',        'CASH'],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '7px 10px', background: '#f7fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '9px', color: '#a0aec0', textTransform: 'uppercase' }}>{k}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#2d3748' }}>{v}</div>
              </div>
            ))}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
            <thead>
              <tr style={{ background: '#f0f4f8' }}>
                <th style={{ padding: '9px 12px', fontSize: '11px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Fee Description</th>
                <th style={{ padding: '9px 12px', fontSize: '11px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px 12px', fontSize: '13px', borderBottom: '1px solid #f0f4f8' }}>{lastPayment.feeType || 'Fee Payment'}</td>
                <td style={{ padding: '10px 12px', fontSize: '13px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid #f0f4f8' }}>₹{fmt(lastPayment.justPaid)}</td>
              </tr>
              <tr style={{ background: '#f0fff4' }}>
                <td style={{ padding: '10px 12px', fontWeight: 700 }}>Total Paid This Transaction</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#76C442', fontSize: '15px' }}>₹{fmt(lastPayment.justPaid)}</td>
              </tr>
            </tbody>
          </table>

          {lastPayment.remarks && (
            <div style={{ fontSize: '12px', color: '#718096', marginBottom: '12px' }}>
              <strong>Remarks:</strong> {lastPayment.remarks}
            </div>
          )}

          <div style={{ marginTop: '32px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#a0aec0' }}>
            <div>Computer-generated receipt · Do not alter</div>
            <div>Authorized Signature: ________________</div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CollectFee;
