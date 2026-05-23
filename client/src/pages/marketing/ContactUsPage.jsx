import React, { useState } from 'react';
import axios from 'axios';
import SEOMeta from '../../components/SEOMeta';
import './marketing.css';

const WHATSAPP_NUMBER = '918333838252';
const WHATSAPP_MSG = encodeURIComponent("Hi My-Skoolz, I'd like to know more about your school management platform.");
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const ContactUsPage = () => {
  const contactEmail = 'schoolapplication20@gmail.com';
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState(null); // 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      await axios.post(`${BACKEND_URL}/api/marketing/contact`, form);
      setStatus('success');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err?.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="mkt-page">
      <SEOMeta
        title="Contact Us — Get in Touch"
        description="Contact My-Skoolz via email or WhatsApp. We typically respond within 24 hours. Reach out with questions about our school management software."
        keywords="contact my-skoolz, school software support, school management help"
        path="/contact"
      />
      <section className="mkt-solutions-hero">
        <div className="mkt-container">
          <span className="mkt-section-tag" style={{ background: 'rgba(255,255,255,.15)', color: 'white' }}>Contact</span>
          <h1>Get In Touch</h1>
          <p>Have questions? We'd love to hear from you — by email or WhatsApp.</p>
        </div>
      </section>

      <section style={{ padding: '80px 0', background: 'var(--bg)' }}>
        <div className="mkt-container">
          <div className="contact-container">
            <div className="contact-info">
              <h2>Contact Information</h2>

              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <div className="contact-details">
                  <h3>Email</h3>
                  <a href={`mailto:${contactEmail}`} className="contact-link">
                    {contactEmail}
                  </a>
                </div>
              </div>

              <div className="contact-item">
                <span className="contact-icon" style={{ fontSize: '28px' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </span>
                <div className="contact-details">
                  <h3>WhatsApp</h3>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-link mkt-wa-link"
                  >
                    Chat with us on WhatsApp →
                  </a>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Fastest way to reach us</p>
                </div>
              </div>

              <div className="contact-item">
                <span className="contact-icon">💬</span>
                <div className="contact-details">
                  <h3>Response Time</h3>
                  <p>Email: within 24 hours · WhatsApp: within a few hours</p>
                </div>
              </div>

              <div className="contact-item">
                <span className="contact-icon">🕐</span>
                <div className="contact-details">
                  <h3>Business Hours</h3>
                  <p>Monday - Friday: 9:00 AM - 6:00 PM IST</p>
                  <p>Saturday - Sunday: 10:00 AM - 4:00 PM IST</p>
                </div>
              </div>
            </div>

            <div className="contact-form-wrapper">
              <h2>Send us a Message</h2>

              {status === 'success' && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '16px', marginBottom: '20px', color: '#166534' }}>
                  Message sent! We'll get back to you within 24 hours.
                </div>
              )}
              {status === 'error' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '16px', marginBottom: '20px', color: '#991b1b' }}>
                  {errorMsg}
                </div>
              )}

              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input type="text" id="name" name="name" required placeholder="Your name" value={form.name} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input type="email" id="email" name="email" required placeholder="your@email.com" value={form.email} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="subject">Subject</label>
                  <input type="text" id="subject" name="subject" required placeholder="How can we help?" value={form.subject} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea id="message" name="message" rows="6" required placeholder="Your message here..." value={form.message} onChange={handleChange} />
                </div>
                <button
                  type="submit"
                  className="mkt-btn mkt-btn--primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};


export default ContactUsPage;
