import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { transportAPI } from '../../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 8;

const EMPTY_FORM = {
  studentId: '',
  studentName: '',
  studentClass: '',
  transportNeeded: false,
  pickupLocation: '',
  dropLocation: '',
  routeId: '',
  routeName: '',
  stopId: '',
  stopName: '',
  pickupTime: '',
  dropTime: '',
  fee: '',
  emergencyContact: '',
  notes: '',
  status: 'Active',
};

const STATUS_COLORS = {
  Active: { bg: '#e6f4ea', color: '#276749' },
  Inactive: { bg: '#fff5f5', color: '#c53030' },
};

// ─── Helper components ────────────────────────────────────────────────────────
function FieldLabel({ children, required }) {
  return (
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '6px' }}>
      {children} {required && <span style={{ color: '#e53e3e' }}>*</span>}
    </label>
  );
}

function FormInput({ label, required, error, style, ...props }) {
  return (
    <div style={{ ...style }}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <input
        style={{
          width: '100%', padding: '9px 12px', border: `1px solid ${error ? '#fc8181' : '#e2e8f0'}`,
          borderRadius: '8px', fontSize: '13px', outline: 'none', background: props.disabled ? '#f7fafc' : '#fff',
          boxSizing: 'border-box', color: '#2d3748', transition: 'border-color 0.15s',
        }}
        {...props}
      />
      {error && <p style={{ color: '#e53e3e', fontSize: '11px', marginTop: '3px' }}>{error}</p>}
    </div>
  );
}

function FormSelect({ label, required, error, children, style, ...props }) {
  return (
    <div style={{ ...style }}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <select
        style={{
          width: '100%', padding: '9px 12px', border: `1px solid ${error ? '#fc8181' : '#e2e8f0'}`,
          borderRadius: '8px', fontSize: '13px', outline: 'none', background: props.disabled ? '#f7fafc' : '#fff',
          boxSizing: 'border-box', color: '#2d3748', cursor: props.disabled ? 'not-allowed' : 'pointer',
        }}
        {...props}
      >
        {children}
      </select>
      {error && <p style={{ color: '#e53e3e', fontSize: '11px', marginTop: '3px' }}>{error}</p>}
    </div>
  );
}

function FormTextarea({ label, required, error, style, ...props }) {
  return (
    <div style={{ ...style }}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <textarea
        rows={3}
        style={{
          width: '100%', padding: '9px 12px', border: `1px solid ${error ? '#fc8181' : '#e2e8f0'}`,
          borderRadius: '8px', fontSize: '13px', outline: 'none', resize: 'vertical',
          boxSizing: 'border-box', color: '#2d3748', fontFamily: 'inherit',
        }}
        {...props}
      />
      {error && <p style={{ color: '#e53e3e', fontSize: '11px', marginTop: '3px' }}>{error}</p>}
    </div>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────────
function SectionTitle({ icon, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '20px 0 12px', borderBottom: '2px solid #edf2f7', paddingBottom: '8px' }}>
      <span className="material-icons" style={{ fontSize: '18px', color: '#76C442' }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: '13px', color: '#2d3748', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{children}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StudentTransportPage() {
  const [records, setRecords] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);

  // View detail modal
  const [viewRecord, setViewRecord] = useState(null);

  // Pagination & search
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [page, setPage] = useState(1);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Data loading ─────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      transportAPI.getStudentTransports(),
      transportAPI.getRoutes(),
      transportAPI.getStops(),
    ]).then(([stRes, routeRes, stopRes]) => {
      setRecords(stRes.data?.data || []);
      setRoutes(routeRes.data?.data || []);
      setStops(stopRes.data?.data || []);
    }).catch(() => showToast('Failed to load transport data', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const filteredStops = stops.filter(s =>
    form.routeId ? String(s.routeId) === String(form.routeId) : true
  );

  const filteredRecords = records.filter(r => {
    const matchSearch = !search ||
      r.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      r.routeName?.toLowerCase().includes(search.toLowerCase()) ||
      r.stopName?.toLowerCase().includes(search.toLowerCase()) ||
      String(r.studentId).includes(search);
    const matchStatus = filterStatus === 'All' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE));
  const paginated = filteredRecords.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Stats
  const stats = [
    { label: 'Total Records', value: records.length, icon: 'directions_bus', color: '#76C442' },
    { label: 'Transport Needed', value: records.filter(r => r.transportNeeded).length, icon: 'check_circle', color: '#3182ce' },
    { label: 'Active', value: records.filter(r => r.status === 'Active').length, icon: 'verified', color: '#38a169' },
    { label: 'Routes Used', value: [...new Set(records.map(r => r.routeId).filter(Boolean))].length, icon: 'route', color: '#805ad5' },
  ];

  // ── Form helpers ──────────────────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Clear stop when route changes
      if (field === 'routeId') {
        const route = routes.find(r => String(r.id) === String(value));
        next.routeName = route?.name || '';
        next.stopId = '';
        next.stopName = '';
        // Auto-fill timings from route
        next.pickupTime = route?.pickupTime || prev.pickupTime;
        next.dropTime = route?.dropTime || prev.dropTime;
      }
      if (field === 'stopId') {
        const stop = stops.find(s => String(s.id) === String(value));
        next.stopName = stop?.name || '';
      }
      return next;
    });
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.studentId) e.studentId = 'Student ID is required';
    if (!form.studentName?.trim()) e.studentName = 'Student name is required';
    if (form.transportNeeded) {
      if (!form.pickupLocation?.trim()) e.pickupLocation = 'Pickup location is required';
      if (!form.dropLocation?.trim()) e.dropLocation = 'Drop location is required';
      if (!form.routeId) e.routeId = 'Route is required';
      if (!form.stopId) e.stopId = 'Bus stop is required';
      if (!form.pickupTime) e.pickupTime = 'Pickup time is required';
      if (!form.dropTime) e.dropTime = 'Drop time is required';
      if (!form.emergencyContact?.trim()) e.emergencyContact = 'Emergency contact is required';
      if (form.emergencyContact && !/^\d{10}$/.test(form.emergencyContact.replace(/\D/g, ''))) {
        e.emergencyContact = 'Enter a valid 10-digit phone number';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (rec) => {
    setForm({
      studentId: String(rec.studentId || ''),
      studentName: rec.studentName || '',
      studentClass: rec.studentClass || '',
      transportNeeded: !!rec.transportNeeded,
      pickupLocation: rec.pickupLocation || '',
      dropLocation: rec.dropLocation || '',
      routeId: String(rec.routeId || ''),
      routeName: rec.routeName || '',
      stopId: String(rec.stopId || ''),
      stopName: rec.stopName || '',
      pickupTime: rec.pickupTime || '',
      dropTime: rec.dropTime || '',
      fee: rec.fee != null ? String(rec.fee) : '',
      emergencyContact: rec.emergencyContact || '',
      notes: rec.notes || '',
      status: rec.status || 'Active',
    });
    setErrors({});
    setEditId(rec.id);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        studentId: Number(form.studentId),
        routeId: form.routeId ? Number(form.routeId) : null,
        stopId: form.stopId ? Number(form.stopId) : null,
        fee: form.fee !== '' ? parseFloat(form.fee) : 0,
      };
      if (editId) {
        const res = await transportAPI.updateStudentTransport(editId, payload);
        const updated = res.data?.data;
        setRecords(prev => prev.map(r => r.id === editId ? updated : r));
        showToast('Transport record updated successfully');
      } else {
        const res = await transportAPI.createStudentTransport(payload);
        const created = res.data?.data;
        setRecords(prev => [created, ...prev]);
        showToast('Transport record created successfully');
      }
      setModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save record', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await transportAPI.deleteStudentTransport(deleteId);
      setRecords(prev => prev.filter(r => r.id !== deleteId));
      showToast('Record deleted');
    } catch {
      showToast('Failed to delete record', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <Layout pageTitle="Student Transport">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="page-header">
        <h1>Student Transport Management</h1>
        <p>Collect, view, and manage student transportation details — routes, stops, timings, and fees</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '18px' }}>
            <div className="stat-icon" style={{ backgroundColor: s.color + '18' }}>
              <span className="material-icons" style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div className="stat-value" style={{ fontSize: '24px' }}>{s.value}</div>
            <div className="stat-label" style={{ fontSize: '11px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <span className="material-icons" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0', fontSize: '18px' }}>search</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by student, route or stop..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          style={{ padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <button
          onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: '#76C442', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
        >
          <span className="material-icons" style={{ fontSize: '16px' }}>add</span>
          Add Record
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #f0f4f8', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>hourglass_empty</span>
            Loading...
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: '48px', display: 'block', marginBottom: '12px', color: '#e2e8f0' }}>directions_bus</span>
            <p style={{ fontWeight: 600, color: '#718096' }}>No transport records found</p>
            <p style={{ fontSize: '13px' }}>Click "Add Record" to create the first entry.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f7fafc', borderBottom: '1px solid #edf2f7' }}>
                {['Student', 'Class', 'Transport', 'Route / Stop', 'Pickup', 'Drop', 'Fee (₹)', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#4a5568', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((rec, i) => (
                <tr key={rec.id} style={{ borderBottom: '1px solid #f0f4f8', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#2d3748' }}>{rec.studentName}</div>
                    <div style={{ fontSize: '11px', color: '#a0aec0' }}>ID: {rec.studentId}</div>
                  </td>
                  <td style={{ padding: '13px 14px', color: '#4a5568' }}>{rec.studentClass || '—'}</td>
                  <td style={{ padding: '13px 14px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                      background: rec.transportNeeded ? '#e6f4ea' : '#fff5f5',
                      color: rec.transportNeeded ? '#276749' : '#c53030',
                    }}>
                      {rec.transportNeeded ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    {rec.transportNeeded ? (
                      <>
                        <div style={{ fontWeight: 600, color: '#2d3748' }}>{rec.routeName || '—'}</div>
                        <div style={{ fontSize: '11px', color: '#a0aec0' }}>{rec.stopName || '—'}</div>
                      </>
                    ) : <span style={{ color: '#a0aec0' }}>N/A</span>}
                  </td>
                  <td style={{ padding: '13px 14px', color: '#4a5568', whiteSpace: 'nowrap' }}>{rec.pickupTime || '—'}</td>
                  <td style={{ padding: '13px 14px', color: '#4a5568', whiteSpace: 'nowrap' }}>{rec.dropTime || '—'}</td>
                  <td style={{ padding: '13px 14px', color: '#2d3748', fontWeight: 600 }}>
                    {rec.fee != null ? Number(rec.fee).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                      ...(STATUS_COLORS[rec.status] || { bg: '#edf2f7', color: '#4a5568' }),
                      background: (STATUS_COLORS[rec.status] || {}).bg || '#edf2f7',
                    }}>
                      {rec.status}
                    </span>
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => setViewRecord(rec)} title="View Details" style={{ background: '#ebf8ff', border: 'none', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer' }}>
                        <span className="material-icons" style={{ fontSize: '15px', color: '#3182ce' }}>visibility</span>
                      </button>
                      <button onClick={() => openEdit(rec)} title="Edit" style={{ background: '#e6f4ea', border: 'none', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer' }}>
                        <span className="material-icons" style={{ fontSize: '15px', color: '#276749' }}>edit</span>
                      </button>
                      <button onClick={() => setDeleteId(rec.id)} title="Delete" style={{ background: '#fff5f5', border: 'none', borderRadius: '6px', padding: '5px 7px', cursor: 'pointer' }}>
                        <span className="material-icons" style={{ fontSize: '15px', color: '#c53030' }}>delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && filteredRecords.length > ITEMS_PER_PAGE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #edf2f7' }}>
            <span style={{ fontSize: '12px', color: '#718096' }}>
              Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredRecords.length)} of {filteredRecords.length}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '5px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: page === 1 ? '#f7fafc' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                ‹ Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ padding: '5px 12px', border: '1px solid', borderColor: page === p ? '#76C442' : '#e2e8f0', borderRadius: '6px', background: page === p ? '#76C442' : '#fff', color: page === p ? '#fff' : '#4a5568', cursor: 'pointer', fontSize: '13px', fontWeight: page === p ? 700 : 400 }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '5px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: page === totalPages ? '#f7fafc' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '760px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #edf2f7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-icons" style={{ color: '#76C442', fontSize: '22px' }}>directions_bus</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#2d3748' }}>
                    {editId ? 'Edit Transport Record' : 'New Transport Record'}
                  </h2>
                  <p style={{ margin: 0, fontSize: '12px', color: '#a0aec0' }}>Fill in the student transportation details below</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0' }}>
                <span className="material-icons">close</span>
              </button>
            </div>

            {/* Modal body */}
            <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>

              {/* ── Student Info ── */}
              <SectionTitle icon="person">Student Information</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <FormInput
                  label="Student ID" required
                  type="number" min="1"
                  value={form.studentId}
                  onChange={e => handleChange('studentId', e.target.value)}
                  error={errors.studentId}
                  placeholder="e.g. 1001"
                />
                <FormInput
                  label="Student Name" required
                  value={form.studentName}
                  onChange={e => handleChange('studentName', e.target.value)}
                  error={errors.studentName}
                  placeholder="Full name"
                />
                <FormInput
                  label="Class / Grade"
                  value={form.studentClass}
                  onChange={e => handleChange('studentClass', e.target.value)}
                  placeholder="e.g. 8-A"
                />
              </div>

              {/* ── Transport Toggle ── */}
              <SectionTitle icon="toggle_on">Transport Requirement</SectionTitle>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
                {['Yes', 'No'].map(opt => {
                  const isYes = opt === 'Yes';
                  const active = form.transportNeeded === isYes;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleChange('transportNeeded', isYes)}
                      style={{
                        flex: 1, padding: '12px', border: `2px solid ${active ? '#76C442' : '#e2e8f0'}`,
                        borderRadius: '10px', background: active ? '#f0faf0' : '#fafafa',
                        cursor: 'pointer', fontWeight: 700, fontSize: '14px',
                        color: active ? '#276749' : '#a0aec0', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      }}
                    >
                      <span className="material-icons" style={{ fontSize: '18px' }}>
                        {isYes ? 'directions_bus' : 'directions_walk'}
                      </span>
                      Transport {opt}
                    </button>
                  );
                })}
              </div>

              {/* ── Transport Details (conditional) ── */}
              {form.transportNeeded && (
                <>
                  {/* Locations */}
                  <SectionTitle icon="place">Pickup & Drop Locations</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <FormInput
                      label="Pickup Location" required
                      value={form.pickupLocation}
                      onChange={e => handleChange('pickupLocation', e.target.value)}
                      error={errors.pickupLocation}
                      placeholder="Enter pickup address"
                    />
                    <FormInput
                      label="Drop Location" required
                      value={form.dropLocation}
                      onChange={e => handleChange('dropLocation', e.target.value)}
                      error={errors.dropLocation}
                      placeholder="Enter drop address"
                    />
                  </div>

                  {/* Route & Stop */}
                  <SectionTitle icon="route">Bus Route & Stop</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <FormSelect
                      label="Bus Route" required
                      value={form.routeId}
                      onChange={e => handleChange('routeId', e.target.value)}
                      error={errors.routeId}
                    >
                      <option value="">Select a route...</option>
                      {routes.map(r => (
                        <option key={r.id} value={r.id}>{r.name} {r.area ? `— ${r.area}` : ''}</option>
                      ))}
                    </FormSelect>

                    <FormSelect
                      label="Bus Stop" required
                      value={form.stopId}
                      onChange={e => handleChange('stopId', e.target.value)}
                      error={errors.stopId}
                      disabled={!form.routeId}
                    >
                      <option value="">{form.routeId ? 'Select a stop...' : 'Select route first'}</option>
                      {filteredStops.map(s => (
                        <option key={s.id} value={s.id}>{s.name} {s.timing ? `(${s.timing})` : ''}</option>
                      ))}
                    </FormSelect>
                  </div>

                  {/* Timings */}
                  <SectionTitle icon="schedule">Timings</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <FormInput
                      label="Morning Pickup Time" required
                      type="time"
                      value={form.pickupTime}
                      onChange={e => handleChange('pickupTime', e.target.value)}
                      error={errors.pickupTime}
                    />
                    <FormInput
                      label="Afternoon Drop Time" required
                      type="time"
                      value={form.dropTime}
                      onChange={e => handleChange('dropTime', e.target.value)}
                      error={errors.dropTime}
                    />
                  </div>

                  {/* Fee */}
                  <SectionTitle icon="payments">Transport Fee</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <FormInput
                        label="Monthly Fee (₹)"
                        type="number" min="0" step="0.01"
                        value={form.fee}
                        onChange={e => handleChange('fee', e.target.value)}
                        placeholder="e.g. 1500.00"
                      />
                      {form.routeId && (() => {
                        const route = routes.find(r => String(r.id) === String(form.routeId));
                        return route?.distance ? (
                          <p style={{ fontSize: '11px', color: '#718096', marginTop: '4px' }}>
                            Route distance: <strong>{route.distance}</strong>
                          </p>
                        ) : null;
                      })()}
                    </div>
                    <FormSelect
                      label="Record Status"
                      value={form.status}
                      onChange={e => handleChange('status', e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </FormSelect>
                  </div>

                  {/* Emergency Contact */}
                  <SectionTitle icon="emergency">Emergency Contact</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <FormInput
                      label="Parent / Guardian Phone" required
                      type="tel"
                      value={form.emergencyContact}
                      onChange={e => handleChange('emergencyContact', e.target.value)}
                      error={errors.emergencyContact}
                      placeholder="10-digit mobile number"
                      maxLength={15}
                    />
                  </div>

                  {/* Notes */}
                  <SectionTitle icon="notes">Special Instructions</SectionTitle>
                  <FormTextarea
                    label="Notes (optional)"
                    value={form.notes}
                    onChange={e => handleChange('notes', e.target.value)}
                    placeholder="e.g. Child needs assistance boarding, allergic to dust, pick up from gate 2..."
                  />
                </>
              )}

              {/* Status when transport not needed */}
              {!form.transportNeeded && (
                <>
                  <SectionTitle icon="settings">Record Settings</SectionTitle>
                  <FormSelect
                    label="Record Status"
                    value={form.status}
                    onChange={e => handleChange('status', e.target.value)}
                    style={{ maxWidth: '200px' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </FormSelect>
                </>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px', borderTop: '1px solid #edf2f7', background: '#f7fafc' }}>
              <button onClick={() => setModalOpen(false)} style={{ padding: '9px 22px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', color: '#4a5568' }}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                style={{ padding: '9px 22px', border: 'none', borderRadius: '8px', background: saving ? '#9ae6b4' : '#76C442', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {saving && <span className="material-icons" style={{ fontSize: '15px', animation: 'spin 1s linear infinite' }}>sync</span>}
                {saving ? 'Saving...' : editId ? 'Update Record' : 'Create Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Detail Modal ── */}
      {viewRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #edf2f7', background: 'linear-gradient(135deg,#76C442 0%,#5ba832 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-icons" style={{ color: '#fff', fontSize: '22px' }}>person</span>
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff' }}>{viewRecord.studentName}</h2>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>ID: {viewRecord.studentId} {viewRecord.studentClass ? `· ${viewRecord.studentClass}` : ''}</p>
                </div>
              </div>
              <button onClick={() => setViewRecord(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: '#fff' }}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
              <DetailRow icon="directions_bus" label="Transport Required" value={viewRecord.transportNeeded ? 'Yes' : 'No'} highlight={viewRecord.transportNeeded} />
              {viewRecord.transportNeeded && (
                <>
                  <DetailRow icon="place" label="Pickup Location" value={viewRecord.pickupLocation} />
                  <DetailRow icon="flag" label="Drop Location" value={viewRecord.dropLocation} />
                  <DetailRow icon="route" label="Bus Route" value={viewRecord.routeName} />
                  <DetailRow icon="location_on" label="Bus Stop" value={viewRecord.stopName} />
                  <DetailRow icon="wb_sunny" label="Morning Pickup" value={viewRecord.pickupTime} />
                  <DetailRow icon="nights_stay" label="Afternoon Drop" value={viewRecord.dropTime} />
                  <DetailRow icon="payments" label="Monthly Fee" value={viewRecord.fee != null ? `₹${Number(viewRecord.fee).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Not set'} />
                  <DetailRow icon="phone" label="Emergency Contact" value={viewRecord.emergencyContact} />
                  {viewRecord.notes && <DetailRow icon="notes" label="Special Instructions" value={viewRecord.notes} />}
                </>
              )}
              <DetailRow icon="verified" label="Status" value={viewRecord.status} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 24px', borderTop: '1px solid #edf2f7' }}>
              <button onClick={() => { setViewRecord(null); openEdit(viewRecord); }}
                style={{ padding: '8px 18px', border: 'none', borderRadius: '8px', background: '#76C442', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icons" style={{ fontSize: '15px' }}>edit</span>
                Edit Record
              </button>
              <button onClick={() => setViewRecord(null)}
                style={{ padding: '8px 18px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', color: '#4a5568' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '32px', maxWidth: '420px', width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span className="material-icons" style={{ fontSize: '28px', color: '#e53e3e' }}>delete_forever</span>
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#2d3748' }}>Delete Record</h3>
            <p style={{ margin: '0 0 24px', color: '#718096', fontSize: '14px' }}>
              This transport record will be permanently deleted. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteId(null)}
                style={{ padding: '9px 22px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', color: '#4a5568' }}>
                Cancel
              </button>
              <button onClick={handleDelete}
                style={{ padding: '9px 22px', border: 'none', borderRadius: '8px', background: '#e53e3e', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Layout>
  );
}

// ─── Detail row helper ────────────────────────────────────────────────────────
function DetailRow({ icon, label, value, highlight }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f0f4f8' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0faf0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span className="material-icons" style={{ fontSize: '16px', color: '#76C442' }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: '11px', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ fontSize: '14px', color: highlight ? '#276749' : '#2d3748', fontWeight: highlight ? 700 : 500, marginTop: '2px' }}>
          {value || '—'}
        </div>
      </div>
    </div>
  );
}
