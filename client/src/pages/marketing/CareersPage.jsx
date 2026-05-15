import React from 'react';
import './marketing.css';

const CareersPage = () => {
  const openPositions = [
    {
      id: 1,
      title: 'Full Stack Developer',
      location: 'Remote',
      type: 'Full Time',
      description: 'Join our team to build scalable school management solutions'
    },
    {
      id: 2,
      title: 'UI/UX Designer',
      location: 'Remote',
      type: 'Full Time',
      description: 'Design intuitive interfaces for our education platform'
    },
    {
      id: 3,
      title: 'Product Manager',
      location: 'India',
      type: 'Full Time',
      description: 'Lead the evolution of our school management platform'
    },
    {
      id: 4,
      title: 'Customer Success Executive',
      location: 'Remote',
      type: 'Full Time',
      description: 'Help schools succeed with My-Skoolz'
    }
  ];

  return (
    <div className="marketing-page">
      <section className="careers-hero">
        <h1>Join Our Team</h1>
        <p>Help us revolutionize school management</p>
      </section>

      <section className="careers-intro">
        <h2>Why Work at My-Skoolz?</h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <h3>🚀 Growth Opportunity</h3>
            <p>Work on innovative solutions impacting education</p>
          </div>
          <div className="benefit-card">
            <h3>💼 Professional Environment</h3>
            <p>Collaborative team of talented professionals</p>
          </div>
          <div className="benefit-card">
            <h3>🏠 Work Flexibility</h3>
            <p>Remote-friendly culture with flexible working hours</p>
          </div>
          <div className="benefit-card">
            <h3>📚 Continuous Learning</h3>
            <p>Training and development opportunities</p>
          </div>
        </div>
      </section>

      <section className="open-positions">
        <h2>Open Positions</h2>
        <div className="positions-list">
          {openPositions.length > 0 ? (
            openPositions.map(position => (
              <div key={position.id} className="position-card">
                <div className="position-header">
                  <h3>{position.title}</h3>
                  <span className="position-type">{position.type}</span>
                </div>
                <p className="position-location">📍 {position.location}</p>
                <p className="position-description">{position.description}</p>
                <button className="apply-button">Apply Now</button>
              </div>
            ))
          ) : (
            <p className="no-positions">No open positions at the moment. Check back soon!</p>
          )}
        </div>
      </section>

      <section className="careers-cta">
        <h2>Don't see a position that fits?</h2>
        <p>Send us your resume and let's talk about how you can contribute to My-Skoolz</p>
        <a href="mailto:navaneeswar1861@gmail.com" className="cta-button primary">
          Send Your Resume
        </a>
      </section>
    </div>
  );
};

export default CareersPage;
