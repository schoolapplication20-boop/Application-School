import React, { useState, useRef, useEffect } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { parentAPI } from '../../services/api';

export default function PayFees() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedFee, setSelectedFee]   = useState(null);
  const [receiptFee, setReceiptFee]     = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [upiId, setUpiId]               = useState('');
  const [cardNum, setCardNum]           = useState('');
  const [cardExpiry, setCardExpiry]     = useState('');
  const [cardCvv, setCardCvv]           = useState('');
  const [fees, setFees]                 = useState([]);
  const [checkedFees, setCheckedFees]   = useState([]);
  const [toast, setToast]               = useState(null);
  const [paying, setPaying]             = useState(false);
  const [studentId, setStudentId]       = useState(null);
  const [childName, setChildName]       = useState('');
  const receiptRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadFees = async (sid) => {
    const id = sid ?? studentId;
    if (!id) return;
    try {
      const res = await parentAPI.getChildFees(id);
      setFees(res.data?.data ?? []);
    } catch (err) {
      console.error('Failed to load fees', err);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    parentAPI.getMyChildren()
      .then(res => {
        const list = res.data?.data ?? [];
        const child = list[0] ?? null;
        const sid = child?.id;
        if (sid) {
          setStudentId(sid);
          setChildName(child.name || '');
          loadFees(sid);
        }
      })
      .catch(err => console.error('Failed to load child info', err));
  }, [user?.id]);

  const totalPaid    = fees.filter(f => f.status === 'PAID').reduce((a, f) => a + f.amount, 0);
  const totalPending = fees.filter(f => f.status !== 'PAID').reduce((a, f) => a + f.amount, 0);
  const totalFee     = fees.reduce((a, f) => a + f.amount, 0);
  const pendingFees  = fees.filter(f => f.status !== 'PAID');

  const toggleCheck = (id) => setCheckedFees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handlePaySingle = (f) => {
    setSelectedFee(f);
    setPaymentMethod('card');
    setUpiId(''); setCardNum(''); setCardExpiry(''); setCardCvv('');
    setShowPayModal(true);
  };

  const handlePaySelected = () => {
    if (checkedFees.length === 0) { showToast('Please select at least one fee to pay', 'warning'); return; }
    const total = fees.filter(f => checkedFees.includes(f.id)).reduce((a, f) => a + f.amount, 0);
    setSelectedFee({ type: `${checkedFees.length} fee(s)`, amount: total, id: null });
    setPaymentMethod('card');
    setUpiId(''); setCardNum(''); setCardExpiry(''); setCardCvv('');
    setShowPayModal(true);
  };

  const handlePay = async () => {
    if (paymentMethod === 'upi' && !upiId.trim()) { showToast('Please enter your UPI ID', 'error'); return; }
    if (paymentMethod === 'card' && (!cardNum.trim() || !cardExpiry.trim() || !cardCvv.trim())) {
      showToast('Please fill in all card details', 'error'); return;
    }
    setPaying(true);
    try {
      const methodLabel = { card: 'Card/Net Banking', upi: 'UPI', cash: 'Cash' }[paymentMethod];
      const idsToMark   = selectedFee.id ? [selectedFee.id] : checkedFees;
      const paidDate    = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      // Persist each payment to the database
      await Promise.all(
        idsToMark.map(id => parentAPI.payFee({ feeId: id, method: methodLabel, paidDate }))
      );

      // Reload fees from DB to reflect true state
      await loadFees();

      // Build receipt from the fee we just paid (use local data before reload for receipt display)
      const justPaid = fees.find(f => idsToMark.includes(f.id));
      setCheckedFees([]);
      setShowPayModal(false);

      if (justPaid) {
        setReceiptFee({ ...justPaid, status: 'PAID', paidDate, method: methodLabel, receiptNo: `RCP-${Date.now()}` });
        setShowReceiptModal(true);
      }

      addNotification({
        text: `Fee payment of ₹${selectedFee.amount.toLocaleString()} received from ${user?.name || 'Parent'}.`,
        icon: 'payments',
        color: '#3182ce',
        role: 'ADMIN',
        details: {
          type: 'fee_payment',
          sender: user?.name || 'Parent',
          senderRole: 'Parent',
          feeType: selectedFee.type,
          amount: selectedFee.amount,
          method: methodLabel,
          paidDate,
        },
      });

      showToast(`Payment of ₹${selectedFee.amount.toLocaleString()} successful!`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setPaying(false);
    }
  };

  const handlePrintReceipt = () => {
    const content = receiptRef.current?.innerHTML;
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    printWindow.document.write(`
      <html>
        <head>
          <title>Fee Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #2d3748; }
            .receipt-header { text-align: center; border-bottom: 2px solid #76C442; padding-bottom: 16px; margin-bottom: 20px; }
            .receipt-header h2 { margin: 0 0 4px; color: #2d3748; font-size: 22px; }
            .receipt-header p { margin: 0; color: #718096; font-size: 13px; }
            .receipt-title { font-size: 18px; font-weight: 700; text-align: center; margin: 12px 0; color: #76C442; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            td { padding: 10px 12px; border-bottom: 1px solid #f0f4f8; font-size: 13px; }
            td:first-child { font-weight: 600; color: #718096; width: 40%; }
            .total-row td { font-size: 16px; font-weight: 700; color: #2d3748; background: #f0fff4; }
            .receipt-footer { text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #a0aec0; }
            .paid-stamp { text-align: center; margin: 16px 0; }
            .paid-stamp span { border: 3px solid #76C442; color: #76C442; padding: 6px 24px; border-radius: 8px; font-size: 20px; font-weight: 900; transform: rotate(-12deg); display: inline-block; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const getStatusBadge = (status) => {
    const map = { PAID: 'status-paid', PENDING: 'status-pending', OVERDUE: 'status-overdue' };
    return <span className={`status-badge ${map[status]}`}>{status}</span>;
  };

  return (
    <Layout pageTitle="Pay Fees">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Fee Payment</h1>
        <p>Manage and pay {childName ? `${childName}'s` : "your child's"} school fees</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Paid',     value: `₹${totalPaid.toLocaleString()}`,     color: '#76C442', icon: 'check_circle' },
          { label: 'Pending Amount', value: `₹${totalPending.toLocaleString()}`,   color: '#e53e3e', icon: 'pending_actions' },
          { label: 'Annual Fee',     value: `₹${totalFee.toLocaleString()}`,     color: '#3182ce', icon: 'payments' },
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

      {/* Progress */}
      <div style={{ background: 'linear-gradient(135deg, #76C442 0%, #5fa832 100%)', borderRadius: '16px', padding: '28px', color: '#fff', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', opacity: 0.85, marginBottom: '4px' }}>Annual Fee Payment Progress</div>
            <div style={{ fontSize: '32px', fontWeight: 800 }}>{Math.round((totalPaid / totalFee) * 100)}% Paid</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', opacity: 0.75 }}>Remaining</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>₹{(totalFee - totalPaid).toLocaleString()}</div>
          </div>
        </div>
        <div style={{ height: '10px', background: 'rgba(255,255,255,0.2)', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#fff', borderRadius: '5px', width: `${Math.min((totalPaid / totalFee) * 100, 100)}%`, transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
          <span>₹{totalPaid.toLocaleString()} paid</span>
          <span>₹{totalFee.toLocaleString()} total</span>
        </div>
      </div>

      {/* Pending Fees */}
      {pendingFees.length > 0 && (
        <div className="data-table-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="data-table-title">Pending Payments</div>
            {checkedFees.length > 0 && (
              <button onClick={handlePaySelected} style={{ padding: '8px 16px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                Pay Selected ({checkedFees.length}) — ₹{fees.filter(f => checkedFees.includes(f.id)).reduce((a, f) => a + f.amount, 0).toLocaleString()}
              </button>
            )}
          </div>
          {pendingFees.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: '#fff5f5', borderRadius: '12px', marginBottom: '10px', border: '1px solid #fed7d7' }}>
              <input type="checkbox" checked={checkedFees.includes(f.id)} onChange={() => toggleCheck(f.id)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e53e3e15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-icons" style={{ color: '#e53e3e', fontSize: '22px' }}>payments</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#2d3748', marginBottom: '3px' }}>{f.type}</div>
                <div style={{ fontSize: '12px', color: '#718096' }}>Due: {f.dueDate}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#e53e3e' }}>₹{f.amount.toLocaleString()}</div>
                {getStatusBadge(f.status)}
              </div>
              <button onClick={() => handlePaySingle(f)} style={{ padding: '10px 20px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                Pay Now
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Payment History */}
      <div className="data-table-card">
        <div className="data-table-title" style={{ marginBottom: '16px' }}>Payment History</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fee Type</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Paid Date</th>
                <th>Method</th>
                <th>Status</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {fees.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600, fontSize: '13px' }}>{f.type}</td>
                  <td style={{ fontWeight: 700 }}>₹{f.amount.toLocaleString()}</td>
                  <td style={{ fontSize: '12px', color: '#718096' }}>{f.dueDate}</td>
                  <td style={{ fontSize: '12px', color: '#76C442', fontWeight: 500 }}>{f.paidDate || '—'}</td>
                  <td style={{ fontSize: '12px', color: '#a0aec0' }}>{f.method || '—'}</td>
                  <td>{getStatusBadge(f.status)}</td>
                  <td>
                    {f.status === 'PAID' && (
                      <button
                        onClick={() => { setReceiptFee(f); setShowReceiptModal(true); }}
                        style={{ padding: '5px 10px', background: '#f7fafc', border: '1.5px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', color: '#4a5568' }}>
                        <span className="material-icons" style={{ fontSize: 14 }}>receipt</span>
                        Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && selectedFee && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Pay Fee</h5>
                <button className="btn-close" onClick={() => setShowPayModal(false)} />
              </div>
              <div className="modal-body">
                <div style={{ background: '#f7fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#718096', marginBottom: '4px' }}>{selectedFee.type}</div>
                  <div style={{ fontSize: '36px', fontWeight: 800, color: '#2d3748' }}>₹{selectedFee.amount.toLocaleString()}</div>
                  {selectedFee.dueDate && <div style={{ fontSize: '13px', color: '#e53e3e', marginTop: '4px' }}>Due: {selectedFee.dueDate}</div>}
                </div>

                <label className="form-label fw-medium">Select Payment Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '8px' }}>
                  {[
                    { value: 'card', icon: 'credit_card', label: 'Card/Net Banking' },
                    { value: 'upi',  icon: 'qr_code',     label: 'UPI' },
                    { value: 'cash', icon: 'payments',    label: 'Cash' },
                  ].map(m => (
                    <div key={m.value} onClick={() => setPaymentMethod(m.value)} style={{
                      padding: '14px 8px', border: paymentMethod === m.value ? '2px solid #76C442' : '1.5px solid #e2e8f0',
                      borderRadius: '10px', textAlign: 'center', cursor: 'pointer',
                      background: paymentMethod === m.value ? '#f0fff4' : '#fafafa'
                    }}>
                      <span className="material-icons" style={{ fontSize: '24px', color: paymentMethod === m.value ? '#76C442' : '#a0aec0', display: 'block', marginBottom: '4px' }}>{m.icon}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: paymentMethod === m.value ? '#76C442' : '#718096' }}>{m.label}</span>
                    </div>
                  ))}
                </div>

                {paymentMethod === 'upi' && (
                  <div className="mt-3">
                    <label className="form-label small fw-medium">UPI ID *</label>
                    <input type="text" className="form-control form-control-sm" placeholder="yourname@upi"
                      value={upiId} onChange={e => setUpiId(e.target.value)} />
                  </div>
                )}
                {paymentMethod === 'card' && (
                  <div className="mt-3 row g-2">
                    <div className="col-12">
                      <label className="form-label small fw-medium">Card Number *</label>
                      <input type="text" className="form-control form-control-sm" placeholder="1234 5678 9012 3456"
                        maxLength={19} value={cardNum}
                        onChange={e => setCardNum(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19))} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">Expiry *</label>
                      <input type="text" className="form-control form-control-sm" placeholder="MM/YY"
                        maxLength={5} value={cardExpiry}
                        onChange={e => {
                          let v = e.target.value.replace(/\D/g, '');
                          if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2,4);
                          setCardExpiry(v);
                        }} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">CVV *</label>
                      <input type="password" className="form-control form-control-sm" placeholder="***"
                        maxLength={3} value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))} />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button className="btn btn-success" onClick={handlePay} disabled={paying}
                  style={{ padding: '10px 24px', fontWeight: 700 }}>
                  {paying ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                      Processing...
                    </span>
                  ) : (
                    <>
                      <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>lock</span>
                      Confirm Payment ₹{selectedFee.amount.toLocaleString()}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && receiptFee && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Fee Receipt</h5>
                <button className="btn-close" onClick={() => setShowReceiptModal(false)} />
              </div>
              <div className="modal-body">
                {/* Printable area */}
                <div ref={receiptRef}>
                  <div className="receipt-header" style={{ textAlign: 'center', borderBottom: '2px solid #76C442', paddingBottom: 16, marginBottom: 20 }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#2d3748' }}>🏆 Schoolers</div>
                    <div style={{ fontSize: '13px', color: '#718096' }}>Management System</div>
                  </div>
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '17px', color: '#76C442', marginBottom: '16px' }}>
                    PAYMENT RECEIPT
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {[
                        ['Receipt No',    receiptFee.receiptNo || `RCP-${receiptFee.id}`],
                        ['Fee Type',      receiptFee.type],
                        ['Amount Paid',   `₹${receiptFee.amount.toLocaleString()}`],
                        ['Due Date',      receiptFee.dueDate],
                        ['Paid On',       receiptFee.paidDate],
                        ['Payment Mode',  receiptFee.method],
                        ['Status',        'PAID'],
                      ].map(([k, v]) => (
                        <tr key={k} style={{ borderBottom: '1px solid #f0f4f8' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#718096', fontSize: '13px', width: '40%' }}>{k}</td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', color: '#2d3748', fontWeight: k === 'Amount Paid' ? 800 : 400 }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ textAlign: 'center', margin: '20px 0 8px' }}>
                    <span style={{ border: '3px solid #76C442', color: '#76C442', padding: '6px 24px', borderRadius: '8px', fontSize: '18px', fontWeight: 900, display: 'inline-block', transform: 'rotate(-5deg)' }}>
                      PAID ✓
                    </span>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#a0aec0' }}>
                    Thank you for your payment. This is a computer-generated receipt.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowReceiptModal(false)}>Close</button>
                <button className="btn btn-primary" onClick={handlePrintReceipt}>
                  <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>print</span>
                  Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
