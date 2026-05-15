import React, { useState } from 'react';
import axios from 'axios';
import SEOMeta from '../../components/SEOMeta';
import './marketing.css';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const BookDemoPage = () => {
  const [formData, setFormData] = useState({
    schoolName: '',
    contactPerson: '',
    email: '',
    phone: '',
    schoolType: 'primary',
    studentCount: '',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await axios.post(`${BACKEND_URL}/api/marketing/book-demo`, formData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 90000,
      });
      setSuccess(true);
      setFormData({
        schoolName: '',
        contactPerson: '',
        email: '',
        phone: '',
        schoolType: 'primary',
        studentCount: '',
        message: ''
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error;
      if (msg) {
        setError(msg);
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('The server is starting up — please wait a moment and try again.');
      } else {
        setError('Unable to reach the server. Please WhatsApp or contact us directly to book your demo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mkt-page">
      <SEOMeta
        title="Book a Free Demo — School Management Software"
        description="Book a free personalized demo of My-Skoolz school management system. See exactly how it works for your school — no credit card required, no commitment."
        keywords="school management demo, free school software demo, school ERP demo, my-skoolz demo"
        path="/demo"
      />
      <section className="mkt-solutions-hero">
        <div className="mkt-container">
          <span className="mkt-section-tag" style={{ background: 'rgba(255,255,255,.15)', color: 'white' }}>Free Demo</span>
          <h1>Book Your Free Demo</h1>
          <p>Experience My-Skoolz with your school data — personalized, no commitment</p>
        </div>
      </section>

      <section className="demo-section">
        <div className="demo-container">
          <div className="demo-info">
            <h2>Why Book a Demo?</h2>
            <div className="demo-benefits">
              <div className="benefit">
                <span className="benefit-icon">✓</span>
                <div>
                  <h3>Personalized Walkthrough</h3>
                  <p>See how My-Skoolz works for your specific school</p>
                </div>
              </div>
              <div className="benefit">
                <span className="benefit-icon">✓</span>
                <div>
                  <h3>No Credit Card Required</h3>
                  <p>Completely free with no commitment</p>
                </div>
              </div>
              <div className="benefit">
                <span className="benefit-icon">✓</span>
                <div>
                  <h3>Expert Guidance</h3>
                  <p>Our team will help you understand all features</p>
                </div>
              </div>
              <div className="benefit">
                <span className="benefit-icon">✓</span>
                <div>
                  <h3>Quick Setup</h3>
                  <p>Start using My-Skoolz immediately after demo</p>
                </div>
              </div>
            </div>
          </div>

          <div className="demo-form-wrapper">
            <h2>Get Started</h2>
            <form onSubmit={handleSubmit} className="demo-form">
              {error && (
                <div className="error-message">
                  ✗ {error}
                </div>
              )}

              {success && (
                <div className="success-message">
                  ✓ Demo booking submitted successfully! We'll contact you within 24 hours.
                </div>
              )}

              <div className="form-group">
                <label htmlFor="schoolName">School Name *</label>
                <input
                  type="text"
                  id="schoolName"
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleChange}
                  required
                  placeholder="Enter your school name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contactPerson">Contact Person *</label>
                <input
                  type="text"
                  id="contactPerson"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  required
                  placeholder="Your full name"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="your@email.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="schoolType">School Type *</label>
                  <select
                    id="schoolType"
                    name="schoolType"
                    value={formData.schoolType}
                    onChange={handleChange}
                    required
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="senior">Senior Secondary</option>
                    <option value="college">College</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="studentCount">Number of Students *</label>
                  <input
                    type="number"
                    id="studentCount"
                    name="studentCount"
                    value={formData.studentCount}
                    onChange={handleChange}
                    required
                    placeholder="e.g., 500"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="message">Tell us about your school (Optional)</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Any specific features or concerns you'd like to discuss?"
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Booking Demo...' : 'Book My Free Demo'}
              </button>

              <p className="form-note">
                We'll send you a personalized demo link via email within 24 hours.
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BookDemoPage;
