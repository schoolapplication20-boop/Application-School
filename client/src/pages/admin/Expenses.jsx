import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import BarChartComponent from '../../components/Charts/BarChartComponent';
import {
  fetchExpenses as apiFetchExpenses,
  createExpense as apiCreateExpense,
  deleteExpense as apiDeleteExpense,
} from '../../services/expenseService';

const monthlyExpenseData = [
  { name: 'Oct', expenses: 548000 },
  { name: 'Nov', expenses: 562000 },
  { name: 'Dec', expenses: 580000 },
  { name: 'Jan', expenses: 595000 },
  { name: 'Feb', expenses: 571000 },
  { name: 'Mar', expenses: 607500 },
];

const categoryColors = {
  'Salaries': '#76C442', 'Infrastructure': '#3182ce', 'Utilities': '#805ad5',
  'Supplies': '#ed8936', 'Technology': '#38b2ac', 'Transport': '#e53e3e',
  'Sports': '#d69e2e', 'Other': '#a0aec0'
};

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ category: 'Salaries', description: '', amount: '', date: '' });

  const filtered = expenses.filter(e => {
    const matchSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || e.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = !filterCategory || e.category === filterCategory;
    return matchSearch && matchCat;
  });

  const totalExpenses = filtered.reduce((a, e) => a + e.amount, 0);

  const categories = [...new Set(expenses.map(e => e.category))];

  const categoryTotals = categories.map(cat => ({
    name: cat,
    total: expenses.filter(e => e.category === cat).reduce((a, e) => a + e.amount, 0),
    count: expenses.filter(e => e.category === cat).length,
  })).sort((a, b) => b.total - a.total);

  useEffect(() => {
    apiFetchExpenses().then(data => { if (data && data.length > 0) setExpenses(data); });
  }, []);

  const handleAdd = async () => {
    if (!formData.description || !formData.amount) { alert('Description and amount are required.'); return; }
    const payload = { ...formData, amount: parseFloat(formData.amount), addedBy: 'Admin' };
    const created = await apiCreateExpense(payload);
    const updated = [created, ...expenses];
    setExpenses(updated);
    setShowModal(false);
  };

  return (
    <Layout pageTitle="Expenses">
      <div className="page-header">
            <h1>Expense Management</h1>
            <p>Track and manage all school expenses</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total This Month', value: `₹${expenses.reduce((a, e) => a + e.amount, 0).toLocaleString()}`, icon: 'receipt_long', color: '#e53e3e' },
              { label: 'Categories', value: categories.length, icon: 'category', color: '#3182ce' },
              { label: 'Transactions', value: expenses.length, icon: 'list_alt', color: '#805ad5' },
              { label: 'Largest Expense', value: `₹${Math.max(...expenses.map(e => e.amount)).toLocaleString()}`, icon: 'trending_up', color: '#ed8936' },
            ].map(c => (
              <div key={c.label} className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: c.color + '15' }}>
                  <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
                </div>
                <div className="stat-value" style={{ fontSize: '20px' }}>{c.value}</div>
                <div className="stat-label">{c.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Monthly Expense Trend</div>
                  <div className="chart-card-subtitle">Last 6 months</div>
                </div>
              </div>
              <BarChartComponent
                data={monthlyExpenseData}
                bars={[{ key: 'expenses', name: 'Total Expenses', color: '#e53e3e' }]}
                height={220}
              />
            </div>

            <div className="chart-card">
              <div className="chart-card-header">
                <div className="chart-card-title">By Category</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                {categoryTotals.map(cat => {
                  const totalAll = expenses.reduce((a, e) => a + e.amount, 0);
                  const pct = Math.round((cat.total / totalAll) * 100);
                  const color = categoryColors[cat.name] || '#a0aec0';
                  return (
                    <div key={cat.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#4a5568' }}>{cat.name}</span>
                        <span style={{ fontSize: '12px', color: '#718096' }}>₹{cat.total.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="progress-bar-custom">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="data-table-card">
            <div className="search-filter-bar">
              <div className="search-input-wrapper">
                <span className="material-icons">search</span>
                <input type="text" className="search-input" placeholder="Search expenses..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="btn-add" onClick={() => { setFormData({ category: 'Salaries', description: '', amount: '', date: '' }); setShowModal(true); }}>
                <span className="material-icons">add</span>
                Add Expense
              </button>
            </div>

            {filtered.length > 0 && (
              <div style={{ padding: '8px 0 16px', fontSize: '14px', color: '#718096' }}>
                Showing {filtered.length} expenses — Total: <strong style={{ color: '#e53e3e' }}>₹{totalExpenses.toLocaleString()}</strong>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Added By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}>
                      <td>
                        <span style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                          background: (categoryColors[e.category] || '#a0aec0') + '15',
                          color: categoryColors[e.category] || '#a0aec0'
                        }}>
                          {e.category}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#4a5568', maxWidth: '200px' }}>{e.description}</td>
                      <td style={{ fontWeight: 700, color: '#e53e3e', fontSize: '14px' }}>₹{e.amount.toLocaleString()}</td>
                      <td style={{ fontSize: '12px', color: '#718096' }}>{e.date}</td>
                      <td style={{ fontSize: '12px', color: '#a0aec0' }}>{e.addedBy}</td>
                      <td>
                        <div className="action-btns">
                          <button className="action-btn action-btn-edit" title="Edit"><span className="material-icons">edit</span></button>
                          <button className="action-btn action-btn-delete" onClick={() => setExpenses(expenses.filter(x => x.id !== e.id))} title="Delete"><span className="material-icons">delete</span></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-container">
            <div className="modal-header">
              <span className="modal-title">Add New Expense</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Category</label>
                  <select className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                    value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                    {Object.keys(categoryColors).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Amount (₹) *</label>
                  <input type="number" className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                    placeholder="Enter amount" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: '12px', gridColumn: '1/-1' }}>
                  <label className="form-label">Description *</label>
                  <input type="text" className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                    placeholder="Enter description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Date</label>
                  <input type="text" className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                    placeholder="DD Mon YYYY" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAdd} style={{ padding: '10px 24px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Add Expense</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Expenses;
