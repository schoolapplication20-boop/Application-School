import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../pages/marketing/marketing.css';

const MarketingLayout = ({ children }) => {
  const [showSolutionsDropdown, setShowSolutionsDropdown] = useState(false);
  const location = useLocation();

  const solutions = [
    { name: 'Teacher Management', path: '/marketing/solutions#teachers' },
    { name: 'Leave Management', path: '/marketing/solutions#leaves' },
    { name: 'Time Table', path: '/marketing/solutions#timetable' },
    { name: 'Transportation', path: '/marketing/solutions#transport' },
    { name: 'Fee Management', path: '/marketing/solutions#fees' },
    { name: 'Expense Management', path: '/marketing/solutions#expenses' }
  ];

  return (
    <div className="marketing-layout">
      <nav className="marketing-navbar">
        <div className="navbar-container">
          <Link to="/marketing/home" className="navbar-brand">
            <span className="brand-icon">🏆</span>
            <span className="brand-name">My-Skoolz</span>
          </Link>

          <ul className="navbar-menu">
            <li className="nav-item">
              <Link 
                to="/marketing/home"
                className={`nav-link ${location.pathname === '/marketing/home' ? 'active' : ''}`}
              >
                Home
              </Link>
            </li>

            <li className="nav-item dropdown">
              <button 
                className={`nav-link dropdown-toggle ${location.pathname === '/marketing/solutions' ? 'active' : ''}`}
                onMouseEnter={() => setShowSolutionsDropdown(true)}
                onMouseLeave={() => setShowSolutionsDropdown(false)}
              >
                Solutions ▼
              </button>
              {showSolutionsDropdown && (
                <div 
                  className="dropdown-menu"
                  onMouseEnter={() => setShowSolutionsDropdown(true)}
                  onMouseLeave={() => setShowSolutionsDropdown(false)}
                >
                  {solutions.map((solution, idx) => (
                    <Link 
                      key={idx}
                      to={solution.path}
                      className="dropdown-item"
                    >
                      {solution.name}
                    </Link>
                  ))}
                  <Link to="/marketing/solutions" className="dropdown-item view-all">
                    View All Solutions →
                  </Link>
                </div>
              )}
            </li>

            <li className="nav-item">
              <Link 
                to="/marketing/contact"
                className={`nav-link ${location.pathname === '/marketing/contact' ? 'active' : ''}`}
              >
                Contact Us
              </Link>
            </li>

            <li className="nav-item">
              <Link 
                to="/marketing/careers"
                className={`nav-link ${location.pathname === '/marketing/careers' ? 'active' : ''}`}
              >
                Careers
              </Link>
            </li>

            <li className="nav-item">
              <Link to="/marketing/demo" className="nav-button cta-primary">
                Book a Free Demo
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      <main className="marketing-content">
        {children}
      </main>

      <footer className="marketing-footer">
        <div className="footer-container">
          <div className="footer-section">
            <h4>My-Skoolz</h4>
            <p>Transforming school management with modern technology</p>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/marketing/home">Home</Link></li>
              <li><Link to="/marketing/solutions">Solutions</Link></li>
              <li><Link to="/marketing/contact">Contact</Link></li>
              <li><Link to="/marketing/careers">Careers</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Contact</h4>
            <p>Email: <a href="mailto:navaneeswar1861@gmail.com">navaneeswar1861@gmail.com</a></p>
            <p>Follow us on social media</p>
          </div>

          <div className="footer-section">
            <h4>Legal</h4>
            <ul>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
              <li><a href="#cookies">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 My-Skoolz. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLayout;
