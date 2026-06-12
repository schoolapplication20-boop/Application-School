import React, { useState } from 'react';
import Button from '../../../components/Button';
import { createDriver, updateDriver, deleteDriver } from '../../../services/transportService';
import { TableCard, Modal, DeleteModal, Paginator } from './shared';
import { ITEMS_PER_PAGE, statusColor } from './constants';

// ─── DRIVERS Panel ────────────────────────────────────────────────────────────
export default function DriversPanel({ drivers, setDrivers, buses, students, showToast }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [viewStudentsDriver, setViewStudentsDriver] = useState(null); // driver whose students to show
  // DB columns: name, license, mobile, bus (bus number string), experience, status
  const EMPTY_DRIVER = { name: '', license: '', mobile: '', experience: '', bus: '', status: 'Active' };
  const [form, setForm] = useState(EMPTY_DRIVER);
  const [errors, setErrors] = useState({});

  const filtered = drivers.filter(d =>
    (!search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.license?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterStatus || d.status === filterStatus)
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = 'Name is required';
    if (!form.license.trim()) e.license = 'License number is required';
    if (form.mobile && !/^\d{10}$/.test(form.mobile)) e.mobile = 'Must be 10 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd  = () => { setEditItem(null); setForm(EMPTY_DRIVER); setErrors({}); setShowModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name || '', license: item.license || '', mobile: item.mobile || '', experience: item.experience || '', bus: item.bus || '', status: item.status || 'Active' });
    setErrors({});
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { name: form.name, license: form.license, mobile: form.mobile, experience: form.experience, bus: form.bus, status: form.status };
    try {
      if (editItem) {
        await updateDriver(editItem.id, payload);
        setDrivers(prev => prev.map(d => d.id === editItem.id ? { ...d, ...payload } : d));
        showToast('Driver updated successfully');
      } else {
        const created = await createDriver(payload);
        setDrivers(prev => [...prev, created]);
        showToast('Driver added successfully');
      }
      setShowModal(false);
    } catch { showToast('Failed to save driver', 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDriver(id);
      setDrivers(prev => prev.filter(d => d.id !== id));
      showToast('Driver removed', 'warning');
    } catch { showToast('Failed to delete driver', 'error'); }
    setDeleteId(null);
  };

  const getInitials = (n) => (n || '?').split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <TableCard onAdd={openAdd} addLabel="Add Driver" addIcon="person_add"
        searchValue={search} onSearch={v => { setSearch(v); setPage(1); }} searchPlaceholder="Search name or license…"
        filters={[{ value: filterStatus, onChange: v => { setFilterStatus(v); setPage(1); }, options: [{ value: '', label: 'All Status' }, { value: 'Active', label: 'Active' }, { value: 'On Leave', label: 'On Leave' }, { value: 'Inactive', label: 'Inactive' }] }]}>
        <table className="data-table">
          <thead>
            <tr><th>Driver</th><th>License No</th><th>Phone</th><th>Experience</th><th>Assigned Bus</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><span className="material-icons">badge</span><h3>No drivers found</h3></div></td></tr>
            ) : paginated.map(d => (
              <tr key={d.id}>
                <td>
                  <div className="student-cell">
                    <div className="student-avatar-sm">{getInitials(d.name)}</div>
                    <span className="student-name">{d.name}</span>
                  </div>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{d.license}</td>
                <td style={{ fontSize: 13 }}>{d.mobile || '—'}</td>
                <td><span style={{ background: '#faf5ff', color: '#6b46c1', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>{d.experience || '—'}</span></td>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{d.bus || '—'}</td>
                <td><span className={`status-badge ${statusColor[d.status] || 'status-pending'}`}>{d.status}</span></td>
                <td>
                  <div className="action-btns">
                    <button className="action-btn" style={{ background: '#ebf8ff', color: '#2b6cb0' }}
                      onClick={() => setViewStudentsDriver(d)} title="View Assigned Students">
                      <span className="material-icons">people</span>
                    </button>
                    <Button variant="edit" onClick={() => openEdit(d)} />
                    <Button variant="delete" onClick={() => setDeleteId(d.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator current={page} total={totalPages} onChange={setPage} />
      </TableCard>

      {/* ── Assigned Students Modal ── */}
      {viewStudentsDriver && (() => {
        const busStudents = (students || []).filter(s => s.busNo === viewStudentsDriver.bus);
        return (
          <div className="modal-overlay" onClick={() => setViewStudentsDriver(null)}>
            <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h5 className="modal-title">
                  <span className="material-icons" style={{ fontSize: 20, verticalAlign: 'middle', marginRight: 8 }}>people</span>
                  Students assigned to {viewStudentsDriver.name}
                  {viewStudentsDriver.bus && <span style={{ fontWeight: 400, fontSize: 13, marginLeft: 8, color: 'var(--text-secondary)' }}>— Bus {viewStudentsDriver.bus}</span>}
                </h5>
                <button className="modal-close" onClick={() => setViewStudentsDriver(null)}>
                  <span className="material-icons">close</span>
                </button>
              </div>
              <div className="modal-body">
                {busStudents.length === 0 ? (
                  <div className="empty-state" style={{ padding: '32px 0' }}>
                    <span className="material-icons" style={{ fontSize: 40, color: 'var(--text-muted)' }}>people_outline</span>
                    <h3 style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 15 }}>No students assigned to this bus</h3>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr><th>#</th><th>Student ID</th><th>Student Name</th><th>Route</th><th>Boarding Stop</th></tr>
                    </thead>
                    <tbody>
                      {busStudents.map((s, i) => (
                        <tr key={s.id}>
                          <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.studentId}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.studentName}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.routeName || '—'}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.stopName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="modal-footer">
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {busStudents.length} student{busStudents.length !== 1 ? 's' : ''} on this bus
                </span>
                <button className="btn btn-sm btn-secondary" onClick={() => setViewStudentsDriver(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {showModal && (
        <Modal title={editItem ? 'Edit Driver' : 'Add New Driver'} onClose={() => setShowModal(false)} onSubmit={handleSave} submitLabel={editItem ? 'Update Driver' : 'Add Driver'} size="modal-lg">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-medium small">Full Name *</label>
              <input type="text" className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`}
                placeholder="Driver's full name" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">License Number *</label>
              <input type="text" className={`form-control form-control-sm ${errors.license ? 'is-invalid' : ''}`}
                placeholder="e.g., DL-1420110012345" value={form.license}
                onChange={e => setForm({ ...form, license: e.target.value })} />
              {errors.license && <div className="invalid-feedback">{errors.license}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Mobile (10 digits)</label>
              <input type="tel" className={`form-control form-control-sm ${errors.mobile ? 'is-invalid' : ''}`}
                placeholder="10-digit number" value={form.mobile} maxLength={10} inputMode="numeric"
                onChange={e => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
              {errors.mobile && <div className="invalid-feedback">{errors.mobile}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Experience</label>
              <input type="text" className="form-control form-control-sm"
                placeholder="e.g., 5 yrs" value={form.experience}
                onChange={e => setForm({ ...form, experience: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Status</label>
              <select className="form-select form-select-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Active</option><option>On Leave</option><option>Inactive</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label fw-medium small">Assign to Bus</label>
              <select className="form-select form-select-sm" value={form.bus}
                onChange={e => setForm({ ...form, bus: e.target.value })}>
                <option value="">— Select Bus —</option>
                {buses.map(b => <option key={b.id} value={b.busNo}>{b.busNo}{b.model ? ` – ${b.model}` : ''}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {deleteId && <DeleteModal label="Driver" onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />}
    </>
  );
}
