import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) =>
  '₹' + (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const today = () => new Date().toISOString().slice(0, 10);

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer'];

const EMPTY = {
  title: '', amount: '', date: today(),
  paymentMode: 'Cash', status: 'UNPAID', description: '',
};

// ─── Summary card ─────────────────────────────────────────────────────────────

function Card({ icon, label, value, color, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: color + '18' }}>
        <span className="material-icons" style={{ color }}>{icon}</span>
      </div>
      <div className="stat-value" style={{ fontSize: '22px', fontWeight: 800 }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const paid = status === 'PAID';
  return (
    <span style={{
      padding: '3px 11px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
      background: paid ? '#f0fff4' : '#fff5e6',
      color:      paid ? '#276749' : '#b7600a',
      border:     `1px solid ${paid ? '#76C44240' : '#ed893640'}`,
    }}>
      {paid ? 'Paid' : 'Unpaid'}
    </span>
  );
}

// ─── Expense Form Modal ───────────────────────────────────────────────────────

function ExpenseModal({ initial, addedBy, addedById, onClose, onSaved }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(
    isEdit
      ? { title: initial.title || '', amount: initial.amount || '',
          date: initial.date || today(), paymentMode: initial.paymentMode || 'Cash',
          status: initial.status || 'UNPAID', description: initial.description || '' }
      : { ...EMPTY }
  );
  const [err,     setErr]     = useState('');
  const [saving,  setSaving]  = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.title.trim())            return 'Expense title is required.';
    if (!form.amount)                  return 'Amount is required.';
    if (parseFloat(form.amount) <= 0)  return 'Amount must be greater than 0.';
    if (!form.date)                    return 'Date is required.';
    return '';
  };

  const submit = async () => {
    const e = validate();
    if (e) { setErr(e); return; }
    setErr(''); setSaving(true);
    try {
      const payload = {
        title:       form.title.trim(),
        amount:      parseFloat(form.amount),
        date:        form.date,
        paymentMode: form.paymentMode,
        status:      form.status,
        description: form.description.trim() || null,
        addedBy,
        addedById,
      };
      if (isEdit) await adminAPI.updateExpense(initial.id, payload);
      else        await adminAPI.createExpense(payload);
      onSaved();
    } catch (ex) {
      setErr(ex?.response?.data?.error || ex?.response?.data?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    padding: '10px 12px', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', fontSize: '13px', width: '100%', boxSizing: 'border-box',
    outline: 'none', fontFamily: 'inherit',
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-container" style={{ maxWidth: '520px', width: '95%' }}>

        {/* Header */}
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit Expense' : 'Add New Expense'}</span>
          <button className="modal-close" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {err && (
            <div style={{ background: '#fff5f5', border: '1px solid #fc8181', borderRadius: '8px',
              padding: '10px 14px', color: '#c53030', fontSize: '13px', marginBottom: '14px' }}>
              <span className="material-icons" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '6px' }}>error_outline</span>
              {err}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

            {/* Title — full width */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>
                Expense Title <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <input
                style={inp}
                placeholder="e.g. Salaries – March 2026, Electricity Bill – April"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                autoFocus
              />
            </div>

            {/* Amount */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>
                Amount (₹) <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <input
                style={inp} type="number" min="0" step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
              />
            </div>

            {/* Date */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>
                Date <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <input
                style={inp} type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>
                Payment Mode
              </label>
              <select style={inp} value={form.paymentMode} onChange={e => set('paymentMode', e.target.value)}>
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>
                Status
              </label>
              <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="UNPAID">Unpaid</option>
                <option value="PAID">Paid</option>
              </select>
            </div>

            {/* Description — full width */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>
                Description <span style={{ fontSize: '11px', color: '#a0aec0', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                style={{ ...inp, resize: 'vertical', minHeight: '76px' }}
                placeholder="Any additional notes..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
              />
            </div>

            {/* Added By — read-only */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>
                Added By
              </label>
              <input style={{ ...inp, background: '#f7fafc', color: '#718096', cursor: 'not-allowed' }}
                readOnly value={addedBy} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            onClick={onClose} disabled={saving}
            style={{ padding: '10px 22px', border: '1.5px solid #e2e8f0', borderRadius: '8px',
              background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
            Cancel
          </button>
          <button
            onClick={submit} disabled={saving}
            style={{ padding: '10px 28px', background: saving ? '#a0aec0' : '#76C442',
              border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700,
              fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : isEdit ? 'Update Expense' : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

function DeleteModal({ expense, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await adminAPI.deleteExpense(expense.id); onDeleted(); }
    catch { setBusy(false); }
  };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-container" style={{ maxWidth: '380px', width: '95%' }}>
        <div className="modal-header">
          <span className="modal-title" style={{ color: '#c53030' }}>Delete Expense</span>
          <button className="modal-close" onClick={onClose}><span className="material-icons">close</span></button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center', padding: '28px 24px' }}>
          <span className="material-icons" style={{ fontSize: '56px', color: '#fc8181', display: 'block', marginBottom: '12px' }}>
            delete_forever
          </span>
          <p style={{ margin: 0, color: '#2d3748', fontSize: '15px', lineHeight: '1.5' }}>
            Delete <strong>"{expense.title}"</strong>?
          </p>
          <p style={{ margin: '8px 0 0', color: '#a0aec0', fontSize: '13px' }}>This cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} disabled={busy}
            style={{ padding: '10px 22px', border: '1.5px solid #e2e8f0', borderRadius: '8px',
              background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
            Cancel
          </button>
          <button onClick={go} disabled={busy}
            style={{ padding: '10px 26px', background: busy ? '#a0aec0' : '#e53e3e',
              border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700,
              fontSize: '13px', cursor: busy ? 'not-allowed' : 'pointer' }}>
            {busy ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Expenses() {
  const { user } = useAuth();

  const [records,  setRecords]  = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  // filters
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [sortBy,       setSortBy]       = useState('date');     // date | amount
  const [sortDir,      setSortDir]      = useState('desc');     // asc | desc

  // modals
  const [formOpen,     setFormOpen]     = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status   = filterStatus;
      if (dateFrom)     params.dateFrom = dateFrom;
      if (dateTo)       params.dateTo   = dateTo;
      if (search)       params.search   = search;

      const [listRes, sumRes] = await Promise.all([
        adminAPI.getExpenses(params),
        adminAPI.getExpenseSummary(),
      ]);
      setRecords(listRes.data?.data || []);
      setSummary(sumRes.data?.data  || null);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, dateFrom, dateTo, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── sorted rows ───────────────────────────────────────────────────────────
  const sorted = [...records].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1;
    if (sortBy === 'amount') return (parseFloat(a.amount) - parseFloat(b.amount)) * mul;
    return (new Date(a.date) - new Date(b.date)) * mul;
  });

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="material-icons" style={{ fontSize: '14px', color: '#cbd5e0', verticalAlign: 'middle', marginLeft: '3px' }}>unfold_more</span>;
    return <span className="material-icons" style={{ fontSize: '14px', color: '#76C442', verticalAlign: 'middle', marginLeft: '3px' }}>
      {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
    </span>;
  };

  const clearFilters = () => { setSearch(''); setFilterStatus(''); setDateFrom(''); setDateTo(''); };
  const hasFilters   = search || filterStatus || dateFrom || dateTo;

  const totalShown   = sorted.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const unpaidShown  = sorted.filter(r => r.status === 'UNPAID').length;

  return (
    <Layout pageTitle="Expenses">

      {/* Page header */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <h1>Expense Management</h1>
        <p>Record, track and manage all school expenses</p>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card
          icon="receipt_long" color="#e53e3e"
          label="Total This Month"
          value={fmt(summary?.totalMonthly || 0)}
          sub={summary ? `${summary.currentMonth} ${summary.currentYear}` : ''}
        />
        <Card
          icon="check_circle" color="#76C442"
          label="Paid This Month"
          value={fmt(summary?.totalPaid || 0)}
        />
        <Card
          icon="pending" color="#ed8936"
          label="Unpaid This Month"
          value={fmt(summary?.totalUnpaid || 0)}
        />
      </div>

      {/* ── Table card ── */}
      <div className="data-table-card">

        {/* ── Toolbar ── */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f4f8',
          display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Search */}
          <div className="search-input-wrapper" style={{ flex: '1 1 220px' }}>
            <span className="material-icons">search</span>
            <input
              className="search-input"
              placeholder="Search by expense title…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <select
            className="filter-select"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
          </select>

          {/* Date range */}
          <input
            type="date" className="filter-select" style={{ minWidth: '130px' }}
            value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            title="From"
          />
          <span style={{ color: '#a0aec0', fontSize: '12px', flexShrink: 0 }}>to</span>
          <input
            type="date" className="filter-select" style={{ minWidth: '130px' }}
            value={dateTo} onChange={e => setDateTo(e.target.value)}
            title="To"
          />

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px',
                background: '#fff', cursor: 'pointer', fontSize: '12px', color: '#718096',
                display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <span className="material-icons" style={{ fontSize: '14px' }}>clear</span>
              Clear
            </button>
          )}

          {/* Add button */}
          <button
            className="btn-add"
            onClick={() => { setEditTarget(null); setFormOpen(true); }}
            style={{ marginLeft: 'auto', flexShrink: 0 }}
          >
            <span className="material-icons">add</span>
            Add Expense
          </button>
        </div>

        {/* ── Results meta ── */}
        {!loading && records.length > 0 && (
          <div style={{ padding: '8px 20px', fontSize: '13px', color: '#718096',
            borderBottom: '1px solid #f0f4f8', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>{sorted.length} record{sorted.length !== 1 ? 's' : ''}</span>
            <span>Total: <strong style={{ color: '#e53e3e' }}>{fmt(totalShown)}</strong></span>
            {unpaidShown > 0 && (
              <span style={{ color: '#ed8936', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-icons" style={{ fontSize: '14px' }}>warning</span>
                {unpaidShown} unpaid
              </span>
            )}
          </div>
        )}

        {/* ── Table ── */}
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '64px', textAlign: 'center', color: '#a0aec0' }}>
              <span className="material-icons" style={{ fontSize: '40px', display: 'block', marginBottom: '8px' }}>hourglass_top</span>
              Loading…
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: '64px', textAlign: 'center', color: '#a0aec0' }}>
              <span className="material-icons" style={{ fontSize: '52px', display: 'block', marginBottom: '10px' }}>receipt_long</span>
              <p style={{ margin: '0 0 16px', fontSize: '15px' }}>No expenses found.</p>
              <button
                onClick={() => { setEditTarget(null); setFormOpen(true); }}
                style={{ padding: '10px 26px', background: '#76C442', border: 'none',
                  borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Add First Expense
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '200px' }}>Expense Title</th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    onClick={() => toggleSort('amount')}
                  >
                    Amount <SortIcon col="amount" />
                  </th>
                  <th
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    onClick={() => toggleSort('date')}
                  >
                    Date <SortIcon col="date" />
                  </th>
                  <th>Payment Mode</th>
                  <th>Status</th>
                  <th>Added By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr
                    key={r.id}
                    style={{ background: r.status === 'UNPAID' ? '#fffbf0' : undefined }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: '#2d3748', fontSize: '13px' }}>{r.title}</div>
                      {r.description && (
                        <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px',
                          maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.description}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: '#e53e3e', fontSize: '14px', whiteSpace: 'nowrap' }}>
                      {fmt(r.amount)}
                    </td>
                    <td style={{ fontSize: '12px', color: '#718096', whiteSpace: 'nowrap' }}>
                      {fmtDate(r.date)}
                    </td>
                    <td style={{ fontSize: '12px', color: '#4a5568' }}>{r.paymentMode || '—'}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ fontSize: '12px', color: '#a0aec0' }}>{r.addedBy || '—'}</td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="action-btn action-btn-edit"
                          title="Edit"
                          onClick={() => { setEditTarget(r); setFormOpen(true); }}
                        >
                          <span className="material-icons">edit</span>
                        </button>
                        <button
                          className="action-btn action-btn-delete"
                          title="Delete"
                          onClick={() => setDeleteTarget(r)}
                        >
                          <span className="material-icons">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {formOpen && (
        <ExpenseModal
          initial={editTarget}
          addedBy={user?.name || 'Admin'}
          addedById={user?.id}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); fetchAll(); }}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          expense={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); fetchAll(); }}
        />
      )}
    </Layout>
  );
}
