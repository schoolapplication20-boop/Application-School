import React, { useState } from 'react';
import Button from '../../../components/Button';
import { createStop, updateStop, deleteStop, fetchStops } from '../../../services/transportService';
import { TableCard, Modal, DeleteModal, Paginator } from './shared';
import { ITEMS_PER_PAGE } from './constants';

// ─── STOPS Panel ──────────────────────────────────────────────────────────────
export default function StopsPanel({ stops, setStops, routes, showToast }) {
  const [filterRoute, setFilterRoute] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', routeId: '', stopOrder: '', timing: '' });
  const [errors, setErrors] = useState({});

  const filtered = stops.filter(s => !filterRoute || String(s.routeId) === String(filterRoute));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name    = 'Stop name is required';
    if (!form.routeId)      e.routeId = 'Please select a route';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const EMPTY_STOP = { name: '', routeId: '', stopOrder: '', timing: '' };
  const openAdd  = () => { setEditItem(null); setForm(EMPTY_STOP); setErrors({}); setShowModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name || '', routeId: item.routeId || '', stopOrder: item.stopOrder || '', timing: item.timing || '' });
    setErrors({});
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const selectedRoute = routes.find(r => String(r.id) === String(form.routeId));
      const payload = {
        name:      form.name,
        routeId:   form.routeId ? Number(form.routeId) : null,
        routeName: selectedRoute?.name || '',
        stopOrder: form.stopOrder ? Number(form.stopOrder) : 0,
        timing:    form.timing,
      };
      if (editItem) {
        await updateStop(editItem.id, payload);
        showToast('Stop updated successfully');
      } else {
        await createStop(payload);
        showToast('Stop added successfully');
      }
      const data = await fetchStops();
      setStops(data);
      setShowModal(false);
    } catch {
      showToast('Failed to save stop. Please try again.', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteStop(id);
      const data = await fetchStops();
      setStops(data);
      showToast('Stop removed', 'warning');
    } catch {
      showToast('Failed to delete stop.', 'error');
    }
    setDeleteId(null);
  };

  const routeName = (id) => routes.find(r => String(r.id) === String(id))?.name || '—';

  return (
    <>
      <TableCard onAdd={openAdd} addLabel="Add Stop" addIcon="add_location"
        filters={[{ value: filterRoute, onChange: v => { setFilterRoute(v); setPage(1); }, options: [{ value: '', label: 'All Routes' }, ...routes.map(r => ({ value: r.id, label: r.name }))] }]}>
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Stop Name</th><th>Route</th><th>Order</th><th>Timing</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><span className="material-icons">place</span><h3>No stops found</h3></div></td></tr>
            ) : paginated.map((s, idx) => (
              <tr key={s.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(page - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-icons" style={{ color: '#e53e3e', fontSize: 18 }}>place</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{routeName(s.routeId)}</td>
                <td>
                  <span style={{ background: '#ebf8ff', color: '#2b6cb0', padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>
                    Stop {s.stopOrder || '—'}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: '#276749', fontSize: 13 }}>{s.timing || '—'}</td>
                <td>
                  <div className="action-btns">
                    <Button variant="edit" onClick={() => openEdit(s)} />
                    <Button variant="delete" onClick={() => setDeleteId(s.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator current={page} total={totalPages} onChange={setPage} />
      </TableCard>

      {showModal && (
        <Modal title={editItem ? 'Edit Stop' : 'Add New Stop'} onClose={() => setShowModal(false)} onSubmit={handleSave} submitLabel={editItem ? 'Update Stop' : 'Add Stop'}>
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label fw-medium small">Stop Name *</label>
              <input type="text" className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`}
                placeholder="e.g., Sector 14 Chowk" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Route *</label>
              <select className={`form-select form-select-sm ${errors.routeId ? 'is-invalid' : ''}`}
                value={form.routeId || ''} onChange={e => setForm({ ...form, routeId: e.target.value })}>
                <option value="">— Select Route —</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}{r.area ? ` — ${r.area}` : ''}</option>)}
              </select>
              {errors.routeId && <div className="invalid-feedback">{errors.routeId}</div>}
            </div>
            <div className="col-md-3">
              <label className="form-label fw-medium small">Stop Order</label>
              <input type="number" className="form-control form-control-sm"
                placeholder="e.g., 1" value={form.stopOrder} min="1"
                onChange={e => setForm({ ...form, stopOrder: e.target.value })} />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-medium small">Timing</label>
              <input type="time" className="form-control form-control-sm" value={form.timing}
                onChange={e => setForm({ ...form, timing: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}

      {deleteId && <DeleteModal label="Stop" onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />}
    </>
  );
}
