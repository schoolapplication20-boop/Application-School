import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const STATUS_COLORS = {
  in_stock:    { label: 'In Stock',    color: 'success' },
  low_stock:   { label: 'Low Stock',   color: 'warning' },
  out_of_stock:{ label: 'Out of Stock',color: 'danger'  },
};

export default function InventoryPage() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [editing, setEditing]   = useState(null);  // { id, stock, lowStockThreshold }
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', { params: { limit: 200 } });
      setItems(res.data.data?.products || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stockStatus = (item) => {
    if (!item.trackInventory) return null;
    if (item.stockQuantity <= 0)                                  return 'out_of_stock';
    if (item.stockQuantity <= (item.lowStockThreshold || 5))     return 'low_stock';
    return 'in_stock';
  };

  const filtered = items.filter((it) => {
    const matchSearch = it.name?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'all') return true;
    return stockStatus(it) === filter;
  });

  const startEdit = (item) =>
    setEditing({ id: item.productId, stock: item.stockQuantity ?? 0, threshold: item.lowStockThreshold ?? 5 });

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/products/${editing.id}/inventory`, {
        stockQuantity:    parseInt(editing.stock, 10),
        lowStockThreshold: parseInt(editing.threshold, 10),
        trackInventory:   true,
      });
      setToast('Inventory updated');
      setEditing(null);
      load();
    } catch {
      setToast('Failed to update');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const counts = {
    all:           items.length,
    in_stock:      items.filter((i) => stockStatus(i) === 'in_stock').length,
    low_stock:     items.filter((i) => stockStatus(i) === 'low_stock').length,
    out_of_stock:  items.filter((i) => stockStatus(i) === 'out_of_stock').length,
  };

  return (
    <div className="page-shell">
      {toast && <div className="toast toast-success">{toast}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Track stock levels across your entire product catalog.</p>
        </div>
        <button className="btn btn-primary" onClick={load}>↻ Refresh</button>
      </div>

      {/* Summary cards */}
      <div className="inventory-summary">
        {[
          { key: 'all',          label: 'Total Products', icon: '📋', color: 'blue'    },
          { key: 'in_stock',     label: 'In Stock',       icon: '✅', color: 'green'   },
          { key: 'low_stock',    label: 'Low Stock',      icon: '⚠️', color: 'yellow'  },
          { key: 'out_of_stock', label: 'Out of Stock',   icon: '❌', color: 'red'     },
        ].map((s) => (
          <button
            key={s.key}
            className={`inv-summary-card ${s.color} ${filter === s.key ? 'active' : ''}`}
            onClick={() => setFilter(s.key)}
          >
            <span className="inv-summary-icon">{s.icon}</span>
            <div>
              <div className="inv-summary-count">{counts[s.key]}</div>
              <div className="inv-summary-label">{s.label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="table-toolbar">
        <input
          className="input search-input"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="page-loader">Loading inventory…</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>In Stock</th>
                <th>Low Stock Alert</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="table-empty">No products found</td></tr>
              ) : filtered.map((item) => {
                const status = stockStatus(item);
                const st     = STATUS_COLORS[status];
                const isEdit = editing?.id === item.productId;

                return (
                  <tr key={item.productId} className={status === 'out_of_stock' ? 'row-danger' : status === 'low_stock' ? 'row-warning' : ''}>
                    <td>
                      <div className="product-cell">
                        {item.imageUrl && <img src={item.imageUrl} alt="" className="product-thumb" />}
                        <span className="product-name">{item.name}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-neutral">{item.category?.name || '—'}</span></td>
                    <td>₹{parseFloat(item.price).toFixed(2)}</td>
                    <td>
                      {isEdit ? (
                        <input
                          type="number" min="0" className="input input-sm"
                          value={editing.stock}
                          onChange={(e) => setEditing((ed) => ({ ...ed, stock: e.target.value }))}
                          style={{ width: 80 }}
                        />
                      ) : (
                        <span className={item.trackInventory ? '' : 'text-muted'}>
                          {item.trackInventory ? item.stockQuantity ?? 0 : '∞'}
                        </span>
                      )}
                    </td>
                    <td>
                      {isEdit ? (
                        <input
                          type="number" min="0" className="input input-sm"
                          value={editing.threshold}
                          onChange={(e) => setEditing((ed) => ({ ...ed, threshold: e.target.value }))}
                          style={{ width: 80 }}
                        />
                      ) : (
                        <span className="text-muted">{item.lowStockThreshold ?? 5}</span>
                      )}
                    </td>
                    <td>
                      {st ? (
                        <span className={`badge badge-${st.color}`}>{st.label}</span>
                      ) : (
                        <span className="badge badge-neutral">Not tracked</span>
                      )}
                    </td>
                    <td>
                      {isEdit ? (
                        <div className="row-actions">
                          <button className="btn btn-primary btn-xs" onClick={saveEdit} disabled={saving}>Save</button>
                          <button className="btn btn-outline btn-xs" onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn btn-outline btn-xs" onClick={() => startEdit(item)}>Edit</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
