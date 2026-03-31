import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { getLogs } from '../../services/activityLog';
import { superAdminAPI, adminAPI } from '../../services/api';

const MODULE_LABELS = {
  students: 'Students', teachers: 'Teachers', classes: 'Classes',
  applications: 'Applications', attendance: 'Attendance', fees: 'Fees',
  collectFee: 'Collect Fee', salaries: 'Salaries', expenses: 'Expenses',
  transport: 'Transport', leave: 'Leave',
};

export default function SuperAdminDashboard() {
  const [admins,   setAdmins]   = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    superAdminAPI.getAdmins()
      .then(res => setAdmins(res.data?.data ?? []))
      .catch(() => setAdmins([]));
    adminAPI.getTeachers()
      .then(res => setTeachers(res.data?.data ?? []))
      .catch(() => setTeachers([]));
    adminAPI.getStudents()
      .then(res => {
        const page = res.data?.data;
        const data = page?.content ?? (Array.isArray(page) ? page : []);
        setStudents(data);
      })
      .catch(() => setStudents([]));
  }, []);

  const [logs, setLogs] = useState(() => getLogs().slice(0, 10));

  useEffect(() => {
    setLogs(getLogs().slice(0, 10));
  }, [admins]);

  const activeAdmins   = admins.filter(a => a.isActive ?? true).length;
  const activeStudents = students.filter(s => s.status === 'Active').length;

  const getPermCount = (u) => u.permissions ? Object.values(u.permissions).filter(Boolean).length : 11;

  const moduleColor = { 'Students': '#76C442', 'Teachers': '#3182ce', 'Fees': '#ed8936', 'Transport': '#805ad5', 'Attendance': '#38b2ac', 'Leave': '#e53e3e', 'Classes': '#d69e2e', 'Applications': '#667eea', 'Salaries': '#48bb78', 'Expenses': '#fc8181', 'Collect Fee': '#76C442' };

  return (
    <Layout pageTitle="Super Admin Dashboard">
      <div className="page-header">
        <h1>Super Admin Dashboard</h1>
        <p>Complete overview of the school management platform</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Admins',   value: admins.length,    sub: `${activeAdmins} active`,   icon: 'manage_accounts', color: '#76C442' },
          { label: 'Total Teachers', value: teachers.length,  sub: 'registered teachers',      icon: 'school',          color: '#3182ce' },
          { label: 'Total Students', value: students.length,  sub: `${activeStudents} active`, icon: 'person',          color: '#805ad5' },
          { label: 'Active Students',value: activeStudents,   sub: 'currently active',          icon: 'how_to_reg',      color: '#ed8936' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: c.color + '18' }}>
              <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
            <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px', marginBottom: '24px' }}>
        {/* Admin List */}
        <div className="data-table-card">
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-icons" style={{ color: '#76C442', fontSize: '20px' }}>manage_accounts</span>
            Admin Overview
            <span style={{ marginLeft: 'auto', background: '#76C44220', color: '#276749', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>{admins.length} admins</span>
          </div>
          {admins.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <span className="material-icons" style={{ fontSize: 40, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>manage_accounts</span>
              <p style={{ color: '#a0aec0' }}>No admins created yet. Go to Admin Management to add one.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Admin</th><th>Permissions</th><th>Status</th><th>Created</th></tr>
                </thead>
                <tbody>
                  {admins.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                            {a.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{a.name}</div>
                            <div style={{ fontSize: '11px', color: '#a0aec0' }}>{a.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                          {a.permissions ? (
                            Object.entries(a.permissions).filter(([,v]) => v).slice(0,3).map(([k]) => (
                              <span key={k} style={{ padding: '2px 7px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, background: (moduleColor[MODULE_LABELS[k]] || '#76C442') + '20', color: moduleColor[MODULE_LABELS[k]] || '#76C442' }}>
                                {MODULE_LABELS[k]}
                              </span>
                            ))
                          ) : (
                            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, background: '#76C44220', color: '#276749' }}>Full Access</span>
                          )}
                          {a.permissions && getPermCount(a) > 3 && (
                            <span style={{ padding: '2px 7px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, background: '#f7fafc', color: '#718096' }}>+{getPermCount(a) - 3} more</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: !(a.isActive ?? true) ? '#fff5f5' : '#f0fff4', color: !(a.isActive ?? true) ? '#e53e3e' : '#76C442' }}>
                          {(a.isActive ?? true) ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ fontSize: '11px', color: '#a0aec0' }}>{a.createdAt || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="data-table-card">
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-icons" style={{ color: '#3182ce', fontSize: '20px' }}>timeline</span>
            Activity Log
          </div>
          {logs.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <span className="material-icons" style={{ fontSize: 40, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>timeline</span>
              <p style={{ color: '#a0aec0' }}>No recent activity. Actions like creating or updating admins will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {logs.map((log, i) => (
                <div key={log.id} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: i < logs.length - 1 ? '1px solid #f7fafc' : 'none' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3182ce18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-icons" style={{ fontSize: '15px', color: '#3182ce' }}>history</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#2d3748', fontWeight: 500, lineHeight: 1.4 }}>{log.action}</div>
                    <div style={{ fontSize: '10px', color: '#a0aec0', marginTop: '2px', display: 'flex', gap: '6px' }}>
                      <span style={{ background: '#f7fafc', padding: '1px 6px', borderRadius: '8px' }}>{log.module}</span>
                      <span>{log.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Student Stats */}
      <div className="data-table-card">
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-icons" style={{ color: '#805ad5', fontSize: '20px' }}>bar_chart</span>
          Student Overview
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px' }}>
          {[
            { label: 'Total Students',    value: students.length,                                            color: '#2d3748' },
            { label: 'Active',            value: students.filter(s => s.status === 'Active').length,        color: '#76C442' },
            { label: 'Inactive',          value: students.filter(s => s.status === 'Inactive').length,      color: '#e53e3e' },
            { label: 'Male',              value: students.filter(s => s.gender === 'Male').length,          color: '#3182ce' },
            { label: 'Female',            value: students.filter(s => s.gender === 'Female').length,        color: '#ed8936' },
          ].map(item => (
            <div key={item.label} style={{ padding: '16px', background: '#f7fafc', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
