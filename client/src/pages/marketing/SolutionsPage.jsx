import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SEOMeta from '../../components/SEOMeta';
import './marketing.css';

const solutions = [
  {
    id: 1,
    icon: '👨‍🏫',
    name: 'Teacher Management',
    description: 'Comprehensive teacher management with attendance tracking, performance evaluation, and credential management.',
    features: ['Teacher profiles & credentials', 'Attendance tracking', 'Performance evaluation', 'Timetable management', 'Salary processing'],
  },
  {
    id: 2,
    icon: '📋',
    name: 'Leave Management',
    description: 'Streamlined leave request and approval system for both teachers and students with instant notifications.',
    features: ['Leave request submission', 'Approval workflow', 'Leave balance tracking', 'Email notifications', 'Leave reports'],
  },
  {
    id: 3,
    icon: '⏰',
    name: 'Timetable Management',
    description: 'Create and manage school timetables with conflict detection, automated generation, and easy distribution.',
    features: ['Automated generation', 'Conflict detection', 'Class scheduling', 'Teacher scheduling', 'Room allocation'],
  },
  {
    id: 4,
    icon: '🚌',
    name: 'Transport Management',
    description: 'Manage school transport routes, vehicle tracking, driver management, and student allocation.',
    features: ['Route management', 'Vehicle tracking', 'Driver management', 'Student allocation', 'GPS tracking'],
  },
  {
    id: 5,
    icon: '💰',
    name: 'Fee Management',
    description: 'Complete fee collection, payment tracking, receipt generation, and automated payment reminders.',
    features: ['Fee structure setup', 'Payment tracking', 'Receipt generation', 'Payment reminders', 'Refund management'],
  },
  {
    id: 6,
    icon: '📊',
    name: 'Expense Management',
    description: 'Track and manage school expenses with detailed reporting, budget management, and analytics.',
    features: ['Expense tracking', 'Budget management', 'Expense reports', 'Category-wise analysis', 'Audit trails'],
  },
];

const SolutionsPage = () => {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="mkt-page">
      <SEOMeta
        title="Features & Solutions — School Management Software"
        description="Explore all features of My-Skoolz school management software: student management, fee collection, teacher management, attendance tracking, timetables, transport, and more."
        keywords="school management features, student management system, fee management software, school attendance software, school timetable software, teacher management system"
        path="/solutions"
      />
      {/* Hero */}
      <section className="mkt-solutions-hero">
        <div className="mkt-container">
          <span className="mkt-section-tag" style={{ background: 'rgba(255,255,255,.15)', color: 'white' }}>
            Our Solutions
          </span>
          <h1>Everything Your School Needs</h1>
          <p>A comprehensive suite of tools built for modern school management — from admissions to alumni.</p>
        </div>
      </section>

      {/* Solutions Grid */}
      <section style={{ padding: '80px 0', background: 'var(--bg)' }}>
        <div className="mkt-container">
          <div className="mkt-solutions-grid">
            {solutions.map((s) => (
              <div
                key={s.id}
                className={`mkt-solution-card ${expandedId === s.id ? 'mkt-solution-card--expanded' : ''}`}
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              >
                <div className="mkt-solution-card__head">
                  <div className="mkt-solution-card__icon">{s.icon}</div>
                  <h3>{s.name}</h3>
                </div>
                <p>{s.description}</p>
                <div className="mkt-solution-card__toggle">
                  {expandedId === s.id ? '▲ Hide details' : '▼ See features'}
                </div>

                {expandedId === s.id && (
                  <div className="mkt-solution-features">
                    <h4>Key Features</h4>
                    <ul>
                      {s.features.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mkt-cta-banner">
        <div className="mkt-container">
          <div className="mkt-cta-banner__inner">
            <div className="mkt-cta-banner__text">
              <h2>See All Features in Action</h2>
              <p>Book a personalized demo and discover how My-Skoolz can transform your school's operations.</p>
            </div>
            <div className="mkt-cta-banner__actions">
              <Link to="/marketing/demo" className="mkt-btn mkt-btn--white mkt-btn--lg">
                Book a Free Demo →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SolutionsPage;
