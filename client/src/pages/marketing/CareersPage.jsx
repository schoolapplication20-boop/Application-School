import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './marketing.css';

const openPositions = [
  { id: 1, title: 'Full Stack Developer', location: 'Remote (India)', type: 'Full Time', dept: 'Engineering', desc: 'Build and scale our React + Spring Boot platform. You\'ll own entire features from DB to UI.' },
  { id: 2, title: 'UI/UX Designer', location: 'Remote (India)', type: 'Full Time', dept: 'Product', desc: 'Design intuitive interfaces for 500+ schools. You care deeply about user research and pixel-perfect execution.' },
  { id: 3, title: 'Product Manager', location: 'Hyderabad / Remote', type: 'Full Time', dept: 'Product', desc: 'Lead the evolution of our platform. You will work directly with schools to define, prioritize, and ship.' },
  { id: 4, title: 'Customer Success Executive', location: 'Remote (India)', type: 'Full Time', dept: 'Success', desc: 'Be the champion for our school customers. You will onboard, train, and support schools to get maximum value from My-Skoolz.' },
  { id: 5, title: 'Business Development Executive', location: 'Remote (India)', type: 'Full Time', dept: 'Sales', desc: 'Identify and onboard new schools. You have a passion for education and a talent for consultative sales.' },
];

const benefits = [
  { icon: '🚀', title: 'Mission-Driven Work', desc: 'Your work directly impacts how schools across India are managed and how students learn.' },
  { icon: '🏠', title: 'Remote First', desc: 'Work from anywhere in India. We are a remote-friendly culture with optional co-working spaces.' },
  { icon: '💰', title: 'Competitive Pay', desc: 'Market-rate salaries with performance bonuses and equity for early team members.' },
  { icon: '📚', title: 'Learning Budget', desc: '₹25,000/year for courses, books, conferences, and any learning that makes you better.' },
  { icon: '🏥', title: 'Health Benefits', desc: 'Comprehensive health insurance for you and your immediate family from day one.' },
  { icon: '⏰', title: 'Flexible Hours', desc: 'We care about outcomes, not hours. Work when you are most productive.' },
];

const DEFAULT_FORM = { applicantName: '', email: '', phone: '', position: '', experience: '', coverLetter: '' };

const CareersPage = () => {
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const openModal = (position) => {
    setSelectedPosition(position);
    setFormData({ ...DEFAULT_FORM, position: position.title });
    setSuccess(false);
    setError('');
  };

  const closeModal = () => {
    setSelectedPosition(null);
    setFormData(DEFAULT_FORM);
    setSuccess(false);
    setError('');
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/marketing/apply-job', formData);
      setSuccess(true);
      setFormData(DEFAULT_FORM);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please email us directly at navaneeswar1861@gmail.com');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mkt-page">

      {/* ── Hero ── */}
      <section className="mkt-solutions-hero">
        <div className="mkt-container">
          <span className="mkt-section-tag" style={{ background: 'rgba(255,255,255,.15)', color: 'white' }}>Careers</span>
          <h1>Build the Future of Education</h1>
          <p>Join a passionate team creating India's most trusted school management platform. We're small, fast, and have a big mission.</p>
        </div>
      </section>

      {/* ── Culture image ── */}
      <section className="mkt-careers-culture">
        <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80" alt="Team collaborating" />
        <div className="mkt-careers-culture__overlay">
          <div className="mkt-careers-culture__stat"><span>500+</span> Schools Impacted</div>
          <div className="mkt-careers-culture__stat"><span>1 Lakh+</span> Students Served</div>
          <div className="mkt-careers-culture__stat"><span>25+</span> Team Members</div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section style={{ padding: '80px 0', background: 'var(--white)' }}>
        <div className="mkt-container">
          <div className="mkt-section-header">
            <span className="mkt-section-tag">Why My-Skoolz</span>
            <h2>Why Work With Us?</h2>
            <p>We're building something meaningful. Here's what we offer to everyone on the team.</p>
          </div>
          <div className="mkt-features__grid">
            {benefits.map((b) => (
              <div key={b.title} className="mkt-feature-card">
                <div className="mkt-feature-card__icon">{b.icon}</div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Open Positions ── */}
      <section style={{ padding: '80px 0', background: 'var(--bg)' }}>
        <div className="mkt-container">
          <div className="mkt-section-header">
            <span className="mkt-section-tag">Open Roles</span>
            <h2>Open Positions</h2>
            <p>We're hiring across functions. If you don't see the right role, send us your resume anyway.</p>
          </div>
          <div className="mkt-positions-list">
            {openPositions.map((p) => (
              <div key={p.id} className="mkt-position-item">
                <div className="mkt-position-item__info">
                  <div className="mkt-position-item__dept">{p.dept}</div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                  <div className="mkt-position-item__meta">
                    <span>📍 {p.location}</span>
                    <span>🕐 {p.type}</span>
                  </div>
                </div>
                <button className="mkt-btn mkt-btn--primary" onClick={() => openModal(p)}>
                  Apply Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── No fit? ── */}
      <section className="mkt-cta-banner">
        <div className="mkt-container">
          <div className="mkt-cta-banner__inner">
            <div className="mkt-cta-banner__text">
              <h2>Don't See a Perfect Fit?</h2>
              <p>We're always looking for talented people who believe in our mission. Send us your resume and tell us how you can contribute.</p>
            </div>
            <div className="mkt-cta-banner__actions">
              <a href="mailto:navaneeswar1861@gmail.com?subject=My-Skoolz Open Application" className="mkt-btn mkt-btn--white mkt-btn--lg">
                Send Your Resume →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Application Modal ── */}
      {selectedPosition && (
        <div className="mkt-modal-backdrop" onClick={closeModal}>
          <div className="mkt-modal" onClick={(e) => e.stopPropagation()}>
            <button className="mkt-modal__close" onClick={closeModal}>✕</button>

            {success ? (
              <div className="mkt-modal__success">
                <div className="mkt-modal__success-icon">✓</div>
                <h2>Application Submitted!</h2>
                <p>Thank you for applying for <strong>{selectedPosition.title}</strong>. We've sent a confirmation to your email and will review your application within 5-7 business days.</p>
                <button className="mkt-btn mkt-btn--primary" onClick={closeModal} style={{ marginTop: '20px' }}>Close</button>
              </div>
            ) : (
              <>
                <div className="mkt-modal__header">
                  <h2>Apply for {selectedPosition.title}</h2>
                  <p>{selectedPosition.location} · {selectedPosition.type}</p>
                </div>

                {error && <div className="mkt-error-msg">{error}</div>}

                <form onSubmit={handleSubmit} className="mkt-modal__form">
                  <div className="mkt-form-row">
                    <div className="mkt-form-group">
                      <label>Full Name *</label>
                      <input name="applicantName" value={formData.applicantName} onChange={handleChange} required placeholder="Your full name" />
                    </div>
                    <div className="mkt-form-group">
                      <label>Email Address *</label>
                      <input name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="your@email.com" />
                    </div>
                  </div>
                  <div className="mkt-form-row">
                    <div className="mkt-form-group">
                      <label>Phone Number *</label>
                      <input name="phone" type="tel" value={formData.phone} onChange={handleChange} required placeholder="+91 XXXXXXXXXX" />
                    </div>
                    <div className="mkt-form-group">
                      <label>Years of Experience *</label>
                      <select name="experience" value={formData.experience} onChange={handleChange} required>
                        <option value="">Select experience</option>
                        <option value="0-1 years">0–1 years (Fresher)</option>
                        <option value="1-3 years">1–3 years</option>
                        <option value="3-5 years">3–5 years</option>
                        <option value="5-8 years">5–8 years</option>
                        <option value="8+ years">8+ years</option>
                      </select>
                    </div>
                  </div>
                  <div className="mkt-form-group">
                    <label>Cover Letter / Why do you want to join? *</label>
                    <textarea name="coverLetter" value={formData.coverLetter} onChange={handleChange} required rows={5} placeholder="Tell us about yourself, your motivation, and what excites you about this role..." />
                  </div>
                  <button type="submit" className="mkt-submit-btn" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Application'}
                  </button>
                  <p className="mkt-form-note">We'll send a confirmation to your email address.</p>
                </form>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default CareersPage;
