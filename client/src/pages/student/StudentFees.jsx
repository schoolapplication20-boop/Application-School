import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { studentAPI } from '../../services/api';

/* ── helpers ── */
const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d + (d.includes('T') ? '' : 'T00:00:00'))
      .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
};

const isOverdue = (dueDate, status) =>
  status !== 'PAID' && dueDate && new Date(dueDate + 'T00:00:00') < new Date();

/* ── Fee type rows ── */
const FEE_TYPES = [
  { key: 'tuitionFee',   label: 'Tuition Fee',   icon: 'school',          color: '#4299e1' },
  { key: 'transportFee', label: 'Transport Fee',  icon: 'directions_bus',  color: '#48bb78' },
  { key: 'labFee',       label: 'Lab Fee',        icon: 'science',         color: '#9f7aea' },
  { key: 'examFee',      label: 'Exam Fee',       icon: 'edit_note',       color: '#ed8936' },
  { key: 'sportsFee',    label: 'Sports Fee',     icon: 'sports_soccer',   color: '#f56565' },
  { key: 'otherFee',     label: 'Other Fee',      icon: 'more_horiz',      color: '#718096' },
];

/* ══════════════════════════════════════════════════════════════════ */
export default function StudentFees() {
  const [feeData, setFeeData]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [activeTab, setActiveTab]   = useState('installments');
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    studentAPI.getMyFees()
      .then(res => {
        setFeeData(res.data?.data ?? null);
        setLastUpdated(new Date());
      })
      .catch(() => setError('Unable to load fee details. Please refresh the page.'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── derived ── */
  const summary      = feeData?.summary          ?? {};
  const installments = feeData?.installments      ?? [];
  const payments     = feeData?.payments          ?? [];
  const assignment   = feeData?.assignment        ?? null;
  const cfs          = feeData?.classFeeStructure ?? null;  // fee type breakdown

  const totalFee   = Number(summary.totalFee   || 0);
  const paidAmount = Number(summary.paidAmount  || 0);
  const dueAmount  = Number(summary.dueAmount   || 0);
  const paidPct    = totalFee > 0 ? Math.min(100, (paidAmount / totalFee) * 100) : 0;

  const overallStatus = summary.status || assignment?.status || 'PENDING';
  const nextDueDate   = summary.nextDueDate ?? assignment?.dueDate ?? null;

  const statusConfig = {
    PAID:    { bg: '#f0fff4', color: '#276749', label: 'Fully Paid',      dot: '#38a169' },
    PARTIAL: { bg: '#fffbeb', color: '#b45309', label: 'Partially Paid',  dot: '#d69e2e' },
    PENDING: { bg: '#fff5f5', color: '#c53030', label: 'Payment Pending', dot: '#e53e3e' },
    OVERDUE: { bg: '#fff5f5', color: '#9b2c2c', label: 'Overdue',         dot: '#9b2c2c' },
  };
  const sc = statusConfig[overallStatus] || statusConfig.PENDING;

  /* fee type rows with amounts from class structure */
  const feeTypeRows = cfs
    ? FEE_TYPES.filter(ft => Number(cfs[ft.key] || 0) > 0)
    : [];

  /* ── sub-components ── */
  const SummaryCard = ({ icon, label, value, color, highlight, sub }) => (
    <div style={{
      background: highlight ? color + '0d' : '#fff',
      border: `1.5px solid ${highlight ? color + '40' : '#e2e8f0'}`,
      borderRadius: 14, padding: '18px 20px',
      display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 160,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 11, background: color + '1a', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span className="material-icons" style={{ color, fontSize: 22 }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: highlight ? color : '#1a202c', lineHeight: 1.1 }}>
          ₹{fmt(value)}
        </div>
        <div style={{ fontSize: 12, color: '#718096', fontWeight: 600, marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );

  const InstBadge = ({ status, dueDate }) => {
    const overdue = isOverdue(dueDate, status);
    if (status === 'PAID')
      return <span style={{ padding: '3px 11px', background: '#f0fff4', color: '#276749', borderRadius: 99, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span className="material-icons" style={{ fontSize: 12 }}>check_circle</span> Paid
      </span>;
    if (overdue)
      return <span style={{ padding: '3px 11px', background: '#fff5f5', color: '#c53030', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>Overdue</span>;
    return <span style={{ padding: '3px 11px', background: '#fffbeb', color: '#b45309', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>Pending</span>;
  };

  /* ── loading ── */
  if (loading) return (
    <Layout pageTitle="My Fees">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16, color: '#a0aec0' }}>
        <div style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#76C442', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>Loading your fee details…</span>
      </div>
    </Layout>
  );

  /* ── error ── */
  if (error) return (
    <Layout pageTitle="My Fees">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <span className="material-icons" style={{ fontSize: 52, color: '#e53e3e' }}>error_outline</span>
        <p style={{ fontSize: 15, color: '#e53e3e', fontWeight: 600, margin: 0 }}>{error}</p>
        <button onClick={load} style={{ padding: '9px 22px', background: '#76C442', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Try Again
        </button>
      </div>
    </Layout>
  );

  /* ── empty state ── */
  if (!assignment) return (
    <Layout pageTitle="My Fees">
      <div style={{ padding: '20px 24px', maxWidth: 700 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a202c' }}>My Fees</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#a0aec0' }}>Track your fee payments and installments</p>
        </div>
        <div style={{
          background: '#fff', border: '2px dashed #e2e8f0', borderRadius: 16,
          padding: '70px 40px', textAlign: 'center',
        }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span className="material-icons" style={{ fontSize: 36, color: '#cbd5e0' }}>account_balance_wallet</span>
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#4a5568' }}>No Fee Assigned Yet</h3>
          <p style={{ margin: 0, fontSize: 14, color: '#a0aec0', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Your fee details will appear here once assigned by the admin.
            Please contact your school administration if you have questions.
          </p>
        </div>
      </div>
    </Layout>
  );

  /* ── main view ── */
  const tabs = [
    { key: 'installments', label: 'Installment Schedule', icon: 'event_note',  count: installments.length },
    { key: 'history',      label: 'Payment History',      icon: 'receipt_long', count: payments.length     },
  ];

  return (
    <Layout pageTitle="My Fees">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ padding: '20px 24px', maxWidth: 960 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a202c' }}>My Fees</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#718096' }}>
              <span style={{ fontWeight: 600 }}>{assignment.studentName}</span>
              {assignment.className && <> · {assignment.className}</>}
              {assignment.rollNumber && <> · Roll No: {assignment.rollNumber}</>}
              {assignment.academicYear && <> · AY {assignment.academicYear}</>}
            </p>
            {lastUpdated && (
              <p style={{ margin: '3px 0 0', fontSize: 11, color: '#a0aec0' }}>
                Last updated: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ padding: '5px 14px', background: sc.bg, color: sc.color, borderRadius: 99, fontSize: 12, fontWeight: 700, border: `1px solid ${sc.color}30`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
              {sc.label}
            </span>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              title="Refresh fee data"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#4a5568', cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1 }}>
              <span className="material-icons" style={{ fontSize: 15, animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}>refresh</span>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
          <SummaryCard icon="receipt_long"     label="Total Fee"      value={totalFee}    color="#4a5568" sub={`Academic Year ${assignment.academicYear || '—'}`} />
          <SummaryCard icon="check_circle"     label="Amount Paid"    value={paidAmount}   color="#38a169" highlight />
          <SummaryCard icon="pending_actions"  label="Balance Due"    value={dueAmount}    color="#e53e3e" highlight={dueAmount > 0} sub={nextDueDate ? `Next due: ${fmtDate(nextDueDate)}` : null} />
        </div>

        {/* ── Progress bar ── */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2d3748' }}>Payment Progress</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: paidPct >= 100 ? '#38a169' : '#4a5568' }}>{paidPct.toFixed(0)}%</span>
          </div>
          <div style={{ height: 10, background: '#edf2f7', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${paidPct}%`,
              background: paidPct >= 100 ? '#38a169' : 'linear-gradient(90deg, #76C442, #5fa832)',
              borderRadius: 99, transition: 'width 0.7s cubic-bezier(.4,0,.2,1)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#a0aec0' }}>
            <span>₹{fmt(paidAmount)} paid</span>
            <span>{dueAmount > 0 ? `₹${fmt(dueAmount)} remaining` : 'Fully cleared ✓'}</span>
          </div>
        </div>

        {/* ── Fee Type Breakdown (from class structure) ── */}
        {feeTypeRows.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2d3748', marginBottom: 14 }}>Fee Breakdown</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {feeTypeRows.map(ft => (
                <div key={ft.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: ft.color + '0d', border: `1px solid ${ft.color}25`, borderRadius: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: ft.color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-icons" style={{ fontSize: 16, color: ft.color }}>{ft.icon}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#718096', fontWeight: 600 }}>{ft.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#2d3748' }}>₹{fmt(cfs[ft.key])}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#718096', fontWeight: 600 }}>Class Total Annual Fee</span>
              <span style={{ fontWeight: 800, color: '#1a202c' }}>₹{fmt(feeTypeRows.reduce((s, ft) => s + Number(cfs[ft.key] || 0), 0))}</span>
            </div>
            {assignment.remarks && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#718096', fontStyle: 'italic' }}>
                Note: {assignment.remarks}
              </div>
            )}
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '2px solid #edf2f7' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
              border: 'none', background: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: 600, color: activeTab === t.key ? '#276749' : '#718096',
              borderBottom: activeTab === t.key ? '2.5px solid #76C442' : '2.5px solid transparent',
              marginBottom: '-2px', transition: 'all 0.18s',
            }}>
              <span className="material-icons" style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
              {t.count > 0 && (
                <span style={{ background: activeTab === t.key ? '#76C44225' : '#f0f4f8', color: activeTab === t.key ? '#276749' : '#718096', borderRadius: 99, fontSize: 10, fontWeight: 800, padding: '1px 7px' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── INSTALLMENTS TAB ── */}
        {activeTab === 'installments' && (
          installments.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
              <span className="material-icons" style={{ fontSize: 48, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>event_note</span>
              <p style={{ margin: 0, fontSize: 14, color: '#a0aec0', fontWeight: 600 }}>No installment schedule set</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#a0aec0' }}>
                Your total fee of <strong style={{ color: '#2d3748' }}>₹{fmt(totalFee)}</strong> is due in full.
                {nextDueDate && <> Due by <strong style={{ color: '#e53e3e' }}>{fmtDate(nextDueDate)}</strong>.</>}
              </p>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
              {/* Mobile-friendly cards on small screens, table on wide */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                  <thead>
                    <tr style={{ background: '#f7fafc' }}>
                      {['#', 'Term / Installment', 'Amount', 'Due Date', 'Status', 'Paid On'].map((h, i) => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: i >= 2 && i <= 3 ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1.5px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {installments.map((inst, idx) => {
                      const overdue = isOverdue(inst.dueDate, inst.status);
                      const isPaid  = inst.status === 'PAID';
                      return (
                        <tr key={inst.id ?? idx}
                            style={{ borderBottom: '1px solid #f0f4f8', background: isPaid ? '#f0fff4' : overdue ? '#fff5f5' : '#fff' }}
                            onMouseEnter={e => { e.currentTarget.style.background = isPaid ? '#e6ffed' : overdue ? '#ffe4e4' : '#fafafa'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isPaid ? '#f0fff4' : overdue ? '#fff5f5' : '#fff'; }}>
                          <td style={{ padding: '13px 16px', fontSize: 12, color: '#a0aec0', fontWeight: 700 }}>{idx + 1}</td>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#2d3748', fontSize: 14 }}>{inst.termName}</div>
                          </td>
                          <td style={{ padding: '13px 16px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: '#1a202c' }}>
                            ₹{fmt(inst.amount)}
                          </td>
                          <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                            <div style={{ fontSize: 13, color: overdue ? '#e53e3e' : '#4a5568', fontWeight: overdue ? 700 : 400 }}>
                              {fmtDate(inst.dueDate)}
                            </div>
                            {overdue && <div style={{ fontSize: 10, color: '#e53e3e', fontWeight: 700, marginTop: 2 }}>PAST DUE</div>}
                          </td>
                          <td style={{ padding: '13px 16px' }}>
                            <InstBadge status={inst.status} dueDate={inst.dueDate} />
                          </td>
                          <td style={{ padding: '13px 16px', fontSize: 13, color: '#718096' }}>
                            {isPaid ? fmtDate(inst.paidDate) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f7fafc', borderTop: '2px solid #e2e8f0' }}>
                      <td colSpan={2} style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#4a5568' }}>
                        Total · {installments.filter(i => i.status === 'PAID').length} of {installments.length} paid
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 15, fontWeight: 800, color: '#1a202c' }}>
                        ₹{fmt(installments.reduce((s, i) => s + Number(i.amount || 0), 0))}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )
        )}

        {/* ── PAYMENT HISTORY TAB ── */}
        {activeTab === 'history' && (
          payments.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '60px 40px', textAlign: 'center' }}>
              <span className="material-icons" style={{ fontSize: 48, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>receipt_long</span>
              <p style={{ margin: 0, fontSize: 14, color: '#a0aec0', fontWeight: 600 }}>No payments recorded yet</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#a0aec0' }}>
                Payment transactions will appear here once your school records a payment.
              </p>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: '#f7fafc' }}>
                      {['Date', 'Term / Installment', 'Amount Paid', 'Receipt No.', 'Mode', 'Received By', 'Remarks'].map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: h === 'Amount Paid' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1.5px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, idx) => (
                      <tr key={p.id ?? idx}
                          style={{ borderBottom: '1px solid #f0f4f8' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#4a5568', whiteSpace: 'nowrap' }}>
                          {fmtDate(p.paymentDate)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {p.term
                            ? <span style={{ background: '#ebf8ff', color: '#2b6cb0', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{p.term}</span>
                            : <span style={{ color: '#a0aec0' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 15, fontWeight: 800, color: '#276749' }}>
                          ₹{fmt(p.amountPaid)}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 11, color: '#718096', fontFamily: 'monospace' }}>
                          {p.receiptNumber || '—'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: '#f0fff4', color: '#276749', padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                            {p.paymentMode || 'Cash'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, color: '#4a5568' }}>{p.receivedBy || '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#a0aec0', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.remarks || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f7fafc', borderTop: '2px solid #e2e8f0' }}>
                      <td colSpan={2} style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#4a5568' }}>
                        {payments.length} transaction{payments.length !== 1 ? 's' : ''}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 15, fontWeight: 800, color: '#276749' }}>
                        ₹{fmt(payments.reduce((s, p) => s + Number(p.amountPaid || 0), 0))}
                      </td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )
        )}

      </div>
    </Layout>
  );
}
