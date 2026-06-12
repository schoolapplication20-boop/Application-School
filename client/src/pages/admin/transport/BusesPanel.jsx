import React, { useState } from 'react';
import Button from '../../../components/Button';
import { createBus, updateBus, deleteBus } from '../../../services/transportService';
import { TableCard, Modal, DeleteModal, Paginator } from './shared';
import { ITEMS_PER_PAGE, statusColor } from './constants';

// ─── BUSES Panel ──────────────────────────────────────────────────────────────
export default function BusesPanel({ buses, setBuses, routes, drivers, showToast }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  // driver / route stored as STRING names (what the DB column holds)
  const EMPTY_BUS = { busNo: '', model: '', year: '', capacity: '', driver: '', route: '', status: 'Active' };
  const [form, setForm] = useState(EMPTY_BUS);
  const [errors, setErrors] = useState({});

  const filtered = buses.filter(b =>
    (!search || b.busNo?.toLowerCase().includes(search.toLowerCase()) || b.model?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterStatus || b.status === filterStatus)
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.busNo.trim()) e.busNo = 'Bus number is required';
    if (!form.capacity || isNaN(form.capacity) || +form.capacity <= 0) e.capacity = 'Valid capacity is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd  = () => { setEditItem(null); setForm(EMPTY_BUS); setErrors({}); setShowModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ busNo: item.busNo || '', model: item.model || '', year: item.year || '', capacity: item.capacity || '', driver: item.driver || '', route: item.route || '', status: item.status || 'Active' });
    setErrors({});
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { busNo: form.busNo, model: form.model, year: form.year, capacity: Number(form.capacity), driver: form.driver, route: form.route, status: form.status };
    try {
      if (editItem) {
        await updateBus(editItem.id, payload);
        setBuses(prev => prev.map(b => b.id === editItem.id ? { ...b, ...payload } : b));
        showToast('Bus updated successfully');
      } else {
        const created = await createBus(payload);
        setBuses(prev => [...prev, created]);
        showToast('Bus added successfully');
      }
      setShowModal(false);
    } catch (err) { showToast(err?.response?.data?.message || 'Failed to save bus', 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBus(id);
      setBuses(prev => prev.filter(b => b.id !== id));
      showToast('Bus removed', 'warning');
    } catch { showToast('Failed to delete bus', 'error'); }
    setDeleteId(null);
  };

  return (
    <>
      <TableCard
        onAdd={openAdd} addLabel="Add Bus" addIcon="directions_bus"
        searchValue={search} onSearch={v => { setSearch(v); setPage(1); }} searchPlaceholder="Search bus number or model…"
        filters={[{ value: filterStatus, onChange: v => { setFilterStatus(v); setPage(1); }, options: [{ value: '', label: 'All Status' }, { value: 'Active', label: 'Active' }, { value: 'Maintenance', label: 'Maintenance' }, { value: 'Inactive', label: 'Inactive' }] }]}
      >
        <table className="data-table">
          <thead>
            <tr><th>Bus No</th><th>Model</th><th>Year</th><th>Capacity</th><th>Driver</th><th>Route</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={8}><div className="empty-state"><span className="material-icons">directions_bus</span><h3>No buses found</h3></div></td></tr>
            ) : paginated.map(b => (
              <tr key={b.id}>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{b.busNo}</td>
                <td>{b.model || '—'}</td>
                <td>{b.year || '—'}</td>
                <td><span style={{ background: '#ebf8ff', color: '#2b6cb0', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>{b.capacity} seats</span></td>
                <td>{b.driver || '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{b.route || '—'}</td>
                <td><span className={`status-badge ${statusColor[b.status] || 'status-pending'}`}>{b.status}</span></td>
                <td>
                  <div className="action-btns">
                    <Button variant="edit" onClick={() => openEdit(b)} />
                    <Button variant="delete" onClick={() => setDeleteId(b.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator current={page} total={totalPages} onChange={setPage} />
      </TableCard>

      {showModal && (
        <Modal title={editItem ? 'Edit Bus' : 'Add New Bus'} onClose={() => setShowModal(false)} onSubmit={handleSave} submitLabel={editItem ? 'Update Bus' : 'Add Bus'} size="modal-lg">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-medium small">Bus Number *</label>
              <input type="text" className={`form-control form-control-sm ${errors.busNo ? 'is-invalid' : ''}`}
                placeholder="e.g., BUS-001" value={form.busNo}
                onChange={e => setForm({ ...form, busNo: e.target.value })} />
              {errors.busNo && <div className="invalid-feedback">{errors.busNo}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Model</label>
              <input type="text" className="form-control form-control-sm"
                placeholder="e.g., Tata Starbus" value={form.model}
                onChange={e => setForm({ ...form, model: e.target.value })} />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-medium small">Year</label>
              <input type="number" className="form-control form-control-sm"
                placeholder="e.g., 2021" value={form.year} min="2000" max="2030"
                onChange={e => setForm({ ...form, year: e.target.value })} />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-medium small">Capacity *</label>
              <input type="number" className={`form-control form-control-sm ${errors.capacity ? 'is-invalid' : ''}`}
                placeholder="40" value={form.capacity} min="1"
                onChange={e => setForm({ ...form, capacity: e.target.value })} />
              {errors.capacity && <div className="invalid-feedback">{errors.capacity}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Assign Driver</label>
              <select className="form-select form-select-sm" value={form.driver}
                onChange={e => setForm({ ...form, driver: e.target.value })}>
                <option value="">— Select Driver —</option>
                {drivers.map(d => <option key={d.id} value={d.name}>{d.name}{d.license ? ` (${d.license})` : ''}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Assign Route</label>
              <select className="form-select form-select-sm" value={form.route}
                onChange={e => setForm({ ...form, route: e.target.value })}>
                <option value="">— Select Route —</option>
                {routes.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label fw-medium small">Status</label>
              <select className="form-select form-select-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Active</option><option>Maintenance</option><option>Inactive</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {deleteId && <DeleteModal label="Bus" onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />}
    </>
  );
}
