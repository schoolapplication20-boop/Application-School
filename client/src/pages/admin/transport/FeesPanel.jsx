import React, { useState } from 'react';
import Button from '../../../components/Button';
import { createTransportFee, updateTransportFee, deleteTransportFee, markTransportFeePaid, fetchTransportFees } from '../../../services/transportService';
import { TableCard, Modal, DeleteModal, Paginator } from './shared';
import { ITEMS_PER_PAGE, statusColor } from './constants';

// ─── FEES Panel ───────────────────────────────────────────────────────────────
export default function FeesPanel({ fees, setFees, students, showToast }) {
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const EMPTY_FEE = { studentId: '', studentName: '', busNo: '', route: '', amount: '', month: '' };
  const [form, setForm] = useState(EMPTY_FEE);
  const [errors, setErrors] = useState({});

  // Backend status enum: PAID, PENDING, OVERDUE
  const filtered = fees.filter(f =>
    (!search || f.studentName?.toLowerCase().includes(search.toLowerCase()) || String(f.studentId).includes(search)) &&
    (!filterStatus || String(f.status || '').toUpperCase() === filterStatus.toUpperCase())
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const totalAmount  = fees.reduce((s, f) => s + (+f.amount || 0), 0);
  const collectedAmt = fees.filter(f => String(f.status || '').toUpperCase() === 'PAID').reduce((s, f) => s + (+f.amount || 0), 0);
  const pendingAmt   = totalAmount - collectedAmt;

  const validate = () => {
    const e = {};
    if (!form.studentId)          e.studentId  = 'Student ID is required';
    if (!form.studentName.trim()) e.studentName = 'Student name is required';
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) e.amount = 'Valid amount is required';
    if (!form.month.trim())       e.month      = 'Month is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd  = () => { setEditItem(null); setForm(EMPTY_FEE); setErrors({}); setShowModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      studentId:   item.studentId   || '',
      studentName: item.studentName || '',
      busNo:       item.busNo       || '',
      route:       item.route       || '',
      amount:      item.amount      || '',
      month:       item.month       || '',
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const payload = {
        studentId:   Number(form.studentId),
        studentName: form.studentName,
        busNo:       form.busNo,
        route:       form.route,
        amount:      Number(form.amount),
        month:       form.month,
      };
      if (editItem) {
        await updateTransportFee(editItem.id, payload);
        showToast('Fee record updated successfully');
      } else {
        await createTransportFee(payload);
        showToast('Fee record added successfully');
      }
      const data = await fetchTransportFees();
      setFees(data);
      setShowModal(false);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save fee record. Please try again.', 'error');
    }
  };

  const markPaid = async (id) => {
    try {
      await markTransportFeePaid(id);
      const data = await fetchTransportFees();
      setFees(data);
      showToast('Fee marked as paid');
    } catch {
      showToast('Failed to mark as paid.', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTransportFee(id);
      const data = await fetchTransportFees();
      setFees(data);
      showToast('Fee record removed', 'warning');
    } catch {
      showToast('Failed to delete fee record.', 'error');
    }
    setDeleteId(null);
  };

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN');

  return (
    <>
      {/* Fee Summary Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total Billed', value: fmt(totalAmount),  color: '#3182ce', icon: 'account_balance' },
          { label: 'Collected',    value: fmt(collectedAmt), color: '#276749', icon: 'check_circle'    },
          { label: 'Pending',      value: fmt(pendingAmt),   color: '#c05621', icon: 'pending'         },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--surface)', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: c.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-icons" style={{ color: c.color, fontSize: 22 }}>{c.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{c.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <TableCard onAdd={openAdd} addLabel="Add Fee" addIcon="add"
        searchValue={search} onSearch={v => { setSearch(v); setPage(1); }} searchPlaceholder="Search by student name or ID…"
        filters={[{ value: filterStatus, onChange: v => { setFilterStatus(v); setPage(1); }, options: [{ value: '', label: 'All Status' }, { value: 'PAID', label: 'Paid' }, { value: 'PENDING', label: 'Pending' }, { value: 'OVERDUE', label: 'Overdue' }] }]}>
        <table className="data-table">
          <thead>
            <tr><th>Student</th><th>Route / Bus</th><th>Month</th><th>Amount</th><th>Status</th><th>Paid On</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><span className="material-icons">payments</span><h3>No fee records</h3></div></td></tr>
            ) : paginated.map(f => (
              <tr key={f.id}>
                <td>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{f.studentName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {f.studentId}</div>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  <div>{f.route || '—'}</div>
                  <div style={{ fontSize: 11 }}>{f.busNo || ''}</div>
                </td>
                <td style={{ fontSize: 13 }}>{f.month}</td>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(f.amount)}</td>
                <td><span className={`status-badge ${statusColor[f.status] || 'status-pending'}`}>{f.status}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.paidDate || '—'}</td>
                <td>
                  <div className="action-btns">
                    {String(f.status || '').toUpperCase() !== 'PAID' && (
                      <button className="action-btn" style={{ background: '#f0fff4', color: '#276749' }} onClick={() => markPaid(f.id)} title="Mark Paid">
                        <span className="material-icons">check_circle</span>
                      </button>
                    )}
                    <Button variant="edit" onClick={() => openEdit(f)} />
                    <Button variant="delete" onClick={() => setDeleteId(f.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator current={page} total={totalPages} onChange={setPage} />
      </TableCard>

      {showModal && (
        <Modal title={editItem ? 'Edit Fee Record' : 'Add Transport Fee'} onClose={() => setShowModal(false)} onSubmit={handleSave} submitLabel={editItem ? 'Update' : 'Add Fee'} size="modal-lg">
          <div className="row g-3">
            {!editItem && students && students.length > 0 && (
              <div className="col-12">
                <label className="form-label fw-medium small">Select Assigned Student</label>
                <select className="form-select form-select-sm"
                  value=""
                  onChange={e => {
                    const s = students.find(st => String(st.studentId) === e.target.value);
                    if (s) setForm(f => ({
                      ...f,
                      studentId:   s.studentId  || '',
                      studentName: s.studentName || '',
                      busNo:       s.busNo       || '',
                      route:       s.routeName   || '',
                    }));
                  }}>
                  <option value="">— Pick from assigned students —</option>
                  {students.map(s => (
                    <option key={s.id} value={s.studentId}>
                      {s.studentName} (ID: {s.studentId}){s.routeName ? ` — ${s.routeName}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-md-4">
              <label className="form-label fw-medium small">Student ID *</label>
              <input type="number" className={`form-control form-control-sm ${errors.studentId ? 'is-invalid' : ''}`}
                placeholder="e.g., 1001" value={form.studentId} min="1"
                onChange={e => setForm({ ...form, studentId: e.target.value })} />
              {errors.studentId && <div className="invalid-feedback">{errors.studentId}</div>}
            </div>
            <div className="col-md-8">
              <label className="form-label fw-medium small">Student Name *</label>
              <input type="text" className={`form-control form-control-sm ${errors.studentName ? 'is-invalid' : ''}`}
                placeholder="Full name" value={form.studentName}
                onChange={e => setForm({ ...form, studentName: e.target.value })} />
              {errors.studentName && <div className="invalid-feedback">{errors.studentName}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Route Name</label>
              <input type="text" className="form-control form-control-sm"
                placeholder="e.g., Route A — North Zone" value={form.route}
                onChange={e => setForm({ ...form, route: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Bus Number</label>
              <input type="text" className="form-control form-control-sm"
                placeholder="e.g., BUS-001" value={form.busNo}
                onChange={e => setForm({ ...form, busNo: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Amount (₹) *</label>
              <input type="number" className={`form-control form-control-sm ${errors.amount ? 'is-invalid' : ''}`}
                placeholder="e.g., 2500" value={form.amount} min="1"
                onChange={e => setForm({ ...form, amount: e.target.value })} />
              {errors.amount && <div className="invalid-feedback">{errors.amount}</div>}
            </div>
            <div className="col-md-8">
              <label className="form-label fw-medium small">Month *</label>
              <input type="text" className={`form-control form-control-sm ${errors.month ? 'is-invalid' : ''}`}
                placeholder="e.g., April 2026" value={form.month}
                onChange={e => setForm({ ...form, month: e.target.value })} />
              {errors.month && <div className="invalid-feedback">{errors.month}</div>}
            </div>
          </div>
        </Modal>
      )}

      {deleteId && <DeleteModal label="Fee Record" onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />}
    </>
  );
}
