import React, { useState, useEffect, useCallback } from 'react';
import { fetchBuses, createBus, updateBus, deleteBus } from '../../../services/transportService';

const STATUS_COLORS = { Active: { bg: '#f0fff4', text: '#276749' }, Inactive: { bg: '#f7fafc', text: '#718096' }, Maintenance: { bg: '#fffaf0', text: '#c05621' } };

const EMPTY = { busNo: '', registrationNo: '', model: '', year: '', capacity: '40', driver: '', conductor: '', route: '', gpsDeviceId: '', insuranceNo: '', insuranceExpiry: '', status: 'Active' };

function Modal({ open, title, children, onClose, onSave, saving }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="modal-card" style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#2d3748' }}>{title}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', color: '#a0aec0' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px' }}>{children}</div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f4f8', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, color: '#4a5568' }}>Cancel</button>
          <button onClick={onSave} disabled={saving} style={{ padding: '9px 24px', background: saving ? '#a0aec0' : 'linear-gradient(135deg,#76C442,#5fa832)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, children, required }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 5 }}>{label}{required && <span style={{ color: '#e53e3e' }}> *</span>}</label>
    {children}
  </div>
);

const inp = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#2d3748', outline: 'none', boxSizing: 'border-box', background: '#fff' };

export default function BusManagement() {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchBuses().then(setBuses).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY); setEditTarget(null); setError(''); setModalOpen(true); };
  const openEdit = (b) => { setForm({ ...EMPTY, ...b, capacity: String(b.capacity || 40) }); setEditTarget(b); setError(''); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.busNo.trim()) { setError('Bus number is required.'); return; }
    setSaving(true); setError('');
    try {
      if (editTarget) await updateBus(editTarget.id, form);
      else await createBus(form);
      setModalOpen(false); load();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save bus.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await deleteBus(deleteId); load(); } catch { }
    setDeleteId(null);
  };

  const filtered = buses.filter(b => {
    const q = search.toLowerCase();
    const matchQ = !q || b.busNo?.toLowerCase().includes(q) || b.driver?.toLowerCase().includes(q) || b.route?.toLowerCase().includes(q);
    const matchS = statusFilter === 'All' || b.status === statusFilter;
    return matchQ && matchS;
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div style={{ padding: 28, background: '#f7fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1a202c' }}>Bus Management</h1>
          <div style={{ fontSize: 13, color: '#718096', marginTop: 2 }}>{buses.length} buses registered</div>
        </div>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg,#76C442,#5fa832)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          <span className="material-icons" style={{ fontSize: 18 }}>add</span>Add Bus
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'Total Buses', val: buses.length, color: '#3182ce', bg: '#ebf8ff', icon: 'directions_bus' },
          { label: 'Active', val: buses.filter(b => b.status === 'Active').length, color: '#38a169', bg: '#f0fff4', icon: 'check_circle' },
          { label: 'Maintenance', val: buses.filter(b => b.status === 'Maintenance').length, color: '#dd6b20', bg: '#fffaf0', icon: 'build' },
          { label: 'Total Capacity', val: buses.reduce((s, b) => s + (b.capacity || 0), 0), color: '#7c3aed', bg: '#faf5ff', icon: 'people' },
          { label: 'Occupied Seats', val: buses.reduce((s, b) => s + (b.currentStudents || 0), 0), color: '#e53e3e', bg: '#fff5f5', icon: 'person' },
        ].map(({ label, val, color, bg, icon }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-icons" style={{ fontSize: 22, color }}>{icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1a202c' }}>{val}</div>
              <div style={{ fontSize: 12, color: '#718096' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span className="material-icons" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#a0aec0' }}>search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by bus number, driver, route…" style={{ ...inp, paddingLeft: 36 }} />
        </div>
        {['All', 'Active', 'Inactive', 'Maintenance'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid', borderColor: statusFilter === s ? '#76C442' : '#e2e8f0', background: statusFilter === s ? '#f0fff4' : '#fff', color: statusFilter === s ? '#276749' : '#4a5568', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#a0aec0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#76C442', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Loading buses…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>directions_bus</span>
            {search || statusFilter !== 'All' ? 'No buses match the filters.' : 'No buses added yet.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f7fafc' }}>
                {['Bus No', 'Registration', 'Model', 'Driver', 'Route', 'Capacity', 'GPS Device', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#718096', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const sc = STATUS_COLORS[b.status] || STATUS_COLORS.Inactive;
                return (
                  <tr key={b.id} style={{ borderTop: '1px solid #f0f4f8' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#2d3748' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#ebf8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-icons" style={{ fontSize: 16, color: '#3182ce' }}>directions_bus</span>
                        </div>
                        {b.busNo}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#4a5568' }}>{b.registrationNo || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#4a5568' }}>{b.model || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#4a5568' }}>{b.driver || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#4a5568' }}>{b.route || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600, color: '#2d3748' }}>{b.currentStudents || 0}/{b.capacity}</span>
                        <div style={{ height: 5, width: 50, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${b.capacity > 0 ? Math.round(((b.currentStudents || 0) / b.capacity) * 100) : 0}%`, background: '#76C442', borderRadius: 5 }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: b.gpsDeviceId ? '#276749' : '#a0aec0', fontSize: 12 }}>
                      {b.gpsDeviceId ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-icons" style={{ fontSize: 14, color: '#38a169' }}>gps_fixed</span>{b.gpsDeviceId}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.text }}>{b.status}</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(b)} style={{ padding: '6px 12px', border: 'none', borderRadius: 7, background: '#ebf8ff', color: '#3182ce', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => setDeleteId(b.id)} style={{ padding: '6px 12px', border: 'none', borderRadius: 7, background: '#fff5f5', color: '#e53e3e', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} title={editTarget ? 'Edit Bus' : 'Add New Bus'} onClose={() => setModalOpen(false)} onSave={handleSave} saving={saving}>
        {error && <div style={{ padding: '10px 14px', background: '#fff5f5', borderRadius: 8, color: '#c53030', fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Field label="Bus Number" required><input style={inp} value={form.busNo} onChange={e => set('busNo', e.target.value)} placeholder="e.g. KA-01-AB-1234" /></Field>
          <Field label="Registration No"><input style={inp} value={form.registrationNo || ''} onChange={e => set('registrationNo', e.target.value)} placeholder="e.g. KA012345" /></Field>
          <Field label="Model"><input style={inp} value={form.model} onChange={e => set('model', e.target.value)} placeholder="e.g. Tata Starbus" /></Field>
          <Field label="Year"><input style={inp} value={form.year} onChange={e => set('year', e.target.value)} placeholder="e.g. 2022" /></Field>
          <Field label="Capacity" required><input style={inp} type="number" min="1" value={form.capacity} onChange={e => set('capacity', e.target.value)} /></Field>
          <Field label="Status">
            <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
              {['Active', 'Inactive', 'Maintenance'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Driver"><input style={inp} value={form.driver} onChange={e => set('driver', e.target.value)} placeholder="Driver name" /></Field>
          <Field label="Conductor"><input style={inp} value={form.conductor} onChange={e => set('conductor', e.target.value)} placeholder="Conductor name" /></Field>
          <Field label="Route"><input style={inp} value={form.route} onChange={e => set('route', e.target.value)} placeholder="Assigned route" /></Field>
          <Field label="GPS Device ID"><input style={inp} value={form.gpsDeviceId || ''} onChange={e => set('gpsDeviceId', e.target.value)} placeholder="e.g. GPS-001" /></Field>
          <Field label="Insurance No"><input style={inp} value={form.insuranceNo || ''} onChange={e => set('insuranceNo', e.target.value)} placeholder="Policy number" /></Field>
          <Field label="Insurance Expiry"><input style={inp} type="date" value={form.insuranceExpiry || ''} onChange={e => set('insuranceExpiry', e.target.value)} /></Field>
        </div>
      </Modal>

      {/* Delete Confirm */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-card" style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <span className="material-icons" style={{ fontSize: 44, color: '#e53e3e', display: 'block', marginBottom: 12 }}>delete_forever</span>
            <h3 style={{ margin: '0 0 8px', color: '#1a202c' }}>Delete Bus?</h3>
            <p style={{ margin: '0 0 22px', color: '#718096', fontSize: 14 }}>This action cannot be undone. All assignment data for this bus will be affected.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: '9px 22px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding: '9px 22px', background: '#e53e3e', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
