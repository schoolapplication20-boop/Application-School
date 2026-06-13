import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import { smsAPI, adminAPI } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import DashboardTab from './DashboardTab';
import ComposeTab from './ComposeTab';
import TemplatesTab from './TemplatesTab';
import HistoryTab from './HistoryTab';
import ScheduledTab from './ScheduledTab';
import SettingsTab from './SettingsTab';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'compose',   label: 'Compose',   icon: 'edit_note' },
  { key: 'templates', label: 'Templates', icon: 'description' },
  { key: 'history',   label: 'History',   icon: 'history' },
  { key: 'scheduled', label: 'Scheduled', icon: 'schedule_send' },
  { key: 'settings',  label: 'Settings',  icon: 'settings' },
];

export default function SMS() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);

  const showToast = useToast();

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await smsAPI.getStats();
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
      const res = await smsAPI.getTemplates(activeTab === 'compose');
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
        const res = await adminAPI.getClasses();
        const cData = res.data?.data ?? res.data ?? [];
        setClassrooms(Array.isArray(cData) ? cData : []);
      } catch {
        setClassrooms([]);
      }
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
    <Layout pageTitle="SMS Notifications">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <span className="material-icons" style={{ fontSize: 28, color: '#4f46e5' }}>sms</span>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>SMS Notifications</h1>
      </div>
      <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 14 }}>
        Send individual or bulk SMS to parents, manage templates, and track delivery.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: 'none',
              background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              color: activeTab === t.key ? '#4f46e5' : 'var(--text-secondary)',
              borderBottom: activeTab === t.key ? '2px solid #4f46e5' : '2px solid transparent',
              marginBottom: -1,
            }}>
            <span className="material-icons" style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && <DashboardTab stats={stats} loading={statsLoading} />}

      {activeTab === 'compose' && (
        <ComposeTab
          templates={templates.filter(t => t.isActive)}
          classrooms={classrooms}
          students={students}
          showToast={showToast}
          onSent={() => { loadStats(); }}
        />
      )}

      {activeTab === 'templates' && (
        <TemplatesTab templates={templates} loading={templatesLoading} showToast={showToast} onChanged={loadTemplates} />
      )}

      {activeTab === 'history' && <HistoryTab showToast={showToast} />}

      {activeTab === 'scheduled' && <ScheduledTab showToast={showToast} />}

      {activeTab === 'settings' && <SettingsTab showToast={showToast} />}
    </Layout>
  );
}
