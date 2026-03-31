import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import { generateRandomPassword } from '../../utils/passwordGenerator';

const EMPTY_FORM = () => ({
  name: '', email: '', mobile: '', password: generateRandomPassword(),
  relation: '', occupation: '', address: '', alternateMobile: '',
});

const inputStyle = (err) => ({
  width: '100%', padding: '9px 12px', fontSize: '13px', fontFamily: 'Poppins, sans-serif',
  border: `1.5px solid ${err ? '#e53e3e' : '#e2e8f0'}`, borderRadius: '8px',
  outline: 'none', boxSizing: 'border-box', color: '#2d3748', background: '#fff',
});
const labelStyle = { fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '5px' };
const errStyle   = { fontSize: '11px', color: '#e53e3e', marginTop: '4px' };

function CredentialCard({ label, value, mono }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{ background: '#f7fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#a0aec0', fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#2d3748', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
      </div>
      <button onClick={copy} title="Copy" style={{ border: 'none', background: copied ? '#f0fff4' : '#e2e8f0', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: copied ? '#76C442' : '#718096', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, fontFamily: 'Poppins, sans-serif', flexShrink: 0 }}>
        <span className="material-icons" style={{ fontSize: 15 }}>{copied ? 'check' : 'content_copy'}</span>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export default function Parents() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [parents,      setParents]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const [showModal,    setShowModal]    = useState(false);
  const [editParent,   setEditParent]   = useState(null);
  const [showView,     setShowView]     = useState(false);
  const [viewParent,   setViewParent]   = useState(null);
  const [showCred,     setShowCred]     = useState(false);
  const [newCred,      setNewCred]      = useState(null);
  const [showReset,    setShowReset]    = useState(false);
  const [resetTarget,  setResetTarget]  = useState(null);
  const [resetPwd,     setResetPwd]     = useState('');
  const [deleteId,     setDeleteId]     = useState(null);

  const [form,   setForm]   = useState(EMPTY_FORM());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadParents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getParents();
      setParents(res.data?.data ?? []);
    } catch {
      setParents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadParents(); }, [loadParents]);

  const filtered = parents.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (p.name   || '').toLowerCase().includes(q) ||
      (p.email  || '').toLowerCase().includes(q) ||
      (p.mobile || '').includes(q);
    const status = (p.isActive ?? true) ? 'Active' : 'Inactive';
    const matchStatus = filterStatus === 'All' || status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getInitials = (name) =>
    (name || 'P').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.mobile && !/^\d{10}$/.test(form.mobile)) e.mobile = 'Mobile must be 10 digits';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editParent) {
        await adminAPI.updateParent(editParent.id, {
          name:            form.name,
          mobile:          form.mobile,
          relation:        form.relation,
          occupation:      form.occupation,
          address:         form.address,
          alternateMobile: form.alternateMobile,
        });
        showToast('Parent updated successfully');
        setShowModal(false);
        setEditParent(null);
        setForm(EMPTY_FORM());
        setErrors({});
        loadParents();
      } else {
        const res = await adminAPI.createParent({
          name:            form.name,
          email:           form.email,
          mobile:          form.mobile,
          password:        form.password,
          relation:        form.relation,
          occupation:      form.occupation,
          address:         form.address,
          alternateMobile: form.alternateMobile,
        });
        const result = res.data?.data;
        setShowModal(false);
        setForm(EMPTY_FORM());
        setErrors({});
        setNewCred({ name: result.name, email: result.email, password: result.generatedPassword || form.password });
        setShowCred(true);
        loadParents();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save parent', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p) => {
    setEditParent(p);
    setForm({
      name: p.name, email: p.email, mobile: p.mobile || '', password: '',
      relation: p.relation || '', occupation: p.occupation || '',
      address: p.address || '', alternateMobile: p.alternateMobile || '',
    });
    setErrors({});
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await adminAPI.deleteParent(deleteId);
      showToast('Parent deleted', 'warning');
      setDeleteId(null);
      loadParents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete parent', 'error');
    }
  };

  const handleToggleStatus = async (p) => {
    try {
      await adminAPI.updateParent(p.id, { isActive: !(p.isActive ?? true) });
      showToast(`Parent ${!(p.isActive ?? true) ? 'activated' : 'deactivated'}`);
      loadParents();
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleReset = async () => {
    if (!resetPwd.trim() || resetPwd.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    try {
      await adminAPI.resetParentPassword(resetTarget.id, resetPwd);
      showToast('Password reset successfully');
      setShowReset(false);
      setResetTarget(null);
      setResetPwd('');
      loadParents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Reset failed', 'error');
    }
  };

  const stats = {
    total:    parents.length,
    active:   parents.filter(p => p.isActive ?? true).length,
    inactive: parents.filter(p => !(p.isActive ?? true)).length,
  };

  return (
    <Layout pageTitle="Parents">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Parents</h1>
          <p>Manage parent accounts and login credentials</p>
        </div>
        <button className="btn-add" onClick={() => { setEditParent(null); setForm(EMPTY_FORM()); setErrors({}); setShowModal(true); }}>
          <span className="material-icons">add</span> Add Parent
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Parents', value: stats.total,    color: '#76C442', icon: 'family_restroom' },
          { label: 'Active',        value: stats.active,   color: '#3182ce', icon: 'check_circle' },
          { label: 'Inactive',      value: stats.inactive, color: '#e53e3e', icon: 'cancel' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: c.color + '18' }}>
              <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="data-table-card">
        <div className="search-filter-bar">
          <div className="search-input-wrapper">
            <span className="material-icons">search</span>
            <input type="text" className="search-input" placeholder="Search parents..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Parent</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state" style={{ padding: '40px' }}>
                    <span className="material-icons" style={{ fontSize: 48, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>family_restroom</span>
                    <h3 style={{ color: '#a0aec0' }}>No parents found</h3>
                    <p style={{ color: '#cbd5e0' }}>Click "Add Parent" to create one.</p>
                  </div>
                </td></tr>
              ) : filtered.map(p => {
                const isActive = p.isActive ?? true;
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#ed8936,#dd6b20)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                          {getInitials(p.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#2d3748' }}>{p.name}</div>
                          <div style={{ fontSize: '11px', color: '#a0aec0' }}>{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '12px', color: '#718096' }}>
                      {p.mobile ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-icons" style={{ fontSize: '13px', color: '#a0aec0' }}>phone</span>
                          {p.mobile}
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <button onClick={() => handleToggleStatus(p)} style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer', background: isActive ? '#f0fff4' : '#fff5f5', color: isActive ? '#76C442' : '#e53e3e' }}>
                        {isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={{ fontSize: '12px', color: '#718096' }}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn action-btn-view" title="View" onClick={() => { setViewParent(p); setShowView(true); }}>
                          <span className="material-icons">visibility</span>
                        </button>
                        {isSuperAdmin && (
                          <button title="Reset Password" onClick={() => { setResetTarget(p); setResetPwd(''); setShowReset(true); }}
                            style={{ padding: '6px', border: '1.5px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', background: '#fff' }}>
                            <span className="material-icons" style={{ fontSize: '16px', color: '#718096' }}>lock_reset</span>
                          </button>
                        )}
                        <button className="action-btn action-btn-edit" title="Edit" onClick={() => handleEdit(p)}>
                          <span className="material-icons">edit</span>
                        </button>
                        <button className="action-btn action-btn-delete" title="Delete" onClick={() => setDeleteId(p.id)}>
                          <span className="material-icons">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-container" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">{editParent ? 'Edit Parent' : 'Add New Parent'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><span className="material-icons">close</span></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Full Name *</label>
                    <input style={inputStyle(errors.name)} placeholder="Parent's full name"
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    {errors.name && <p style={errStyle}>{errors.name}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address {editParent ? '' : '*'}</label>
                    <input type="email" style={inputStyle(errors.email)} placeholder="parent@email.com"
                      value={form.email} disabled={!!editParent}
                      onChange={e => setForm({ ...form, email: e.target.value })} />
                    {errors.email && <p style={errStyle}>{errors.email}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>Mobile Number</label>
                    <input type="tel" style={inputStyle(errors.mobile)} placeholder="10-digit mobile" maxLength={10}
                      value={form.mobile}
                      onChange={e => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                    {errors.mobile && <p style={errStyle}>{errors.mobile}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>Relation</label>
                    <select style={inputStyle(false)} value={form.relation}
                      onChange={e => setForm({ ...form, relation: e.target.value })}>
                      <option value="">Select relation</option>
                      <option>Father</option>
                      <option>Mother</option>
                      <option>Guardian</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Occupation</label>
                    <input style={inputStyle(false)} placeholder="e.g. Engineer, Teacher"
                      value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} />
                  </div>
                  <div>
                    <label style={labelStyle}>Alternate Mobile</label>
                    <input type="tel" style={inputStyle(false)} placeholder="Alternate 10-digit number" maxLength={10}
                      value={form.alternateMobile}
                      onChange={e => setForm({ ...form, alternateMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Address</label>
                    <textarea style={{ ...inputStyle(false), resize: 'vertical', minHeight: '68px' }}
                      placeholder="Full residential address"
                      value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                  </div>
                  {!editParent && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Auto-Generated Password</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ flex: 1, padding: '9px 14px', background: '#f0fff4', border: '1.5px solid #76C442', borderRadius: '8px', fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, color: '#276749', letterSpacing: '0.1em' }}>
                          {form.password}
                        </div>
                        <button type="button" title="Regenerate password"
                          onClick={() => setForm({ ...form, password: generateRandomPassword() })}
                          style={{ padding: '8px 12px', border: '1.5px solid #76C442', borderRadius: '8px', background: '#f0fff4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#276749', fontWeight: 600, fontSize: '12px', fontFamily: 'Poppins, sans-serif', flexShrink: 0 }}>
                          <span className="material-icons" style={{ fontSize: '16px' }}>refresh</span>
                          Regenerate
                        </button>
                      </div>
                      <p style={{ fontSize: '11px', color: '#718096', marginTop: '5px' }}>This password is auto-generated. You can regenerate it before saving.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => { setShowModal(false); setEditParent(null); setForm(EMPTY_FORM()); setErrors({}); }}
                  style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{ padding: '10px 24px', background: saving ? '#a0aec0' : '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : editParent ? 'Update Parent' : 'Create Parent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCred && newCred && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 460 }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg,#ed8936,#dd6b20)', borderRadius: '12px 12px 0 0' }}>
              <span className="modal-title" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-icons">check_circle</span> Parent Created Successfully
              </span>
              <button className="modal-close" onClick={() => setShowCred(false)} style={{ color: '#fff' }}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: '#4a5568', margin: '0 0 8px' }}>
                Share these login credentials with <strong>{newCred.name}</strong>.
              </p>
              <CredentialCard label="Name"             value={newCred.name} />
              <CredentialCard label="Email (Login ID)" value={newCred.email} />
              <CredentialCard label="Password"         value={newCred.password} mono />
              <div style={{ padding: '10px 12px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px', fontSize: '12px', color: '#c53030', display: 'flex', gap: '6px' }}>
                <span className="material-icons" style={{ fontSize: '16px', flexShrink: 0 }}>warning</span>
                This password will not be visible again after closing. Copy it now.
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowCred(false)} style={{ padding: '10px 28px', background: '#ed8936', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showView && viewParent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowView(false)}>
          <div className="modal-container" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span className="modal-title">Parent Details</span>
              <button className="modal-close" onClick={() => setShowView(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', background: '#fffaf0', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#ed8936,#dd6b20)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px', fontWeight: 700, flexShrink: 0 }}>
                  {getInitials(viewParent.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748' }}>{viewParent.name}</div>
                  <div style={{ fontSize: '12px', color: '#718096' }}>{viewParent.email}</div>
                  {viewParent.mobile && <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>{viewParent.mobile}</div>}
                  <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, background: (viewParent.isActive ?? true) ? '#f0fff4' : '#fff5f5', color: (viewParent.isActive ?? true) ? '#76C442' : '#e53e3e', display: 'inline-block', marginTop: '4px' }}>
                    {(viewParent.isActive ?? true) ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'Role',             value: 'Parent' },
                  { label: 'Relation',         value: viewParent.relation || '—' },
                  { label: 'Occupation',       value: viewParent.occupation || '—' },
                  { label: 'Alternate Mobile', value: viewParent.alternateMobile || '—' },
                  { label: 'First Login',      value: viewParent.firstLogin ? 'Yes (pending)' : 'Completed' },
                  { label: 'Joined',           value: viewParent.createdAt ? new Date(viewParent.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                ].map(item => (
                  <div key={item.label} style={{ background: '#f7fafc', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', marginBottom: '3px' }}>{item.label}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748' }}>{item.value}</div>
                  </div>
                ))}
                {viewParent.address && (
                  <div style={{ gridColumn: '1 / -1', background: '#f7fafc', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', marginBottom: '3px' }}>Address</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748' }}>{viewParent.address}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowView(false)} style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Close</button>
              <button onClick={() => { setShowView(false); handleEdit(viewParent); }} style={{ padding: '10px 20px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Edit Parent</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showReset && resetTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowReset(false)}>
          <div className="modal-container" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span className="modal-title">Reset Password — {resetTarget.name}</span>
              <button className="modal-close" onClick={() => setShowReset(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <label style={labelStyle}>New Password</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" style={{ ...inputStyle(false), flex: 1 }} placeholder="Enter new password"
                  value={resetPwd} onChange={e => setResetPwd(e.target.value)} />
                <button type="button" onClick={() => setResetPwd(generateRandomPassword())}
                  style={{ padding: '0 10px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#f7fafc', cursor: 'pointer', flexShrink: 0 }}>
                  <span className="material-icons" style={{ fontSize: '18px', color: '#76C442' }}>auto_fix_high</span>
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowReset(false)} style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleReset} style={{ padding: '10px 24px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Reset Password</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <span className="modal-title">Confirm Delete</span>
              <button className="modal-close" onClick={() => setDeleteId(null)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: '14px', color: '#4a5568', margin: 0 }}>
                Are you sure you want to delete this parent? This will also remove their login account. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteId(null)} style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding: '10px 24px', background: '#e53e3e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
