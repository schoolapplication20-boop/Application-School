import React from 'react';
import { Link } from 'react-router-dom';
import SEOMeta from '../../components/SEOMeta';
import './marketing.css';

/* ── Structured data for Google ──────────────────────────────────────────── */

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'My-Skoolz',
  alternateName: ['My Skoolz', 'MySkoolz', 'My-Skools'],
  url: 'https://my-skoolz.com',
  description: 'All-in-one school management system for Indian schools — students, fees, teachers, attendance, timetables and more.',
};

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'My-Skoolz',
  alternateName: ['My Skoolz', 'MySkoolz', 'My-Skools'],
  url: 'https://my-skoolz.com',
  logo: {
    '@type': 'ImageObject',
    url: 'https://my-skoolz.com/logo.svg',
    width: 200,
    height: 200,
  },
  image: 'https://my-skoolz.com/logo.svg',
  description: 'My-Skoolz is India\'s modern cloud-based school management platform — students, fees, attendance, exams and more.',
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    availableLanguage: ['English', 'Hindi'],
  },
};

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'My-Skoolz',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'My-Skoolz is an all-in-one school management system for Indian schools. Manage students, fees, teachers, attendance, timetables, and more from any device.',
  url: 'https://my-skoolz.com',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR', description: 'Free demo available' },
  provider: { '@type': 'Organization', name: 'My-Skoolz', url: 'https://my-skoolz.com' },
};

const homeSchema = [websiteSchema, orgSchema, softwareSchema];

const features = [
  { icon: '🎓', title: 'Student Management',  color: '#2563EB', desc: 'Complete student lifecycle — admissions, profiles, attendance, grades, and progress reports in one place.' },
  { icon: '👨‍🏫', title: 'Teacher Management', color: '#7C3AED', desc: 'Manage teacher profiles, timetables, attendance, performance, and salary from a single dashboard.' },
  { icon: '💰', title: 'Fee Management',       color: '#059669', desc: 'Automate fee collection, generate receipts, track dues, and send payment reminders instantly.' },
  { icon: '🚌', title: 'Transport Tracking',   color: '#F59E0B', desc: 'Assign routes, manage drivers, allocate students to buses, and track vehicles in real time.' },
  { icon: '📋', title: 'Leave Management',     color: '#EF4444', desc: 'Seamless leave request and approval flow for both staff and students with balance tracking.' },
  { icon: '📊', title: 'Reports & Analytics',  color: '#0EA5E9', desc: 'Insightful dashboards and reports to help administrators make data-driven decisions.' },
];

const userRoles = [
  {
    role: 'For Administrators',
    img: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&w=700&q=80',
    title: 'Full Control. Zero Chaos.',
    desc: 'Manage your entire school from one screen. Track students, fees, staff, attendance, and more — with real-time dashboards that give you complete visibility.',
    points: ['School-wide dashboard & analytics', 'Fee collection & expense tracking', 'Staff & student management', 'Customizable access controls'],
    color: '#2563EB',
  },
  {
    role: 'For Teachers',
    img: '/teacher.png',
    title: 'Less Admin. More Teaching.',
    desc: 'Mark attendance in seconds, share homework, upload marks, and communicate with parents — all from your phone or laptop, without drowning in paperwork.',
    points: ['One-click attendance marking', 'Digital diary & homework', 'Exam marks management', 'Parent messaging'],
    color: '#7C3AED',
  },
  {
    role: 'For Students',
    img: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=700&q=80',
    title: 'Everything You Need to Succeed.',
    desc: 'Access your timetable, homework, exam schedules, attendance, and fee details all in one place. Stay organized and focused on learning.',
    points: ['Timetable & exam schedule', 'Homework & assignments', 'Attendance history', 'Leave requests'],
    color: '#F59E0B',
  },
];

const steps = [
  { step: '01', icon: '📅', title: 'Book a Free Demo', desc: 'Schedule a personalized walkthrough tailored to your school\'s specific needs and size.' },
  { step: '02', icon: '⚙️', title: 'Onboard Your School', desc: 'Our team sets up your school profile, imports data, and configures everything in days — not months.' },
  { step: '03', icon: '🚀', title: 'Go Live & Grow', desc: 'Start managing smarter from day one, with dedicated support from our customer success team.' },
];

const lifecycle = [
  [
    { icon: '📝', title: 'Admissions',    color: '#2563EB', bg: '#eff6ff', desc: 'Accept applications online, review documents, and confirm new students in a few clicks.' },
    { icon: '👨‍🎓', title: 'Enrollment',    color: '#7C3AED', bg: '#f5f3ff', desc: 'Create student profiles, assign roll numbers, sections, and issue ID cards instantly.' },
    { icon: '📅', title: 'Attendance',     color: '#059669', bg: '#ecfdf5', desc: 'Mark daily attendance from any device and trigger instant parent SMS/email alerts.' },
    { icon: '📋', title: 'Timetable',      color: '#0EA5E9', bg: '#f0f9ff', desc: 'Build class schedules, manage teacher periods, and publish timetables digitally.' },
  ],
  [
    { icon: '✏️', title: 'Exams & Marks',  color: '#F59E0B', bg: '#fffbeb', desc: 'Schedule assessments, upload marks digitally, and auto-generate report cards.' },
    { icon: '💰', title: 'Fee Collection', color: '#EF4444', bg: '#fff1f2', desc: 'Collect fees online or offline, print receipts, and send automated due reminders.' },
    { icon: '📊', title: 'Reports',        color: '#8B5CF6', bg: '#faf5ff', desc: 'Access real-time dashboards, analytics, and export reports for admin decisions.' },
    { icon: '🎓', title: 'Graduation',     color: '#10B981', bg: '#ecfdf5', desc: 'Celebrate completions, manage alumni records, and maintain a lifelong school bond.' },
  ],
];


const HomePage = () => (
  <div className="mkt-page">
    <SEOMeta
      title="School Management System & Software for Indian Schools"
      description="My-Skoolz is an all-in-one school management system built for Indian schools. Manage students, fees, teachers, attendance, timetables, and reports from any device. Book a free demo."
      keywords="school management system, school software India, school ERP software, school application, student management system, fee management software, school administration software, school management app"
      path="/"
      schema={homeSchema}
    />

    {/* ══ HERO ══ */}
    <section className="mkt-hero">
      <div className="mkt-hero__bg-shapes">
        <div className="mkt-hero__shape mkt-hero__shape--1" />
        <div className="mkt-hero__shape mkt-hero__shape--2" />
        <div className="mkt-hero__shape mkt-hero__shape--3" />
      </div>

      {/* Grid dots overlay */}
      <div className="mkt-hero__grid" />

      <div className="mkt-hero__content">
        <div className="mkt-hero__badge">
          <span className="mkt-badge-dot" />
          School Management, Reimagined
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
          <Link to="/marketing/demo" className="mkt-btn mkt-btn--hero-primary mkt-btn--lg">
            Book a Free Demo <span className="mkt-btn__arrow">→</span>
          </Link>
          <Link to="/marketing/solutions" className="mkt-btn mkt-btn--hero-ghost mkt-btn--lg">
            Explore Features
          </Link>
        </div>

        {/* Mini feature pills */}
        <div className="mkt-hero__pills">
          {['Fee Management', 'Attendance', 'Transport', 'Timetable', 'Exams', 'Reports'].map(p => (
            <span key={p} className="mkt-hero__pill">✓ {p}</span>
          ))}
        </div>
      </div>

      {/* Dashboard mockup */}
      <div className="mkt-hero__mockup">
        <div className="mkt-mockup">
          <div className="mkt-mockup__bar"><span /><span /><span /></div>
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
                <div className="mkt-mockup__row mkt-mockup__row--short" />
              </div>
            </div>
          </div>
        </div>
        {/* Floating cards */}
        <div className="mkt-mockup__float mkt-mockup__float--1">
          <span>📈</span> Attendance up this week
        </div>
        <div className="mkt-mockup__float mkt-mockup__float--2">
          <span>💳</span> ₹12,400 collected today
        </div>
      </div>
    </section>

    {/* ══ TRUST BAR ══ */}
    <section className="mkt-trust-bar">
      <div className="mkt-container">
        <p className="mkt-trust-bar__label">Designed for every type of school</p>
        <div className="mkt-trust-bar__items">
          {['Primary Schools', 'Secondary Schools', 'Senior Secondary', 'CBSE Schools', 'ICSE Schools', 'State Board Schools'].map(s => (
            <div key={s} className="mkt-trust-bar__item">
              <span className="mkt-trust-bar__dot" />
              {s}
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ══ WHAT IS MY-SKOOLZ ══ */}
    <section className="mkt-section mkt-section--white">
      <div className="mkt-container">
        <div className="mkt-what-grid">
          <div className="mkt-what__image">
            <img
              src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=700&q=80"
              alt="Students using technology in school"
            />
            <div className="mkt-what__image-badge">
              <span className="mkt-what__image-badge-icon">🏆</span>
              <div>
                <strong>All-in-One</strong>
                <span>School Platform</span>
              </div>
            </div>
          </div>
          <div className="mkt-what__text">
            <span className="mkt-section-tag">What is My-Skoolz?</span>
            <h2>One Platform to Run Your Entire School</h2>
            <p>
              My-Skoolz is a comprehensive, cloud-based school management system designed specifically for Indian schools. It replaces the maze of spreadsheets, paper registers, and disconnected apps with a single, unified platform.
            </p>
            <p>
              From the moment a student applies for admission to the day they graduate — every interaction, record, fee, attendance entry, and report lives in one place, accessible from any device.
            </p>
            <div className="mkt-what__checklist">
              {[
                'No software installation — 100% cloud-based',
                'Works on any device — desktop, tablet, or phone',
                'Onboard in days, not months — we handle the setup',
                'Dedicated support team always available',
              ].map(c => (
                <div key={c} className="mkt-what__check">
                  <span className="mkt-what__check-icon">✓</span> {c}
                </div>
              ))}
            </div>
            <Link to="/marketing/about" className="mkt-btn mkt-btn--outline" style={{ marginTop: '28px', display: 'inline-flex' }}>
              Learn About Us →
            </Link>
          </div>
        </div>
      </div>
    </section>

    {/* ══ FEATURES ══ */}
    <section className="mkt-section mkt-section--bg">
      <div className="mkt-container">
        <div className="mkt-section-header">
          <span className="mkt-section-tag">Features</span>
          <h2>Everything You Need to Run Your School</h2>
          <p>A complete suite of tools designed to reduce admin overhead and let educators focus on what matters — teaching.</p>
        </div>
        <div className="mkt-features__grid">
          {features.map((f) => (
            <div key={f.title} className="mkt-feature-card" style={{ '--card-accent': f.color }}>
              <div className="mkt-feature-card__icon" style={{ background: f.color + '18', color: f.color }}>
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <div className="mkt-feature-card__accent" style={{ background: f.color }} />
            </div>
          ))}
        </div>
        <div className="mkt-features__cta">
          <Link to="/marketing/solutions" className="mkt-btn mkt-btn--outline">View All Features →</Link>
        </div>
      </div>
    </section>

    {/* ══ BUILT FOR EVERYONE ══ */}
    <section className="mkt-section mkt-section--white">
      <div className="mkt-container">
        <div className="mkt-section-header">
          <span className="mkt-section-tag">For Everyone</span>
          <h2>Built for Every Member of Your School Community</h2>
          <p>My-Skoolz serves all stakeholders — with a tailored experience for each role.</p>
        </div>
        <div className="mkt-roles">
          {userRoles.map((r, i) => (
            <div key={r.role} className={`mkt-role ${i % 2 === 1 ? 'mkt-role--reverse' : ''}`}>
              <div className="mkt-role__image">
                <img src={r.img} alt={r.role} />
                <div className="mkt-role__role-tag" style={{ background: r.color }}>{r.role}</div>
              </div>
              <div className="mkt-role__content">
                <div className="mkt-role__accent" style={{ background: r.color }} />
                <h3>{r.title}</h3>
                <p>{r.desc}</p>
                <ul className="mkt-role__list">
                  {r.points.map(pt => (
                    <li key={pt}>
                      <span className="mkt-role__check" style={{ background: r.color + '18', color: r.color }}>✓</span>
                      {pt}
                    </li>
                  ))}
                </ul>
                <Link to="/marketing/solutions" className="mkt-role__link" style={{ color: r.color }}>
                  See all features →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ══ PHOTO STRIP ══ */}
    <section className="mkt-photo-strip">
      <img src="https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=500&q=80" alt="Classroom" />
      <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=500&q=80" alt="Students studying" />
      <img src="https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=500&q=80" alt="Teacher and students" />
      <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=500&q=80" alt="Student reading" />
      <img src="https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=500&q=80" alt="Teacher explaining" />
    </section>

    {/* ══ HOW IT WORKS ══ */}
    <section className="mkt-section mkt-section--bg">
      <div className="mkt-container">
        <div className="mkt-section-header">
          <span className="mkt-section-tag">How It Works</span>
          <h2>Get Started in 3 Simple Steps</h2>
          <p>From demo to go-live in days. We handle the heavy lifting so you can focus on your school.</p>
        </div>
        <div className="mkt-how__grid">
          {steps.map((s, i) => (
            <div key={s.step} className="mkt-how__step">
              <div className="mkt-how__step-top">
                <div className="mkt-how__step-num">{s.step}</div>
                {i < steps.length - 1 && <div className="mkt-how__step-line" />}
              </div>
              <div className="mkt-how__step-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ══ SCHOOL MANAGEMENT LIFECYCLE ══ */}
    <section className="mkt-section mkt-lifecycle">
      <div className="mkt-container">
        <div className="mkt-section-header">
          <span className="mkt-section-tag">School Lifecycle</span>
          <h2>The Complete School Management Journey</h2>
          <p>From the moment a student applies to the day they graduate — My-Skoolz handles every stage of school life in one connected platform.</p>
        </div>

        {lifecycle.map((row, ri) => (
          <div key={ri}>
            <div className="mkt-lifecycle__row">
              {row.map((stage, si) => (
                <>
                  <div key={stage.title} className="mkt-lifecycle__stage">
                    <div className="mkt-lifecycle__num">STEP {String(ri * 4 + si + 1).padStart(2, '0')}</div>
                    <div className="mkt-lifecycle__icon" style={{ background: stage.bg, color: stage.color }}>
                      {stage.icon}
                    </div>
                    <h4>{stage.title}</h4>
                    <p>{stage.desc}</p>
                  </div>
                  {si < row.length - 1 && (
                    <div className="mkt-lifecycle__arrow">→</div>
                  )}
                </>
              ))}
            </div>
            {ri === 0 && (
              <div className="mkt-lifecycle__row-break">↓</div>
            )}
          </div>
        ))}
      </div>
    </section>

    {/* ══ CTA BANNER ══ */}
    <section className="mkt-cta-banner">
      <div className="mkt-cta-banner__bg-shape" />
      <div className="mkt-container">
        <div className="mkt-cta-banner__inner">
          <div className="mkt-cta-banner__text">
            <h2>Ready to Transform Your School?</h2>
            <p>Book a free personalized demo and see exactly how My-Skoolz fits your school's needs.</p>
          </div>
          <div className="mkt-cta-banner__actions">
            <Link to="/marketing/demo" className="mkt-btn mkt-btn--white mkt-btn--lg">
              Book a Free Demo <span className="mkt-btn__arrow">→</span>
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

export default HomePage;
