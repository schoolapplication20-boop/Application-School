import React from 'react';
import { CAMPAIGN_STATUS_META, LOG_STATUS_META, targetLabel, formatDateTime } from './constants';

const STAT_CARDS = [
  { key: 'sentToday',          label: 'Sent Today',           icon: 'send',           color: '#2b6cb0', bg: '#ebf8ff' },
  { key: 'sentThisMonth',      label: 'Sent This Month',      icon: 'calendar_month', color: '#553c9a', bg: '#faf5ff' },
  { key: 'deliveredThisMonth', label: 'Delivered This Month', icon: 'task_alt',       color: '#276749', bg: '#f0fff4' },
  { key: 'failedThisMonth',    label: 'Failed This Month',    icon: 'error_outline',  color: '#c53030', bg: '#fff5f5' },
  { key: 'pendingInQueue',     label: 'Pending In Queue',     icon: 'hourglass_top',  color: '#c05621', bg: '#fffaf0' },
];

export default function DashboardTab({ stats, loading }) {
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
        Loading dashboard…
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      {/* Provider status banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, marginBottom: 16,
        background: stats.providerConfigured ? '#f0fff4' : '#fffaf0',
        color: stats.providerConfigured ? '#276749' : '#c05621',
        fontSize: 13, fontWeight: 600,
      }}>
        <span className="material-icons" style={{ fontSize: 18 }}>{stats.providerConfigured ? 'check_circle' : 'warning'}</span>
        {stats.providerConfigured
          ? `SMS provider "${stats.providerName}" is configured and ready.`
          : `SMS provider "${stats.providerName || 'unknown'}" is not configured. Messages will queue but fail to send until credentials are set.`}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {STAT_CARDS.map(card => (
          <div key={card.key} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-icons" style={{ color: card.color, fontSize: 20 }}>{card.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{stats[card.key] ?? 0}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        {/* Recent campaigns */}
        <div className="data-table-card">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
            Recent Campaigns
          </div>
          {(!stats.recentCampaigns || stats.recentCampaigns.length === 0) ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8, color: 'var(--border-strong)' }}>sms</span>
              No campaigns yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {stats.recentCampaigns.map(c => {
                const meta = CAMPAIGN_STATUS_META[c.status] || {};
                return (
                  <div key={c.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {targetLabel(c.targetType)} · {formatDateTime(c.createdAt)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.sentCount + c.deliveredCount}/{c.totalRecipients}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: meta.bg, color: meta.color }}>{meta.label || c.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="data-table-card">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
            Status Breakdown (All Time)
          </div>
          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(stats.statusBreakdown || {}).map(([status, count]) => {
              const meta = LOG_STATUS_META[status] || {};
              return (
                <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color || '#a0aec0', display: 'inline-block' }} />
                    {meta.label || status}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
