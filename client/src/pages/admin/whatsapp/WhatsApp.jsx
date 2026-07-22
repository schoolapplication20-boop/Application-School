import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import { whatsappAPI, adminAPI } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import DashboardTab from './DashboardTab';
import FeeReminderTab from './FeeReminderTab';
import TemplatesTab from './TemplatesTab';
import HistoryTab from './HistoryTab';
import SettingsTab from './SettingsTab';

const TABS = [
  { key: 'dashboard',    label: 'Dashboard',    icon: 'dashboard' },
  { key: 'fee-reminder', label: 'Fee Reminder', icon: 'payments' },
  { key: 'templates',    label: 'Templates',    icon: 'description' },
  { key: 'history',      label: 'History',      icon: 'history' },
  { key: 'settings',     label: 'Settings',     icon: 'settings' },
];

export default function WhatsApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [students, setStudents] = useState([]);

  const showToast = useToast();

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await whatsappAPI.getStats();
      setStats(res.data?.data ?? null);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await whatsappAPI.getTemplates(activeTab === 'fee-reminder');
      setTemplates(res.data?.data ?? []);
    } catch {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminAPI.getStudents({});
        const raw = res.data?.data;
        const arr = raw?.content ?? raw ?? [];
        setStudents(Array.isArray(arr) ? arr.filter(s => s.isActive !== false) : []);
      } catch {
        setStudents([]);
      }
    })();
  }, []);

  return (
    <Layout pageTitle="WhatsApp">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <span className="material-icons" style={{ fontSize: 28, color: '#25D366' }}>chat</span>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>WhatsApp</h1>
      </div>
      <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 14 }}>
        Send fee reminders to parents via WhatsApp, and track payment confirmations and receipt deliveries.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: 'none',
              background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              color: activeTab === t.key ? '#25D366' : 'var(--text-secondary)',
              borderBottom: activeTab === t.key ? '2px solid #25D366' : '2px solid transparent',
              marginBottom: -1,
            }}>
            <span className="material-icons" style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && <DashboardTab stats={stats} loading={statsLoading} />}

      {activeTab === 'fee-reminder' && (
        <FeeReminderTab
          templates={templates.filter(t => t.isActive && t.category === 'FEE_REMINDER' && t.approvalStatus === 'APPROVED')}
          students={students}
          showToast={showToast}
          onSent={() => { loadStats(); }}
        />
      )}

      {activeTab === 'templates' && (
        <TemplatesTab templates={templates} loading={templatesLoading} showToast={showToast} onChanged={loadTemplates} />
      )}

      {activeTab === 'history' && <HistoryTab showToast={showToast} />}

      {activeTab === 'settings' && <SettingsTab showToast={showToast} />}
    </Layout>
  );
}
