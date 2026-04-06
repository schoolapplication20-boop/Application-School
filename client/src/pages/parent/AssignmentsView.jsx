import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { parentAPI } from '../../services/api';

const subjectColors = {
  'Mathematics': '#76C442', 'Math': '#76C442',
  'Science': '#3182ce',
  'English': '#805ad5',
  'Social Studies': '#e53e3e', 'Social': '#e53e3e',
  'Hindi': '#ed8936',
  'Computer Science': '#38b2ac', 'Computer': '#38b2ac',
};

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

export default function AssignmentsView() {
  const { user } = useAuth();
  const [child,        setChild]        = useState(null);
  const [assignments,  setAssignments]  = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId,   setExpandedId]   = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    parentAPI.getMyChildren()
      .then(res => {
        const list = res.data?.data ?? [];
        const c = list[0] ?? null;
        setChild(c);
        if (!c?.id) { setLoading(false); return; }
        return parentAPI.getChildAssignments(c.id);
      })
      .then(res => {
        if (res) setAssignments(res.data?.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filtered = assignments.filter(a => !filterStatus || a.status === filterStatus);

  if (loading) {
    return (
      <Layout pageTitle="Assignments">
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#a0aec0' }}>
          <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>hourglass_empty</span>
          Loading…
        </div>
      </Layout>
    );
  }

  if (!child) {
    return (
      <Layout pageTitle="Assignments">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <span className="material-icons" style={{ fontSize: 64, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>child_care</span>
          <p style={{ color: '#a0aec0', fontSize: 13 }}>No child linked to your account.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Assignments">
      <div className="page-header">
        <h1>Assignments</h1>
        <p>View {child.name}'s current and completed assignments</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total',         value: assignments.length,                                       color: '#3182ce', icon: 'assignment' },
          { label: 'Pending',       value: assignments.filter(a => a.status === 'Pending').length,   color: '#ed8936', icon: 'pending_actions' },
          { label: 'Submitted',     value: assignments.filter(a => a.status === 'Submitted').length, color: '#76C442', icon: 'assignment_turned_in' },
          { label: 'High Priority', value: assignments.filter(a => a.priority === 'High').length,    color: '#e53e3e', icon: 'priority_high' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: c.color + '15' }}>
              <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="data-table-card">
        <div className="search-filter-bar" style={{ marginBottom: '20px' }}>
          <div className="data-table-title" style={{ flex: 1 }}>All Assignments</div>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Submitted">Submitted</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>
            No assignments found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(a => {
              const subjectColor = subjectColors[a.subject] || '#76C442';
              const isExpanded   = expandedId === a.id;
              const priorityColor = a.priority === 'High' ? '#e53e3e' : a.priority === 'Medium' ? '#ed8936' : '#76C442';
              return (
                <div key={a.id} style={{ border: `1px solid ${isExpanded ? subjectColor + '40' : '#f0f4f8'}`, borderRadius: '12px', overflow: 'hidden', transition: 'all 0.2s' }}>
                  <div
                    style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: subjectColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-icons" style={{ color: subjectColor, fontSize: '22px' }}>
                        {a.status === 'Submitted' ? 'assignment_turned_in' : 'assignment'}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#2d3748' }}>{a.title}</span>
                        {a.priority && (
                          <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, background: priorityColor + '15', color: priorityColor }}>{a.priority}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {a.subject  && <span style={{ fontSize: '12px', color: subjectColor, fontWeight: 600 }}>{a.subject}</span>}
                        {a.teacher  && <span style={{ fontSize: '12px', color: '#a0aec0' }}>By {a.teacher}</span>}
                        {a.dueDate  && <span style={{ fontSize: '12px', color: '#a0aec0' }}>Due: {fmtDate(a.dueDate)}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {a.status && (
                        <span className={`status-badge ${a.status === 'Submitted' ? 'status-paid' : 'status-pending'}`}>{a.status}</span>
                      )}
                      <span className="material-icons" style={{ color: '#a0aec0', fontSize: '18px', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                        expand_more
                      </span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f7fafc' }}>
                      {a.description && (
                        <p style={{ fontSize: '13px', color: '#718096', lineHeight: '1.6', marginBottom: '12px', paddingTop: '12px' }}>{a.description}</p>
                      )}
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {[
                          a.assignedDate && { icon: 'calendar_today', text: `Assigned: ${fmtDate(a.assignedDate)}` },
                          a.dueDate      && { icon: 'alarm',          text: `Due: ${fmtDate(a.dueDate)}` },
                          a.teacher      && { icon: 'person',         text: `Teacher: ${a.teacher}` },
                        ].filter(Boolean).map((info, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="material-icons" style={{ fontSize: '14px', color: '#a0aec0' }}>{info.icon}</span>
                            <span style={{ fontSize: '12px', color: '#718096' }}>{info.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
