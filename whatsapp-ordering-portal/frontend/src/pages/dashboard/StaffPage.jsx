import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const ROLES = [
  { key: 'manager',  label: 'Manager',          desc: 'Full access except billing' },
  { key: 'cashier',  label: 'Cashier',           desc: 'Process orders and payments' },
  { key: 'kitchen',  label: 'Kitchen Staff',     desc: 'View and update order status' },
  { key: 'delivery', label: 'Delivery Driver',   desc: 'View and mark orders delivered' },
  { key: 'support',  label: 'Customer Support',  desc: 'View orders and customers' },
];

const ROLE_COLORS = {
  manager:  'badge-info',
  cashier:  'badge-success',
  kitchen:  'badge-warning',
  delivery: 'badge-neutral',
  support:  'badge-neutral',
  owner:    'badge-danger',
};

export default function StaffPage() {
  const [staff, setStaff]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ name: '', email: '', role: 'cashier' });
  const [errors, setErrors]     = useState({});
  const [toast, setToast]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff');
      setStaff(res.data.data || []);
    } catch { setStaff([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const validate = () => {
    const e = {};
    if (!form.name.trim())                                        e.name = 'Required';
    if (!form.email.trim())                                       e.email = 'Required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))  e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleInvite = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await api.post('/staff/invite', form);
      setToast(`Invitation sent to ${form.email}`);
      setShowForm(false);
      setForm({ name: '', email: '', role: 'cashier' });
      load();
    } catch (err) {
      setToast(err.response?.data?.message || 'Failed to invite');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 4000);
    }
  };

  const removeStaff = async (id, name) => {
    if (!window.confirm(`Remove ${name} from your team?`)) return;
    try {
      await api.delete(`/staff/${id}`);
      setStaff((s) => s.filter((m) => m.staffId !== id));
    } catch {}
  };

  return (
    <div className="page-shell">
      {toast && <div className="toast toast-success">{toast}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">Invite team members and assign roles with granular permissions.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Invite Staff</button>
      </div>

      {showForm && (
        <div className="card form-card">
          <h3 className="form-card-title">Invite Team Member</h3>
          <p className="form-card-desc">They'll receive an email invitation to join your business dashboard.</p>
          <div className="form-grid">
            <div className="field">
              <label className="label">Full Name</label>
              <input className="input" placeholder="Priya Patel" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>
            <div className="field">
              <label className="label">Email Address</label>
              <input className="input" type="email" placeholder="priya@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>
            <div className="field">
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {ROLES.map((r) => (
                  <option key={r.key} value={r.key}>{r.label} — {r.desc}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleInvite} disabled={saving}>
              {saving ? 'Sending…' : '📧 Send Invitation'}
            </button>
          </div>
        </div>
      )}

      {/* Roles reference */}
      <div className="roles-grid">
        {ROLES.map((r) => (
          <div key={r.key} className="role-card">
            <span className={`badge ${ROLE_COLORS[r.key]}`}>{r.label}</span>
            <p className="role-desc">{r.desc}</p>
          </div>
        ))}
      </div>

      {loading ? <div className="page-loader">Loading…</div> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr><td colSpan={6} className="table-empty">No staff members yet. Invite your first team member!</td></tr>
              ) : staff.map((m) => (
                <tr key={m.staffId}>
                  <td>
                    <div className="staff-cell">
                      <div className="staff-avatar">{(m.name || 'S')[0].toUpperCase()}</div>
                      <span>{m.name}</span>
                    </div>
                  </td>
                  <td className="text-muted">{m.email}</td>
                  <td><span className={`badge ${ROLE_COLORS[m.role] || 'badge-neutral'}`}>{m.role}</span></td>
                  <td><span className={`badge ${m.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{m.status || 'pending'}</span></td>
                  <td className="text-muted">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <button className="btn btn-danger btn-xs" onClick={() => removeStaff(m.staffId, m.name)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
