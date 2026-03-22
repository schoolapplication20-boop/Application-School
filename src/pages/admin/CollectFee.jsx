import React, { useState, useRef, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';

/* ── static fallback students ── */
const FALLBACK = [
  { name: 'Arjun Patel',   class: '10', section: 'A', rollNo: 'S001', fatherName: 'Rajesh Patel',  fatherPhone: '9876543210', annualFee: 45000 },
  { name: 'Sneha Gupta',   class: '9',  section: 'B', rollNo: 'S002', fatherName: 'Priya Gupta',   fatherPhone: '9876543211', annualFee: 42000 },
  { name: 'Ravi Kumar',    class: '8',  section: 'C', rollNo: 'S003', fatherName: 'Suresh Kumar',  fatherPhone: '9876543212', annualFee: 38000 },
  { name: 'Ananya Singh',  class: '10', section: 'B', rollNo: 'S004', fatherName: 'Amit Singh',    fatherPhone: '9876543213', annualFee: 45000 },
];

const feeTypes = [
  { name: 'Tuition Fee',   amount: 15000 },
  { name: 'Transport Fee', amount: 3500  },
  { name: 'Library Fee',   amount: 1000  },
  { name: 'Sports Fee',    amount: 2000  },
  { name: 'Exam Fee',      amount: 1500  },
  { name: 'Lab Fee',       amount: 2000  },
];

/* ── helpers ── */
const loadStoredStudents = () => FALLBACK;

const methodIcon = { Cash: 'payments', Cheque: 'description', UPI: 'qr_code', 'Bank Transfer': 'account_balance' };

const CollectFee = () => {
  /* search */
  const [query, setQuery]           = useState('');
  const [showDrop, setShowDrop]     = useState(false);
  const [foundStudent, setFoundStudent] = useState(null);
  const inputRef = useRef(null);

  /* payment form */
  const [selFeeType, setSelFeeType] = useState('Tuition Fee');
  const [amount, setAmount]         = useState('15000');
  const [payMethod, setPayMethod]   = useState('Cash');
  const [refNo, setRefNo]           = useState('');
  const [payDate, setPayDate]       = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks]       = useState('');

  /* result */
  const [paid, setPaid]             = useState(false);
  const [receiptNo, setReceiptNo]   = useState('');
  const [toast, setToast]           = useState(null);
  const [allPayments, setAllPayments] = useState([]);

  const printRef = useRef();

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const allStudents = useMemo(() => loadStoredStudents(), []);

  /* live-filter suggestions */
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allStudents.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.rollNo || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, allStudents]);

  /* payments for the currently selected student */
  const studentPayments = useMemo(() => {
    if (!foundStudent) return [];
    return allPayments.filter(p =>
      p.rollNo === (foundStudent.rollNo || foundStudent.id?.toString())
    );
  }, [foundStudent, allPayments]);

  /* total paid by this student (from payment history) */
  const totalPaidByStudent = useMemo(() =>
    studentPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
  [studentPayments]);

  const annualFee = foundStudent?.annualFee || 45000;
  const balance   = annualFee - totalPaidByStudent;

  /* select student from dropdown */
  const selectStudent = (s) => {
    setFoundStudent(s);
    setQuery(s.name);
    setShowDrop(false);
    setPaid(false);
    setRefNo(''); setRemarks('');
  };

  /* handle typing */
  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setFoundStudent(null);
    setPaid(false);
    setShowDrop(true);
  };

  /* submit search (Enter / button) */
  const handleSearch = (e) => {
    e.preventDefault();
    if (suggestions.length === 1) { selectStudent(suggestions[0]); return; }
    const q = query.toLowerCase();
    const exact = allStudents.find(s => s.name.toLowerCase() === q || (s.rollNo || '').toLowerCase() === q);
    if (exact) { selectStudent(exact); return; }
    if (suggestions.length > 0) { setShowDrop(true); }
    else showToast('No student found. Try a different name or roll number.', 'error');
  };

  const handleFeeTypeChange = (val) => {
    setSelFeeType(val);
    const ft = feeTypes.find(f => f.name === val);
    if (ft) setAmount(ft.amount.toString());
  };

  const handleCollect = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { showToast('Please enter a valid amount.', 'error'); return; }
    const rNo = `SCH-${Date.now().toString().slice(-6)}`;
    setReceiptNo(rNo);

    const newPayment = {
      id: Date.now(),
      rollNo: foundStudent.rollNo || foundStudent.id?.toString(),
      studentName: foundStudent.name,
      class: `${foundStudent.class}-${foundStudent.section || ''}`,
      feeType: selFeeType,
      amount: parseFloat(amount),
      method: payMethod,
      refNo,
      date: payDate,
      remarks,
      receiptNo: rNo,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [newPayment, ...allPayments];
    setAllPayments(updated);
    setPaid(true);
    showToast(`₹${parseFloat(amount).toLocaleString()} collected! Receipt: ${rNo}`);
  };

  /* close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => { if (!e.target.closest('.search-wrapper')) setShowDrop(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Search screen ── */
  if (!foundStudent) return (
    <Layout pageTitle="Collect Fee">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header"><h1>Fee Collection</h1><p>Search for a student to collect fee</p></div>

      <div style={{ maxWidth: '620px', margin: '0 auto' }}>
        <div className="chart-card" style={{ padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#76C44215', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span className="material-icons" style={{ color: '#76C442', fontSize: '32px' }}>point_of_sale</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#2d3748' }}>Find Student</h2>
            <p style={{ fontSize: '14px', color: '#718096' }}>Type a name or roll number — results appear instantly</p>
          </div>

          <form onSubmit={handleSearch}>
            <div className="search-wrapper" style={{ position: 'relative', marginBottom: '16px' }}>
              <span className="material-icons" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0', fontSize: '20px', pointerEvents: 'none' }}>search</span>
              <input
                ref={inputRef}
                type="text"
                style={{ width: '100%', padding: '14px 14px 14px 44px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box' }}
                placeholder="Type student name or roll number…"
                value={query}
                onChange={handleQueryChange}
                onFocus={() => query && setShowDrop(true)}
                autoFocus
              />

              {/* Live dropdown */}
              {showDrop && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, marginTop: '4px', overflow: 'hidden' }}>
                  {suggestions.map((s, idx) => (
                    <div key={s.rollNo || idx}
                      onClick={() => selectStudent(s)}
                      style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: idx < suggestions.length - 1 ? '1px solid #f7fafc' : 'none', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0fff4'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                        {s.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#2d3748' }}>{s.name}</div>
                        <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                          Class {s.class}{s.section ? `-${s.section}` : ''} &nbsp;·&nbsp; Roll: {s.rollNo || s.id}
                          {(s.fatherName || s.parent) && <> &nbsp;·&nbsp; {s.fatherName || s.parent}</>}
                        </div>
                      </div>
                      <span className="material-icons" style={{ color: '#76C442', fontSize: '18px' }}>chevron_right</span>
                    </div>
                  ))}
                </div>
              )}

              {showDrop && query && suggestions.length === 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, marginTop: '4px', padding: '16px', textAlign: 'center', color: '#a0aec0', fontSize: '13px' }}>
                  <span className="material-icons" style={{ display: 'block', fontSize: '28px', marginBottom: '6px' }}>search_off</span>
                  No students found for "{query}"
                </div>
              )}
            </div>

            <button type="submit" style={{ width: '100%', padding: '14px', background: '#76C442', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
              Search Student
            </button>
          </form>

          <div style={{ marginTop: '16px', padding: '10px 14px', background: '#f7fafc', borderRadius: '8px', fontSize: '12px', color: '#718096' }}>
            <strong>Tip:</strong> Results appear as you type. Click a suggestion to open their fee details.
          </div>
        </div>

        {/* Today's recent collections */}
        {allPayments.length > 0 && (
          <div className="data-table-card" style={{ marginTop: '24px' }}>
            <div className="data-table-title" style={{ marginBottom: '16px' }}>Recent Collections</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Student</th><th>Fee Type</th><th>Amount</th><th>Method</th><th>Date</th><th>Receipt</th></tr></thead>
                <tbody>
                  {allPayments.slice(0, 8).map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{c.studentName}</div>
                        <div style={{ fontSize: '11px', color: '#a0aec0' }}>{c.class}</div>
                      </td>
                      <td style={{ fontSize: '12px', color: '#718096' }}>{c.feeType}</td>
                      <td style={{ fontWeight: 700, color: '#2d3748' }}>₹{c.amount.toLocaleString()}</td>
                      <td><span style={{ padding: '3px 8px', background: '#76C44215', color: '#76C442', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>{c.method}</span></td>
                      <td style={{ fontSize: '12px', color: '#a0aec0' }}>{c.date}</td>
                      <td style={{ fontSize: '11px', fontFamily: 'monospace', color: '#718096' }}>{c.receiptNo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );

  /* ── Fee collection screen ── */
  return (
    <Layout pageTitle="Collect Fee">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1>Fee Collection</h1>
            <p>Collecting fee for <strong>{foundStudent.name}</strong></p>
          </div>
          <button onClick={() => { setFoundStudent(null); setQuery(''); setPaid(false); }}
            style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-icons" style={{ fontSize: '18px' }}>arrow_back</span> Back
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

          {/* ── LEFT column ── */}
          <div>
            {/* Student card */}
            <div className="chart-card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: 700, flexShrink: 0 }}>
                  {foundStudent.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#2d3748' }}>{foundStudent.name}</div>
                  <div style={{ fontSize: '13px', color: '#718096' }}>
                    Class {foundStudent.class}{foundStudent.section ? `-${foundStudent.section}` : ''} &nbsp;·&nbsp; Roll: {foundStudent.rollNo || foundStudent.id}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aec0' }}>
                    {(foundStudent.fatherName || foundStudent.parent) && <>Father: {foundStudent.fatherName || foundStudent.parent}</>}
                    {(foundStudent.fatherPhone || foundStudent.mobile) && <> &nbsp;|&nbsp; {foundStudent.fatherPhone || foundStudent.mobile}</>}
                  </div>
                </div>
              </div>
            </div>

            {/* Fee summary */}
            <div className="chart-card" style={{ marginBottom: '20px' }}>
              <div className="chart-card-title" style={{ marginBottom: '16px' }}>Fee Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Annual Fee',  value: annualFee,            color: '#3182ce' },
                  { label: 'Paid',        value: totalPaidByStudent,   color: '#76C442' },
                  { label: 'Balance Due', value: balance,              color: balance > 0 ? '#e53e3e' : '#76C442' },
                ].map(item => (
                  <div key={item.label} style={{ padding: '12px', background: '#f7fafc', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: item.color }}>₹{item.value.toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px' }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#718096' }}>Payment Progress</span>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>{Math.min(100, Math.round((totalPaidByStudent / annualFee) * 100))}%</span>
              </div>
              <div className="progress-bar-custom" style={{ height: '8px' }}>
                <div className="progress-fill" style={{ width: `${Math.min(100, (totalPaidByStudent / annualFee) * 100)}%` }} />
              </div>
              {studentPayments.length > 0 && (
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '8px' }}>
                  Last payment: {studentPayments[0].date} · ₹{studentPayments[0].amount.toLocaleString()} via {studentPayments[0].method}
                </div>
              )}
            </div>

            {/* Payment history */}
            <div className="chart-card">
              <div className="chart-card-title" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-icons" style={{ color: '#76C442', fontSize: '18px' }}>history</span>
                Payment History
                {studentPayments.length > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#76C44220', color: '#276749', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
                    {studentPayments.length} payment{studentPayments.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {studentPayments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 16px', color: '#a0aec0' }}>
                  <span className="material-icons" style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>receipt_long</span>
                  <div style={{ fontSize: '13px' }}>No payments recorded yet</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: '260px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Date</th><th>Fee Type</th><th>Amount</th><th>Method</th><th>Receipt</th></tr>
                    </thead>
                    <tbody>
                      {studentPayments.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontSize: '12px', color: '#718096' }}>{p.date}</td>
                          <td style={{ fontSize: '12px' }}>{p.feeType}</td>
                          <td style={{ fontWeight: 700, color: '#76C442', fontSize: '13px' }}>₹{p.amount.toLocaleString()}</td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', background: '#f0f4f8', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                              <span className="material-icons" style={{ fontSize: '12px' }}>{methodIcon[p.method] || 'payments'}</span>
                              {p.method}
                            </span>
                          </td>
                          <td style={{ fontSize: '11px', fontFamily: 'monospace', color: '#a0aec0' }}>{p.receiptNo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT column: payment form ── */}
          <div>
            {!paid ? (
              <div className="chart-card">
                <div className="chart-card-title" style={{ marginBottom: '20px' }}>Payment Details</div>
                <form onSubmit={handleCollect}>
                  <div style={{ marginBottom: '16px' }}>
                    <label className="form-label">Fee Type</label>
                    <select className="filter-select" style={{ width: '100%', padding: '12px' }} value={selFeeType} onChange={e => handleFeeTypeChange(e.target.value)}>
                      {feeTypes.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label className="form-label">Amount (₹)</label>
                    <input type="number" style={{ padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box' }}
                      value={amount} onChange={e => setAmount(e.target.value)} min="1" />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label className="form-label">Payment Method</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                      {['Cash', 'Cheque', 'UPI', 'Bank Transfer'].map(m => (
                        <label key={m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 6px', border: `2px solid ${payMethod === m ? '#76C442' : '#e2e8f0'}`, borderRadius: '8px', cursor: 'pointer', background: payMethod === m ? '#f0fff4' : '#fafafa' }}>
                          <input type="radio" name="payMethod" value={m} checked={payMethod === m} onChange={e => setPayMethod(e.target.value)} style={{ display: 'none' }} />
                          <span className="material-icons" style={{ fontSize: '20px', color: payMethod === m ? '#76C442' : '#a0aec0', marginBottom: '4px' }}>{methodIcon[m]}</span>
                          <span style={{ fontSize: '10px', fontWeight: 600, color: payMethod === m ? '#76C442' : '#718096' }}>{m}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {payMethod !== 'Cash' && (
                    <div style={{ marginBottom: '16px' }}>
                      <label className="form-label">Reference Number</label>
                      <input type="text" style={{ padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box' }}
                        placeholder="Transaction / cheque reference" value={refNo} onChange={e => setRefNo(e.target.value)} />
                    </div>
                  )}

                  <div style={{ marginBottom: '16px' }}>
                    <label className="form-label">Payment Date</label>
                    <input type="date" style={{ padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box' }}
                      value={payDate} onChange={e => setPayDate(e.target.value)} />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label className="form-label">Remarks</label>
                    <textarea style={{ padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', width: '100%', outline: 'none', fontFamily: 'Poppins, sans-serif', minHeight: '70px', resize: 'vertical', boxSizing: 'border-box' }}
                      placeholder="Optional remarks…" value={remarks} onChange={e => setRemarks(e.target.value)} />
                  </div>

                  {/* Balance banner */}
                  {balance > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#fff5f5', borderRadius: '10px', marginBottom: '16px', border: '1px solid #fed7d7' }}>
                      <span className="material-icons" style={{ color: '#e53e3e', fontSize: '20px' }}>warning</span>
                      <div style={{ fontSize: '13px', color: '#c53030' }}>
                        Outstanding balance: <strong>₹{balance.toLocaleString()}</strong>
                      </div>
                    </div>
                  )}
                  {balance <= 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#f0fff4', borderRadius: '10px', marginBottom: '16px', border: '1px solid #c6f6d5' }}>
                      <span className="material-icons" style={{ color: '#76C442', fontSize: '20px' }}>check_circle</span>
                      <div style={{ fontSize: '13px', color: '#276749' }}>All fees cleared for this student!</div>
                    </div>
                  )}

                  <button type="submit" style={{ width: '100%', padding: '14px', background: '#76C442', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span className="material-icons">payments</span>
                    Collect ₹{parseFloat(amount || 0).toLocaleString()}
                  </button>
                </form>
              </div>
            ) : (
              <div className="chart-card" style={{ textAlign: 'center' }}>
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#f0fff4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <span className="material-icons" style={{ color: '#76C442', fontSize: '32px' }}>check_circle</span>
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#2d3748', marginBottom: '8px' }}>Payment Successful!</h3>
                <p style={{ fontSize: '14px', color: '#718096', marginBottom: '4px' }}>Receipt: <strong style={{ color: '#76C442' }}>{receiptNo}</strong></p>
                <p style={{ fontSize: '13px', color: '#718096', marginBottom: '24px' }}>
                  ₹{parseFloat(amount).toLocaleString()} via {payMethod} &nbsp;·&nbsp; {payDate}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button onClick={() => window.print()} style={{ padding: '12px 24px', background: '#76C442', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-icons">print</span> Print Receipt
                  </button>
                  <button onClick={() => { setPaid(false); setRefNo(''); setRemarks(''); }}
                    style={{ padding: '12px 24px', border: '1.5px solid #e2e8f0', borderRadius: '10px', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    New Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print receipt */}
      {paid && (
        <div className="print-only" ref={printRef} style={{ padding: '40px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px', position: 'relative' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#2d3748', margin: 0 }}>Schoolers School</h1>
            <p style={{ fontSize: '12px', color: '#718096', margin: '4px 0' }}>123 Education Avenue, Knowledge City - 400001</p>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#76C442', marginTop: '12px' }}>FEE RECEIPT</h2>
            <div style={{ position: 'absolute', top: '10px', right: '10px', width: '80px', height: '80px', border: '4px solid #76C44240', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#76C44260', fontWeight: 800, fontSize: '18px', transform: 'rotate(-20deg)', display: 'inline-block' }}>PAID</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
            {[
              ['Receipt No', receiptNo], ['Date', payDate],
              ['Student', foundStudent.name], ['Class', `${foundStudent.class}-${foundStudent.section || ''}`],
              ['Roll No', foundStudent.rollNo || foundStudent.id], ['Father', foundStudent.fatherName || foundStudent.parent || ''],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '8px 12px', background: '#f7fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: '#a0aec0', textTransform: 'uppercase' }}>{k}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748' }}>{v}</div>
              </div>
            ))}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
            <thead><tr style={{ background: '#f0f4f8' }}>
              <th style={{ padding: '10px 12px', fontSize: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Fee Description</th>
              <th style={{ padding: '10px 12px', fontSize: '12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Amount</th>
            </tr></thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px', fontSize: '13px', borderBottom: '1px solid #f0f4f8' }}>{selFeeType}</td>
                <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid #f0f4f8' }}>₹{parseFloat(amount).toLocaleString()}</td>
              </tr>
              <tr style={{ background: '#f0fff4' }}>
                <td style={{ padding: '12px', fontWeight: 700 }}>Total Paid</td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: '#76C442', fontSize: '16px' }}>₹{parseFloat(amount).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: '12px', color: '#718096', display: 'flex', justifyContent: 'space-between' }}>
            <div><strong>Method:</strong> {payMethod}</div>
            {refNo && <div><strong>Ref:</strong> {refNo}</div>}
          </div>
          <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#a0aec0' }}>
            <div>School Management System</div>
            <div>Signature: _________________</div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CollectFee;
