import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { salaryAPI } from '../../services/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const currentYear = new Date().getFullYear();
const YEARS = [String(currentYear - 1), String(currentYear), String(currentYear + 1)];

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusBadge = (s) => {
  const map   = { PAID: 'success', PENDING: 'secondary', PROCESSING: 'warning text-dark' };
  const label = { PAID: 'Paid',    PENDING: 'Unpaid',    PROCESSING: 'Partial' };
  return <span className={`badge bg-${map[s] || 'secondary'}`}>{label[s] || s}</span>;
};

export default function Salaries() {
  const [tab, setTab] = useState('salaries');
  const [records, setRecords]   = useState([]);
  const [payments, setPayments] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null);

  const [selMonth, setSelMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selYear,  setSelYear]  = useState(String(currentYear));
  const [search,   setSearch]   = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Modals
  const [editModal,    setEditModal]    = useState(null); // salary record
  const [leavesModal,  setLeavesModal]  = useState(null); // salary record
  const [payModal,     setPayModal]     = useState(null); // salary record
  const [addModal,     setAddModal]     = useState(false);
  const [holidayModal, setHolidayModal] = useState(false);
  const [slipModal,    setSlipModal]    = useState(null);

  // Forms
  const [editForm,    setEditForm]    = useState({});
  const [leavesForm,  setLeavesForm]  = useState({ leavesTaken: 0 });
  const [payForm,     setPayForm]     = useState({ amount: '', paymentMode: 'Cash', receiptNumber: '', remarks: '' });
  const [addForm,     setAddForm]     = useState({ staffName: '', role: '', department: '', basic: '' });
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', recurring: false });
  const [payHistory,  setPayHistory]  = useState([]);
  const [saving, setSaving] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salaryAPI.getAll({ month: selMonth, year: selYear });
      setRecords(res.data?.data || []);
    } catch { showToast('Failed to load salary records', 'error'); }
    finally { setLoading(false); }
  }, [selMonth, selYear, showToast]);

  const loadPayments = useCallback(async () => {
    try {
      const res = await salaryAPI.getAllPayments();
      setPayments(res.data?.data || []);
    } catch { showToast('Failed to load payment history', 'error'); }
  }, [showToast]);

  const loadHolidays = useCallback(async () => {
    try {
      const res = await salaryAPI.getHolidays();
      setHolidays(res.data?.data || []);
    } catch { showToast('Failed to load holidays', 'error'); }
  }, [showToast]);

  useEffect(() => { loadRecords(); }, [loadRecords]);
  useEffect(() => { if (tab === 'payments') loadPayments(); }, [tab, loadPayments]);
  useEffect(() => { if (tab === 'holidays') loadHolidays(); }, [tab, loadHolidays]);

  const filtered = useMemo(() => records.filter(r => {
    const matchSearch = !search || r.staffName?.toLowerCase().includes(search.toLowerCase()) || r.department?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || r.status === filterStatus;
    return matchSearch && matchStatus;
  }), [records, search, filterStatus]);

  const stats = useMemo(() => ({
    total: records.length,
    paid: records.filter(r => r.status === 'PAID').length,
    partial: records.filter(r => r.status === 'PROCESSING').length,
    unpaid: records.filter(r => r.status === 'PENDING').length,
    totalCalc: records.reduce((s, r) => s + Number(r.calculatedSalary || 0), 0),
    totalPaid: records.reduce((s, r) => s + Number(r.paidAmount || 0), 0),
  }), [records]);

  // ── ADD SALARY ────────────────────────────────────────────────────────────

  const handleAddSave = async () => {
    if (!addForm.staffName.trim()) { showToast('Staff name is required', 'error'); return; }
    setSaving(true);
    try {
      await salaryAPI.create({ ...addForm, month: selMonth, year: selYear });
      showToast('Salary record created');
      setAddModal(false);
      setAddForm({ staffName: '', role: '', department: '', basic: '' });
      loadRecords();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to create record', 'error');
    } finally { setSaving(false); }
  };

  // ── EDIT SALARY ───────────────────────────────────────────────────────────

  const openEdit = (r) => { setEditForm({ ...r }); setEditModal(r); };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      await salaryAPI.update(editModal.id, editForm);
      showToast('Salary updated');
      setEditModal(null);
      loadRecords();
    } catch { showToast('Failed to update salary', 'error'); }
    finally { setSaving(false); }
  };

  // ── LEAVES ────────────────────────────────────────────────────────────────

  const openLeaves = (r) => {
    setLeavesForm({ leavesTaken: r.leavesTaken || 0 });
    setLeavesModal(r);
  };

  const handleLeavesSave = async () => {
    setSaving(true);
    try {
      await salaryAPI.updateLeaves(leavesModal.id, { leavesTaken: Number(leavesForm.leavesTaken) });
      showToast('Leaves updated');
      setLeavesModal(null);
      loadRecords();
    } catch { showToast('Failed to update leaves', 'error'); }
    finally { setSaving(false); }
  };

  // ── COLLECT PAYMENT ───────────────────────────────────────────────────────

  const openPay = async (r) => {
    setPayForm({ amount: '', paymentMode: 'Cash', receiptNumber: '', remarks: '' });
    setPayModal(r);
    try {
      const res = await salaryAPI.getPayments(r.id);
      setPayHistory(res.data?.data || []);
    } catch { setPayHistory([]); }
  };

  const handlePayCollect = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) { showToast('Enter a valid amount', 'error'); return; }
    setSaving(true);
    try {
      await salaryAPI.collectPayment(payModal.id, {
        amount: Number(payForm.amount),
        paymentMode: payForm.paymentMode,
        receiptNumber: payForm.receiptNumber || undefined,
        remarks: payForm.remarks || undefined,
      });
      showToast('Payment collected successfully');
      setPayModal(null);
      loadRecords();
      if (tab === 'payments') loadPayments();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to collect payment', 'error');
    } finally { setSaving(false); }
  };

  // ── HOLIDAYS ──────────────────────────────────────────────────────────────

  const handleAddHoliday = async () => {
    if (!holidayForm.name.trim() || !holidayForm.date) { showToast('Name and date are required', 'error'); return; }
    setSaving(true);
    try {
      await salaryAPI.addHoliday(holidayForm);
      showToast('Holiday added');
      setHolidayModal(false);
      setHolidayForm({ name: '', date: '', recurring: false });
      loadHolidays();
    } catch { showToast('Failed to add holiday', 'error'); }
    finally { setSaving(false); }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Delete this holiday?')) return;
    try {
      await salaryAPI.deleteHoliday(id);
      showToast('Holiday deleted');
      loadHolidays();
    } catch { showToast('Failed to delete holiday', 'error'); }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="fw-bold mb-0">Salaries</h4>
          <small className="text-muted">Attendance-based salary management</small>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {tab === 'salaries' && (
            <>
              <select className="form-select form-select-sm" value={selMonth} onChange={e => setSelMonth(e.target.value)} style={{ width: 130 }}>
                {MONTHS.map(m => <option key={m}>{m}</option>)}
              </select>
              <select className="form-select form-select-sm" value={selYear} onChange={e => setSelYear(e.target.value)} style={{ width: 90 }}>
                {YEARS.map(y => <option key={y}>{y}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" onClick={() => setAddModal(true)}>
                <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>add</span>Add Staff
              </button>
            </>
          )}
          {tab === 'holidays' && (
            <button className="btn btn-primary btn-sm" onClick={() => setHolidayModal(true)}>
              <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>add</span>Add Holiday
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        {[['salaries','groups','Staff Salaries'],['payments','receipt_long','Payment History'],['holidays','event_busy','Holidays']].map(([key, icon, label]) => (
          <li className="nav-item" key={key}>
            <button className={`nav-link d-flex align-items-center gap-1 ${tab === key ? 'active fw-semibold' : ''}`} onClick={() => setTab(key)}>
              <span className="material-icons" style={{ fontSize: 16 }}>{icon}</span>{label}
            </button>
          </li>
        ))}
      </ul>

      {/* ── TAB: STAFF SALARIES ─────────────────────────────────────────── */}
      {tab === 'salaries' && (
        <>
          {/* Stats */}
          <div className="row g-3 mb-3">
            {[
              { label: 'Total Staff', value: stats.total, icon: 'groups', color: '#4361ee' },
              { label: 'Total Payable', value: fmt(stats.totalCalc), icon: 'account_balance_wallet', color: '#76C442' },
              { label: 'Paid', value: `${stats.paid} staff`, icon: 'check_circle', color: '#28a745' },
              { label: 'Unpaid / Partial', value: `${stats.unpaid + stats.partial}`, icon: 'pending', color: '#ffc107' },
            ].map((s, i) => (
              <div className="col-6 col-md-3" key={i}>
                <div className="card border-0 shadow-sm">
                  <div className="card-body d-flex align-items-center gap-3 p-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, background: s.color + '20' }}>
                      <span className="material-icons" style={{ color: s.color, fontSize: 22 }}>{s.icon}</span>
                    </div>
                    <div>
                      <div className="fw-bold fs-5">{s.value}</div>
                      <div className="text-muted small">{s.label}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body p-3">
              <div className="row g-2 align-items-center">
                <div className="col-md-5">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white"><span className="material-icons" style={{ fontSize: 16 }}>search</span></span>
                    <input type="text" className="form-control" placeholder="Search by name or department…" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                </div>
                <div className="col-md-3">
                  <select className="form-select form-select-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="All">All Status</option>
                    <option value="PAID">Paid</option>
                    <option value="PROCESSING">Partial</option>
                    <option value="PENDING">Unpaid</option>
                  </select>
                </div>
                <div className="col-md-4 text-end">
                  <span className="text-muted small">{filtered.length} records · {selMonth} {selYear}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border spinner-border-sm me-2" />Loading…
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">#</th>
                        <th>Staff</th>
                        <th>Department</th>
                        <th>Working Days</th>
                        <th>Leaves</th>
                        <th>Worked Days</th>
                        <th>Gross Salary</th>
                        <th>Calculated</th>
                        <th>Paid</th>
                        <th>Due</th>
                        <th>Status</th>
                        <th className="pe-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => {
                        const gross = Number(r.basic||0)+Number(r.hra||0)+Number(r.da||0)+Number(r.medical||0);
                        const due   = Math.max(Number(r.calculatedSalary||0) - Number(r.paidAmount||0), 0);
                        return (
                          <tr key={r.id}>
                            <td className="ps-3 text-muted">{i+1}</td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: 34, height: 34, background: '#4361ee', fontSize: 12, flexShrink: 0 }}>
                                  {(r.staffName||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-medium">{r.staffName}</div>
                                  <div className="text-muted" style={{ fontSize: 11 }}>{r.role}</div>
                                </div>
                              </div>
                            </td>
                            <td>{r.department || '—'}</td>
                            <td>
                              <span className="badge bg-light text-dark border">{r.totalWorkingDays || 0}</span>
                              <span className="text-muted ms-1" style={{ fontSize: 11 }}>/{r.totalDaysInMonth||0}d</span>
                            </td>
                            <td>
                              <span className={`badge ${(r.leavesTaken||0) > 0 ? 'bg-warning text-dark' : 'bg-light text-dark border'}`}>{r.leavesTaken || 0}</span>
                            </td>
                            <td>
                              <span className="badge bg-primary bg-opacity-10 text-primary">{r.workedDays || 0}</span>
                            </td>
                            <td>{fmt(gross)}</td>
                            <td className="fw-semibold text-success">{fmt(r.calculatedSalary)}</td>
                            <td className="text-success">{fmt(r.paidAmount)}</td>
                            <td className={due > 0 ? 'text-danger fw-semibold' : 'text-muted'}>{fmt(due)}</td>
                            <td>{statusBadge(r.status)}</td>
                            <td className="pe-3">
                              <div className="d-flex gap-1 flex-wrap">
                                <button className="btn btn-outline-secondary btn-sm" title="Edit salary components" onClick={() => openEdit(r)}>
                                  <span className="material-icons" style={{ fontSize: 14 }}>edit</span>
                                </button>
                                <button className="btn btn-outline-info btn-sm" title="Record leaves" onClick={() => openLeaves(r)}>
                                  <span className="material-icons" style={{ fontSize: 14 }}>event_busy</span>
                                </button>
                                {(r.status === 'PENDING' || r.status === 'PROCESSING') && (
                                  <button className="btn btn-success btn-sm" title="Collect payment" onClick={() => openPay(r)}>
                                    <span className="material-icons" style={{ fontSize: 14 }}>payments</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr><td colSpan={12} className="text-center text-muted py-5">
                          No records for {selMonth} {selYear}. Add staff above.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── TAB: PAYMENT HISTORY ────────────────────────────────────────── */}
      {tab === 'payments' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">#</th>
                    <th>Staff</th>
                    <th>Month / Year</th>
                    <th>Amount Paid</th>
                    <th>Mode</th>
                    <th>Receipt No.</th>
                    <th>Date</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={p.id}>
                      <td className="ps-3 text-muted">{i+1}</td>
                      <td className="fw-medium">{p.staffName}</td>
                      <td>{p.month} {p.year}</td>
                      <td className="fw-semibold text-success">{fmt(p.amountPaid)}</td>
                      <td><span className="badge bg-light text-dark border">{p.paymentMode}</span></td>
                      <td><code style={{ fontSize: 11 }}>{p.receiptNumber}</code></td>
                      <td>{p.paidDate}</td>
                      <td className="text-muted">{p.remarks || '—'}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-muted py-5">No payment history</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: HOLIDAYS ───────────────────────────────────────────────── */}
      {tab === 'holidays' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">#</th>
                    <th>Holiday Name</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th className="pe-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h, i) => (
                    <tr key={h.id}>
                      <td className="ps-3 text-muted">{i+1}</td>
                      <td className="fw-medium">{h.name}</td>
                      <td>{h.date}</td>
                      <td>
                        {h.recurring
                          ? <span className="badge bg-primary bg-opacity-10 text-primary">Recurring (Every Year)</span>
                          : <span className="badge bg-light text-dark border">One-time</span>}
                      </td>
                      <td className="pe-3">
                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteHoliday(h.id)}>
                          <span className="material-icons" style={{ fontSize: 14 }}>delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {holidays.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-muted py-5">No holidays configured. Weekends are excluded automatically.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD STAFF SALARY ─────────────────────────────────────── */}
      {addModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Staff Salary — {selMonth} {selYear}</h5>
                <button className="btn-close" onClick={() => setAddModal(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-medium">Staff Name *</label>
                    <input className="form-control form-control-sm" value={addForm.staffName} onChange={e => setAddForm(f=>({...f, staffName: e.target.value}))} placeholder="Full name" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-medium">Role</label>
                    <select className="form-select form-select-sm" value={addForm.role} onChange={e => setAddForm(f=>({...f, role: e.target.value}))}>
                      <option value="">Select role</option>
                      {['Teacher','Admin','Support','Driver','Other'].map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-medium">Department</label>
                    <input className="form-control form-control-sm" value={addForm.department} onChange={e => setAddForm(f=>({...f, department: e.target.value}))} placeholder="e.g. Mathematics" />
                  </div>
                </div>
                <hr className="my-3" />
                <div className="mb-3">
                  <label className="form-label small fw-medium">Basic Salary (₹) *</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">₹</span>
                    <input type="number" min="0" className="form-control" value={addForm.basic} onChange={e => setAddForm(f=>({...f, basic: e.target.value}))} placeholder="0" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setAddModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleAddSave} disabled={saving}>{saving ? 'Saving…' : 'Add Record'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT SALARY ──────────────────────────────────────────── */}
      {editModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Salary — {editModal.staffName}</h5>
                <button className="btn-close" onClick={() => setEditModal(null)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-medium">Basic Salary (₹)</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">₹</span>
                    <input type="number" min="0" className="form-control" value={editForm.basic || ''} onChange={e => setEditForm(f=>({...f, basic: e.target.value}))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setEditModal(null)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleEditSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: RECORD LEAVES ────────────────────────────────────────── */}
      {leavesModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Record Leaves — {leavesModal.staffName}</h5>
                <button className="btn-close" onClick={() => setLeavesModal(null)} />
              </div>
              <div className="modal-body">
                <div className="bg-light rounded p-3 mb-3">
                  <div className="row text-center g-2">
                    <div className="col-4">
                      <div className="text-muted small">Calendar Days</div>
                      <div className="fw-bold fs-5">{leavesModal.totalDaysInMonth || '—'}</div>
                    </div>
                    <div className="col-4">
                      <div className="text-muted small">Working Days</div>
                      <div className="fw-bold fs-5 text-primary">{leavesModal.totalWorkingDays || '—'}</div>
                    </div>
                    <div className="col-4">
                      <div className="text-muted small">Worked Days</div>
                      <div className="fw-bold fs-5 text-success">
                        {Math.max((leavesModal.totalWorkingDays || 0) - Number(leavesForm.leavesTaken || 0), 0)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-medium">Leaves Taken</label>
                  <input
                    type="number" min="0" max={leavesModal.totalWorkingDays || 31}
                    className="form-control"
                    value={leavesForm.leavesTaken}
                    onChange={e => setLeavesForm(f => ({ ...f, leavesTaken: e.target.value }))}
                  />
                  <div className="form-text">Weekends and holidays are already excluded from working days.</div>
                </div>
                <div className="alert alert-info py-2 small mb-0">
                  <strong>Note:</strong> Holidays reduce working days automatically — only staff leaves reduce the payable salary.
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setLeavesModal(null)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleLeavesSave} disabled={saving}>{saving ? 'Saving…' : 'Update Leaves'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: COLLECT PAYMENT ──────────────────────────────────────── */}
      {payModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Collect Payment — {payModal.staffName}</h5>
                <button className="btn-close" onClick={() => setPayModal(null)} />
              </div>
              <div className="modal-body">
                {/* Summary */}
                <div className="row g-2 mb-3">
                  {[
                    { label: 'Calculated Salary', value: fmt(payModal.calculatedSalary), color: 'text-primary' },
                    { label: 'Paid So Far',        value: fmt(payModal.paidAmount),       color: 'text-success' },
                    { label: 'Due Amount',         value: fmt(Math.max(Number(payModal.calculatedSalary||0)-Number(payModal.paidAmount||0),0)), color: 'text-danger' },
                  ].map(({ label, value, color }, i) => (
                    <div className="col-4" key={i}>
                      <div className="border rounded p-2 text-center">
                        <div className="text-muted small">{label}</div>
                        <div className={`fw-bold fs-6 ${color}`}>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                {Number(payModal.calculatedSalary) > 0 && (
                  <div className="mb-3">
                    <div className="progress" style={{ height: 8 }}>
                      <div className="progress-bar bg-success" style={{ width: `${Math.min((Number(payModal.paidAmount||0)/Number(payModal.calculatedSalary))*100, 100)}%` }} />
                    </div>
                    <div className="text-end text-muted" style={{ fontSize: 11 }}>
                      {((Number(payModal.paidAmount||0)/Number(payModal.calculatedSalary))*100).toFixed(1)}% paid
                    </div>
                  </div>
                )}

                <hr />
                <p className="fw-medium mb-2">New Payment</p>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Amount (₹) *</label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text">₹</span>
                      <input type="number" min="1" className="form-control" value={payForm.amount} onChange={e => setPayForm(f=>({...f, amount: e.target.value}))} placeholder="Enter amount" />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Payment Mode</label>
                    <select className="form-select form-select-sm" value={payForm.paymentMode} onChange={e => setPayForm(f=>({...f, paymentMode: e.target.value}))}>
                      {['Cash','Bank Transfer','Cheque','UPI'].map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Receipt Number</label>
                    <input className="form-control form-control-sm" value={payForm.receiptNumber} onChange={e => setPayForm(f=>({...f, receiptNumber: e.target.value}))} placeholder="Auto-generated if empty" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-medium">Remarks</label>
                    <input className="form-control form-control-sm" value={payForm.remarks} onChange={e => setPayForm(f=>({...f, remarks: e.target.value}))} placeholder="Optional" />
                  </div>
                </div>

                {/* Payment history */}
                {payHistory.length > 0 && (
                  <>
                    <hr />
                    <p className="fw-medium mb-2 small">Payment History</p>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered mb-0" style={{ fontSize: 12 }}>
                        <thead className="table-light">
                          <tr><th>Date</th><th>Amount</th><th>Mode</th><th>Receipt</th></tr>
                        </thead>
                        <tbody>
                          {payHistory.map(p => (
                            <tr key={p.id}>
                              <td>{p.paidDate}</td>
                              <td className="text-success fw-semibold">{fmt(p.amountPaid)}</td>
                              <td>{p.paymentMode}</td>
                              <td><code style={{ fontSize: 11 }}>{p.receiptNumber}</code></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setPayModal(null)}>Cancel</button>
                <button className="btn btn-success btn-sm" onClick={handlePayCollect} disabled={saving}>
                  {saving ? 'Processing…' : 'Collect Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD HOLIDAY ──────────────────────────────────────────── */}
      {holidayModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Holiday</h5>
                <button className="btn-close" onClick={() => setHolidayModal(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-medium">Holiday Name *</label>
                  <input className="form-control form-control-sm" value={holidayForm.name} onChange={e => setHolidayForm(f=>({...f, name: e.target.value}))} placeholder="e.g. Diwali" />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-medium">Date *</label>
                  <input type="date" className="form-control form-control-sm" value={holidayForm.date} onChange={e => setHolidayForm(f=>({...f, date: e.target.value}))} />
                </div>
                <div className="form-check">
                  <input type="checkbox" className="form-check-input" id="recurringCheck" checked={holidayForm.recurring} onChange={e => setHolidayForm(f=>({...f, recurring: e.target.checked}))} />
                  <label className="form-check-label small" htmlFor="recurringCheck">
                    Recurring (applies every year on this date)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setHolidayModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleAddHoliday} disabled={saving}>{saving ? 'Saving…' : 'Add Holiday'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SALARY SLIP ──────────────────────────────────────────── */}
      {slipModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header no-print">
                <h5 className="modal-title">Salary Slip</h5>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-primary btn-sm" onClick={() => window.print()}>
                    <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>print</span>Print
                  </button>
                  <button className="btn-close" onClick={() => setSlipModal(null)} />
                </div>
              </div>
              <div className="modal-body" id="salary-slip">
                <div className="text-center border-bottom pb-3 mb-3">
                  <h4 className="fw-bold mb-0" style={{ color: '#76C442' }}>Schoolers Management System</h4>
                  <p className="text-muted mb-1 small">School Campus, Education City</p>
                  <h6 className="fw-bold mt-2 mb-0">SALARY SLIP</h6>
                  <p className="text-muted small mb-0">For the month of {slipModal.month} {slipModal.year}</p>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <table className="table table-sm table-borderless mb-0">
                      <tbody>
                        <tr><td className="text-muted ps-0">Employee Name</td><td>: {slipModal.staffName}</td></tr>
                        <tr><td className="text-muted ps-0">Designation</td><td>: {slipModal.role || '—'}</td></tr>
                        <tr><td className="text-muted ps-0">Department</td><td>: {slipModal.department || '—'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-6">
                    <table className="table table-sm table-borderless mb-0">
                      <tbody>
                        <tr><td className="text-muted ps-0">Pay Period</td><td>: {slipModal.month} {slipModal.year}</td></tr>
                        <tr><td className="text-muted ps-0">Working Days</td><td>: {slipModal.totalWorkingDays} of {slipModal.totalDaysInMonth}</td></tr>
                        <tr><td className="text-muted ps-0">Leaves / Worked</td><td>: {slipModal.leavesTaken} leaves / {slipModal.workedDays} days</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <div className="border rounded p-3">
                      <h6 className="fw-bold mb-3 text-success">Earnings</h6>
                      <table className="table table-sm mb-0">
                        <tbody>
                          <tr><td>Basic Salary</td><td className="text-end">{fmt(slipModal.basic)}</td></tr>
                          <tr><td>HRA</td><td className="text-end">{fmt(slipModal.hra)}</td></tr>
                          <tr><td>DA</td><td className="text-end">{fmt(slipModal.da)}</td></tr>
                          <tr><td>Medical</td><td className="text-end">{fmt(slipModal.medical)}</td></tr>
                          <tr className="fw-bold border-top"><td>Gross</td><td className="text-end text-success">{fmt(Number(slipModal.basic||0)+Number(slipModal.hra||0)+Number(slipModal.da||0)+Number(slipModal.medical||0))}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="border rounded p-3">
                      <h6 className="fw-bold mb-3 text-danger">Deductions</h6>
                      <table className="table table-sm mb-0">
                        <tbody>
                          <tr><td>Provident Fund</td><td className="text-end">{fmt(slipModal.pf)}</td></tr>
                          <tr><td>Income Tax</td><td className="text-end">{fmt(slipModal.tax)}</td></tr>
                          <tr><td>Leave Deduction</td><td className="text-end text-danger">{fmt(Math.max(Number(slipModal.calculatedSalary||(Number(slipModal.basic||0)+Number(slipModal.hra||0)+Number(slipModal.da||0)+Number(slipModal.medical||0))-Number(slipModal.pf||0)-Number(slipModal.tax||0)) - (Number(slipModal.calculatedSalary||0)), 0))}</td></tr>
                          <tr className="fw-bold border-top"><td>Total Deductions</td><td className="text-end text-danger">{fmt(Number(slipModal.pf||0)+Number(slipModal.tax||0))}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="bg-success bg-opacity-10 border border-success rounded p-3 text-center mb-2">
                  <div className="text-muted small">NET PAYABLE SALARY (for {slipModal.workedDays} worked days)</div>
                  <div className="fw-bold fs-3 text-success">{fmt(slipModal.calculatedSalary)}</div>
                  <div className="d-flex justify-content-center gap-3 mt-1 small">
                    <span className="text-success">Paid: {fmt(slipModal.paidAmount)}</span>
                    <span className="text-danger">Due: {fmt(Math.max(Number(slipModal.calculatedSalary||0)-Number(slipModal.paidAmount||0),0))}</span>
                    <span>{statusBadge(slipModal.status)}</span>
                  </div>
                </div>
                <div className="text-center text-muted small border-top pt-2">
                  Per day salary: {fmt(slipModal.perDaySalary)} · Computer generated slip
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
