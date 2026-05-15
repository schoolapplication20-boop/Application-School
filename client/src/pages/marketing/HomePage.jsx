import React from 'react';
import { Link } from 'react-router-dom';
import './marketing.css';

const stats = [
  { value: '500+', label: 'Schools Onboarded' },
  { value: '1 Lakh+', label: 'Students Managed' },
  { value: '98%', label: 'Customer Satisfaction' },
  { value: '24/7', label: 'Support Available' },
];

const features = [
  {
    icon: '🎓',
    title: 'Student Management',
    desc: 'Complete student lifecycle — admissions, profiles, attendance, grades, and progress reports in one place.',
  },
  {
    icon: '👨‍🏫',
    title: 'Teacher Management',
    desc: 'Manage teacher profiles, timetables, attendance, performance, and salary all from a single dashboard.',
  },
  {
    icon: '💰',
    title: 'Fee Management',
    desc: 'Automate fee collection, generate receipts, track dues, and send payment reminders instantly.',
  },
  {
    icon: '🚌',
    title: 'Transport Tracking',
    desc: 'Assign routes, manage drivers, allocate students to buses, and track vehicles in real time.',
  },
  {
    icon: '📋',
    title: 'Leave Management',
    desc: 'Seamless leave request and approval flow for both staff and students with balance tracking.',
  },
  {
    icon: '📊',
    title: 'Reports & Analytics',
    desc: 'Insightful dashboards and reports to help administrators make data-driven decisions with ease.',
  },
];

const steps = [
  {
    step: '01',
    title: 'Book a Free Demo',
    desc: 'Schedule a personalized walkthrough with our team tailored to your school\'s needs.',
  },
  {
    step: '02',
    title: 'Onboard Your School',
    desc: 'Our team sets up your school profile, imports data, and configures the system in days — not months.',
  },
  {
    step: '03',
    title: 'Go Live & Grow',
    desc: 'Start managing your school smarter with full support from our dedicated customer success team.',
  },
];

const testimonials = [
  {
    quote: 'My-Skoolz has completely changed how we manage day-to-day operations. The fee collection alone saved us 10 hours a week.',
    name: 'Priya Sharma',
    role: 'Principal, Sunrise Public School',
    avatar: 'PS',
  },
  {
    quote: 'The parent communication and attendance tracking features are outstanding. Parents love the transparency.',
    name: 'Ravi Menon',
    role: 'Administrator, Greenwood Academy',
    avatar: 'RM',
  },
  {
    quote: 'Implementation was smooth and the support team is always there. Best investment we made for our school.',
    name: 'Anita Joshi',
    role: 'Director, St. Mary\'s School',
    avatar: 'AJ',
  },
];

const HomePage = () => {
  return (
    <div className="mkt-page">

      {/* ── Hero ── */}
      <section className="mkt-hero">
        <div className="mkt-hero__bg-shapes">
          <div className="mkt-hero__shape mkt-hero__shape--1" />
          <div className="mkt-hero__shape mkt-hero__shape--2" />
        </div>
        <div className="mkt-hero__content">
          <div className="mkt-hero__badge">
            <span className="mkt-badge-dot" />
            Trusted by 500+ Schools Across India
          </div>
          <h1 className="mkt-hero__title">
            The All-in-One<br />
            <span className="mkt-text-gradient">School Management</span><br />
            Platform
          </h1>
          <p className="mkt-hero__subtitle">
            Streamline every aspect of your school — from admissions to alumni — with a powerful, easy-to-use platform built for modern education.
          </p>
          <div className="mkt-hero__actions">
            <Link to="/marketing/demo" className="mkt-btn mkt-btn--primary mkt-btn--lg">
              Book a Free Demo
              <span className="mkt-btn__arrow">→</span>
            </Link>
            <Link to="/marketing/solutions" className="mkt-btn mkt-btn--outline mkt-btn--lg">
              Explore Features
            </Link>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="mkt-hero__mockup">
          <div className="mkt-mockup">
            <div className="mkt-mockup__bar">
              <span /><span /><span />
            </div>
            <div className="mkt-mockup__body">
              <div className="mkt-mockup__sidebar">
                <div className="mkt-mockup__nav-item mkt-mockup__nav-item--active" />
                <div className="mkt-mockup__nav-item" />
                <div className="mkt-mockup__nav-item" />
                <div className="mkt-mockup__nav-item" />
                <div className="mkt-mockup__nav-item" />
              </div>
              <div className="mkt-mockup__content">
                <div className="mkt-mockup__stats">
                  <div className="mkt-mockup__stat mkt-mockup__stat--blue" />
                  <div className="mkt-mockup__stat mkt-mockup__stat--green" />
                  <div className="mkt-mockup__stat mkt-mockup__stat--orange" />
                </div>
                <div className="mkt-mockup__chart" />
                <div className="mkt-mockup__table">
                  <div className="mkt-mockup__row" />
                  <div className="mkt-mockup__row" />
                  <div className="mkt-mockup__row" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="mkt-stats">
        <div className="mkt-container">
          <div className="mkt-stats__grid">
            {stats.map((s) => (
              <div key={s.label} className="mkt-stats__item">
                <div className="mkt-stats__value">{s.value}</div>
                <div className="mkt-stats__label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mkt-features">
        <div className="mkt-container">
          <div className="mkt-section-header">
            <span className="mkt-section-tag">Features</span>
            <h2>Everything You Need to Run Your School</h2>
            <p>A complete suite of tools designed to reduce admin overhead and let educators focus on what matters — teaching.</p>
          </div>
          <div className="mkt-features__grid">
            {features.map((f) => (
              <div key={f.title} className="mkt-feature-card">
                <div className="mkt-feature-card__icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mkt-features__cta">
            <Link to="/marketing/solutions" className="mkt-btn mkt-btn--outline">
              View All Features →
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mkt-how">
        <div className="mkt-container">
          <div className="mkt-section-header">
            <span className="mkt-section-tag">How It Works</span>
            <h2>Get Started in 3 Simple Steps</h2>
            <p>From demo to go-live in days. We handle the heavy lifting so you can focus on your school.</p>
          </div>
          <div className="mkt-how__grid">
            {steps.map((s, i) => (
              <div key={s.step} className="mkt-how__step">
                <div className="mkt-how__step-num">{s.step}</div>
                {i < steps.length - 1 && <div className="mkt-how__connector" />}
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="mkt-testimonials">
        <div className="mkt-container">
          <div className="mkt-section-header">
            <span className="mkt-section-tag">Testimonials</span>
            <h2>What School Leaders Say</h2>
          </div>
          <div className="mkt-testimonials__grid">
            {testimonials.map((t) => (
              <div key={t.name} className="mkt-testimonial-card">
                <div className="mkt-testimonial-card__stars">★★★★★</div>
                <p className="mkt-testimonial-card__quote">"{t.quote}"</p>
                <div className="mkt-testimonial-card__author">
                  <div className="mkt-testimonial-card__avatar">{t.avatar}</div>
                  <div>
                    <div className="mkt-testimonial-card__name">{t.name}</div>
                    <div className="mkt-testimonial-card__role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="mkt-cta-banner">
        <div className="mkt-container">
          <div className="mkt-cta-banner__inner">
            <div className="mkt-cta-banner__text">
              <h2>Ready to Transform Your School?</h2>
              <p>Join hundreds of schools already saving time and improving outcomes with My-Skoolz.</p>
            </div>
            <div className="mkt-cta-banner__actions">
              <Link to="/marketing/demo" className="mkt-btn mkt-btn--white mkt-btn--lg">
                Book a Free Demo
                <span className="mkt-btn__arrow">→</span>
              </Link>
              <Link to="/marketing/contact" className="mkt-btn mkt-btn--outline-white mkt-btn--lg">
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
