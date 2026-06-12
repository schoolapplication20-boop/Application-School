import React, { useState } from 'react';
import Button from '../../../components/Button';
import { createRoute, updateRoute, deleteRoute } from '../../../services/transportService';
import { TableCard, Modal, DeleteModal, Paginator } from './shared';
import { ITEMS_PER_PAGE, statusColor } from './constants';

// ─── ROUTES Panel ─────────────────────────────────────────────────────────────
export default function RoutesPanel({ routes, setRoutes, buses, drivers, showToast }) {
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage]             = useState(1);
  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [deleteId, setDeleteId]     = useState(null);

  const EMPTY_ROUTE = {
    name: '', routeNumber: '', area: '', distance: '',
    pickupTime: '', dropTime: '',
    busId: '', busNo: '', driverId: '', driverName: '',
    capacity: '', status: 'Active',
  };
  const [form, setForm]     = useState(EMPTY_ROUTE);
  const [errors, setErrors] = useState({});

  const filtered = routes.filter(r =>
    (!search || r.name?.toLowerCase().includes(search.toLowerCase()) ||
                r.routeNumber?.toLowerCase().includes(search.toLowerCase()) ||
                r.area?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterStatus || r.status === filterStatus)
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Route name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => { setEditItem(null); setForm(EMPTY_ROUTE); setErrors({}); setShowModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name:         item.name         || '',
      routeNumber:  item.routeNumber  || '',
      area:         item.area         || '',
      distance:     item.distance     || '',
      pickupTime:   item.pickupTime   || '',
      dropTime:     item.dropTime     || '',
      busId:        item.busId        || '',
      busNo:        item.busNo        || '',
      driverId:     item.driverId     || '',
      driverName:   item.driverName   || '',
      capacity:     item.capacity     != null ? String(item.capacity) : '',
      status:       item.status       || 'Active',
    });
    setErrors({});
    setShowModal(true);
  };

  const selectBus = (id) => {
    const b = buses.find(b => String(b.id) === String(id));
    setForm(f => ({ ...f, busId: id, busNo: b?.busNo || '' }));
  };
  const selectDriver = (id) => {
    const d = drivers.find(d => String(d.id) === String(id));
    setForm(f => ({ ...f, driverId: id, driverName: d?.name || '' }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      name:        form.name,
      routeNumber: form.routeNumber || null,
      area:        form.area        || null,
      distance:    form.distance    || null,
      pickupTime:  form.pickupTime  || null,
      dropTime:    form.dropTime    || null,
      busId:       form.busId    ? Number(form.busId)    : null,
      busNo:       form.busNo    || null,
      driverId:    form.driverId ? Number(form.driverId) : null,
      driverName:  form.driverName  || null,
      capacity:    form.capacity ? Number(form.capacity) : 0,
      status:      form.status,
    };
    try {
      if (editItem) {
        await updateRoute(editItem.id, payload);
        setRoutes(prev => prev.map(r => r.id === editItem.id ? { ...r, ...payload, id: editItem.id } : r));
        showToast('Bus route updated successfully');
      } else {
        const saved = await createRoute(payload);
        setRoutes(prev => [...prev, saved]);
        showToast('Bus route added successfully');
      }
      setShowModal(false);
    } catch { showToast('Failed to save route. Please try again.', 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteRoute(id);
      setRoutes(prev => prev.filter(r => r.id !== id));
      showToast('Bus route removed', 'warning');
    } catch { showToast('Failed to delete route', 'error'); }
    setDeleteId(null);
  };

  return (
    <>
      <TableCard
        onAdd={openAdd} addLabel="Add Bus Route" addIcon="add_road"
        searchValue={search} onSearch={v => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search route name, number or area…"
        filters={[{
          value: filterStatus,
          onChange: v => { setFilterStatus(v); setPage(1); },
          options: [{ value: '', label: 'All Status' }, { value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }],
        }]}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Route</th><th>Route No.</th><th>Area / Zone</th>
              <th>Bus</th><th>Driver</th><th>Capacity</th>
              <th>Pickup</th><th>Drop</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={10}>
                <div className="empty-state">
                  <span className="material-icons">route</span>
                  <h3>No bus routes found</h3>
                  <p>Click "Add Bus Route" to create your first route</p>
                </div>
              </td></tr>
            ) : paginated.map(r => (
              <tr key={r.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#0de1e8,#0eb5da)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-icons" style={{ color: '#fff', fontSize: 16 }}>route</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{r.name}</div>
                      {r.distance && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.distance}</div>}
                    </div>
                  </div>
                </td>
                <td>
                  {r.routeNumber
                    ? <span style={{ background: '#ebf8ff', color: '#2b6cb0', padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>{r.routeNumber}</span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.area || '—'}</td>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: 12 }}>{r.busNo || '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.driverName || '—'}</td>
                <td style={{ fontWeight: 700, color: '#3182ce' }}>{r.capacity || 0}</td>
                <td style={{ fontWeight: 600, color: '#276749', fontSize: 12 }}>{r.pickupTime || '—'}</td>
                <td style={{ fontWeight: 600, color: '#c05621', fontSize: 12 }}>{r.dropTime || '—'}</td>
                <td>
                  <span className={`status-badge ${statusColor[r.status] || 'status-pending'}`}>{r.status || 'Active'}</span>
                </td>
                <td>
                  <div className="action-btns">
                    <Button variant="edit" onClick={() => openEdit(r)} />
                    <Button variant="delete" onClick={() => setDeleteId(r.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator current={page} total={totalPages} onChange={setPage} />
      </TableCard>

      {showModal && (
        <Modal title={editItem ? 'Edit Bus Route' : 'Add Bus Route'} onClose={() => setShowModal(false)} onSubmit={handleSave} submitLabel={editItem ? 'Update Route' : 'Add Bus Route'} size="modal-lg">
          <div className="row g-3">
            {/* Row 1: Route Name + Route Number */}
            <div className="col-md-8">
              <label className="form-label fw-medium small">Route Name *</label>
              <input type="text" className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`}
                placeholder="e.g., North Zone Route" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Route Number</label>
              <input type="text" className="form-control form-control-sm"
                placeholder="e.g., RT-01" value={form.routeNumber}
                onChange={e => setForm({ ...form, routeNumber: e.target.value })} />
            </div>

            {/* Row 2: Area / Zone + Distance */}
            <div className="col-md-8">
              <label className="form-label fw-medium small">Area / Zone</label>
              <input type="text" className="form-control form-control-sm"
                placeholder="e.g., School Gate → Sector 14 → Bus Stand" value={form.area}
                onChange={e => setForm({ ...form, area: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Distance</label>
              <input type="text" className="form-control form-control-sm"
                placeholder="e.g., 12 km" value={form.distance}
                onChange={e => setForm({ ...form, distance: e.target.value })} />
            </div>

            {/* Row 3: Bus + Driver */}
            <div className="col-md-6">
              <label className="form-label fw-medium small">Assigned Bus</label>
              <select className="form-select form-select-sm" value={form.busId || ''} onChange={e => selectBus(e.target.value)}>
                <option value="">— Select Bus —</option>
                {buses.map(b => (
                  <option key={b.id} value={b.id}>{b.busNo}{b.model ? ` (${b.model})` : ''} — cap: {b.capacity}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Assigned Driver</label>
              <select className="form-select form-select-sm" value={form.driverId || ''} onChange={e => selectDriver(e.target.value)}>
                <option value="">— Select Driver —</option>
                {drivers.filter(d => d.status === 'Active' || !d.status).map(d => (
                  <option key={d.id} value={d.id}>{d.name}{d.mobile ? ` — ${d.mobile}` : ''}</option>
                ))}
              </select>
            </div>

            {/* Row 4: Pickup Time + Drop Time + Capacity + Status */}
            <div className="col-md-3">
              <label className="form-label fw-medium small">Pickup Time</label>
              <input type="time" className="form-control form-control-sm" value={form.pickupTime}
                onChange={e => setForm({ ...form, pickupTime: e.target.value })} />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-medium small">Drop Time</label>
              <input type="time" className="form-control form-control-sm" value={form.dropTime}
                onChange={e => setForm({ ...form, dropTime: e.target.value })} />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-medium small">Route Capacity</label>
              <input type="number" className="form-control form-control-sm"
                placeholder="e.g., 40" min="0" value={form.capacity}
                onChange={e => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-medium small">Status</label>
              <select className="form-select form-select-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>

            {/* Info note */}
            <div className="col-12">
              <div style={{ background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#2b6cb0' }}>
                <span className="material-icons" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>info</span>
                After saving the route, go to the <strong>Stops</strong> tab to add pickup points and their timings for this route.
              </div>
            </div>
          </div>
        </Modal>
      )}

      {deleteId && <DeleteModal label="Bus Route" onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />}
    </>
  );
}
