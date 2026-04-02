import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import {
  fetchBuses, createBus, updateBus, deleteBus,
  fetchRoutes, createRoute, updateRoute, deleteRoute,
  fetchDrivers, createDriver, updateDriver, deleteDriver,
  fetchStudentAssignments, assignStudent, updateStudentAssignment, removeStudentAssignment,
  fetchStops, createStop, updateStop, deleteStop,
  fetchTransportFees, createTransportFee, updateTransportFee, deleteTransportFee, markTransportFeePaid,
} from '../../services/transportService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 6;
const nextId = (arr) => (arr.length ? Math.max(...arr.map((x) => x.id)) + 1 : 1);

const statusColor = {
  Active: 'status-present',
  Inactive: 'status-absent',
  Maintenance: 'status-pending',
  'On Leave': 'status-pending',
  Pending: 'status-pending',
  Paid: 'status-paid',
  Overdue: 'status-overdue',
};

const TABS = [
  { key: 'buses',    label: 'Buses',   icon: 'directions_bus' },
  { key: 'routes',   label: 'Routes',  icon: 'route' },
  { key: 'drivers',  label: 'Drivers', icon: 'badge' },
  { key: 'students', label: 'Students',icon: 'people' },
  { key: 'stops',    label: 'Stops',   icon: 'place' },
  { key: 'fees',     label: 'Fees',    icon: 'payments' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Transport() {
  const [activeTab, setActiveTab] = useState('buses');
  const [toast, setToast] = useState(null);

  // Data stores
  const [buses,    setBuses]    = useState([]);
  const [routes,   setRoutes]   = useState([]);
  const [drivers,  setDrivers]  = useState([]);
  const [students, setStudents] = useState([]);
  const [stops,    setStops]    = useState([]);
  const [fees,     setFees]     = useState([]);

  // Load all data on mount from real API
  useEffect(() => {
    fetchBuses().then(data => setBuses(data));
    fetchRoutes().then(data => setRoutes(data));
    fetchDrivers().then(data => setDrivers(data));
    fetchStudentAssignments().then(data => setStudents(data));
    fetchStops().then(data => setStops(data));
    fetchTransportFees().then(data => setFees(data));
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Summary stats
  const stats = [
    { label: 'Total Buses',   value: buses.length,                                        icon: 'directions_bus', color: '#76C442' },
    { label: 'Active Routes', value: routes.filter(r => r.status === 'Active').length,    icon: 'route',          color: '#3182ce' },
    { label: 'Drivers',       value: drivers.length,                                       icon: 'badge',          color: '#805ad5' },
    { label: 'Students',      value: students.filter(s => s.status === 'Active').length,  icon: 'people',         color: '#e67e22' },
    { label: 'Total Stops',   value: stops.length,                                        icon: 'place',          color: '#e53e3e' },
    { label: 'Pending Fees',  value: fees.filter(f => f.status !== 'Paid').length,        icon: 'payments',       color: '#d69e2e' },
  ];

  return (
    <Layout pageTitle="Transport">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page Header */}
      <div className="page-header">
        <h1>Transport Management</h1>
        <p>Manage buses, routes, drivers, student assignments, stops and fees</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '14px', marginBottom: '24px' }}>
        {stats.map(c => (
          <div key={c.label} className="stat-card" style={{ padding: '16px' }}>
            <div className="stat-icon" style={{ backgroundColor: c.color + '18' }}>
              <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="stat-value" style={{ fontSize: '22px' }}>{c.value}</div>
            <div className="stat-label" style={{ fontSize: '11px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '20px',
        background: '#fff', borderRadius: '12px', padding: '6px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8',
        overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 18px', border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', transition: 'all 0.2s',
            background: activeTab === t.key ? '#76C442' : 'transparent',
            color: activeTab === t.key ? '#fff' : '#718096',
          }}>
            <span className="material-icons" style={{ fontSize: '16px' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'buses' && (
        <BusesPanel
          buses={buses} setBuses={setBuses}
          routes={routes} drivers={drivers}
          showToast={showToast}
        />
      )}
      {activeTab === 'routes' && (
        <RoutesPanel routes={routes} setRoutes={setRoutes} showToast={showToast} />
      )}
      {activeTab === 'drivers' && (
        <DriversPanel
          drivers={drivers} setDrivers={setDrivers}
          buses={buses} showToast={showToast}
        />
      )}
      {activeTab === 'students' && (
        <StudentsPanel
          students={students} setStudents={setStudents}
          routes={routes} stops={stops} buses={buses}
          showToast={showToast}
        />
      )}
      {activeTab === 'stops' && (
        <StopsPanel stops={stops} setStops={setStops} routes={routes} showToast={showToast} />
      )}
      {activeTab === 'fees' && (
        <FeesPanel fees={fees} setFees={setFees} showToast={showToast} />
      )}
    </Layout>
  );
}

// ─── Reusable table wrapper ───────────────────────────────────────────────────
function TableCard({ children, onAdd, addLabel, addIcon, searchValue, onSearch, searchPlaceholder, filters = [] }) {
  return (
    <div className="data-table-card">
      <div className="search-filter-bar">
        {onSearch !== undefined && (
          <div className="search-input-wrapper">
            <span className="material-icons">search</span>
            <input type="text" className="search-input" placeholder={searchPlaceholder || 'Search…'}
              value={searchValue} onChange={e => onSearch(e.target.value)} />
          </div>
        )}
        {filters.map((f, i) => (
          <select key={i} className="filter-select" value={f.value} onChange={e => f.onChange(e.target.value)}>
            {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}
        {onAdd && (
          <button className="btn-add" onClick={onAdd}>
            <span className="material-icons">{addIcon || 'add'}</span> {addLabel || 'Add'}
          </button>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, onSubmit, submitLabel = 'Save', size = '', children }) {
  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className={`modal-dialog ${size}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body">{children}</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">{submitLabel}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────
function DeleteModal({ label, onCancel, onConfirm }) {
  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-sm">
        <div className="modal-content">
          <div className="modal-body text-center p-4">
            <span className="material-icons text-danger" style={{ fontSize: 48 }}>delete</span>
            <h5 className="mt-2">Delete {label}?</h5>
            <p className="text-muted small">This action cannot be undone.</p>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Paginator({ current, total, onChange }) {
  if (total <= 1) return null;
  return (
    <div className="pagination-bar">
      <div className="pagination-info">Page {current} of {total}</div>
      <div className="pagination-controls">
        <button className="page-btn" disabled={current === 1} onClick={() => onChange(current - 1)}>
          <span className="material-icons" style={{ fontSize: 16 }}>chevron_left</span>
        </button>
        {Array.from({ length: total }, (_, i) => i + 1).map(p => (
          <button key={p} className={`page-btn ${current === p ? 'active' : ''}`} onClick={() => onChange(p)}>{p}</button>
        ))}
        <button className="page-btn" disabled={current === total} onClick={() => onChange(current + 1)}>
          <span className="material-icons" style={{ fontSize: 16 }}>chevron_right</span>
        </button>
      </div>
    </div>
  );
}

// ─── BUSES Panel ──────────────────────────────────────────────────────────────
function BusesPanel({ buses, setBuses, routes, drivers, showToast }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ busNo: '', model: '', year: '', capacity: '', driverId: '', routeId: '', status: 'Active' });
  const [errors, setErrors] = useState({});

  const filtered = buses.filter(b =>
    (!search || b.busNo.toLowerCase().includes(search.toLowerCase()) || b.model.toLowerCase().includes(search.toLowerCase())) &&
    (!filterStatus || b.status === filterStatus)
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.busNo.trim()) e.busNo = 'Bus number is required';
    if (!form.model.trim()) e.model = 'Model is required';
    if (!form.capacity || isNaN(form.capacity) || +form.capacity <= 0) e.capacity = 'Valid capacity is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => { setEditItem(null); setForm({ busNo: '', model: '', year: '', capacity: '', driverId: '', routeId: '', status: 'Active' }); setErrors({}); setShowModal(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ ...item }); setErrors({}); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    let updated;
    if (editItem) {
      await updateBus(editItem.id, form);
      updated = buses.map(b => b.id === editItem.id ? { ...b, ...form } : b);
      showToast('Bus updated successfully');
    } else {
      const created = await createBus({ id: nextId(buses), ...form });
      updated = [...buses, created];
      showToast('Bus added successfully');
    }
    setBuses(updated);
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    await deleteBus(id);
    const updated = buses.filter(b => b.id !== id);
    setBuses(updated);
    setDeleteId(null);
    showToast('Bus removed', 'warning');
  };

  const driverName = (id) => drivers.find(d => d.id === +id)?.name || '—';
  const routeName  = (id) => routes.find(r => r.id === +id)?.name || '—';

  return (
    <>
      <TableCard
        onAdd={openAdd} addLabel="Add Bus" addIcon="directions_bus"
        searchValue={search} onSearch={v => { setSearch(v); setPage(1); }} searchPlaceholder="Search bus number or model…"
        filters={[
          { value: filterStatus, onChange: v => { setFilterStatus(v); setPage(1); }, options: [{ value: '', label: 'All Status' }, { value: 'Active', label: 'Active' }, { value: 'Maintenance', label: 'Maintenance' }, { value: 'Inactive', label: 'Inactive' }] },
        ]}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Bus No</th><th>Model</th><th>Year</th><th>Capacity</th>
              <th>Driver</th><th>Route</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={8}><div className="empty-state"><span className="material-icons">directions_bus</span><h3>No buses found</h3></div></td></tr>
            ) : paginated.map(b => (
              <tr key={b.id}>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#2d3748' }}>{b.busNo}</td>
                <td>{b.model}</td>
                <td>{b.year || '—'}</td>
                <td>
                  <span style={{ background: '#ebf8ff', color: '#2b6cb0', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>
                    {b.capacity} seats
                  </span>
                </td>
                <td>{driverName(b.driverId)}</td>
                <td style={{ fontSize: 12, color: '#718096' }}>{routeName(b.routeId)}</td>
                <td><span className={`status-badge ${statusColor[b.status] || 'status-pending'}`}>{b.status}</span></td>
                <td>
                  <div className="action-btns">
                    <button className="action-btn action-btn-edit" onClick={() => openEdit(b)} title="Edit"><span className="material-icons">edit</span></button>
                    <button className="action-btn action-btn-delete" onClick={() => setDeleteId(b.id)} title="Delete"><span className="material-icons">delete</span></button>
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
            <div className="col-md-6">
              <label className="form-label fw-medium small">Bus Number *</label>
              <input type="text" className={`form-control form-control-sm ${errors.busNo ? 'is-invalid' : ''}`}
                placeholder="e.g., BUS-001" value={form.busNo}
                onChange={e => setForm({ ...form, busNo: e.target.value })} />
              {errors.busNo && <div className="invalid-feedback">{errors.busNo}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Model *</label>
              <input type="text" className={`form-control form-control-sm ${errors.model ? 'is-invalid' : ''}`}
                placeholder="e.g., Tata Starbus" value={form.model}
                onChange={e => setForm({ ...form, model: e.target.value })} />
              {errors.model && <div className="invalid-feedback">{errors.model}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Year</label>
              <input type="number" className="form-control form-control-sm"
                placeholder="e.g., 2021" value={form.year} min="2000" max="2030"
                onChange={e => setForm({ ...form, year: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Seating Capacity *</label>
              <input type="number" className={`form-control form-control-sm ${errors.capacity ? 'is-invalid' : ''}`}
                placeholder="e.g., 40" value={form.capacity} min="1"
                onChange={e => setForm({ ...form, capacity: e.target.value })} />
              {errors.capacity && <div className="invalid-feedback">{errors.capacity}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Status</label>
              <select className="form-select form-select-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Active</option><option>Maintenance</option><option>Inactive</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Assign Driver</label>
              <select className="form-select form-select-sm" value={form.driverId || ''} onChange={e => setForm({ ...form, driverId: e.target.value })}>
                <option value="">— Select Driver —</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Assign Route</label>
              <select className="form-select form-select-sm" value={form.routeId || ''} onChange={e => setForm({ ...form, routeId: e.target.value })}>
                <option value="">— Select Route —</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {deleteId && <DeleteModal label="Bus" onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />}
    </>
  );
}

// ─── ROUTES Panel ─────────────────────────────────────────────────────────────
function RoutesPanel({ routes, setRoutes, showToast }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', start: '', end: '', distance: '', stops: '', status: 'Active' });
  const [errors, setErrors] = useState({});

  const filtered = routes.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.start.toLowerCase().includes(search.toLowerCase()) || r.end.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Route name is required';
    if (!form.start.trim()) e.start = 'Start point is required';
    if (!form.end.trim())   e.end   = 'End point is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd  = () => { setEditItem(null); setForm({ name: '', start: '', end: '', distance: '', stops: '', status: 'Active' }); setErrors({}); setShowModal(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ ...item }); setErrors({}); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    let updated;
    if (editItem) {
      await updateRoute(editItem.id, form);
      updated = routes.map(r => r.id === editItem.id ? { ...r, ...form } : r);
      showToast('Route updated successfully');
    } else {
      const created = await createRoute({ id: nextId(routes), ...form });
      updated = [...routes, created];
      showToast('Route added successfully');
    }
    setRoutes(updated);
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    await deleteRoute(id);
    const updated = routes.filter(r => r.id !== id);
    setRoutes(updated);
    setDeleteId(null);
    showToast('Route removed', 'warning');
  };

  return (
    <>
      <TableCard onAdd={openAdd} addLabel="Add Route" addIcon="add_road"
        searchValue={search} onSearch={v => { setSearch(v); setPage(1); }} searchPlaceholder="Search routes…">
        <table className="data-table">
          <thead>
            <tr><th>Route Name</th><th>Start Point</th><th>End Point</th><th>Distance</th><th>Stops</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><span className="material-icons">route</span><h3>No routes found</h3></div></td></tr>
            ) : paginated.map(r => (
              <tr key={r.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-icons" style={{ color: '#fff', fontSize: 16 }}>route</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#2d3748' }}>{r.name}</span>
                  </div>
                </td>
                <td style={{ fontSize: 13 }}>{r.start}</td>
                <td style={{ fontSize: 13 }}>{r.end}</td>
                <td><span style={{ background: '#f0fff4', color: '#276749', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>{r.distance || '—'}</span></td>
                <td style={{ fontWeight: 700, color: '#3182ce' }}>{r.stops || 0}</td>
                <td><span className={`status-badge ${statusColor[r.status] || 'status-pending'}`}>{r.status}</span></td>
                <td>
                  <div className="action-btns">
                    <button className="action-btn action-btn-edit" onClick={() => openEdit(r)} title="Edit"><span className="material-icons">edit</span></button>
                    <button className="action-btn action-btn-delete" onClick={() => setDeleteId(r.id)} title="Delete"><span className="material-icons">delete</span></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator current={page} total={totalPages} onChange={setPage} />
      </TableCard>

      {showModal && (
        <Modal title={editItem ? 'Edit Route' : 'Add New Route'} onClose={() => setShowModal(false)} onSubmit={handleSave} submitLabel={editItem ? 'Update Route' : 'Add Route'} size="modal-lg">
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label fw-medium small">Route Name *</label>
              <input type="text" className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`}
                placeholder="e.g., Route A – North" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Start Point *</label>
              <input type="text" className={`form-control form-control-sm ${errors.start ? 'is-invalid' : ''}`}
                placeholder="e.g., School Gate" value={form.start}
                onChange={e => setForm({ ...form, start: e.target.value })} />
              {errors.start && <div className="invalid-feedback">{errors.start}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">End Point *</label>
              <input type="text" className={`form-control form-control-sm ${errors.end ? 'is-invalid' : ''}`}
                placeholder="e.g., Sector 14" value={form.end}
                onChange={e => setForm({ ...form, end: e.target.value })} />
              {errors.end && <div className="invalid-feedback">{errors.end}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Distance</label>
              <input type="text" className="form-control form-control-sm"
                placeholder="e.g., 12 km" value={form.distance}
                onChange={e => setForm({ ...form, distance: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">No. of Stops</label>
              <input type="number" className="form-control form-control-sm"
                placeholder="e.g., 6" value={form.stops} min="0"
                onChange={e => setForm({ ...form, stops: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Status</label>
              <select className="form-select form-select-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Active</option><option>Inactive</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {deleteId && <DeleteModal label="Route" onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />}
    </>
  );
}

// ─── DRIVERS Panel ────────────────────────────────────────────────────────────
function DriversPanel({ drivers, setDrivers, buses, showToast }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', license: '', phone: '', experience: '', busId: '', status: 'Active' });
  const [errors, setErrors] = useState({});

  const filtered = drivers.filter(d =>
    (!search || d.name.toLowerCase().includes(search.toLowerCase()) || d.license.toLowerCase().includes(search.toLowerCase())) &&
    (!filterStatus || d.status === filterStatus)
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = 'Name is required';
    if (!form.license.trim()) e.license = 'License number is required';
    if (form.phone && !/^\d{10}$/.test(form.phone)) e.phone = 'Must be 10 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd  = () => { setEditItem(null); setForm({ name: '', license: '', phone: '', experience: '', busId: '', status: 'Active' }); setErrors({}); setShowModal(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ ...item }); setErrors({}); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    let updated;
    if (editItem) {
      await updateDriver(editItem.id, form);
      updated = drivers.map(d => d.id === editItem.id ? { ...d, ...form } : d);
      showToast('Driver updated successfully');
    } else {
      const created = await createDriver({ id: nextId(drivers), ...form });
      updated = [...drivers, created];
      showToast('Driver added successfully');
    }
    setDrivers(updated);
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    await deleteDriver(id);
    const updated = drivers.filter(d => d.id !== id);
    setDrivers(updated);
    setDeleteId(null);
    showToast('Driver removed', 'warning');
  };

  const busNo = (id) => buses.find(b => b.id === +id)?.busNo || '—';
  const getInitials = (n) => n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);

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
                <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#718096', fontWeight: 600 }}>{d.license}</td>
                <td style={{ fontSize: 13 }}>{d.phone || '—'}</td>
                <td><span style={{ background: '#faf5ff', color: '#6b46c1', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>{d.experience || '—'}</span></td>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#2d3748' }}>{busNo(d.busId)}</td>
                <td><span className={`status-badge ${statusColor[d.status] || 'status-pending'}`}>{d.status}</span></td>
                <td>
                  <div className="action-btns">
                    <button className="action-btn action-btn-edit" onClick={() => openEdit(d)} title="Edit"><span className="material-icons">edit</span></button>
                    <button className="action-btn action-btn-delete" onClick={() => setDeleteId(d.id)} title="Delete"><span className="material-icons">delete</span></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator current={page} total={totalPages} onChange={setPage} />
      </TableCard>

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
              <label className="form-label fw-medium small">Phone (10 digits)</label>
              <input type="tel" className={`form-control form-control-sm ${errors.phone ? 'is-invalid' : ''}`}
                placeholder="10-digit number" value={form.phone} maxLength={10} inputMode="numeric"
                onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
              {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
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
              <select className="form-select form-select-sm" value={form.busId || ''} onChange={e => setForm({ ...form, busId: e.target.value })}>
                <option value="">— Select Bus —</option>
                {buses.map(b => <option key={b.id} value={b.id}>{b.busNo} – {b.model}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {deleteId && <DeleteModal label="Driver" onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />}
    </>
  );
}

// ─── STUDENTS Panel ───────────────────────────────────────────────────────────
function StudentsPanel({ students, setStudents, routes, stops, buses, showToast }) {
  const [search, setSearch] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ studentName: '', rollNo: '', routeId: '', stopId: '', busId: '', status: 'Active' });
  const [errors, setErrors] = useState({});

  const filteredStops = stops.filter(s => !form.routeId || s.routeId === +form.routeId);

  const filtered = students.filter(s =>
    (!search || s.studentName.toLowerCase().includes(search.toLowerCase()) || s.rollNo.toLowerCase().includes(search.toLowerCase())) &&
    (!filterRoute || s.routeId === +filterRoute)
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.studentName.trim()) e.studentName = 'Student name is required';
    if (!form.rollNo.trim())      e.rollNo      = 'Roll number is required';
    if (!form.routeId)            e.routeId     = 'Please select a route';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd  = () => { setEditItem(null); setForm({ studentName: '', rollNo: '', routeId: '', stopId: '', busId: '', status: 'Active' }); setErrors({}); setShowModal(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ ...item }); setErrors({}); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (editItem) {
        await updateStudentAssignment(editItem.id, form);
        showToast('Student transport updated successfully');
      } else {
        await assignStudent(form);
        showToast('Student assigned to transport successfully');
      }
      const data = await fetchStudentAssignments();
      setStudents(data);
      setShowModal(false);
    } catch {
      showToast('Failed to save. Please try again.', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await removeStudentAssignment(id);
      const data = await fetchStudentAssignments();
      setStudents(data);
      showToast('Student transport assignment removed', 'warning');
    } catch {
      showToast('Failed to remove assignment.', 'error');
    }
    setDeleteId(null);
  };

  const routeName = (id) => routes.find(r => r.id === +id)?.name || '—';
  const stopName  = (id) => stops.find(s => s.id === +id)?.name  || '—';
  const busNo     = (id) => buses.find(b => b.id === +id)?.busNo  || '—';
  const getInitials = (n) => n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <TableCard onAdd={openAdd} addLabel="Assign Student" addIcon="person_add"
        searchValue={search} onSearch={v => { setSearch(v); setPage(1); }} searchPlaceholder="Search student or roll no…"
        filters={[{ value: filterRoute, onChange: v => { setFilterRoute(v); setPage(1); }, options: [{ value: '', label: 'All Routes' }, ...routes.map(r => ({ value: r.id, label: r.name }))] }]}>
        <table className="data-table">
          <thead>
            <tr><th>Student</th><th>Roll No</th><th>Route</th><th>Stop</th><th>Bus</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><span className="material-icons">people</span><h3>No students assigned</h3></div></td></tr>
            ) : paginated.map(s => (
              <tr key={s.id}>
                <td>
                  <div className="student-cell">
                    <div className="student-avatar-sm">{getInitials(s.studentName)}</div>
                    <span className="student-name">{s.studentName}</span>
                  </div>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#718096', fontWeight: 600 }}>{s.rollNo}</td>
                <td style={{ fontSize: 12, color: '#4a5568' }}>{routeName(s.routeId)}</td>
                <td>
                  <span style={{ background: '#fff5f7', color: '#805ad5', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>
                    {stopName(s.stopId)}
                  </span>
                </td>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#2d3748' }}>{busNo(s.busId)}</td>
                <td><span className={`status-badge ${statusColor[s.status] || 'status-pending'}`}>{s.status}</span></td>
                <td>
                  <div className="action-btns">
                    <button className="action-btn action-btn-edit" onClick={() => openEdit(s)} title="Edit"><span className="material-icons">edit</span></button>
                    <button className="action-btn action-btn-delete" onClick={() => setDeleteId(s.id)} title="Remove"><span className="material-icons">delete</span></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginator current={page} total={totalPages} onChange={setPage} />
      </TableCard>

      {showModal && (
        <Modal title={editItem ? 'Edit Transport Assignment' : 'Assign Student to Transport'} onClose={() => setShowModal(false)} onSubmit={handleSave} submitLabel={editItem ? 'Update' : 'Assign'} size="modal-lg">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-medium small">Student Name *</label>
              <input type="text" className={`form-control form-control-sm ${errors.studentName ? 'is-invalid' : ''}`}
                placeholder="Full name" value={form.studentName}
                onChange={e => setForm({ ...form, studentName: e.target.value })} />
              {errors.studentName && <div className="invalid-feedback">{errors.studentName}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Roll Number *</label>
              <input type="text" className={`form-control form-control-sm ${errors.rollNo ? 'is-invalid' : ''}`}
                placeholder="e.g., S001" value={form.rollNo}
                onChange={e => setForm({ ...form, rollNo: e.target.value })} />
              {errors.rollNo && <div className="invalid-feedback">{errors.rollNo}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Route *</label>
              <select className={`form-select form-select-sm ${errors.routeId ? 'is-invalid' : ''}`}
                value={form.routeId || ''} onChange={e => setForm({ ...form, routeId: e.target.value, stopId: '' })}>
                <option value="">— Select Route —</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {errors.routeId && <div className="invalid-feedback">{errors.routeId}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Boarding Stop</label>
              <select className="form-select form-select-sm" value={form.stopId || ''} onChange={e => setForm({ ...form, stopId: e.target.value })}>
                <option value="">— Select Stop —</option>
                {filteredStops.map(s => <option key={s.id} value={s.id}>{s.name} ({s.pickupTime})</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Bus</label>
              <select className="form-select form-select-sm" value={form.busId || ''} onChange={e => setForm({ ...form, busId: e.target.value })}>
                <option value="">— Select Bus —</option>
                {buses.map(b => <option key={b.id} value={b.id}>{b.busNo} – {b.model}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Status</label>
              <select className="form-select form-select-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Active</option><option>Inactive</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {deleteId && <DeleteModal label="Assignment" onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />}
    </>
  );
}

// ─── STOPS Panel ──────────────────────────────────────────────────────────────
function StopsPanel({ stops, setStops, routes, showToast }) {
  const [filterRoute, setFilterRoute] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', routeId: '', order: '', pickupTime: '', dropTime: '' });
  const [errors, setErrors] = useState({});

  const filtered = stops.filter(s => !filterRoute || s.routeId === +filterRoute);
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name    = 'Stop name is required';
    if (!form.routeId)      e.routeId = 'Please select a route';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd  = () => { setEditItem(null); setForm({ name: '', routeId: '', order: '', pickupTime: '', dropTime: '' }); setErrors({}); setShowModal(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ ...item }); setErrors({}); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (editItem) {
        await updateStop(editItem.id, form);
        showToast('Stop updated successfully');
      } else {
        await createStop(form);
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

  const routeName = (id) => routes.find(r => r.id === +id)?.name || '—';

  return (
    <>
      <TableCard onAdd={openAdd} addLabel="Add Stop" addIcon="add_location"
        filters={[{ value: filterRoute, onChange: v => { setFilterRoute(v); setPage(1); }, options: [{ value: '', label: 'All Routes' }, ...routes.map(r => ({ value: r.id, label: r.name }))] }]}>
        <table className="data-table">
          <thead>
            <tr><th>#</th><th>Stop Name</th><th>Route</th><th>Order</th><th>Pickup Time</th><th>Drop Time</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><span className="material-icons">place</span><h3>No stops found</h3></div></td></tr>
            ) : paginated.map((s, idx) => (
              <tr key={s.id}>
                <td style={{ color: '#a0aec0', fontSize: 12 }}>{(page - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-icons" style={{ color: '#e53e3e', fontSize: 18 }}>place</span>
                    <span style={{ fontWeight: 600, color: '#2d3748' }}>{s.name}</span>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: '#718096' }}>{routeName(s.routeId)}</td>
                <td>
                  <span style={{ background: '#ebf8ff', color: '#2b6cb0', padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>
                    Stop {s.order || '—'}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: '#276749', fontSize: 13 }}>{s.pickupTime || '—'}</td>
                <td style={{ fontWeight: 600, color: '#c05621', fontSize: 13 }}>{s.dropTime || '—'}</td>
                <td>
                  <div className="action-btns">
                    <button className="action-btn action-btn-edit" onClick={() => openEdit(s)} title="Edit"><span className="material-icons">edit</span></button>
                    <button className="action-btn action-btn-delete" onClick={() => setDeleteId(s.id)} title="Delete"><span className="material-icons">delete</span></button>
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
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {errors.routeId && <div className="invalid-feedback">{errors.routeId}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Stop Order</label>
              <input type="number" className="form-control form-control-sm"
                placeholder="e.g., 1" value={form.order} min="1"
                onChange={e => setForm({ ...form, order: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Pickup Time</label>
              <input type="time" className="form-control form-control-sm" value={form.pickupTime}
                onChange={e => setForm({ ...form, pickupTime: e.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Drop Time</label>
              <input type="time" className="form-control form-control-sm" value={form.dropTime}
                onChange={e => setForm({ ...form, dropTime: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}

      {deleteId && <DeleteModal label="Stop" onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />}
    </>
  );
}

// ─── FEES Panel ───────────────────────────────────────────────────────────────
function FeesPanel({ fees, setFees, showToast }) {
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ studentName: '', rollNo: '', amount: '', month: '', dueDate: '', status: 'Pending', paidOn: '' });
  const [errors, setErrors] = useState({});

  const filtered = fees.filter(f =>
    (!search || f.studentName.toLowerCase().includes(search.toLowerCase()) || f.rollNo.toLowerCase().includes(search.toLowerCase())) &&
    (!filterStatus || f.status === filterStatus)
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const totalAmount  = fees.reduce((s, f) => s + (+f.amount || 0), 0);
  const collectedAmt = fees.filter(f => f.status === 'Paid').reduce((s, f) => s + (+f.amount || 0), 0);
  const pendingAmt   = totalAmount - collectedAmt;

  const validate = () => {
    const e = {};
    if (!form.studentName.trim()) e.studentName = 'Student name is required';
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) e.amount = 'Valid amount is required';
    if (!form.month.trim())   e.month   = 'Month is required';
    if (!form.dueDate)        e.dueDate = 'Due date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd  = () => { setEditItem(null); setForm({ studentName: '', rollNo: '', amount: '', month: '', dueDate: '', status: 'Pending', paidOn: '' }); setErrors({}); setShowModal(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ ...item }); setErrors({}); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (editItem) {
        await updateTransportFee(editItem.id, form);
        showToast('Fee record updated successfully');
      } else {
        await createTransportFee(form);
        showToast('Fee record added successfully');
      }
      const data = await fetchTransportFees();
      setFees(data);
      setShowModal(false);
    } catch {
      showToast('Failed to save fee record. Please try again.', 'error');
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
          <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: c.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-icons" style={{ color: c.color, fontSize: 22 }}>{c.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#2d3748' }}>{c.value}</div>
              <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <TableCard onAdd={openAdd} addLabel="Add Fee" addIcon="add"
        searchValue={search} onSearch={v => { setSearch(v); setPage(1); }} searchPlaceholder="Search student or roll no…"
        filters={[{ value: filterStatus, onChange: v => { setFilterStatus(v); setPage(1); }, options: [{ value: '', label: 'All Status' }, { value: 'Paid', label: 'Paid' }, { value: 'Pending', label: 'Pending' }, { value: 'Overdue', label: 'Overdue' }] }]}>
        <table className="data-table">
          <thead>
            <tr><th>Student</th><th>Month</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Paid On</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><span className="material-icons">payments</span><h3>No fee records</h3></div></td></tr>
            ) : paginated.map(f => (
              <tr key={f.id}>
                <td>
                  <div>
                    <div style={{ fontWeight: 600, color: '#2d3748', fontSize: 13 }}>{f.studentName}</div>
                    <div style={{ fontSize: 11, color: '#a0aec0' }}>{f.rollNo}</div>
                  </div>
                </td>
                <td style={{ fontSize: 13 }}>{f.month}</td>
                <td style={{ fontWeight: 700, color: '#2d3748' }}>{fmt(f.amount)}</td>
                <td style={{ fontSize: 12, color: '#718096' }}>{f.dueDate || '—'}</td>
                <td><span className={`status-badge ${statusColor[f.status] || 'status-pending'}`}>{f.status}</span></td>
                <td style={{ fontSize: 12, color: '#718096' }}>{f.paidOn || '—'}</td>
                <td>
                  <div className="action-btns">
                    {f.status !== 'Paid' && (
                      <button className="action-btn" style={{ background: '#f0fff4', color: '#276749' }} onClick={() => markPaid(f.id)} title="Mark Paid">
                        <span className="material-icons">check_circle</span>
                      </button>
                    )}
                    <button className="action-btn action-btn-edit" onClick={() => openEdit(f)} title="Edit"><span className="material-icons">edit</span></button>
                    <button className="action-btn action-btn-delete" onClick={() => setDeleteId(f.id)} title="Delete"><span className="material-icons">delete</span></button>
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
            <div className="col-md-6">
              <label className="form-label fw-medium small">Student Name *</label>
              <input type="text" className={`form-control form-control-sm ${errors.studentName ? 'is-invalid' : ''}`}
                placeholder="Full name" value={form.studentName}
                onChange={e => setForm({ ...form, studentName: e.target.value })} />
              {errors.studentName && <div className="invalid-feedback">{errors.studentName}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Roll Number</label>
              <input type="text" className="form-control form-control-sm"
                placeholder="e.g., S001" value={form.rollNo}
                onChange={e => setForm({ ...form, rollNo: e.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Amount (₹) *</label>
              <input type="number" className={`form-control form-control-sm ${errors.amount ? 'is-invalid' : ''}`}
                placeholder="e.g., 2500" value={form.amount} min="1"
                onChange={e => setForm({ ...form, amount: e.target.value })} />
              {errors.amount && <div className="invalid-feedback">{errors.amount}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Month *</label>
              <input type="text" className={`form-control form-control-sm ${errors.month ? 'is-invalid' : ''}`}
                placeholder="e.g., April 2026" value={form.month}
                onChange={e => setForm({ ...form, month: e.target.value })} />
              {errors.month && <div className="invalid-feedback">{errors.month}</div>}
            </div>
            <div className="col-md-4">
              <label className="form-label fw-medium small">Due Date *</label>
              <input type="date" className={`form-control form-control-sm ${errors.dueDate ? 'is-invalid' : ''}`}
                value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })} />
              {errors.dueDate && <div className="invalid-feedback">{errors.dueDate}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Status</label>
              <select className="form-select form-select-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value, paidOn: e.target.value === 'Paid' ? (form.paidOn || new Date().toISOString().split('T')[0]) : form.paidOn })}>
                <option>Pending</option><option>Paid</option><option>Overdue</option>
              </select>
            </div>
            {form.status === 'Paid' && (
              <div className="col-md-6">
                <label className="form-label fw-medium small">Paid On</label>
                <input type="date" className="form-control form-control-sm" value={form.paidOn}
                  onChange={e => setForm({ ...form, paidOn: e.target.value })} />
              </div>
            )}
          </div>
        </Modal>
      )}

      {deleteId && <DeleteModal label="Fee Record" onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />}
    </>
  );
}
