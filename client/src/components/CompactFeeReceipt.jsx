/**
 * CompactFeeReceipt
 *
 * A dense, small-footprint fee receipt card for the "N receipts per A4 page"
 * print templates (1/2/3 per page — see utils/feeReceiptPdf.js). Deliberately
 * compact regardless of template: even at 1-per-page the receipt itself stays
 * this size (centered on the page) rather than stretching to fill the sheet.
 *
 * Rendered off-screen (one instance per receipt) so it can be captured by
 * html2canvas and composited into a PDF — see utils/feeReceiptPdf.js. Must
 * stay inside the same provider tree as the rest of the app (uses useSchool()),
 * so it's mounted as a normal React child, never into a separate detached root.
 *
 * Props:
 *   id      – DOM id for this instance (must be unique per receipt on the page)
 *   receipt – { receiptNo, date, studentName, rollNo, className, section,
 *               totalFee, amountPaid, paidSoFar, dueAmount, status,
 *               paymentMode, term, receivedBy }
 */
import React from 'react';
import { useSchool } from '../context/SchoolContext';
import { formatClassName } from '../utils/format';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const dt = new Date(d.includes?.('T') ? d : `${d}T00:00:00`);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
};

const S = {
  card: {
    width: '440px',
    fontFamily: "'Arial', 'Helvetica', sans-serif",
    fontSize: '9px',
    color: '#111',
    background: '#fff',
    border: '1.5px solid #0369a1',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  header: {
    background: '#0369a1',
    color: '#fff',
    padding: '6px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logo: { width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0, borderRadius: '4px', background: '#fff' },
  schoolName: { fontSize: '12px', fontWeight: 900, lineHeight: 1.15 },
  titleBar: {
    background: '#e0f2fe', color: '#0369a1', textAlign: 'center', padding: '3px 8px',
    fontWeight: 800, fontSize: '9.5px', letterSpacing: '0.6px', textTransform: 'uppercase',
  },
  body: { padding: '7px 10px' },
  metaRow: { display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: '#475569', marginBottom: '5px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 10px', marginBottom: '5px' },
  field: { display: 'flex', gap: '4px', borderBottom: '1px dotted #dbeafe', paddingBottom: '1.5px' },
  label: { color: '#64748b', fontWeight: 700, flexShrink: 0 },
  value: { color: '#0f172a', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  amountBox: {
    background: '#f0fdf4', border: '1.5px solid #16a34a', borderRadius: '4px',
    padding: '5px 10px', margin: '4px 0', textAlign: 'center',
  },
  amountLabel: { fontSize: '7.5px', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.4px' },
  amountValue: { fontSize: '16px', fontWeight: 900, color: '#166534' },
  moneyRow: { display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', padding: '1.5px 0' },
  footer: {
    display: 'flex', justifyContent: 'space-between', paddingTop: '4px',
    borderTop: '1px solid #cbd5e1', fontSize: '7.5px', color: '#64748b',
  },
};

export default function CompactFeeReceipt({ id, receipt }) {
  const { school, logoVersion } = useSchool();
  const schoolName = school?.name || 'School';
  const schoolLogoUrl = school?.logoUrl ? `${school.logoUrl}?v=${logoVersion}` : null;

  const r = receipt || {};
  const previouslyPaid = Math.max(0, Number(r.paidSoFar || 0) - Number(r.amountPaid || 0));
  const balanceDue = Number(r.dueAmount || 0);

  return (
    <div id={id} style={S.card}>
      <div style={S.header}>
        {schoolLogoUrl && <img src={schoolLogoUrl} alt="" style={S.logo} />}
        <div style={S.schoolName}>{schoolName}</div>
      </div>

      <div style={S.titleBar}>Fee Payment Receipt</div>

      <div style={S.body}>
        <div style={S.metaRow}>
          <span>Receipt No: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{r.receiptNo || '—'}</strong></span>
          <span>Date: <strong style={{ color: '#0f172a' }}>{fmtDate(r.date)}</strong></span>
        </div>

        <div style={S.grid}>
          <div style={{ ...S.field, gridColumn: '1 / -1' }}>
            <span style={S.label}>Student:</span>
            <span style={{ ...S.value, textTransform: 'uppercase' }}>{r.studentName || '—'}</span>
          </div>
          <div style={S.field}><span style={S.label}>Roll No:</span><span style={S.value}>{r.rollNo || '—'}</span></div>
          <div style={S.field}>
            <span style={S.label}>Class:</span>
            <span style={S.value}>{r.className ? formatClassName(r.className, r.section) : '—'}</span>
          </div>
        </div>

        <div style={S.amountBox}>
          <div style={S.amountLabel}>Amount Received ({r.paymentMode || 'Cash'})</div>
          <div style={S.amountValue}>₹{fmt(r.amountPaid)}</div>
        </div>

        <div style={S.moneyRow}><span style={{ color: '#64748b' }}>Total Assigned Fee</span><span style={{ fontWeight: 700 }}>₹{fmt(r.totalFee)}</span></div>
        <div style={S.moneyRow}><span style={{ color: '#64748b' }}>Previously Paid</span><span style={{ fontWeight: 700 }}>₹{fmt(previouslyPaid)}</span></div>
        <div style={S.moneyRow}><span style={{ color: '#64748b' }}>Total Paid to Date</span><span style={{ fontWeight: 700 }}>₹{fmt(r.paidSoFar)}</span></div>
        <div style={{ ...S.moneyRow, borderTop: '1px dashed #cbd5e1', paddingTop: '3px', marginTop: '1px' }}>
          <span style={{ color: '#64748b', fontWeight: 700 }}>Balance Due</span>
          <span style={{ fontWeight: 900, color: balanceDue > 0 ? '#dc2626' : '#166534' }}>
            {balanceDue > 0 ? `₹${fmt(balanceDue)}` : 'NIL'}
          </span>
        </div>
        {r.term && (
          <div style={S.moneyRow}><span style={{ color: '#64748b' }}>Term / Installment</span><span style={{ fontWeight: 700, color: '#0369a1' }}>{r.term}</span></div>
        )}

        <div style={S.footer}>
          <span>Received By: {r.receivedBy || '—'}</span>
          <span>System-generated receipt</span>
        </div>
      </div>
    </div>
  );
}
