import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/landing.css';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
];

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI-Powered WhatsApp Bot',
    desc: 'Automated ordering 24/7. Customers browse your menu, add items, and pay — all inside WhatsApp without downloading any app.',
  },
  {
    icon: '📋',
    title: 'Smart Menu Management',
    desc: 'Unlimited categories, products, variants, modifiers, and images. Go live in minutes with a beautiful digital menu.',
  },
  {
    icon: '📦',
    title: 'Live Order Dashboard',
    desc: 'Real-time order notifications. Accept, prepare, dispatch, and complete orders from one powerful dashboard.',
  },
  {
    icon: '💳',
    title: 'Multi-Payment Support',
    desc: 'Accept Stripe, PayPal, Razorpay, Cash, UPI, and more. Automated invoices and receipts sent to customers.',
  },
  {
    icon: '📊',
    title: 'Revenue Analytics',
    desc: 'Beautiful charts for sales, orders, top products, and customer insights. Export reports in CSV or PDF.',
  },
  {
    icon: '📢',
    title: 'WhatsApp Broadcasts',
    desc: 'Send promotional messages, offers, and updates to all customers or targeted segments in one click.',
  },
  {
    icon: '🎯',
    title: 'QR Code Ordering',
    desc: 'Generate branded QR codes for your tables, storefront, or packaging. Customers scan and order instantly.',
  },
  {
    icon: '🏷️',
    title: 'Coupons & Loyalty',
    desc: 'Create discount codes, referral programs, and loyalty points to keep customers coming back.',
  },
  {
    icon: '📦',
    title: 'Inventory Tracking',
    desc: 'Automatic stock deduction on orders. Low-stock alerts keep you from overselling.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Sign up & set up your business',
    desc: 'Create your account, add your business details, set your hours, and configure delivery options in under 10 minutes.',
  },
  {
    number: '02',
    title: 'Connect your WhatsApp',
    desc: 'Link your WhatsApp Business number via the Meta API. Your AI ordering bot activates instantly.',
  },
  {
    number: '03',
    title: 'Add your products',
    desc: 'Upload your menu with photos, prices, variants, and modifiers. Your digital storefront is live.',
  },
  {
    number: '04',
    title: 'Share your link & receive orders',
    desc: 'Share your WhatsApp ordering link or QR code. Customers order, pay, and you get notified in real time.',
  },
];

const PLANS = [
  {
    name: 'Free Trial',
    price: 0,
    period: 'First 5 orders free/month',
    highlight: false,
    features: [
      '5 orders free every month',
      '1 WhatsApp number',
      'Basic menu (20 products)',
      'Order dashboard',
      'Email support',
    ],
    cta: 'Start Free',
    to: '/signup',
  },
  {
    name: 'Professional',
    price: 1499,
    period: 'per month',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Unlimited orders',
      '1 WhatsApp number',
      'Unlimited products & categories',
      'Analytics & reports',
      'Coupons & loyalty',
      'QR code generation',
      'WhatsApp broadcasts',
      'Priority support',
    ],
    cta: 'Get Started',
    to: '/signup?plan=professional',
  },
  {
    name: 'Enterprise',
    price: 2999,
    period: 'per month',
    highlight: false,
    features: [
      'Everything in Professional',
      '3 WhatsApp numbers',
      'Staff management',
      'Multi-location support',
      'API access',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    to: '/signup?plan=enterprise',
  },
];

const TESTIMONIALS = [
  {
    name: 'Arjun Mehta',
    role: 'Owner, Spice Garden Restaurant',
    avatar: 'AM',
    color: '#f97316',
    text: "We went from missing WhatsApp orders to processing 200+ orders a day seamlessly. The bot handles everything while we focus on cooking. Revenue up 40% in 3 months.",
  },
  {
    name: 'Sarah K.',
    role: 'Manager, Fresh Bake Café',
    avatar: 'SK',
    color: '#8b5cf6',
    text: "Setup took less than 20 minutes. Our customers love that they can order fresh pastries on WhatsApp without downloading an app. Game changer for our small bakery.",
  },
  {
    name: 'Mohammed Al-Farsi',
    role: 'Director, Gulf Supermarket',
    avatar: 'MA',
    color: '#0ea5e9',
    text: "The inventory tracking and broadcast feature alone paid for the entire subscription. We send weekly deals to 5,000 customers and see 30% redemption rates.",
  },
];

const BUSINESS_TYPES = [
  '🍕 Restaurants', '☕ Cafés', '🛒 Grocery Stores', '🥐 Bakeries',
  '🧃 Juice Shops', '💊 Pharmacies', '🌸 Flower Shops', '🍦 Ice Cream',
  '🐾 Pet Stores', '🥩 Meat Shops', '👗 Clothing', '📱 Electronics',
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const annualDiscount = (price) => billingAnnual ? Math.round(price * 0.8) : price;

  return (
    <div className="landing">
      {/* ── Navbar ── */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <a href="#" className="landing-logo">
            <span className="landing-logo-icon">💬</span>
            <span className="landing-logo-text">OrderBot</span>
          </a>

          <div className={`landing-nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="landing-nav-link" onClick={() => setMobileMenuOpen(false)}>
                {l.label}
              </a>
            ))}
          </div>

          <div className="landing-nav-cta">
            <Link to="/login" className="landing-btn landing-btn-ghost">Log in</Link>
            <Link to="/signup" className="landing-btn landing-btn-primary">Get Started Free</Link>
          </div>

          <button className="landing-mobile-toggle" onClick={() => setMobileMenuOpen((o) => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-bg">
          <div className="landing-hero-blob blob-1" />
          <div className="landing-hero-blob blob-2" />
        </div>
        <div className="landing-container">
          <div className="landing-hero-badge">
            <span className="landing-badge-dot" />
            Trusted by 3,000+ businesses worldwide
          </div>
          <h1 className="landing-hero-title">
            Turn WhatsApp into your
            <span className="landing-gradient-text"> automated ordering machine</span>
          </h1>
          <p className="landing-hero-subtitle">
            Your customers already use WhatsApp. Let them browse your menu, place orders, and pay — without ever leaving the chat. No app download. No friction. Pure revenue.
          </p>
          <div className="landing-hero-actions">
            <Link to="/signup" className="landing-btn landing-btn-primary landing-btn-lg">
              Start Free — No Credit Card
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <a href="#how-it-works" className="landing-btn landing-btn-outline landing-btn-lg">
              See How It Works
            </a>
          </div>
          <div className="landing-hero-social-proof">
            <div className="landing-avatars">
              {['R', 'S', 'M', 'A', 'K'].map((l, i) => (
                <div key={i} className="landing-avatar" style={{ '--i': i }}>{l}</div>
              ))}
            </div>
            <p><strong>3,000+ businesses</strong> process orders on WhatsApp today</p>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="landing-hero-mockup">
          <div className="landing-mockup-window">
            <div className="landing-mockup-bar">
              <span /><span /><span />
              <div className="landing-mockup-url">dashboard.orderbot.ai</div>
            </div>
            <div className="landing-mockup-content">
              <div className="landing-mock-stat green">
                <div className="landing-mock-stat-label">Today's Revenue</div>
                <div className="landing-mock-stat-value">₹18,450</div>
                <div className="landing-mock-stat-change">↑ 23% vs yesterday</div>
              </div>
              <div className="landing-mock-stat blue">
                <div className="landing-mock-stat-label">Orders Today</div>
                <div className="landing-mock-stat-value">142</div>
                <div className="landing-mock-stat-change">↑ 18 new</div>
              </div>
              <div className="landing-mock-orders">
                {['Chicken Biryani × 2', 'Veg Thali × 1', 'Masala Chai × 4'].map((item) => (
                  <div key={item} className="landing-mock-order-row">
                    <span className="landing-mock-order-dot" />
                    <span>{item}</span>
                    <span className="landing-mock-order-badge">New</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* WhatsApp chat bubble */}
          <div className="landing-whatsapp-bubble">
            <div className="landing-wa-msg received">👋 Hi! I'd like to order please</div>
            <div className="landing-wa-msg sent">Sure! Here's our menu 🍽️<br /><em>*Tap to browse*</em></div>
            <div className="landing-wa-msg received">2× Chicken Biryani please!</div>
            <div className="landing-wa-msg sent">✅ Order confirmed! Total ₹480<br />Pay via UPI or Cash on Delivery</div>
          </div>
        </div>
      </section>

      {/* ── Business types ticker ── */}
      <section className="landing-ticker">
        <div className="landing-ticker-track">
          {[...BUSINESS_TYPES, ...BUSINESS_TYPES].map((t, i) => (
            <span key={i} className="landing-ticker-item">{t}</span>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-section" id="features">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">Everything you need</div>
            <h2 className="landing-section-title">A complete ordering platform, built for WhatsApp</h2>
            <p className="landing-section-subtitle">From menu management to payments, analytics, and automation — every tool your business needs in one place.</p>
          </div>
          <div className="landing-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="landing-feature-card">
                <div className="landing-feature-icon">{f.icon}</div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="landing-section landing-section-alt" id="how-it-works">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">Get started in minutes</div>
            <h2 className="landing-section-title">Up and running before your next order</h2>
            <p className="landing-section-subtitle">No developers, no tech skills needed. If you can use WhatsApp, you can run OrderBot.</p>
          </div>
          <div className="landing-steps">
            {STEPS.map((step, i) => (
              <div key={step.number} className="landing-step">
                <div className="landing-step-number">{step.number}</div>
                {i < STEPS.length - 1 && <div className="landing-step-connector" />}
                <div className="landing-step-body">
                  <h3 className="landing-step-title">{step.title}</h3>
                  <p className="landing-step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="landing-stats">
        <div className="landing-container">
          <div className="landing-stats-grid">
            {[
              { value: '3,000+', label: 'Active businesses' },
              { value: '2M+', label: 'Orders processed' },
              { value: '98.9%', label: 'Uptime SLA' },
              { value: '4.8★', label: 'Average rating' },
            ].map((s) => (
              <div key={s.label} className="landing-stat">
                <div className="landing-stat-value">{s.value}</div>
                <div className="landing-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="landing-section" id="pricing">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">Simple pricing</div>
            <h2 className="landing-section-title">Start free. Grow with us.</h2>
            <p className="landing-section-subtitle">No hidden fees. No long-term contracts. Cancel anytime.</p>

            <div className="landing-billing-toggle">
              <span className={!billingAnnual ? 'active' : ''}>Monthly</span>
              <button
                className={`landing-toggle-btn ${billingAnnual ? 'on' : ''}`}
                onClick={() => setBillingAnnual((v) => !v)}
                aria-label="Toggle billing period"
              />
              <span className={billingAnnual ? 'active' : ''}>
                Annual
                <span className="landing-save-badge">Save 20%</span>
              </span>
            </div>
          </div>

          <div className="landing-pricing-grid">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`landing-pricing-card ${plan.highlight ? 'highlight' : ''}`}>
                {plan.badge && <div className="landing-pricing-badge">{plan.badge}</div>}
                <div className="landing-pricing-name">{plan.name}</div>
                <div className="landing-pricing-price">
                  {plan.price === 0 ? (
                    <span className="landing-price-amount">Free</span>
                  ) : (
                    <>
                      <span className="landing-price-currency">₹</span>
                      <span className="landing-price-amount">{annualDiscount(plan.price).toLocaleString()}</span>
                    </>
                  )}
                  <span className="landing-price-period">{plan.period}</span>
                </div>
                <ul className="landing-pricing-features">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <svg className="landing-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={plan.to} className={`landing-btn landing-btn-lg ${plan.highlight ? 'landing-btn-primary' : 'landing-btn-outline'} landing-pricing-cta`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="landing-section landing-section-alt" id="testimonials">
        <div className="landing-container">
          <div className="landing-section-header">
            <div className="landing-section-badge">Customer stories</div>
            <h2 className="landing-section-title">Businesses that transformed with OrderBot</h2>
          </div>
          <div className="landing-testimonials-grid">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="landing-testimonial-card">
                <div className="landing-testimonial-stars">★★★★★</div>
                <p className="landing-testimonial-text">"{t.text}"</p>
                <div className="landing-testimonial-author">
                  <div className="landing-testimonial-avatar" style={{ background: t.color }}>{t.avatar}</div>
                  <div>
                    <div className="landing-testimonial-name">{t.name}</div>
                    <div className="landing-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta">
        <div className="landing-container">
          <div className="landing-cta-inner">
            <h2 className="landing-cta-title">Ready to automate your WhatsApp orders?</h2>
            <p className="landing-cta-subtitle">Join 3,000+ businesses already processing orders on autopilot. Free forever. No credit card required.</p>
            <div className="landing-cta-actions">
              <Link to="/signup" className="landing-btn landing-btn-white landing-btn-lg">
                Get Started Free
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <a href="https://wa.me/demo" className="landing-btn landing-btn-ghost-white landing-btn-lg">
                💬 See Live Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-top">
            <div className="landing-footer-brand">
              <a href="#" className="landing-logo">
                <span className="landing-logo-icon">💬</span>
                <span className="landing-logo-text">OrderBot</span>
              </a>
              <p className="landing-footer-tagline">Automate your WhatsApp ordering. Delight your customers. Grow your business.</p>
            </div>
            <div className="landing-footer-links">
              {[
                { heading: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
                { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
                { heading: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'] },
                { heading: 'Support', links: ['Help Center', 'Contact Us', 'Status', 'API Docs'] },
              ].map((col) => (
                <div key={col.heading} className="landing-footer-col">
                  <h4 className="landing-footer-col-heading">{col.heading}</h4>
                  {col.links.map((l) => (
                    <a key={l} href="#" className="landing-footer-link">{l}</a>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="landing-footer-bottom">
            <p>© {new Date().getFullYear()} OrderBot. All rights reserved.</p>
            <div className="landing-footer-socials">
              {['𝕏', 'in', 'f', '▶'].map((s) => (
                <a key={s} href="#" className="landing-social-icon">{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
