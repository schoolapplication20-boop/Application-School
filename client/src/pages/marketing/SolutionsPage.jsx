import React, { useState } from 'react';
import './marketing.css';

const SolutionsPage = () => {
  const solutions = [
    {
      id: 1,
      name: 'Teacher Management',
      icon: '👨‍🏫',
      description: 'Comprehensive teacher management system with attendance tracking, performance evaluation, and credential management.',
      features: [
        'Teacher profiles and credentials',
        'Attendance tracking',
        'Performance evaluation',
        'Timetable management',
        'Salary processing'
      ]
    },
    {
      id: 2,
      name: 'Leave Management',
      icon: '📋',
      description: 'Streamlined leave request and approval system for both teachers and students.',
      features: [
        'Leave request submission',
        'Approval workflow',
        'Leave balance tracking',
        'Email notifications',
        'Leave reports'
      ]
    },
    {
      id: 3,
      name: 'Time Table Management',
      icon: '⏰',
      description: 'Create and manage school timetables with conflict detection and easy distribution.',
      features: [
        'Automated timetable generation',
        'Conflict detection',
        'Class scheduling',
        'Teacher scheduling',
        'Room allocation'
      ]
    },
    {
      id: 4,
      name: 'Transportation Management',
      icon: '🚌',
      description: 'Manage school transport routes, vehicle tracking, and driver management.',
      features: [
        'Route management',
        'Vehicle tracking',
        'Driver management',
        'Student allocation',
        'GPS tracking'
      ]
    },
    {
      id: 5,
      name: 'Fee Management',
      icon: '💰',
      description: 'Complete fee collection, payment tracking, and automated reminders.',
      features: [
        'Fee structure setup',
        'Payment tracking',
        'Receipt generation',
        'Payment reminders',
        'Refund management'
      ]
    },
    {
      id: 6,
      name: 'Expense Management',
      icon: '📊',
      description: 'Track and manage school expenses with detailed reporting and analytics.',
      features: [
        'Expense tracking',
        'Budget management',
        'Expense reports',
        'Category-wise analysis',
        'Audit trails'
      ]
    }
  ];

  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="marketing-page">
      <section className="solutions-hero">
        <h1>Our Solutions</h1>
        <p>Comprehensive features designed for modern school management</p>
      </section>

      <section className="solutions-section">
        <div className="solutions-grid">
          {solutions.map(solution => (
            <div 
              key={solution.id} 
              className={`solution-card ${expandedId === solution.id ? 'expanded' : ''}`}
              onClick={() => setExpandedId(expandedId === solution.id ? null : solution.id)}
            >
              <div className="solution-header">
                <span className="solution-icon">{solution.icon}</span>
                <h3>{solution.name}</h3>
              </div>
              
              <p className="solution-description">{solution.description}</p>
              
              {expandedId === solution.id && (
                <div className="solution-features">
                  <h4>Key Features:</h4>
                  <ul>
                    {solution.features.map((feature, idx) => (
                      <li key={idx}>✓ {feature}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="solutions-cta">
        <h2>Explore How These Solutions Can Benefit Your School</h2>
        <a href="/marketing/demo" className="cta-button primary">
          Book a Demo to See All Features
        </a>
      </section>
    </div>
  );
};

export default SolutionsPage;
