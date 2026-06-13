import React, { useCallback, useEffect, useState } from 'react';
import { smsAPI } from '../../../services/api';
import { CAMPAIGN_STATUS_META, targetLabel, formatDateTime } from './constants';

export default function ScheduledTab({ showToast }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await smsAPI.getActiveCampaigns();
      setCampaigns(res.data?.data ?? []);
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to load scheduled campaigns', 'error');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (campaign) => {
    if (!window.confirm(`Cancel campaign "${campaign.name}"? Messages already sent will not be affected.`)) return;
    setCancellingId(campaign.id);
    try {
      const res = await smsAPI.cancelCampaign(campaign.id);
      if (res.data?.success) {
        showToast('Campaign cancelled');
        load();
      } else {
        showToast(res.data?.message || 'Failed to cancel campaign', 'error');
      }
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to cancel campaign', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="data-table-card">
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
        Scheduled & In-Progress Campaigns
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
          Loading…
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8, color: 'var(--border-strong)' }}>schedule_send</span>
          No scheduled or in-progress campaigns.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {campaigns.map(c => {
            const meta = CAMPAIGN_STATUS_META[c.status] || {};
            const done = c.sentCount + c.deliveredCount + c.failedCount;
            const pct = c.totalRecipients > 0 ? Math.round((done / c.totalRecipients) * 100) : 0;
            return (
              <div key={c.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {targetLabel(c.targetType)} · {c.totalRecipients} recipient{c.totalRecipients === 1 ? '' : 's'}
                      {c.scheduledFor && ` · Scheduled for ${formatDateTime(c.scheduledFor)}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: meta.bg, color: meta.color }}>{meta.label || c.status}</span>
                    <button onClick={() => handleCancel(c)} disabled={cancellingId === c.id}
                      style={{ border: '1px solid var(--border-strong)', background: 'var(--surface)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#c53030', cursor: cancellingId === c.id ? 'not-allowed' : 'pointer' }}>
                      {cancellingId === c.id ? 'Cancelling…' : 'Cancel'}
                    </button>
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 4, background: 'var(--surface-alt)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#4f46e5', transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>Sent: {c.sentCount}</span>
                  <span>Delivered: {c.deliveredCount}</span>
                  <span>Failed: {c.failedCount}</span>
                  <span>Pending: {c.pendingCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
