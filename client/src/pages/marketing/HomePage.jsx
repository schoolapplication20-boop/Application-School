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
  { icon: '🎓', title: 'Student Management', desc: 'Complete student lifecycle — admissions, profiles, attendance, grades, and progress reports in one place.' },
  { icon: '👨‍🏫', title: 'Teacher Management', desc: 'Manage teacher profiles, timetables, attendance, performance, and salary from a single dashboard.' },
  { icon: '💰', title: 'Fee Management', desc: 'Automate fee collection, generate receipts, track dues, and send payment reminders instantly.' },
  { icon: '🚌', title: 'Transport Tracking', desc: 'Assign routes, manage drivers, allocate students to buses, and track vehicles in real time.' },
  { icon: '📋', title: 'Leave Management', desc: 'Seamless leave request and approval flow for both staff and students with balance tracking.' },
  { icon: '📊', title: 'Reports & Analytics', desc: 'Insightful dashboards and reports to help administrators make data-driven decisions.' },
];

const userRoles = [
  {
    role: 'For Administrators',
    img: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?auto=format&fit=crop&w=600&q=80',
    title: 'Full Control. Zero Chaos.',
    desc: 'Manage your entire school from one screen. Track students, fees, staff, attendance, and more — with real-time dashboards that give you complete visibility.',
    points: ['School-wide dashboard & analytics', 'Fee collection & expense tracking', 'Staff & student management', 'Customizable access controls'],
    color: '#2563EB',
  },
  {
    role: 'For Teachers',
    img: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?auto=format&fit=crop&w=600&q=80',
    title: 'Less Admin. More Teaching.',
    desc: 'Mark attendance in seconds, share homework, upload marks, and communicate with parents — all from your phone or laptop, without drowning in paperwork.',
    points: ['One-click attendance marking', 'Digital diary & homework', 'Exam marks management', 'Parent messaging'],
    color: '#059669',
  },
  {
    role: 'For Parents',
    img: 'https://images.unsplash.com/photo-1491013516836-7db643ee125a?auto=format&fit=crop&w=600&q=80',
    title: 'Stay Informed. Always.',
    desc: 'Know what\'s happening in your child\'s school life in real time. From attendance to exam results, fee receipts to teacher messages — everything at your fingertips.',
    points: ['Real-time attendance alerts', 'Exam results & report cards', 'Online fee payment', 'Direct teacher communication'],
    color: '#7C3AED',
  },
  {
    role: 'For Students',
    img: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=600&q=80',
    title: 'Everything You Need to Succeed.',
    desc: 'Access your timetable, homework, exam schedules, attendance, and fee details all in one app. Stay organized and focused on what matters most — learning.',
    points: ['Timetable & exam schedule', 'Homework & assignments', 'Attendance history', 'Leave requests'],
    color: '#F59E0B',
  },
];

const steps = [
  { step: '01', title: 'Book a Free Demo', desc: 'Schedule a personalized walkthrough with our team tailored to your school\'s needs.' },
  { step: '02', title: 'Onboard Your School', desc: 'Our team sets up your school profile, imports data, and configures the system in days — not months.' },
  { step: '03', title: 'Go Live & Grow', desc: 'Start managing your school smarter with full support from our dedicated customer success team.' },
];

const testimonials = [
  { quote: 'My-Skoolz has completely changed how we manage day-to-day operations. The fee collection alone saved us 10 hours a week.', name: 'Priya Sharma', role: 'Principal, Sunrise Public School', avatar: 'PS' },
  { quote: 'The parent communication and attendance tracking features are outstanding. Parents love the transparency it brings.', name: 'Ravi Menon', role: 'Administrator, Greenwood Academy', avatar: 'RM' },
  { quote: 'Implementation was smooth and the support team is always available. Best investment we made for our school.', name: 'Anita Joshi', role: 'Director, St. Mary\'s School', avatar: 'AJ' },
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
              Book a Free Demo <span className="mkt-btn__arrow">→</span>
            </Link>
            <Link to="/marketing/solutions" className="mkt-btn mkt-btn--outline mkt-btn--lg" style={{ color: 'white', borderColor: 'rgba(255,255,255,.5)' }}>
              Explore Features
            </Link>
          </div>
        </div>
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

      {/* ── What is My-Skoolz ── */}
      <section style={{ padding: '80px 0', background: 'var(--white)' }}>
        <div className="mkt-container">
          <div className="mkt-what-grid">
            <div className="mkt-what__image">
              <img
                src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=700&q=80"
                alt="Students using technology in school"
              />
              <div className="mkt-what__image-badge">
                <strong>500+</strong>
                <span>Schools use<br />My-Skoolz</span>
              </div>
            </div>
            <div className="mkt-what__text">
              <span className="mkt-section-tag">What is My-Skoolz?</span>
              <h2>One Platform to Run Your Entire School</h2>
              <p>
                My-Skoolz is a comprehensive, cloud-based school management system designed specifically for Indian schools. It replaces the maze of spreadsheets, paper registers, and disconnected apps with a single, unified platform.
              </p>
              <p>
                From the moment a student applies for admission to the day they graduate — every interaction, record, fee, attendance entry, and report lives in one place, accessible to everyone who needs it, from any device.
              </p>
              <div className="mkt-what__checklist">
                <div className="mkt-what__check"><span>✓</span> No software installation required — 100% cloud-based</div>
                <div className="mkt-what__check"><span>✓</span> Works on any device — desktop, tablet, or phone</div>
                <div className="mkt-what__check"><span>✓</span> Onboard in days, not months — we handle the setup</div>
                <div className="mkt-what__check"><span>✓</span> Dedicated support team available 24/7</div>
              </div>
              <Link to="/marketing/about" className="mkt-btn mkt-btn--outline" style={{ marginTop: '28px', display: 'inline-flex' }}>
                Learn About Us →
              </Link>
            </div>
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
            <Link to="/marketing/solutions" className="mkt-btn mkt-btn--outline">View All Features →</Link>
          </div>
        </div>
      </section>

      {/* ── Built for Everyone ── */}
      <section style={{ padding: '80px 0', background: 'var(--white)' }}>
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
                  <h3>{r.title}</h3>
                  <p>{r.desc}</p>
                  <ul className="mkt-role__list">
                    {r.points.map((pt) => (
                      <li key={pt}><span style={{ color: r.color }}>✓</span> {pt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── School photos ── */}
      <section className="mkt-photo-strip">
        <img src="https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=500&q=80" alt="Classroom" />
        <img src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=500&q=80" alt="Students studying" />
        <img src="https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=500&q=80" alt="Teacher and students" />
        <img src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=500&q=80" alt="Student reading" />
        <img src="https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=500&q=80" alt="Teacher explaining" />
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
            {steps.map((s) => (
              <div key={s.step} className="mkt-how__step">
                <div className="mkt-how__step-num">{s.step}</div>
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
                Book a Free Demo <span className="mkt-btn__arrow">→</span>
              </Link>
              <Link to="/marketing/contact" className="mkt-btn mkt-btn--outline-white mkt-btn--lg">Talk to Sales</Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
