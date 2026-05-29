import React, { useState, useEffect } from 'react';
import { fetchDrivers, createDriver, updateDriver, deleteDriver, fetchBuses } from '../../../services/transportService';

const STATUS_COLORS = {
  Active: { bg: '#f0fff4', text: '#276749', border: '#c6f6d5' },
  Inactive: { bg: '#f7fafc', text: '#718096', border: '#e2e8f0' },
  'On Leave': { bg: '#fffaf0', text: '#c05621', border: '#feebc8' },
};

const EMPTY_FORM = {
  name: '', employeeId: '', licenseNo: '', licenseExpiry: '',
  phone: '', email: '', address: '', busId: '', busNo: '',
  status: 'Active', experience: '', emergencyContact: '', bloodGroup: '',
};

export default function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([fetchDrivers(), fetchBuses()])
      .then(([d, b]) => { setDrivers(d); setBuses(b); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = drivers.filter(d => {
    const matchSearch = !search || [d.name, d.employeeId, d.licenseNo, d.phone, d.busNo]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => { setForm(EMPTY_FORM); setEditDriver(null); setError(''); setShowModal(true); };
  const openEdit = (d) => {
    setForm({
      name: d.name || '', employeeId: d.employeeId || '', licenseNo: d.licenseNo || '',
      licenseExpiry: d.licenseExpiry || '', phone: d.phone || '', email: d.email || '',
      address: d.address || '', busId: d.busId || '', busNo: d.busNo || '',
      status: d.status || 'Active', experience: d.experience || '',
      emergencyContact: d.emergencyContact || '', bloodGroup: d.bloodGroup || '',
    });
    setEditDriver(d);
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Driver name is required.'); return; }
    if (!form.licenseNo.trim()) { setError('License number is required.'); return; }
    setSaving(true); setError('');
    try {
      if (editDriver) await updateDriver(editDriver.id, form);
      else await createDriver(form);
      setShowModal(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to save driver.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteDriver(deleteTarget.id); setDeleteTarget(null); load(); }
    catch { setDeleteTarget(null); }
    finally { setDeleting(false); }
  };

  const activeCount = drivers.filter(d => d.status === 'Active').length;
  const onLeaveCount = drivers.filter(d => d.status === 'On Leave').length;
  const inactiveCount = drivers.filter(d => d.status === 'Inactive').length;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#76C442', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: 28, background: '#f7fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#38a169,#276749)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-icons" style={{ color: '#fff', fontSize: 24 }}>person</span>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a202c' }}>Driver Management</h1>
            <div style={{ fontSize: 13, color: '#718096' }}>Manage bus drivers, licenses, and assignments</div>
          </div>
        </div>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#76C442,#5fa832)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          <span className="material-icons" style={{ fontSize: 18 }}>add</span> Add Driver
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Drivers', value: drivers.length, color: '#3182ce', bg: '#ebf8ff', icon: 'group' },
          { label: 'Active', value: activeCount, color: '#38a169', bg: '#f0fff4', icon: 'check_circle' },
          { label: 'On Leave', value: onLeaveCount, color: '#dd6b20', bg: '#fffaf0', icon: 'event_busy' },
          { label: 'Inactive', value: inactiveCount, color: '#718096', bg: '#f7fafc', icon: 'cancel' },
          { label: 'Assigned to Bus', value: drivers.filter(d => d.busId).length, color: '#7c3aed', bg: '#faf5ff', icon: 'directions_bus' },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-icons" style={{ fontSize: 22, color }}>{icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1a202c' }}>{value}</div>
              <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span className="material-icons" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#a0aec0' }}>search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search drivers..."
            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['All', 'Active', 'Inactive', 'On Leave'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: statusFilter === s ? '#76C442' : '#fff',
                color: statusFilter === s ? '#fff' : '#4a5568',
                borderColor: statusFilter === s ? '#76C442' : '#e2e8f0' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f7fafc' }}>
                {['Driver', 'Employee ID', 'License', 'Expiry', 'Phone', 'Bus Assigned', 'Experience', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#718096', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 48, textAlign: 'center', color: '#a0aec0' }}>
                  <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>person_off</span>
                  No drivers found.
                </td></tr>
              ) : filtered.map(d => {
                const sc = STATUS_COLORS[d.status] || STATUS_COLORS.Inactive;
                return (
                  <tr key={d.id} style={{ borderTop: '1px solid #f0f4f8' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#38a169,#276749)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                          {(d.name || 'D').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#2d3748' }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: '#a0aec0' }}>{d.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#4a5568' }}>{d.employeeId || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#4a5568', fontFamily: 'monospace' }}>{d.licenseNo || '—'}</td>
                    <td style={{ padding: '12px 16px', color: d.licenseExpiry && new Date(d.licenseExpiry) < new Date() ? '#e53e3e' : '#4a5568' }}>{d.licenseExpiry || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#4a5568' }}>{d.phone || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#4a5568' }}>
                      {d.busNo ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-icons" style={{ fontSize: 14, color: '#3182ce' }}>directions_bus</span>
                          {d.busNo}
                        </span>
                      ) : <span style={{ color: '#a0aec0' }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#4a5568' }}>{d.experience ? `${d.experience} yrs` : '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{d.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(d)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #bee3f8', background: '#ebf8ff', color: '#2b6cb0', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-icons" style={{ fontSize: 14 }}>edit</span> Edit
                        </button>
                        <button onClick={() => setDeleteTarget(d)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #fed7d7', background: '#fff5f5', color: '#c53030', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-icons" style={{ fontSize: 14 }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f4f8', fontSize: 12, color: '#a0aec0' }}>
          Showing {filtered.length} of {drivers.length} drivers
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="modal-card" style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1a202c' }}>{editDriver ? 'Edit Driver' : 'Add New Driver'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#718096' }}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} style={{ padding: 24 }}>
              {error && <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Driver Name *', key: 'name', type: 'text', placeholder: 'Full name' },
                  { label: 'Employee ID', key: 'employeeId', type: 'text', placeholder: 'EMP-001' },
                  { label: 'License Number *', key: 'licenseNo', type: 'text', placeholder: 'License no.' },
                  { label: 'License Expiry', key: 'licenseExpiry', type: 'date' },
                  { label: 'Phone', key: 'phone', type: 'tel', placeholder: '9876543210' },
                  { label: 'Email', key: 'email', type: 'email', placeholder: 'driver@school.com' },
                  { label: 'Experience (years)', key: 'experience', type: 'number', placeholder: '5' },
                  { label: 'Blood Group', key: 'bloodGroup', type: 'text', placeholder: 'O+' },
                  { label: 'Emergency Contact', key: 'emergencyContact', type: 'tel', placeholder: '9876543210' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568' }}>{label}</label>
                    <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                      placeholder={placeholder}
                      style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                  </div>
                ))}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}>
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>On Leave</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Assign Bus</label>
                  <select value={form.busId} onChange={e => {
                    const b = buses.find(b => String(b.id) === e.target.value);
                    setForm({ ...form, busId: e.target.value, busNo: b?.busNo || '' });
                  }} style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}>
                    <option value="">— Unassigned —</option>
                    {buses.map(b => <option key={b.id} value={b.id}>{b.busNo} {b.model ? `(${b.model})` : ''}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Address</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Driver's residential address" rows={2}
                  style={{ padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#4a5568', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#76C442,#5fa832)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Saving...' : editDriver ? 'Update Driver' : 'Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="modal-card" style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span className="material-icons" style={{ color: '#e53e3e', fontSize: 28 }}>delete</span>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#1a202c' }}>Delete Driver?</h3>
            <p style={{ margin: '0 0 24px', color: '#718096', fontSize: 14 }}>This will permanently delete <strong>{deleteTarget.name}</strong>. This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#4a5568', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#e53e3e,#c53030)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
