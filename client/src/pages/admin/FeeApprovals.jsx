import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABEL = {
  FEE_STRUCTURE_SAVE:   'Fee Structure Change',
  FEE_STRUCTURE_DELETE: 'Fee Structure Delete',
  STUDENT_FEE_UPDATE:   'Student Fee Update',
  CONDONATION_UPDATE:   'Concession Change',
  ASSIGNMENT_DELETE:    'Fee Assignment Delete',
};

const TYPE_ICON = {
  FEE_STRUCTURE_SAVE:   'edit_note',
  FEE_STRUCTURE_DELETE: 'delete_forever',
  STUDENT_FEE_UPDATE:   'person_edit',
  CONDONATION_UPDATE:   'discount',
  ASSIGNMENT_DELETE:    'remove_circle',
};

const FEE_FIELDS = [
  { key: 'tuitionFee',   label: 'Tuition Fee'   },
  { key: 'transportFee', label: 'Transport Fee'  },
  { key: 'labFee',       label: 'Lab Fee'        },
  { key: 'examFee',      label: 'Exam Fee'       },
  { key: 'sportsFee',    label: 'Sports Fee'     },
  { key: 'otherFee',     label: 'Other Fee'      },
];

const STUDENT_FEE_FIELDS = [
  { key: 'totalFee',          label: 'Total Fee'         },
  { key: 'condonationAmount', label: 'Concession Amount' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tryParse = (str) => {
  if (!str) return null;
  if (typeof str === 'object') return str;
  try { return JSON.parse(str); } catch { return null; }
};

const fmtCurrency = (val) => {
  const n = Number(val ?? 0);
  if (n === 0) return '—';
  return '₹' + n.toLocaleString('en-IN');
};

const fmtDate = (dt) => {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return String(dt); }
};

const buildRequestId = (req) => {
  if (!req?.requestedAt || !req?.id) return `FCR-${req?.id ?? '?'}`;
  const d = new Date(req.requestedAt);
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `FCR-${date}-${String(req.id).padStart(3, '0')}`;
};

const totalFee = (obj) =>
  FEE_FIELDS.reduce((s, f) => s + Number(obj?.[f.key] ?? 0), 0);

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const map = {
    PENDING:  { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', label: 'Pending'  },
    APPROVED: { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7', label: 'Approved' },
    REJECTED: { bg: '#fee2e2', color: '#7f1d1d', border: '#fca5a5', label: 'Rejected' },
  };
  const s = map[status] || map.PENDING;
  return (
    <span style={{
      padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1.5px solid ${s.border}`,
      letterSpacing: 0.3,
    }}>
      {s.label}
    </span>
  );
};

const SectionTitle = ({ icon, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
    <span className="material-icons" style={{ fontSize: 16, color: '#4361ee' }}>{icon}</span>
    <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {children}
    </span>
  </div>
);

// Fee structure table (current values only)
const CurrentFeeTable = ({ data }) => {
  const obj  = tryParse(data);
  const rows = FEE_FIELDS.filter(f => Number(obj?.[f.key] ?? 0) > 0);
  const tot  = totalFee(obj);

  if (!obj || rows.length === 0)
    return <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No existing fee structure on record.</p>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: '#f1f5f9' }}>
          <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1.5px solid #e2e8f0', fontSize: 11, textTransform: 'uppercase' }}>Fee Type</th>
          <th style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#475569', borderBottom: '1.5px solid #e2e8f0', fontSize: 11, textTransform: 'uppercase' }}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(f => (
          <tr key={f.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '8px 14px', color: '#334155' }}>{f.label}</td>
            <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>{fmtCurrency(obj[f.key])}</td>
          </tr>
        ))}
        <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
          <td style={{ padding: '9px 14px', fontWeight: 800, color: '#1e293b' }}>Total Fee</td>
          <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 800, color: '#1e293b', fontSize: 14 }}>{fmtCurrency(tot)}</td>
        </tr>
      </tbody>
    </table>
  );
};

// Changes comparison table (existing vs new with diff)
const FeeChangesTable = ({ existingData, newData, fields }) => {
  const existing = tryParse(existingData) || {};
  const newer    = tryParse(newData) || {};

  const rows = fields.filter(f => {
    const ev = Number(existing[f.key] ?? 0);
    const nv = Number(newer[f.key] ?? 0);
    return ev !== 0 || nv !== 0;
  });

  if (rows.length === 0)
    return <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No changes recorded.</p>;

  const changedRows  = rows.filter(f => Number(existing[f.key] ?? 0) !== Number(newer[f.key] ?? 0));
  const showOnlyChanged = changedRows.length > 0 && changedRows.length < rows.length;
  const displayRows  = showOnlyChanged ? changedRows : rows;

  const existingTotal = fields.reduce((s, f) => s + Number(existing[f.key] ?? 0), 0);
  const newTotal      = fields.reduce((s, f) => s + Number(newer[f.key] ?? 0), 0);
  const totalDiff     = newTotal - existingTotal;

  return (
    <>
      {showOnlyChanged && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontStyle: 'italic' }}>
          Showing {changedRows.length} changed field{changedRows.length !== 1 ? 's' : ''} only. Unchanged fields are not affected.
        </p>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            {['Fee Type', 'Current Amount', 'New Amount', 'Difference'].map(h => (
              <th key={h} style={{ padding: '8px 14px', textAlign: h === 'Fee Type' ? 'left' : 'right', fontWeight: 700, color: '#475569', borderBottom: '1.5px solid #e2e8f0', fontSize: 11, textTransform: 'uppercase' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map(f => {
            const ev   = Number(existing[f.key] ?? 0);
            const nv   = Number(newer[f.key] ?? 0);
            const diff = nv - ev;
            return (
              <tr key={f.key} style={{ borderBottom: '1px solid #f1f5f9', background: diff !== 0 ? (diff > 0 ? '#f0fdf4' : '#fef2f2') : undefined }}>
                <td style={{ padding: '9px 14px', color: '#334155', fontWeight: 600 }}>{f.label}</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', color: diff !== 0 ? '#94a3b8' : '#1e293b', textDecoration: diff !== 0 ? 'line-through' : 'none', fontWeight: 500 }}>
                  {fmtCurrency(ev)}
                </td>
                <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: diff > 0 ? '#15803d' : diff < 0 ? '#b91c1c' : '#1e293b' }}>
                  {fmtCurrency(nv)}
                </td>
                <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 800 }}>
                  {diff === 0
                    ? <span style={{ color: '#94a3b8', fontWeight: 500 }}>No change</span>
                    : <span style={{ color: diff > 0 ? '#15803d' : '#b91c1c' }}>
                        {diff > 0 ? '+' : ''}{fmtCurrency(Math.abs(diff))}
                        <span style={{ fontSize: 10, marginLeft: 4 }}>{diff > 0 ? '▲' : '▼'}</span>
                      </span>}
                </td>
              </tr>
            );
          })}
          {fields === FEE_FIELDS && (
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
              <td style={{ padding: '9px 14px', fontWeight: 800, color: '#1e293b' }}>Total Fee</td>
              <td style={{ padding: '9px 14px', textAlign: 'right', color: '#94a3b8', textDecoration: totalDiff !== 0 ? 'line-through' : 'none' }}>{fmtCurrency(existingTotal)}</td>
              <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 800, color: totalDiff > 0 ? '#15803d' : totalDiff < 0 ? '#b91c1c' : '#1e293b', fontSize: 14 }}>{fmtCurrency(newTotal)}</td>
              <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 800 }}>
                {totalDiff === 0
                  ? <span style={{ color: '#94a3b8', fontWeight: 500 }}>No change</span>
                  : <span style={{ color: totalDiff > 0 ? '#15803d' : '#b91c1c' }}>
                      {totalDiff > 0 ? '+' : ''}{fmtCurrency(Math.abs(totalDiff))}
                    </span>}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
};

// Delete summary panel
const DeleteSummary = ({ existingData, label }) => {
  const obj = tryParse(existingData);
  if (!obj) return null;
  return (
    <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className="material-icons" style={{ color: '#b91c1c', fontSize: 18 }}>warning</span>
        <span style={{ fontWeight: 700, color: '#7f1d1d', fontSize: 13 }}>This will permanently delete the {label}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {obj.studentName && <div style={{ fontSize: 13 }}><span style={{ color: '#94a3b8' }}>Student:</span> <strong>{obj.studentName}</strong></div>}
        {obj.className   && <div style={{ fontSize: 13 }}><span style={{ color: '#94a3b8' }}>Class:</span> <strong>{obj.className}</strong></div>}
        {obj.totalFee    && <div style={{ fontSize: 13 }}><span style={{ color: '#94a3b8' }}>Total Fee:</span> <strong>{fmtCurrency(obj.totalFee)}</strong></div>}
        {obj.academicYear && <div style={{ fontSize: 13 }}><span style={{ color: '#94a3b8' }}>Academic Year:</span> <strong>{obj.academicYear}</strong></div>}
      </div>
    </div>
  );
};

// Audit trail row (after approval/rejection)
const AuditTrail = ({ req }) => (
  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
    <SectionTitle icon="history">Audit Trail</SectionTitle>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
      {[
        { label: 'Request ID',    value: buildRequestId(req)      },
        { label: 'Requested By',  value: req.requestedByName       },
        { label: 'Request Date',  value: fmtDate(req.requestedAt)  },
        { label: 'Status',        value: req.status                },
        { label: 'Actioned By',   value: req.approvedByName || '—' },
        { label: 'Action Date',   value: fmtDate(req.actionedAt)   },
      ].map(({ label, value }) => (
        <div key={label}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{value || '—'}</div>
        </div>
      ))}
      {req.approvalNotes && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Remarks</div>
          <div style={{ fontSize: 13, color: '#334155', fontStyle: 'italic' }}>{req.approvalNotes}</div>
        </div>
      )}
    </div>
  </div>
);

// Render the body content based on request type
const RequestBody = ({ req }) => {
  const type = req.requestType;

  if (type === 'FEE_STRUCTURE_SAVE') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <SectionTitle icon="table_view">Current Fee Structure</SectionTitle>
        <CurrentFeeTable data={req.existingValues} />
      </div>
      <div>
        <SectionTitle icon="compare_arrows">Requested Changes</SectionTitle>
        <FeeChangesTable existingData={req.existingValues} newData={req.newValues} fields={FEE_FIELDS} />
      </div>
    </div>
  );

  if (type === 'STUDENT_FEE_UPDATE') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <SectionTitle icon="compare_arrows">Fee Changes Requested</SectionTitle>
        <FeeChangesTable existingData={req.existingValues} newData={req.newValues} fields={STUDENT_FEE_FIELDS} />
      </div>
    </div>
  );

  if (type === 'CONDONATION_UPDATE') {
    const existing = tryParse(req.existingValues) || {};
    const newer    = tryParse(req.newValues) || {};
    const oldAmt   = Number(existing.condonationAmount ?? 0);
    const newAmt   = Number(newer.condonationAmount ?? 0);
    const diff     = newAmt - oldAmt;
    return (
      <div>
        <SectionTitle icon="discount">Concession Change</SectionTitle>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Current Concession', value: fmtCurrency(oldAmt), color: '#1e293b' },
            { label: 'New Concession',     value: fmtCurrency(newAmt), color: diff > 0 ? '#15803d' : diff < 0 ? '#b91c1c' : '#1e293b' },
            { label: 'Difference',         value: diff === 0 ? 'No change' : `${diff > 0 ? '+' : ''}${fmtCurrency(Math.abs(diff))}`, color: diff > 0 ? '#15803d' : diff < 0 ? '#b91c1c' : '#94a3b8' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: 1, minWidth: 140, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'FEE_STRUCTURE_DELETE') return (
    <div>
      <SectionTitle icon="warning">Fee Structure to be Deleted</SectionTitle>
      <CurrentFeeTable data={req.existingValues} />
    </div>
  );

  if (type === 'ASSIGNMENT_DELETE') return (
    <div>
      <SectionTitle icon="warning">Assignment to be Deleted</SectionTitle>
      <DeleteSummary existingData={req.existingValues} label="fee assignment" />
    </div>
  );

  return null;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FeeApprovals() {
  const { user }  = useAuth();
  const showToast = useToast();
  const isSA      = user?.role === 'SUPER_ADMIN';

  const [requests,     setRequests]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId,   setExpandedId]   = useState(null);
  const [actionId,     setActionId]     = useState(null);
  const [actionType,   setActionType]   = useState('');
  const [notes,        setNotes]        = useState('');
  const [actioning,    setActioning]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.listFeeEditRequests();
      setRequests(res.data?.data ?? []);
    } catch { showToast('Failed to load requests', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = filterStatus ? requests.filter(r => r.status === filterStatus) : requests;
  const counts = {
    PENDING:  requests.filter(r => r.status === 'PENDING').length,
    APPROVED: requests.filter(r => r.status === 'APPROVED').length,
    REJECTED: requests.filter(r => r.status === 'REJECTED').length,
  };

  const openAction  = (req, type) => { setActionId(req.id); setActionType(type); setNotes(''); };
  const closeAction = () => { setActionId(null); setActionType(''); setNotes(''); };

  // Approval/rejection submission — logic unchanged
  const submitAction = async () => {
    if (!actionId) return;
    if (actionType === 'reject' && !notes.trim()) { showToast('Please provide a reason for rejection', 'error'); return; }
    setActioning(true);
    try {
      if (actionType === 'approve') {
        await adminAPI.approveFeeEditRequest(actionId, { notes });
        showToast('Request approved — change applied successfully');
      } else {
        await adminAPI.rejectFeeEditRequest(actionId, { notes });
        showToast('Request rejected', 'warning');
      }
      closeAction(); load();
    } catch (err) {
      showToast(err?.response?.data?.message || err?.response?.data?.error || 'Action failed', 'error');
    } finally { setActioning(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout pageTitle="Fee Approvals">

      {/* Page Header */}
      <div className="page-header">
        <h1>Fee Change Requests</h1>
        <p>Review and approve or reject fee modification requests submitted by Admins</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Pending Review', value: counts.PENDING,  color: '#92400e', bg: '#fef3c7', icon: 'pending_actions' },
          { label: 'Approved',       value: counts.APPROVED, color: '#065f46', bg: '#d1fae5', icon: 'check_circle'    },
          { label: 'Rejected',       value: counts.REJECTED, color: '#7f1d1d', bg: '#fee2e2', icon: 'cancel'          },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--surface)', border: '1.5px solid var(--border-strong)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-icons" style={{ color: c.color, fontSize: 22 }}>{c.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{c.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 1 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: '#f1f5f9', padding: '4px', borderRadius: 10, width: 'fit-content' }}>
        {[
          { value: '',         label: `All (${requests.length})` },
          { value: 'PENDING',  label: `Pending (${counts.PENDING})`  },
          { value: 'APPROVED', label: `Approved (${counts.APPROVED})` },
          { value: 'REJECTED', label: `Rejected (${counts.REJECTED})` },
        ].map(tab => (
          <button key={tab.value}
            onClick={() => setFilterStatus(tab.value)}
            style={{
              padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: filterStatus === tab.value ? 700 : 500,
              background: filterStatus === tab.value ? '#fff' : 'transparent',
              color: filterStatus === tab.value ? '#1e293b' : '#64748b',
              boxShadow: filterStatus === tab.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Request List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>hourglass_top</span>
          Loading requests…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <span className="material-icons" style={{ fontSize: 56, display: 'block', marginBottom: 12, color: '#cbd5e1' }}>task_alt</span>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>No requests found</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {filterStatus ? `No ${filterStatus.toLowerCase()} requests.` : 'Admins have not submitted any fee change requests yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(req => {
            const isExpanded = expandedId === req.id;

            return (
              <div key={req.id} style={{
                background: 'var(--surface)',
                border: req.status === 'PENDING'
                  ? '1.5px solid #fcd34d'
                  : req.status === 'APPROVED' ? '1.5px solid #6ee7b7' : '1.5px solid #fca5a5',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>

                {/* ── Card Header ── */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  style={{
                    padding: '16px 20px', cursor: 'pointer',
                    background: req.status === 'PENDING'
                      ? 'linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)'
                      : req.status === 'APPROVED' ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)'
                      : 'linear-gradient(135deg, #fff1f2 0%, #fef2f2 100%)',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>

                    {/* Icon */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: req.status === 'PENDING' ? '#fef3c7' : req.status === 'APPROVED' ? '#d1fae5' : '#fee2e2',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="material-icons" style={{
                        fontSize: 20,
                        color: req.status === 'PENDING' ? '#92400e' : req.status === 'APPROVED' ? '#065f46' : '#7f1d1d',
                      }}>
                        {TYPE_ICON[req.requestType] || 'edit'}
                      </span>
                    </div>

                    {/* Title + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                          {TYPE_LABEL[req.requestType] || req.requestType}
                        </span>
                        {req.studentName && (
                          <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>— {req.studentName}</span>
                        )}
                        {req.className && (
                          <span style={{ padding: '2px 10px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                            {req.className}
                          </span>
                        )}
                        <StatusBadge status={req.status} />
                      </div>

                      {/* Meta row */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#64748b' }}>
                        <span>
                          <span className="material-icons" style={{ fontSize: 12, verticalAlign: 'middle', marginRight: 3 }}>person</span>
                          Requested by <strong style={{ color: '#334155' }}>{req.requestedByName || '—'}</strong>
                        </span>
                        <span>
                          <span className="material-icons" style={{ fontSize: 12, verticalAlign: 'middle', marginRight: 3 }}>schedule</span>
                          {fmtDate(req.requestedAt)}
                        </span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f1f5f9', padding: '1px 7px', borderRadius: 6, color: '#475569', fontWeight: 700 }}>
                          {buildRequestId(req)}
                        </span>
                      </div>
                    </div>

                    {/* Expand arrow */}
                    <span className="material-icons" style={{
                      color: '#94a3b8', fontSize: 22, flexShrink: 0,
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}>
                      expand_more
                    </span>
                  </div>
                </div>

                {/* ── Card Body (expanded) ── */}
                {isExpanded && (
                  <div style={{ padding: '20px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Fee-type specific content */}
                    <RequestBody req={req} />

                    {/* Reason */}
                    {req.reason && (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px' }}>
                        <SectionTitle icon="chat_bubble_outline">Reason for Request</SectionTitle>
                        <p style={{ fontSize: 14, color: '#334155', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
                          "{req.reason}"
                        </p>
                      </div>
                    )}

                    {/* Audit trail (actioned requests) */}
                    {req.actionedAt && <AuditTrail req={req} />}

                    {/* Action buttons (Super Admin, pending only) */}
                    {isSA && req.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                        <button
                          onClick={() => openAction(req, 'reject')}
                          style={{ padding: '10px 22px', background: '#fff', color: '#b91c1c', border: '1.5px solid #fca5a5', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="material-icons" style={{ fontSize: 16 }}>cancel</span>
                          Reject
                        </button>
                        <button
                          onClick={() => openAction(req, 'approve')}
                          style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}>
                          <span className="material-icons" style={{ fontSize: 16 }}>check_circle</span>
                          Approve &amp; Apply
                        </button>
                      </div>
                    )}

                    {/* Result banner for actioned requests */}
                    {req.status === 'APPROVED' && (
                      <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="material-icons" style={{ color: '#065f46', fontSize: 18 }}>check_circle</span>
                        <span style={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>
                          This change was approved by {req.approvedByName} on {fmtDate(req.actionedAt)} and has been applied to the system.
                        </span>
                      </div>
                    )}
                    {req.status === 'REJECTED' && (
                      <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="material-icons" style={{ color: '#7f1d1d', fontSize: 18 }}>cancel</span>
                        <span style={{ fontSize: 13, color: '#7f1d1d', fontWeight: 600 }}>
                          Rejected by {req.approvedByName} on {fmtDate(req.actionedAt)}. No changes were made.
                          {req.approvalNotes && <span style={{ fontWeight: 400 }}> Reason: {req.approvalNotes}</span>}
                        </span>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Approve / Reject Modal — logic unchanged ── */}
      {actionId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !actioning && closeAction()}>
          <div className="modal-container" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ margin: 0 }}>
                  {actionType === 'approve' ? 'Approve & Apply Change' : 'Reject Request'}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  {actionType === 'approve'
                    ? 'This change will be immediately applied to the fee system.'
                    : 'The request will be rejected. No changes will be made.'}
                </p>
              </div>
              <button className="modal-close" onClick={closeAction} disabled={actioning}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {actionType === 'approve' && (
                <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-icons" style={{ color: '#065f46', fontSize: 18 }}>check_circle</span>
                  <span style={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>
                    Approving will immediately apply this fee change everywhere in the system.
                  </span>
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                  {actionType === 'reject' ? 'Reason for Rejection *' : 'Approval Notes (optional)'}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={actionType === 'reject' ? 'State the reason for rejecting this request…' : 'Add optional notes for the audit trail…'}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={closeAction} disabled={actioning}
                  style={{ padding: '9px 20px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  onClick={submitAction}
                  disabled={actioning || (actionType === 'reject' && !notes.trim())}
                  style={{
                    padding: '9px 24px', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
                    cursor: (actioning || (actionType === 'reject' && !notes.trim())) ? 'not-allowed' : 'pointer',
                    background: (actioning || (actionType === 'reject' && !notes.trim()))
                      ? '#a0aec0'
                      : actionType === 'approve' ? 'linear-gradient(135deg, #059669, #047857)' : '#dc2626',
                    color: '#fff',
                    display: 'flex', alignItems: 'center', gap: 6,
                    boxShadow: actioning ? 'none' : actionType === 'approve' ? '0 2px 8px rgba(5,150,105,0.3)' : '0 2px 8px rgba(220,38,38,0.3)',
                  }}>
                  <span className="material-icons" style={{ fontSize: 16 }}>
                    {actionType === 'approve' ? 'check_circle' : 'cancel'}
                  </span>
                  {actioning ? 'Processing…' : actionType === 'approve' ? 'Approve & Apply' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
