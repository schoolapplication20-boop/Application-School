import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import '../../styles/sidebar.css';
import '../../styles/dashboard.css';

const mockAssignments = [
  { id: 1, title: 'Quadratic Equations Practice', subject: 'Mathematics', teacher: 'Priya Sharma', dueDate: '20 Mar 2026', assignedDate: '10 Mar 2026', description: 'Solve problems 1-20 from chapter 4 of the textbook.', status: 'Pending', priority: 'High' },
  { id: 2, title: 'History Essay - Mughal Empire', subject: 'Social Studies', teacher: 'Amit Joshi', dueDate: '22 Mar 2026', assignedDate: '12 Mar 2026', description: 'Write a 500-word essay on the contribution of Mughal rulers.', status: 'Submitted', priority: 'Medium' },
  { id: 3, title: 'Science Lab Report', subject: 'Science', teacher: 'Rajesh Verma', dueDate: '25 Mar 2026', assignedDate: '15 Mar 2026', description: 'Prepare a detailed lab report on the acid-base experiment.', status: 'Pending', priority: 'High' },
  { id: 4, title: 'English Comprehension', subject: 'English', teacher: 'Sunita Rao', dueDate: '19 Mar 2026', assignedDate: '09 Mar 2026', description: 'Read the passage and answer the comprehension questions.', status: 'Submitted', priority: 'Low' },
  { id: 5, title: 'Hindi Creative Writing', subject: 'Hindi', teacher: 'Kavita Iyer', dueDate: '28 Mar 2026', assignedDate: '17 Mar 2026', description: 'Write a creative story in Hindi (min 300 words).', status: 'Pending', priority: 'Medium' },
  { id: 6, title: 'Computer Practical - Python', subject: 'Computer Science', teacher: 'Mohan Das', dueDate: '30 Mar 2026', assignedDate: '17 Mar 2026', description: 'Write a Python program to implement a simple calculator.', status: 'Pending', priority: 'Low' },
];

const subjectColors = {
  'Mathematics': '#76C442', 'Science': '#3182ce', 'English': '#805ad5',
  'Social Studies': '#e53e3e', 'Hindi': '#ed8936', 'Computer Science': '#38b2ac'
};

const priorityColors = { 'High': '#e53e3e', 'Medium': '#ed8936', 'Low': '#76C442' };

const AssignmentsView = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = mockAssignments.filter(a => !filterStatus || a.status === filterStatus);

  return (
    <div className="app-layout">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} mobileOpen={mobileSidebarOpen} />
      {mobileSidebarOpen && <div className="sidebar-overlay visible" onClick={() => setMobileSidebarOpen(false)} />}

      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar pageTitle="Assignments" onMenuToggle={() => {
          if (window.innerWidth <= 1024) setMobileSidebarOpen(!mobileSidebarOpen);
          else setSidebarCollapsed(!sidebarCollapsed);
        }} />

        <div className="page-content">
          <div className="page-header">
            <h1>Assignments</h1>
            <p>View Arjun's current and completed assignments</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total', value: mockAssignments.length, color: '#3182ce', icon: 'assignment' },
              { label: 'Pending', value: mockAssignments.filter(a => a.status === 'Pending').length, color: '#ed8936', icon: 'pending_actions' },
              { label: 'Submitted', value: mockAssignments.filter(a => a.status === 'Submitted').length, color: '#76C442', icon: 'assignment_turned_in' },
              { label: 'High Priority', value: mockAssignments.filter(a => a.priority === 'High').length, color: '#e53e3e', icon: 'priority_high' },
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.map(a => {
                const subjectColor = subjectColors[a.subject] || '#76C442';
                const isExpanded = expandedId === a.id;
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
                          <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, background: priorityColors[a.priority] + '15', color: priorityColors[a.priority] }}>{a.priority}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', color: subjectColor, fontWeight: 600 }}>{a.subject}</span>
                          <span style={{ fontSize: '12px', color: '#a0aec0' }}>By {a.teacher}</span>
                          <span style={{ fontSize: '12px', color: '#a0aec0' }}>Due: {a.dueDate}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className={`status-badge ${a.status === 'Submitted' ? 'status-paid' : 'status-pending'}`}>{a.status}</span>
                        <span className="material-icons" style={{ color: '#a0aec0', fontSize: '18px', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                          expand_more
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f7fafc' }}>
                        <p style={{ fontSize: '13px', color: '#718096', lineHeight: '1.6', marginBottom: '12px', paddingTop: '12px' }}>{a.description}</p>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          {[
                            { icon: 'calendar_today', text: `Assigned: ${a.assignedDate}` },
                            { icon: 'alarm', text: `Due: ${a.dueDate}` },
                            { icon: 'person', text: `Teacher: ${a.teacher}` },
                          ].map((info, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="material-icons" style={{ fontSize: '14px', color: '#a0aec0' }}>{info.icon}</span>
                              <span style={{ fontSize: '12px', color: '#718096' }}>{info.text}</span>
                            </div>
                          ))}
                        </div>
                        {a.status === 'Pending' && (
                          <div style={{ marginTop: '14px' }}>
                            <button style={{ padding: '8px 20px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                              Mark as Submitted
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentsView;
