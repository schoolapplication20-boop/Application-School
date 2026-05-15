import React from 'react';
import './marketing.css';

const ContactUsPage = () => {
  const contactEmail = 'navaneeswar1861@gmail.com';

  return (
    <div className="marketing-page">
      <section className="contact-hero">
        <h1>Get In Touch</h1>
        <p>Have questions? We'd love to hear from you.</p>
      </section>

      <section className="contact-section">
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
              <span className="contact-icon">💬</span>
              <div className="contact-details">
                <h3>Response Time</h3>
                <p>We typically respond within 24 hours</p>
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
            <form className="contact-form">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  required 
                  placeholder="Your name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  required 
                  placeholder="your@email.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input 
                  type="text" 
                  id="subject" 
                  name="subject" 
                  required 
                  placeholder="How can we help?"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea 
                  id="message" 
                  name="message" 
                  rows="6" 
                  required 
                  placeholder="Your message here..."
                ></textarea>
              </div>

              <button type="submit" className="submit-button">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactUsPage;
