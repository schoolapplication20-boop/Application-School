import { useState, useEffect } from 'react';
import api from '../../services/api';

const PLANS = [
  {
    key: 'free',
    name: 'Free Trial',
    price: 0,
    period: '5 orders free/month',
    color: '#64748b',
    features: ['5 orders free every month', '1 WhatsApp number', '20 products', 'Basic dashboard'],
    cta: 'Current Plan',
    disabled: true,
  },
  {
    key: 'professional',
    name: 'Professional',
    price: 1499,
    period: '/month',
    color: '#25d366',
    popular: true,
    features: ['Unlimited orders', 'Unlimited products', 'Analytics & reports', 'Coupons & loyalty', 'QR codes', 'Broadcasts', 'Priority support'],
    cta: 'Upgrade to Pro',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 2999,
    period: '/month',
    color: '#8b5cf6',
    features: ['Everything in Pro', '3 WhatsApp numbers', 'Staff management', 'API access', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee'],
    cta: 'Contact Sales',
  },
];

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [upgrading, setUpgrading]       = useState(null);

  useEffect(() => {
    api.get('/subscriptions/current')
      .then((res) => setSubscription(res.data.data))
      .catch(() => setSubscription({ plan: 'free', status: 'active' }))
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (plan) => {
    if (plan === 'enterprise') {
      window.open('mailto:sales@orderbot.ai?subject=Enterprise Plan Enquiry', '_blank');
      return;
    }
    setUpgrading(plan);
    try {
      const res = await api.post('/subscriptions/checkout', { plan });
      if (res.data.data?.checkoutUrl) {
        window.location.href = res.data.data.checkoutUrl;
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to initiate checkout');
    } finally {
      setUpgrading(null);
    }
  };

  const currentPlan = subscription?.plan || 'free';
  const daysLeft    = subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt) - new Date()) / 86400000))
    : null;

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription</h1>
          <p className="page-subtitle">Manage your plan, billing, and usage.</p>
        </div>
      </div>

      {/* Current plan banner */}
      {!loading && subscription && (
        <div className={`sub-current-banner ${subscription.status}`}>
          <div className="sub-current-info">
            <div className="sub-current-plan">
              Current Plan: <strong>{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</strong>
            </div>
            <div className="sub-current-status">
              Status: <span className={`badge badge-${subscription.status === 'active' ? 'success' : 'warning'}`}>{subscription.status}</span>
              {daysLeft !== null && <span className="sub-trial">· {daysLeft} trial days left</span>}
            </div>
            {subscription.nextBillingDate && (
              <div className="sub-current-billing">
                Next billing: {new Date(subscription.nextBillingDate).toLocaleDateString()}
              </div>
            )}
          </div>
          {currentPlan !== 'free' && (
            <button className="btn btn-outline btn-sm" onClick={() => api.post('/subscriptions/portal').then((r) => window.open(r.data.data?.url, '_blank')).catch(() => {})}>
              Manage Billing →
            </button>
          )}
        </div>
      )}

      {/* Plans */}
      <div className="sub-plans">
        {PLANS.map((plan) => {
          const isCurrent  = plan.key === currentPlan;
          const isUpgrading = upgrading === plan.key;

          return (
            <div key={plan.key} className={`sub-plan-card ${plan.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`} style={{ '--plan-color': plan.color }}>
              {plan.popular && <div className="sub-popular-badge">Most Popular</div>}
              {isCurrent && <div className="sub-current-badge">Your Plan</div>}

              <div className="sub-plan-name" style={{ color: plan.color }}>{plan.name}</div>
              <div className="sub-plan-price">
                {plan.price === 0 ? (
                  <span className="sub-price-free">Free</span>
                ) : (
                  <>
                    <span className="sub-price-currency">₹</span>
                    <span className="sub-price-amount">{plan.price.toLocaleString('en-IN')}</span>
                    <span className="sub-price-period">{plan.period}</span>
                  </>
                )}
              </div>

              <ul className="sub-plan-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <span style={{ color: plan.color }}>✓</span> {f}
                  </li>
                ))}
              </ul>

              <button
                className={`btn btn-lg sub-plan-cta ${isCurrent ? 'btn-outline' : 'btn-primary'}`}
                style={!isCurrent ? { background: plan.color, borderColor: plan.color } : {}}
                disabled={isCurrent || plan.disabled || isUpgrading}
                onClick={() => !isCurrent && handleUpgrade(plan.key)}
              >
                {isUpgrading ? 'Redirecting…' : isCurrent ? 'Current Plan' : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Usage */}
      {subscription && (
        <div className="sub-usage card">
          <h3 className="card-title">Current Usage</h3>
          <div className="sub-usage-grid">
            {[
              { label: 'Orders this month', value: subscription.ordersThisMonth || 0, max: currentPlan === 'free' ? 50 : null, icon: '📦' },
              { label: 'Products',          value: subscription.totalProducts || 0,    max: currentPlan === 'free' ? 20 : null, icon: '🍽️' },
              { label: 'Customers',         value: subscription.totalCustomers || 0,   max: null,                               icon: '👥' },
            ].map((u) => (
              <div key={u.label} className="sub-usage-item">
                <div className="sub-usage-icon">{u.icon}</div>
                <div className="sub-usage-info">
                  <div className="sub-usage-label">{u.label}</div>
                  <div className="sub-usage-value">
                    {u.value}{u.max ? <span className="text-muted"> / {u.max}</span> : ''}
                  </div>
                  {u.max && (
                    <div className="sub-usage-bar">
                      <div className="sub-usage-fill" style={{ width: `${Math.min(100, (u.value / u.max) * 100)}%`, background: u.value >= u.max ? '#ef4444' : '#25d366' }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
