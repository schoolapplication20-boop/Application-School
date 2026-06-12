import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useToast } from '../../context/ToastContext';
import {
  fetchBuses, fetchRoutes, fetchDrivers, fetchStudentAssignments, fetchStops, fetchTransportFees,
} from '../../services/transportService';
import { TABS } from './transport/constants';
import BusesPanel from './transport/BusesPanel';
import RoutesPanel from './transport/RoutesPanel';
import DriversPanel from './transport/DriversPanel';
import StudentsPanel from './transport/StudentsPanel';
import StopsPanel from './transport/StopsPanel';
import FeesPanel from './transport/FeesPanel';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Transport() {
  const [activeTab, setActiveTab] = useState('routes');

  // Data stores
  const [buses,    setBuses]    = useState([]);
  const [routes,   setRoutes]   = useState([]);
  const [drivers,  setDrivers]  = useState([]);
  const [students, setStudents] = useState([]);
  const [stops,    setStops]    = useState([]);
  const [fees,     setFees]     = useState([]);

  // Load all data on mount from real API
  useEffect(() => {
    fetchBuses().then(data => setBuses(data));
    fetchRoutes().then(data => setRoutes(data));
    fetchDrivers().then(data => setDrivers(data));
    fetchStudentAssignments().then(data => setStudents(data));
    fetchStops().then(data => setStops(data));
    fetchTransportFees().then(data => setFees(data));
  }, []);

  const showToast = useToast();

  // Summary stats
  const stats = [
    { label: 'Total Buses',   value: buses.length,                                        icon: 'directions_bus', color: '#0de1e8' },
    { label: 'Active Routes', value: routes.filter(r => r.status === 'Active').length,    icon: 'route',          color: '#3182ce' },
    { label: 'Drivers',       value: drivers.length,                                       icon: 'badge',          color: '#805ad5' },
    { label: 'Students',      value: students.filter(s => s.status === 'Active').length,  icon: 'people',         color: '#e67e22' },
    { label: 'Total Stops',   value: stops.length,                                        icon: 'place',          color: '#e53e3e' },
    { label: 'Pending Fees',  value: fees.filter(f => f.status !== 'Paid').length,        icon: 'payments',       color: '#d69e2e' },
  ];

  return (
    <Layout pageTitle="Transport">
      {/* Page Header */}
      <div className="page-header">
        <h1>Transport Management</h1>
        <p>Manage buses, routes, drivers, student assignments, stops and fees</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '14px', marginBottom: '24px' }}>
        {stats.map(c => (
          <div key={c.label} className="stat-card" style={{ padding: '16px' }}>
            <div className="stat-icon" style={{ backgroundColor: c.color + '18' }}>
              <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="stat-value" style={{ fontSize: '22px' }}>{c.value}</div>
            <div className="stat-label" style={{ fontSize: '11px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '20px',
        background: 'var(--surface)', borderRadius: '12px', padding: '6px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid var(--border)',
        overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 18px', border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', transition: 'all 0.2s',
            background: activeTab === t.key ? '#0de1e8' : 'transparent',
            color: activeTab === t.key ? '#fff' : 'var(--text-secondary)',
          }}>
            <span className="material-icons" style={{ fontSize: '16px' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'buses' && (
        <BusesPanel
          buses={buses} setBuses={setBuses}
          routes={routes} drivers={drivers}
          showToast={showToast}
        />
      )}
      {activeTab === 'routes' && (
        <RoutesPanel routes={routes} setRoutes={setRoutes} buses={buses} drivers={drivers} showToast={showToast} />
      )}
      {activeTab === 'drivers' && (
        <DriversPanel
          drivers={drivers} setDrivers={setDrivers}
          buses={buses} students={students} showToast={showToast}
        />
      )}
      {activeTab === 'students' && (
        <StudentsPanel
          students={students} setStudents={setStudents}
          routes={routes} stops={stops} buses={buses}
          showToast={showToast}
        />
      )}
      {activeTab === 'stops' && (
        <StopsPanel stops={stops} setStops={setStops} routes={routes} showToast={showToast} />
      )}
      {activeTab === 'fees' && (
        <FeesPanel fees={fees} setFees={setFees} students={students} showToast={showToast} />
      )}
    </Layout>
  );
}
