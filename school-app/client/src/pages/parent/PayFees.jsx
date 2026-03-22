import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import '../../styles/sidebar.css';
import '../../styles/dashboard.css';

const feeHistory = [
  { id: 1, type: 'Tuition Fee - Q1', amount: 15000, dueDate: '10 Jan 2026', paidDate: '08 Jan 2026', status: 'PAID', method: 'Online' },
  { id: 2, type: 'Transport Fee - Q1', amount: 3500, dueDate: '10 Jan 2026', paidDate: '08 Jan 2026', status: 'PAID', method: 'Online' },
  { id: 3, type: 'Tuition Fee - Q2', amount: 15000, dueDate: '10 Apr 2026', paidDate: null, status: 'PENDING', method: null },
  { id: 4, type: 'Lab Fee - Annual', amount: 2000, dueDate: '10 Feb 2026', paidDate: '09 Feb 2026', status: 'PAID', method: 'Cash' },
  { id: 5, type: 'Exam Fee', amount: 1500, dueDate: '01 Mar 2026', paidDate: null, status: 'OVERDUE', method: null },
];

const PayFees = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [paySuccess, setPaySuccess] = useState(false);
  const [fees, setFees] = useState(feeHistory);

  const totalPaid = fees.filter(f => f.status === 'PAID').reduce((a, f) => a + f.amount, 0);
  const totalPending = fees.filter(f => f.status !== 'PAID').reduce((a, f) => a + f.amount, 0);
  const pendingFees = fees.filter(f => f.status !== 'PAID');

  const handlePay = () => {
    setFees(fees.map(f => f.id === selectedFee.id ? { ...f, status: 'PAID', paidDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), method: paymentMethod === 'online' ? 'Online' : paymentMethod === 'upi' ? 'UPI' : 'Cash' } : f));
    setShowPayModal(false);
    setPaySuccess(true);
    setTimeout(() => setPaySuccess(false), 4000);
  };

  const getStatusBadge = (status) => {
    const map = { 'PAID': 'status-paid', 'PENDING': 'status-pending', 'OVERDUE': 'status-overdue' };
    return <span className={`status-badge ${map[status]}`}>{status}</span>;
  };

  return (
    <div className="app-layout">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} mobileOpen={mobileSidebarOpen} />
      {mobileSidebarOpen && <div className="sidebar-overlay visible" onClick={() => setMobileSidebarOpen(false)} />}

      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar pageTitle="Pay Fees" onMenuToggle={() => {
          if (window.innerWidth <= 1024) setMobileSidebarOpen(!mobileSidebarOpen);
          else setSidebarCollapsed(!sidebarCollapsed);
        }} />

        <div className="page-content">
          <div className="page-header">
            <h1>Fee Payment</h1>
            <p>Manage and pay Arjun's school fees</p>
          </div>

          {paySuccess && (
            <div className="alert-success" style={{ marginBottom: '20px' }}>
              <span className="material-icons">check_circle</span>
              Payment successful! The fee has been marked as paid.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Paid', value: `₹${totalPaid.toLocaleString()}`, color: '#76C442', icon: 'check_circle' },
              { label: 'Pending Amount', value: `₹${totalPending.toLocaleString()}`, color: '#e53e3e', icon: 'pending_actions' },
              { label: 'Annual Fee', value: '₹45,000', color: '#3182ce', icon: 'payments' },
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

          {/* Payment Progress */}
          <div style={{ background: 'linear-gradient(135deg, #76C442 0%, #5fa832 100%)', borderRadius: '16px', padding: '28px', color: '#fff', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', opacity: 0.85, marginBottom: '4px' }}>Annual Fee Payment Progress</div>
                <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'Poppins, sans-serif' }}>
                  {Math.round((totalPaid / 45000) * 100)}% Paid
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', opacity: 0.75 }}>Remaining</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>₹{(45000 - totalPaid).toLocaleString()}</div>
              </div>
            </div>
            <div style={{ height: '10px', background: 'rgba(255,255,255,0.2)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#fff', borderRadius: '5px', width: `${(totalPaid / 45000) * 100}%`, transition: 'width 0.5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
              <span>₹{totalPaid.toLocaleString()} paid</span>
              <span>₹45,000 total</span>
            </div>
          </div>

          {/* Pending Fees */}
          {pendingFees.length > 0 && (
            <div className="data-table-card" style={{ marginBottom: '24px' }}>
              <div className="data-table-title" style={{ marginBottom: '16px' }}>Pending Payments</div>
              {pendingFees.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: '#fff5f5', borderRadius: '12px', marginBottom: '10px', border: '1px solid #fed7d7' }}>
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
                  <button
                    onClick={() => { setSelectedFee(f); setShowPayModal(true); }}
                    style={{ padding: '10px 20px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
                  >
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && selectedFee && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPayModal(false)}>
          <div className="modal-container" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <span className="modal-title">Pay Fee</span>
              <button className="modal-close" onClick={() => setShowPayModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#f7fafc', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#718096', marginBottom: '4px' }}>{selectedFee.type}</div>
                <div style={{ fontSize: '36px', fontWeight: 800, color: '#2d3748', fontFamily: 'Poppins, sans-serif' }}>₹{selectedFee.amount.toLocaleString()}</div>
                <div style={{ fontSize: '13px', color: '#e53e3e', marginTop: '4px' }}>Due: {selectedFee.dueDate}</div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Select Payment Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '8px' }}>
                  {[
                    { value: 'online', icon: 'credit_card', label: 'Card/Net Banking' },
                    { value: 'upi', icon: 'qr_code', label: 'UPI' },
                    { value: 'cash', icon: 'payments', label: 'Cash' },
                  ].map(m => (
                    <div
                      key={m.value}
                      onClick={() => setPaymentMethod(m.value)}
                      style={{
                        padding: '14px 8px', border: paymentMethod === m.value ? '2px solid #76C442' : '1.5px solid #e2e8f0',
                        borderRadius: '10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                        background: paymentMethod === m.value ? '#f0fff4' : '#fafafa'
                      }}
                    >
                      <span className="material-icons" style={{ fontSize: '24px', color: paymentMethod === m.value ? '#76C442' : '#a0aec0', display: 'block', marginBottom: '4px' }}>{m.icon}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: paymentMethod === m.value ? '#76C442' : '#718096' }}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowPayModal(false)} style={{ padding: '12px 24px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button onClick={handlePay} style={{ padding: '12px 32px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                Confirm Payment ₹{selectedFee.amount.toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayFees;
