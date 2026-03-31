import React, { useState, useMemo } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';

const initialStaff = [
  { id: 1, name: 'Dr. Priya Sharma', role: 'Teacher', department: 'Mathematics', basic: 45000, hra: 13500, da: 9000, medical: 2000, pf: 5400, tax: 3200, status: 'Paid' },
  { id: 2, name: 'Mr. Rajesh Kumar', role: 'Teacher', department: 'Science', basic: 42000, hra: 12600, da: 8400, medical: 2000, pf: 5040, tax: 2800, status: 'Paid' },
  { id: 3, name: 'Ms. Anita Verma', role: 'Teacher', department: 'English', basic: 40000, hra: 12000, da: 8000, medical: 2000, pf: 4800, tax: 2500, status: 'Pending' },
  { id: 4, name: 'Mr. Suresh Nair', role: 'Teacher', department: 'Social Studies', basic: 38000, hra: 11400, da: 7600, medical: 2000, pf: 4560, tax: 2200, status: 'Pending' },
  { id: 5, name: 'Ms. Kavitha Reddy', role: 'Teacher', department: 'Hindi', basic: 37000, hra: 11100, da: 7400, medical: 2000, pf: 4440, tax: 2100, status: 'Paid' },
  { id: 6, name: 'Mr. Arjun Mehta', role: 'Teacher', department: 'Computer Science', basic: 48000, hra: 14400, da: 9600, medical: 2000, pf: 5760, tax: 3500, status: 'Processing' },
  { id: 7, name: 'Ms. Deepa Singh', role: 'Teacher', department: 'Physics', basic: 44000, hra: 13200, da: 8800, medical: 2000, pf: 5280, tax: 3000, status: 'Paid' },
  { id: 8, name: 'Mr. Vikram Patel', role: 'Teacher', department: 'Chemistry', basic: 43000, hra: 12900, da: 8600, medical: 2000, pf: 5160, tax: 2900, status: 'Pending' },
  { id: 9, name: 'Mrs. Sunita Joshi', role: 'Admin', department: 'Administration', basic: 35000, hra: 10500, da: 7000, medical: 1500, pf: 4200, tax: 1800, status: 'Paid' },
  { id: 10, name: 'Mr. Mohan Das', role: 'Admin', department: 'Accounts', basic: 32000, hra: 9600, da: 6400, medical: 1500, pf: 3840, tax: 1500, status: 'Paid' },
  { id: 11, name: 'Ms. Rekha Iyer', role: 'Admin', department: 'HR', basic: 30000, hra: 9000, da: 6000, medical: 1500, pf: 3600, tax: 1300, status: 'Pending' },
  { id: 12, name: 'Mr. Ganesh Rao', role: 'Support', department: 'Maintenance', basic: 18000, hra: 5400, da: 3600, medical: 1000, pf: 2160, tax: 0, status: 'Paid' },
  { id: 13, name: 'Mr. Ramu Pillai', role: 'Support', department: 'Security', basic: 16000, hra: 4800, da: 3200, medical: 1000, pf: 1920, tax: 0, status: 'Pending' },
  { id: 14, name: 'Ms. Lakshmi Devi', role: 'Support', department: 'Housekeeping', basic: 15000, hra: 4500, da: 3000, medical: 1000, pf: 1800, tax: 0, status: 'Paid' },
  { id: 15, name: 'Mr. Balu Swamy', role: 'Support', department: 'Transport', basic: 20000, hra: 6000, da: 4000, medical: 1000, pf: 2400, tax: 0, status: 'Processing' },
];

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const calcNet = (s) => s.basic + s.hra + s.da + s.medical - s.pf - s.tax;

export default function Salaries() {
  const [staff, setStaff] = useState(initialStaff);
  const [selectedMonth, setSelectedMonth] = useState('March');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmAll, setShowConfirmAll] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [payMethod, setPayMethod] = useState('Bank Transfer');
  const [toast, setToast] = useState(null);
  const [editForm, setEditForm] = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = useMemo(() => {
    return staff.filter(s => {
      const matchRole = filterRole === 'All' || s.role === filterRole;
      const matchStatus = filterStatus === 'All' || s.status === filterStatus;
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.department.toLowerCase().includes(searchTerm.toLowerCase());
      return matchRole && matchStatus && matchSearch;
    });
  }, [staff, filterRole, filterStatus, searchTerm]);

  const stats = useMemo(() => ({
    total: staff.length,
    totalSalary: staff.reduce((sum, s) => sum + calcNet(s), 0),
    paid: staff.filter(s => s.status === 'Paid').length,
    pending: staff.filter(s => s.status === 'Pending').length,
  }), [staff]);

  const openPay = (s) => { setSelectedStaff(s); setPayMethod('Bank Transfer'); setShowPayModal(true); };
  const openSlip = (s) => { setSelectedStaff(s); setShowSlipModal(true); };
  const openEdit = (s) => {
    setSelectedStaff(s);
    setEditForm({ ...s });
    setShowEditModal(true);
  };

  const processPay = () => {
    setStaff(prev => prev.map(s => s.id === selectedStaff.id ? { ...s, status: 'Paid' } : s));
    setShowPayModal(false);
    showToast(`Salary paid to ${selectedStaff.name} successfully`);
  };

  const payAllPending = () => {
    setStaff(prev => prev.map(s => s.status === 'Pending' ? { ...s, status: 'Paid' } : s));
    setShowConfirmAll(false);
    showToast(`All pending salaries processed successfully`);
  };

  const saveEdit = () => {
    setStaff(prev => prev.map(s => s.id === editForm.id ? { ...editForm, basic: +editForm.basic, hra: +editForm.hra, da: +editForm.da, medical: +editForm.medical, pf: +editForm.pf, tax: +editForm.tax } : s));
    setShowEditModal(false);
    showToast('Salary details updated');
  };

  const statusBadge = (status) => {
    const map = { Paid: 'success', Pending: 'warning', Processing: 'info' };
    return <span className={`badge bg-${map[status] || 'secondary'}`}>{status}</span>;
  };

  const formatCurrency = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

  return (
    <Layout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-0">Salaries</h4>
          <small className="text-muted">Manage staff salary payments</small>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <select className="form-select form-select-sm" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ width: 130 }}>
            {months.map(m => <option key={m}>{m}</option>)}
          </select>
          <select className="form-select form-select-sm" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={{ width: 90 }}>
            {['2023','2024','2025'].map(y => <option key={y}>{y}</option>)}
          </select>
          <button className="btn btn-warning btn-sm text-white" onClick={() => setShowConfirmAll(true)}>
            <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>payments</span>
            Pay All Pending
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Staff', value: stats.total, icon: 'groups', color: '#4361ee' },
          { label: 'Monthly Salary', value: formatCurrency(stats.totalSalary), icon: 'account_balance_wallet', color: '#76C442' },
          { label: 'Paid This Month', value: stats.paid, icon: 'check_circle', color: '#28a745' },
          { label: 'Pending', value: stats.pending, icon: 'pending', color: '#ffc107' },
        ].map((stat, i) => (
          <div className="col-6 col-md-3" key={i}>
            <div className="card border-0 shadow-sm">
              <div className="card-body d-flex align-items-center gap-3 p-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 48, height: 48, background: stat.color + '20' }}>
                  <span className="material-icons" style={{ color: stat.color }}>{stat.icon}</span>
                </div>
                <div>
                  <div className="fw-bold fs-5">{stat.value}</div>
                  <div className="text-muted small">{stat.label}</div>
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
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white"><span className="material-icons" style={{ fontSize: 16 }}>search</span></span>
                <input type="text" className="form-control" placeholder="Search by name or department..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="All">All Roles</option>
                <option>Teacher</option>
                <option>Admin</option>
                <option>Support</option>
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="All">All Status</option>
                <option>Paid</option>
                <option>Pending</option>
                <option>Processing</option>
              </select>
            </div>
            <div className="col-md-2 text-end">
              <span className="text-muted small">{filtered.length} records</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">#</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Basic</th>
                  <th>Allowances</th>
                  <th>Deductions</th>
                  <th>Net Salary</th>
                  <th>Status</th>
                  <th className="pe-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const allowances = s.hra + s.da + s.medical;
                  const deductions = s.pf + s.tax;
                  const net = calcNet(s);
                  return (
                    <tr key={s.id}>
                      <td className="ps-3">{i + 1}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: 36, height: 36, background: '#76C442', fontSize: 13 }}>
                            {s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="fw-medium">{s.name}</span>
                        </div>
                      </td>
                      <td><span className={`badge ${s.role === 'Teacher' ? 'bg-primary' : s.role === 'Admin' ? 'bg-info text-dark' : 'bg-secondary'} bg-opacity-10 text-${s.role === 'Teacher' ? 'primary' : s.role === 'Admin' ? 'info' : 'secondary'}`}>{s.role}</span></td>
                      <td>{s.department}</td>
                      <td>{formatCurrency(s.basic)}</td>
                      <td className="text-success">{formatCurrency(allowances)}</td>
                      <td className="text-danger">{formatCurrency(deductions)}</td>
                      <td className="fw-bold">{formatCurrency(net)}</td>
                      <td>{statusBadge(s.status)}</td>
                      <td className="pe-3">
                        <div className="d-flex gap-1">
                          {s.status === 'Pending' && (
                            <button className="btn btn-success btn-sm" onClick={() => openPay(s)} title="Pay">
                              <span className="material-icons" style={{ fontSize: 14 }}>payments</span>
                            </button>
                          )}
                          <button className="btn btn-outline-primary btn-sm" onClick={() => openSlip(s)} title="View Slip">
                            <span className="material-icons" style={{ fontSize: 14 }}>receipt</span>
                          </button>
                          <button className="btn btn-outline-secondary btn-sm" onClick={() => openEdit(s)} title="Edit">
                            <span className="material-icons" style={{ fontSize: 14 }}>edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center text-muted py-4">No records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pay Modal */}
      {showPayModal && selectedStaff && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Process Salary Payment</h5>
                <button className="btn-close" onClick={() => setShowPayModal(false)} />
              </div>
              <div className="modal-body">
                <div className="bg-light rounded p-3 mb-3">
                  <div className="row g-2 text-center">
                    <div className="col-6">
                      <div className="text-muted small">Staff Name</div>
                      <div className="fw-bold">{selectedStaff.name}</div>
                    </div>
                    <div className="col-6">
                      <div className="text-muted small">Month</div>
                      <div className="fw-bold">{selectedMonth} {selectedYear}</div>
                    </div>
                  </div>
                </div>
                <table className="table table-sm mb-3">
                  <tbody>
                    <tr><td className="text-muted">Basic Salary</td><td className="text-end">{formatCurrency(selectedStaff.basic)}</td></tr>
                    <tr><td className="text-muted">HRA</td><td className="text-end text-success">{formatCurrency(selectedStaff.hra)}</td></tr>
                    <tr><td className="text-muted">DA</td><td className="text-end text-success">{formatCurrency(selectedStaff.da)}</td></tr>
                    <tr><td className="text-muted">Medical Allowance</td><td className="text-end text-success">{formatCurrency(selectedStaff.medical)}</td></tr>
                    <tr className="border-top"><td className="text-muted">Provident Fund (PF)</td><td className="text-end text-danger">-{formatCurrency(selectedStaff.pf)}</td></tr>
                    <tr><td className="text-muted">Income Tax</td><td className="text-end text-danger">-{formatCurrency(selectedStaff.tax)}</td></tr>
                    <tr className="table-success fw-bold border-top"><td>Net Salary</td><td className="text-end">{formatCurrency(calcNet(selectedStaff))}</td></tr>
                  </tbody>
                </table>
                <div className="mb-3">
                  <label className="form-label fw-medium">Payment Method</label>
                  {['Bank Transfer', 'Cash', 'Cheque'].map(method => (
                    <div className="form-check" key={method}>
                      <input className="form-check-input" type="radio" value={method} checked={payMethod === method} onChange={() => setPayMethod(method)} id={`pm-${method}`} />
                      <label className="form-check-label" htmlFor={`pm-${method}`}>{method}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button className="btn btn-success" onClick={processPay}>
                  <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>check_circle</span>
                  Process Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Salary Slip Modal */}
      {showSlipModal && selectedStaff && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header no-print">
                <h5 className="modal-title">Salary Slip</h5>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-primary btn-sm" onClick={() => window.print()}>
                    <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>print</span>Print
                  </button>
                  <button className="btn-close" onClick={() => setShowSlipModal(false)} />
                </div>
              </div>
              <div className="modal-body" id="salary-slip">
                {/* Slip Header */}
                <div className="text-center border-bottom pb-3 mb-3">
                  <h4 className="fw-bold mb-0" style={{ color: '#76C442' }}>Schoolers Management System</h4>
                  <p className="text-muted mb-1 small">123 Education Lane, Knowledge City - 560001</p>
                  <h6 className="fw-bold mt-2 mb-0">SALARY SLIP</h6>
                  <p className="text-muted small mb-0">For the month of {selectedMonth} {selectedYear}</p>
                </div>
                {/* Employee Details */}
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <table className="table table-sm table-borderless mb-0">
                      <tbody>
                        <tr><td className="text-muted ps-0">Employee Name</td><td className="fw-medium">: {selectedStaff.name}</td></tr>
                        <tr><td className="text-muted ps-0">Designation</td><td className="fw-medium">: {selectedStaff.role}</td></tr>
                        <tr><td className="text-muted ps-0">Department</td><td className="fw-medium">: {selectedStaff.department}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-6">
                    <table className="table table-sm table-borderless mb-0">
                      <tbody>
                        <tr><td className="text-muted ps-0">Employee ID</td><td className="fw-medium">: EMP{String(selectedStaff.id).padStart(4, '0')}</td></tr>
                        <tr><td className="text-muted ps-0">Pay Period</td><td className="fw-medium">: {selectedMonth} {selectedYear}</td></tr>
                        <tr><td className="text-muted ps-0">Pay Date</td><td className="fw-medium">: {new Date().toLocaleDateString('en-IN')}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Earnings & Deductions */}
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <div className="border rounded p-3">
                      <h6 className="fw-bold mb-3 text-success">Earnings</h6>
                      <table className="table table-sm mb-0">
                        <tbody>
                          <tr><td>Basic Salary</td><td className="text-end">{formatCurrency(selectedStaff.basic)}</td></tr>
                          <tr><td>HRA</td><td className="text-end">{formatCurrency(selectedStaff.hra)}</td></tr>
                          <tr><td>Dearness Allowance (DA)</td><td className="text-end">{formatCurrency(selectedStaff.da)}</td></tr>
                          <tr><td>Medical Allowance</td><td className="text-end">{formatCurrency(selectedStaff.medical)}</td></tr>
                          <tr className="fw-bold border-top"><td>Total Earnings</td><td className="text-end text-success">{formatCurrency(selectedStaff.basic + selectedStaff.hra + selectedStaff.da + selectedStaff.medical)}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="border rounded p-3">
                      <h6 className="fw-bold mb-3 text-danger">Deductions</h6>
                      <table className="table table-sm mb-0">
                        <tbody>
                          <tr><td>Provident Fund (PF)</td><td className="text-end">{formatCurrency(selectedStaff.pf)}</td></tr>
                          <tr><td>Income Tax (TDS)</td><td className="text-end">{formatCurrency(selectedStaff.tax)}</td></tr>
                          <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
                          <tr><td>&nbsp;</td><td>&nbsp;</td></tr>
                          <tr className="fw-bold border-top"><td>Total Deductions</td><td className="text-end text-danger">{formatCurrency(selectedStaff.pf + selectedStaff.tax)}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                {/* Net Salary */}
                <div className="bg-success bg-opacity-10 border border-success rounded p-3 text-center">
                  <div className="text-muted small">NET SALARY PAYABLE</div>
                  <div className="fw-bold fs-3 text-success">{formatCurrency(calcNet(selectedStaff))}</div>
                  <div className="text-muted small mt-1">
                    {selectedStaff.status === 'Paid' ? (
                      <span className="badge bg-success">PAID</span>
                    ) : (
                      <span className="badge bg-warning text-dark">{selectedStaff.status.toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <div className="text-center text-muted small mt-3 border-top pt-3">
                  This is a computer generated salary slip and does not require a signature.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Salary — {editForm.name}</h5>
                <button className="btn-close" onClick={() => setShowEditModal(false)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  {[
                    { key: 'basic', label: 'Basic Salary' },
                    { key: 'hra', label: 'HRA' },
                    { key: 'da', label: 'Dearness Allowance (DA)' },
                    { key: 'medical', label: 'Medical Allowance' },
                    { key: 'pf', label: 'Provident Fund (PF)' },
                    { key: 'tax', label: 'Income Tax (TDS)' },
                  ].map(({ key, label }) => (
                    <div className="col-6" key={key}>
                      <label className="form-label small fw-medium">{label}</label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text">₹</span>
                        <input type="number" className="form-control" value={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-light rounded p-3 mt-3">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Net Salary</span>
                    <span className="fw-bold text-success">{formatCurrency(+editForm.basic + +editForm.hra + +editForm.da + +editForm.medical - +editForm.pf - +editForm.tax)}</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Pay All Modal */}
      {showConfirmAll && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Payment</h5>
                <button className="btn-close" onClick={() => setShowConfirmAll(false)} />
              </div>
              <div className="modal-body text-center">
                <span className="material-icons text-warning" style={{ fontSize: 48 }}>warning</span>
                <p className="mt-2">Pay all <strong>{stats.pending} pending</strong> salaries for <strong>{selectedMonth} {selectedYear}</strong>?</p>
                <p className="text-muted small">This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowConfirmAll(false)}>Cancel</button>
                <button className="btn btn-warning text-white" onClick={payAllPending}>Confirm & Pay All</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
