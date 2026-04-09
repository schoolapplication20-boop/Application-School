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
  Pending: 'status-pending', PENDING: 'status-pending',
  Paid:    'status-paid',    PAID:    'status-paid',
  Overdue: 'status-overdue', OVERDUE: 'status-overdue',
};

// Tabs in logical setup order: Route → Stops → Bus → Driver → Student → Fees
const TABS = [
  { key: 'routes',   label: 'Routes',   icon: 'route' },
  { key: 'stops',    label: 'Stops',    icon: 'place' },
  { key: 'buses',    label: 'Buses',    icon: 'directions_bus' },
  { key: 'drivers',  label: 'Drivers',  icon: 'badge' },
  { key: 'students', label: 'Students', icon: 'people' },
  { key: 'fees',     label: 'Fees',     icon: 'payments' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Transport() {
  const [activeTab, setActiveTab] = useState('routes');
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
          buses={buses} students={students} showToast={showToast}
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
        <FeesPanel fees={fees} setFees={setFees} students={students} showToast={showToast} />
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
                <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#2d3748' }}>{b.busNo}</td>
                <td>{b.model || '—'}</td>
                <td>{b.year || '—'}</td>
                <td><span style={{ background: '#ebf8ff', color: '#2b6cb0', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>{b.capacity} seats</span></td>
                <td>{b.driver || '—'}</td>
                <td style={{ fontSize: 12, color: '#718096' }}>{b.route || '—'}</td>
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

// ─── ROUTES Panel ─────────────────────────────────────────────────────────────
function RoutesPanel({ routes, setRoutes, showToast }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const EMPTY_ROUTE = { name: '', area: '', distance: '', stops: '', pickupTime: '', dropTime: '' };
  const [form, setForm] = useState(EMPTY_ROUTE);
  const [errors, setErrors] = useState({});

  const filtered = routes.filter(r => !search ||
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.area?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Route name is required';
    if (!form.area.trim()) e.area = 'Area / zone is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd  = () => { setEditItem(null); setForm(EMPTY_ROUTE); setErrors({}); setShowModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name || '', area: item.area || '', distance: item.distance || '', stops: item.stops || '', pickupTime: item.pickupTime || '', dropTime: item.dropTime || '' });
    setErrors({});
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { name: form.name, area: form.area, distance: form.distance, stops: form.stops ? Number(form.stops) : 0, pickupTime: form.pickupTime, dropTime: form.dropTime };
    try {
      let saved;
      if (editItem) {
        saved = await updateRoute(editItem.id, payload);
        setRoutes(prev => prev.map(r => r.id === editItem.id ? { ...r, ...payload, id: editItem.id } : r));
        showToast('Route updated successfully');
      } else {
        saved = await createRoute(payload);
        setRoutes(prev => [...prev, saved]);
        showToast('Route added successfully');
      }
      setShowModal(false);
    } catch { showToast('Failed to save route', 'error'); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteRoute(id);
      setRoutes(prev => prev.filter(r => r.id !== id));
      showToast('Route removed', 'warning');
    } catch { showToast('Failed to delete route', 'error'); }
    setDeleteId(null);
  };

  return (
    <>
      <TableCard onAdd={openAdd} addLabel="Add Route" addIcon="add_road"
        searchValue={search} onSearch={v => { setSearch(v); setPage(1); }} searchPlaceholder="Search route name or area…">
        <table className="data-table">
          <thead>
            <tr><th>Route Name</th><th>Area / Zone</th><th>Distance</th><th>Stops</th><th>Pickup</th><th>Drop</th><th>Actions</th></tr>
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
                <td style={{ fontSize: 13 }}>{r.area || '—'}</td>
                <td><span style={{ background: '#f0fff4', color: '#276749', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>{r.distance || '—'}</span></td>
                <td style={{ fontWeight: 700, color: '#3182ce' }}>{r.stops || 0}</td>
                <td style={{ fontWeight: 600, color: '#276749', fontSize: 13 }}>{r.pickupTime || '—'}</td>
                <td style={{ fontWeight: 600, color: '#c05621', fontSize: 13 }}>{r.dropTime || '—'}</td>
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
            <div className="col-md-6">
              <label className="form-label fw-medium small">Route Name *</label>
              <input type="text" className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`}
                placeholder="e.g., Route A – North Zone" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Area / Zone *</label>
              <input type="text" className={`form-control form-control-sm ${errors.area ? 'is-invalid' : ''}`}
                placeholder="e.g., School Gate → Sector 14" value={form.area}
                onChange={e => setForm({ ...form, area: e.target.value })} />
              {errors.area && <div className="invalid-feedback">{errors.area}</div>}
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
            <div className="col-md-2">
              <label className="form-label fw-medium small">Pickup Time</label>
              <input type="time" className="form-control form-control-sm" value={form.pickupTime}
                onChange={e => setForm({ ...form, pickupTime: e.target.value })} />
            </div>
            <div className="col-md-2">
              <label className="form-label fw-medium small">Drop Time</label>
              <input type="time" className="form-control form-control-sm" value={form.dropTime}
                onChange={e => setForm({ ...form, dropTime: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}

      {deleteId && <DeleteModal label="Route" onCancel={() => setDeleteId(null)} onConfirm={() => handleDelete(deleteId)} />}
    </>
  );
}

// ─── DRIVERS Panel ────────────────────────────────────────────────────────────
function DriversPanel({ drivers, setDrivers, buses, students, showToast }) {
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
                <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#718096', fontWeight: 600 }}>{d.license}</td>
                <td style={{ fontSize: 13 }}>{d.mobile || '—'}</td>
                <td><span style={{ background: '#faf5ff', color: '#6b46c1', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>{d.experience || '—'}</span></td>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#2d3748' }}>{d.bus || '—'}</td>
                <td><span className={`status-badge ${statusColor[d.status] || 'status-pending'}`}>{d.status}</span></td>
                <td>
                  <div className="action-btns">
                    <button className="action-btn" style={{ background: '#ebf8ff', color: '#2b6cb0' }}
                      onClick={() => setViewStudentsDriver(d)} title="View Assigned Students">
                      <span className="material-icons">people</span>
                    </button>
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
                  {viewStudentsDriver.bus && <span style={{ fontWeight: 400, fontSize: 13, marginLeft: 8, color: '#718096' }}>— Bus {viewStudentsDriver.bus}</span>}
                </h5>
                <button className="modal-close" onClick={() => setViewStudentsDriver(null)}>
                  <span className="material-icons">close</span>
                </button>
              </div>
              <div className="modal-body">
                {busStudents.length === 0 ? (
                  <div className="empty-state" style={{ padding: '32px 0' }}>
                    <span className="material-icons" style={{ fontSize: 40, color: '#cbd5e0' }}>people_outline</span>
                    <h3 style={{ marginTop: 8, color: '#a0aec0', fontSize: 15 }}>No students assigned to this bus</h3>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr><th>#</th><th>Student ID</th><th>Student Name</th><th>Route</th><th>Boarding Stop</th></tr>
                    </thead>
                    <tbody>
                      {busStudents.map((s, i) => (
                        <tr key={s.id}>
                          <td style={{ color: '#a0aec0', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.studentId}</td>
                          <td style={{ fontWeight: 600, color: '#2d3748' }}>{s.studentName}</td>
                          <td style={{ fontSize: 12, color: '#718096' }}>{s.routeName || '—'}</td>
                          <td style={{ fontSize: 12, color: '#718096' }}>{s.stopName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="modal-footer">
                <span style={{ fontSize: 13, color: '#718096' }}>
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

// ─── STUDENTS Panel ───────────────────────────────────────────────────────────
function StudentsPanel({ students, setStudents, routes, stops, buses, showToast }) {
  const [search, setSearch] = useState('');
  const [filterRoute, setFilterRoute] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const EMPTY_STUDENT = { studentId: '', studentName: '', routeId: '', routeName: '', stopId: '', stopName: '', busId: '', busNo: '' };
  const [form, setForm] = useState(EMPTY_STUDENT);
  const [errors, setErrors] = useState({});

  const filteredStops = stops.filter(s => !form.routeId || String(s.routeId) === String(form.routeId));

  const filtered = students.filter(s =>
    (!search || s.studentName?.toLowerCase().includes(search.toLowerCase()) || String(s.studentId).includes(search)) &&
    (!filterRoute || String(s.routeId) === String(filterRoute))
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const validate = () => {
    const e = {};
    if (!form.studentId)          e.studentId  = 'Student ID is required';
    if (!form.studentName.trim()) e.studentName = 'Student name is required';
    if (!form.routeId)            e.routeId     = 'Please select a route';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd  = () => { setEditItem(null); setForm(EMPTY_STUDENT); setErrors({}); setShowModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      studentId:   item.studentId   || '',
      studentName: item.studentName || '',
      routeId:     item.routeId     || '',
      routeName:   item.routeName   || '',
      stopId:      item.stopId      || '',
      stopName:    item.stopName    || '',
      busId:       item.busId       || '',
      busNo:       item.busNo       || '',
    });
    setErrors({});
    setShowModal(true);
  };

  // When route/stop/bus dropdowns change, also populate the name fields
  const setRoute = (id) => {
    const r = routes.find(r => String(r.id) === String(id));
    setForm(f => ({ ...f, routeId: id, routeName: r?.name || '', stopId: '', stopName: '' }));
  };
  const setStop = (id) => {
    const s = stops.find(s => String(s.id) === String(id));
    setForm(f => ({ ...f, stopId: id, stopName: s?.name || '' }));
  };
  const setBus = (id) => {
    const b = buses.find(b => String(b.id) === String(id));
    setForm(f => ({ ...f, busId: id, busNo: b?.busNo || '' }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const payload = {
        studentId:   Number(form.studentId),
        studentName: form.studentName,
        routeId:     form.routeId  ? Number(form.routeId)  : null,
        routeName:   form.routeName,
        stopId:      form.stopId   ? Number(form.stopId)   : null,
        stopName:    form.stopName,
        busId:       form.busId    ? Number(form.busId)    : null,
        busNo:       form.busNo,
      };
      if (editItem) {
        await updateStudentAssignment(editItem.id, payload);
        showToast('Student transport updated successfully');
      } else {
        await assignStudent(payload);
        showToast('Student assigned to transport successfully');
      }
      const data = await fetchStudentAssignments();
      setStudents(data);
      setShowModal(false);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save. Please try again.', 'error');
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
            <tr><th>Student</th><th>Student ID</th><th>Route</th><th>Stop</th><th>Bus</th><th>Actions</th></tr>
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
                <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#718096', fontWeight: 600 }}>ID: {s.studentId}</td>
                <td style={{ fontSize: 12, color: '#4a5568' }}>{routeName(s.routeId)}</td>
                <td>
                  <span style={{ background: '#fff5f7', color: '#805ad5', padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>
                    {stopName(s.stopId)}
                  </span>
                </td>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#2d3748' }}>{s.busNo || busNo(s.busId)}</td>
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
            <div className="col-md-4">
              <label className="form-label fw-medium small">Student ID *</label>
              <input type="number" className={`form-control form-control-sm ${errors.studentId ? 'is-invalid' : ''}`}
                placeholder="e.g., 1001" value={form.studentId} min="1"
                onChange={e => { setForm(f => ({ ...f, studentId: e.target.value })); if (errors.studentId) setErrors(ev => ({ ...ev, studentId: '' })); }} />
              {errors.studentId && <div className="invalid-feedback">{errors.studentId}</div>}
            </div>
            <div className="col-md-8">
              <label className="form-label fw-medium small">Student Name *</label>
              <input type="text" className={`form-control form-control-sm ${errors.studentName ? 'is-invalid' : ''}`}
                placeholder="Full name" value={form.studentName}
                onChange={e => { setForm(f => ({ ...f, studentName: e.target.value })); if (errors.studentName) setErrors(ev => ({ ...ev, studentName: '' })); }} />
              {errors.studentName && <div className="invalid-feedback">{errors.studentName}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Route *</label>
              <select className={`form-select form-select-sm ${errors.routeId ? 'is-invalid' : ''}`}
                value={form.routeId || ''} onChange={e => { setRoute(e.target.value); if (errors.routeId) setErrors(ev => ({ ...ev, routeId: '' })); }}>
                <option value="">— Select Route —</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}{r.area ? ` (${r.area})` : ''}</option>)}
              </select>
              {errors.routeId && <div className="invalid-feedback">{errors.routeId}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium small">Boarding Stop</label>
              <select className="form-select form-select-sm" value={form.stopId || ''} onChange={e => setStop(e.target.value)}
                disabled={!form.routeId}>
                <option value="">{form.routeId ? '— Select Stop —' : '— Select route first —'}</option>
                {filteredStops.map(s => <option key={s.id} value={s.id}>{s.name}{s.timing ? ` (${s.timing})` : ''}</option>)}
              </select>
            </div>
            <div className="col-md-12">
              <label className="form-label fw-medium small">Bus</label>
              <select className="form-select form-select-sm" value={form.busId || ''} onChange={e => setBus(e.target.value)}>
                <option value="">— Select Bus (optional) —</option>
                {buses.map(b => <option key={b.id} value={b.id}>{b.busNo}{b.route ? ` — ${b.route}` : ''} (cap: {b.capacity})</option>)}
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
                    Stop {s.stopOrder || '—'}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: '#276749', fontSize: 13 }}>{s.timing || '—'}</td>
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

// ─── FEES Panel ───────────────────────────────────────────────────────────────
function FeesPanel({ fees, setFees, students, showToast }) {
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
    (!filterStatus || f.status === filterStatus)
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const totalAmount  = fees.reduce((s, f) => s + (+f.amount || 0), 0);
  const collectedAmt = fees.filter(f => f.status === 'PAID').reduce((s, f) => s + (+f.amount || 0), 0);
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
                    <div style={{ fontWeight: 600, color: '#2d3748', fontSize: 13 }}>{f.studentName}</div>
                    <div style={{ fontSize: 11, color: '#a0aec0' }}>ID: {f.studentId}</div>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: '#718096' }}>
                  <div>{f.route || '—'}</div>
                  <div style={{ fontSize: 11 }}>{f.busNo || ''}</div>
                </td>
                <td style={{ fontSize: 13 }}>{f.month}</td>
                <td style={{ fontWeight: 700, color: '#2d3748' }}>{fmt(f.amount)}</td>
                <td><span className={`status-badge ${statusColor[f.status] || 'status-pending'}`}>{f.status}</span></td>
                <td style={{ fontSize: 12, color: '#718096' }}>{f.paidDate || '—'}</td>
                <td>
                  <div className="action-btns">
                    {f.status !== 'PAID' && (
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
