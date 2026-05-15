import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';
import '../pages/marketing/marketing.css';

const MarketingLayout = ({ children }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const navLinks = [
    { label: 'Home',      path: '/marketing/home' },
    { label: 'Solutions', path: '/marketing/solutions' },
    { label: 'About Us',  path: '/marketing/about' },
    { label: 'Contact',   path: '/marketing/contact' },
    { label: 'Careers',   path: '/marketing/careers' },
  ];

  return (
    <div className="mkt-layout">
      <nav className={`mkt-nav ${scrolled ? 'mkt-nav--scrolled' : ''}`}>
        <div className="mkt-nav__inner">

          {/* ── Logo ── */}
          <Link to="/" className="mkt-nav__logo">
            <Logo size={36} />
            <span className="mkt-nav__logo-text">My-Skoolz</span>
          </Link>

          {/* ── Links ── */}
          <ul className="mkt-nav__links">
            {navLinks.map(({ label, path }) => (
              <li key={path}>
                <Link
                  to={path}
                  className={`mkt-nav__link ${location.pathname === path || (path === '/marketing/home' && location.pathname === '/') ? 'mkt-nav__link--active' : ''}`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* ── Actions ── */}
          <div className="mkt-nav__actions">
            <Link to="/login" className="mkt-btn mkt-btn--ghost">Login</Link>
            <Link to="/marketing/demo" className="mkt-btn mkt-btn--primary">Book Free Demo</Link>
          </div>

          {/* ── Hamburger ── */}
          <button
            className="mkt-nav__hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span className={`hamburger-line ${mobileOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${mobileOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${mobileOpen ? 'open' : ''}`} />
          </button>
        </div>

        {/* ── Mobile menu ── */}
        {mobileOpen && (
          <div className="mkt-nav__mobile">
            {navLinks.map(({ label, path }) => (
              <Link
                key={path}
                to={path}
                className={`mkt-nav__mobile-link ${location.pathname === path ? 'mkt-nav__link--active' : ''}`}
              >
                {label}
              </Link>
            ))}
            <div className="mkt-nav__mobile-actions">
              <Link to="/login"         className="mkt-btn mkt-btn--ghost   mkt-btn--full">Login</Link>
              <Link to="/marketing/demo" className="mkt-btn mkt-btn--primary mkt-btn--full">Book Free Demo</Link>
            </div>
          </div>
        )}
      </nav>

      <main className="mkt-main">{children}</main>

      {/* ── Footer ── */}
      <footer className="mkt-footer">
        <div className="mkt-footer__inner">

          <div className="mkt-footer__brand">
            <Link to="/" className="mkt-footer__logo-link">
              <Logo size={32} />
              <span className="mkt-footer__logo-name">My-Skoolz</span>
            </Link>
            <p>A modern, all-in-one school management platform built to simplify operations and improve outcomes for every school.</p>
            <div className="mkt-footer__socials">
              <a href="#linkedin" aria-label="LinkedIn">in</a>
              <a href="#twitter"  aria-label="Twitter">𝕏</a>
              <a href="#facebook" aria-label="Facebook">f</a>
            </div>
          </div>

          <div className="mkt-footer__col">
            <h5>Product</h5>
            <Link to="/marketing/solutions">Features</Link>
            <Link to="/marketing/demo">Book a Demo</Link>
            <Link to="/marketing/about">About Us</Link>
          </div>

          <div className="mkt-footer__col">
            <h5>Company</h5>
            <Link to="/marketing/about">Our Story</Link>
            <Link to="/marketing/careers">Careers</Link>
            <Link to="/marketing/contact">Contact Us</Link>
          </div>

          <div className="mkt-footer__col">
            <h5>Legal</h5>
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#cookies">Cookie Policy</a>
          </div>
        </div>

        <div className="mkt-footer__bottom">
          <p>&copy; 2025 My-Skoolz. All rights reserved.</p>
          <a href="mailto:navaneeswar1861@gmail.com">navaneeswar1861@gmail.com</a>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLayout;
