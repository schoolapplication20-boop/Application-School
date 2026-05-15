import React from 'react';
import { Link } from 'react-router-dom';
import './marketing.css';

const values = [
  { icon: '🎯', title: 'Student-First', desc: 'Every feature we build is evaluated on one question: does it make the student experience better?' },
  { icon: '🤝', title: 'Trust & Transparency', desc: 'We build honest, open relationships with every school — no hidden charges, no lock-ins.' },
  { icon: '⚡', title: 'Move Fast', desc: 'We ship updates every week. When a school reports a problem, we fix it fast — not in months.' },
  { icon: '🌍', title: 'Accessible for All', desc: 'We believe quality school management software should be affordable for every school in India, not just elite institutions.' },
  { icon: '🔒', title: 'Data Security', desc: 'Student and school data is treated with the highest standards of security, privacy, and compliance.' },
  { icon: '📈', title: 'Continuous Growth', desc: 'We invest in our team, our product, and our customers. Growth is not a destination — it\'s a culture.' },
];

const timeline = [
  { year: '2022', title: 'The Idea', desc: 'Frustrated by outdated school software, our founders set out to build something modern, affordable, and actually useful.' },
  { year: '2023', title: 'Building the Foundation', desc: 'After 12 months of research and development, we launched our platform and began working with our first pilot schools.' },
  { year: '2024', title: 'Growing the Platform', desc: 'We added core modules — transport tracking, examinations, parent communication — based on direct feedback from school administrators.' },
  { year: '2025', title: 'Expanding Across India', desc: 'My-Skoolz is actively onboarding schools across India. We\'re building fast and improving with every school we serve.' },
];

const team = [
  { name: 'Navaneeswar', role: 'Co-Founder & CEO', initials: 'N', bg: '#2563EB' },
  { name: 'Engineering Team', role: 'Platform & Infrastructure', initials: 'E', bg: '#7C3AED' },
  { name: 'Product Team', role: 'Design & Experience', initials: 'P', bg: '#059669' },
  { name: 'Customer Success', role: 'School Partnerships', initials: 'C', bg: '#F59E0B' },
];

const AboutUsPage = () => {
  return (
    <div className="mkt-page">

      {/* ── Hero ── */}
      <section className="mkt-about-hero">
        <div className="mkt-container">
          <span className="mkt-section-tag" style={{ background: 'rgba(255,255,255,.15)', color: 'white' }}>
            About Us
          </span>
          <h1>We're on a Mission to Modernize<br />School Management in India</h1>
          <p>My-Skoolz was built by educators, engineers, and parents who were tired of outdated software that made school administration harder, not easier.</p>
        </div>
        <div className="mkt-about-hero__image">
          <img
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1400&q=80"
            alt="Students in school campus"
          />
          <div className="mkt-about-hero__image-overlay" />
        </div>
      </section>

      {/* ── Mission ── */}
      <section style={{ padding: '80px 0', background: 'var(--white)' }}>
        <div className="mkt-container">
          <div className="mkt-about-mission">
            <div className="mkt-about-mission__text">
              <span className="mkt-section-tag">Our Mission</span>
              <h2>Empowering Every School to Operate at Its Best</h2>
              <p>
                Running a school is complex — managing students, teachers, fees, timetables, transport, exams, and parent communication all at once. Most schools still rely on spreadsheets, paper registers, and fragmented apps.
              </p>
              <p>
                My-Skoolz brings everything under one roof. A single, unified platform that gives administrators clarity, teachers productivity, parents transparency, and students a better experience — all from any device.
              </p>
              <Link to="/marketing/demo" className="mkt-btn mkt-btn--primary mkt-btn--lg" style={{ marginTop: '24px', display: 'inline-flex' }}>
                See It in Action →
              </Link>
            </div>
            <div className="mkt-about-mission__image">
              <img
                src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=700&q=80"
                alt="Students learning in classroom"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section style={{ padding: '80px 0', background: 'var(--bg)' }}>
        <div className="mkt-container">
          <div className="mkt-section-header">
            <span className="mkt-section-tag">Our Values</span>
            <h2>What We Stand For</h2>
            <p>These aren't posters on a wall. They're the principles that drive every product decision, support call, and team hire.</p>
          </div>
          <div className="mkt-about-values">
            {values.map((v) => (
              <div key={v.title} className="mkt-about-value-card">
                <div className="mkt-about-value-card__icon">{v.icon}</div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Journey ── */}
      <section style={{ padding: '80px 0', background: 'var(--white)' }}>
        <div className="mkt-container">
          <div className="mkt-section-header">
            <span className="mkt-section-tag">Our Journey</span>
            <h2>Our Journey So Far</h2>
          </div>
          <div className="mkt-timeline">
            {timeline.map((t, i) => (
              <div key={t.year} className="mkt-timeline__item">
                <div className="mkt-timeline__year">{t.year}</div>
                <div className="mkt-timeline__connector" />
                <div className="mkt-timeline__content">
                  <h3>{t.title}</h3>
                  <p>{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section style={{ padding: '80px 0', background: 'var(--bg)' }}>
        <div className="mkt-container">
          <div className="mkt-section-header">
            <span className="mkt-section-tag">Our Team</span>
            <h2>The People Behind My-Skoolz</h2>
            <p>A passionate team of builders, educators, and customer success champions — all working toward the same goal.</p>
          </div>
          <div className="mkt-team-grid">
            {team.map((m) => (
              <div key={m.name} className="mkt-team-card">
                <div className="mkt-team-card__avatar" style={{ background: m.bg }}>{m.initials}</div>
                <h3>{m.name}</h3>
                <p>{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── School photo strip ── */}
      <section className="mkt-photo-strip">
        <img src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80" alt="Students in lab" />
        <img src="https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=600&q=80" alt="Classroom" />
        <img src="https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=600&q=80" alt="Teacher with students" />
        <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80" alt="Student studying" />
      </section>

      {/* ── CTA ── */}
      <section className="mkt-cta-banner">
        <div className="mkt-container">
          <div className="mkt-cta-banner__inner">
            <div className="mkt-cta-banner__text">
              <h2>Want to Be Part of the Story?</h2>
              <p>Join our team or bring My-Skoolz to your school. Either way, we'd love to hear from you.</p>
            </div>
            <div className="mkt-cta-banner__actions">
              <Link to="/marketing/demo" className="mkt-btn mkt-btn--white mkt-btn--lg">Book a Free Demo</Link>
              <Link to="/marketing/careers" className="mkt-btn mkt-btn--outline-white mkt-btn--lg">View Careers</Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default AboutUsPage;
