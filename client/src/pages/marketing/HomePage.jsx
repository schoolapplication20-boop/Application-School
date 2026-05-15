import React from 'react';
import { Link } from 'react-router-dom';
import './marketing.css';

const HomePage = () => {
  return (
    <div className="marketing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Welcome to My-Skoolz</h1>
          <p className="hero-subtitle">Complete School Management System for Modern Education</p>
          <Link to="/marketing/demo" className="cta-button">
            Book a Free Demo
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>Why Choose My-Skoolz?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Comprehensive Management</h3>
            <p>Manage all aspects of your school operations in one place</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>User Friendly</h3>
            <p>Intuitive interface designed for teachers, parents, and students</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Secure & Reliable</h3>
            <p>Enterprise-level security for all your school data</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Real-time Updates</h3>
            <p>Instant notifications and updates for all stakeholders</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Transform Your School?</h2>
        <p>Join hundreds of schools already using My-Skoolz</p>
        <Link to="/marketing/demo" className="cta-button primary">
          Schedule Your Free Demo Today
        </Link>
      </section>
    </div>
  );
};

export default HomePage;
