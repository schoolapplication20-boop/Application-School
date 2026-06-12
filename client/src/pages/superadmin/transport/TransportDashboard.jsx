import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchBuses, fetchDrivers, fetchRoutes, fetchStops, fetchStudentAssignments } from '../../../services/transportService';

const StatCard = ({ icon, label, value, sub, color, bg }) => (
  <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '22px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 18 }}>
    <div style={{ width: 54, height: 54, borderRadius: 14, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span className="material-icons" style={{ fontSize: 28, color }}>{icon}</span>
    </div>
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

const QuickLink = ({ to, icon, label, color }) => (
  <Link to={to} style={{ textDecoration: 'none' }}>
    <div style={{ background: 'var(--surface)', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'box-shadow 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-icons" style={{ fontSize: 22, color }}>{icon}</span>
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
      <span className="material-icons" style={{ fontSize: 18, color: 'var(--text-muted)', marginLeft: 'auto' }}>chevron_right</span>
    </div>
  </Link>
);

export default function TransportDashboard() {
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBuses(), fetchDrivers(), fetchRoutes(), fetchStops(), fetchStudentAssignments()])
      .then(([b, d, r, s, a]) => { setBuses(b); setDrivers(d); setRoutes(r); setStops(s); setAssignments(a); })
      .finally(() => setLoading(false));
  }, []);

  const activeBuses = buses.filter(b => b.status === 'Active').length;
  const activeDrivers = drivers.filter(d => d.status === 'Active').length;
  const activeRoutes = routes.filter(r => r.status === 'Active').length;
  const totalCapacity = buses.reduce((s, b) => s + (b.capacity || 0), 0);
  const totalStudents = buses.reduce((s, b) => s + (b.currentStudents || 0), 0);
  const utilPct = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0;

  const recentActivities = [
    { icon: 'directions_bus', text: 'Bus KA-01-AB-1234 departed from Route A', time: '8:05 AM', color: '#3182ce' },
    { icon: 'person_pin_circle', text: 'Student Ravi Kumar boarded at Stop 3', time: '8:12 AM', color: '#38a169' },
    { icon: 'warning', text: 'Bus KA-02-CD-5678 delayed by 5 minutes', time: '8:18 AM', color: '#dd6b20' },
    { icon: 'check_circle', text: 'Route B completed all morning pickups', time: '9:02 AM', color: '#38a169' },
    { icon: 'notifications', text: 'Driver Ramesh updated ETA for Route C', time: '9:15 AM', color: '#7c3aed' },
  ];

  const busStatusData = [
    { label: 'Active', count: activeBuses, color: '#38a169' },
    { label: 'Inactive', count: buses.filter(b => b.status === 'Inactive').length, color: '#a0aec0' },
    { label: 'Maintenance', count: buses.filter(b => b.status === 'Maintenance').length, color: '#dd6b20' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border-strong)', borderTopColor: '#76C442', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ padding: '28px', background: 'var(--surface-alt)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-icons" style={{ color: '#fff', fontSize: 24 }}>directions_bus</span>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Transport Management</h1>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Overview of fleet, routes, and student assignments</div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard icon="directions_bus" label="Total Buses" value={buses.length} sub={`${activeBuses} active`} color="#3182ce" bg="#ebf8ff" />
        <StatCard icon="person" label="Drivers" value={drivers.length} sub={`${activeDrivers} on duty`} color="#38a169" bg="#f0fff4" />
        <StatCard icon="alt_route" label="Routes" value={routes.length} sub={`${activeRoutes} active`} color="#7c3aed" bg="#faf5ff" />
        <StatCard icon="place" label="Stops" value={stops.length} sub="Total stops" color="#dd6b20" bg="#fffaf0" />
        <StatCard icon="people" label="Students" value={assignments.length} sub={`${utilPct}% capacity used`} color="#e53e3e" bg="#fff5f5" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Fleet Utilization */}
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Fleet Utilization</h3>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Overall Capacity Used</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{totalStudents}/{totalCapacity} ({utilPct}%)</span>
            </div>
            <div style={{ height: 10, background: 'var(--border-strong)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${utilPct}%`, background: utilPct > 80 ? '#e53e3e' : utilPct > 60 ? '#dd6b20' : '#38a169', borderRadius: 10, transition: 'width 0.5s' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {busStatusData.map(({ label, count, color }) => (
              <div key={label} style={{ textAlign: 'center', padding: '14px 10px', background: color + '10', borderRadius: 12, border: `1px solid ${color}30` }}>
                <div style={{ fontSize: 24, fontWeight: 800, color }}>{count}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          {buses.slice(0, 4).map(bus => (
            <div key={bus.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
              <span className="material-icons" style={{ fontSize: 18, color: '#3182ce' }}>directions_bus</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{bus.busNo}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{bus.route || 'No route assigned'}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 8 }}>{bus.currentStudents}/{bus.capacity}</div>
              <div style={{ height: 6, width: 80, background: 'var(--border-strong)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${bus.capacity > 0 ? Math.round((bus.currentStudents / bus.capacity) * 100) : 0}%`, background: '#76C442', borderRadius: 6 }} />
              </div>
              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: bus.status === 'Active' ? '#f0fff4' : '#f7fafc', color: bus.status === 'Active' ? '#276749' : '#718096' }}>
                {bus.status}
              </span>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentActivities.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: a.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-icons" style={{ fontSize: 16, color: a.color }}>{a.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <QuickLink to="/superadmin/transport/buses" icon="directions_bus" label="Manage Buses" color="#3182ce" />
          <QuickLink to="/superadmin/transport/drivers" icon="person" label="Manage Drivers" color="#38a169" />
          <QuickLink to="/superadmin/transport/routes" icon="alt_route" label="Manage Routes" color="#7c3aed" />
          <QuickLink to="/superadmin/transport/stops" icon="place" label="Manage Stops" color="#dd6b20" />
          <QuickLink to="/superadmin/transport/assignments" icon="assignment_ind" label="Student Assignments" color="#e53e3e" />
          <QuickLink to="/superadmin/transport/tracking" icon="gps_fixed" label="Live Tracking" color="#00b5d8" />
          <QuickLink to="/superadmin/transport/reports" icon="bar_chart" label="Reports" color="#d69e2e" />
        </div>
      </div>

      {/* Routes Overview */}
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Routes Overview</h3>
        {routes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>alt_route</span>
            <div>No routes configured yet.</div>
            <Link to="/superadmin/transport/routes" style={{ color: '#76C442', fontWeight: 600, fontSize: 13 }}>Add your first route →</Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-alt)' }}>
                  {['Route', 'Bus', 'Driver', 'Stops', 'Distance', 'Pickup', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {routes.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{r.busNo || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{r.driverName || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{r.stops || 0}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{r.distance || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{r.pickupTime || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: r.status === 'Active' ? '#f0fff4' : '#f7fafc', color: r.status === 'Active' ? '#276749' : '#718096' }}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
