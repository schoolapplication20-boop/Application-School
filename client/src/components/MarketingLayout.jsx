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
              <a href="https://wa.me/918333838252" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="mkt-footer__social-wa">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
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
            <h5>Contact</h5>
            <a href="mailto:schoolapplication20@gmail.com">Email Us</a>
            <a href="https://wa.me/918333838252" target="_blank" rel="noopener noreferrer">WhatsApp Us</a>
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
          </div>
        </div>

        <div className="mkt-footer__bottom">
          <p>&copy; 2025 My-Skoolz. All rights reserved.</p>
          <a href="/marketing/contact">Contact Us</a>
        </div>
      </footer>

      {/* ── Floating WhatsApp button ── */}
      <a
        href="https://wa.me/918333838252?text=Hi%20My-Skoolz%2C%20I%27d%20like%20to%20know%20more%20about%20your%20school%20management%20platform."
        target="_blank"
        rel="noopener noreferrer"
        className="mkt-wa-fab"
        aria-label="Chat on WhatsApp"
        title="Chat with us on WhatsApp"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        <span>WhatsApp</span>
      </a>
    </div>
  );
};

export default MarketingLayout;
