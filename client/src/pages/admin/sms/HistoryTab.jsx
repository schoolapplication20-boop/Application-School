import React, { useCallback, useEffect, useState } from 'react';
import { smsAPI } from '../../../services/api';
import { LOG_STATUS_META, formatDateTime } from './constants';

const inputStyle = { padding: '8px 12px', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none' };

export default function HistoryTab({ showToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: 20 };
      if (status) params.status = status;
      if (from) params.from = `${from}T00:00:00`;
      if (to) params.to = `${to}T23:59:59`;
      if (search) params.search = search;
      const res = await smsAPI.getHistory(params);
      const data = res.data?.data;
      setLogs(data?.content ?? []);
      setTotalPages(data?.totalPages ?? 0);
      setTotalElements(data?.totalElements ?? 0);
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to load SMS history', 'error');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, status, from, to, search]);

  useEffect(() => { load(); }, [load]);

  const resetFilters = () => { setStatus(''); setFrom(''); setTo(''); setSearch(''); setPage(0); };

  return (
    <div className="data-table-card">
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginRight: 8 }}>SMS History</span>
        <input placeholder="Search name or phone…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} style={{ ...inputStyle, minWidth: 180 }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }} style={inputStyle}>
          <option value="">All Statuses</option>
          {Object.entries(LOG_STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
        <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(0); }} style={inputStyle} />
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
        <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(0); }} style={inputStyle} />
        {(status || from || to || search) && (
          <button onClick={resetFilters} style={{ ...inputStyle, background: 'var(--surface)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Clear</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{totalElements} total</span>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
          Loading…
        </div>
      ) : logs.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8, color: 'var(--border-strong)' }}>history</span>
          No messages found.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-alt)', textAlign: 'left' }}>
                <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Recipient</th>
                <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Message</th>
                <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Segments</th>
                <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Sent At</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const meta = LOG_STATUS_META[log.status] || {};
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.recipientName || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.recipientPhone}</div>
                    </td>
                    <td style={{ padding: '10px 16px', maxWidth: 360 }}>
                      <div style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.messageContent}</div>
                      {log.errorMessage && <div style={{ fontSize: 11, color: '#c53030', marginTop: 2 }}>{log.errorMessage}</div>}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: meta.bg, color: meta.color }}>{meta.label || log.status}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{log.segments}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDateTime(log.sentAt || log.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border)' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ ...inputStyle, background: 'var(--surface)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1 }}>
            Previous
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={{ ...inputStyle, background: 'var(--surface)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.5 : 1 }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
