export default function PublishStep({ data, saving, onPublish, onBack }) {
  const checks = [
    { done: !!data.businessName,    label: 'Business profile completed' },
    { done: !!data.businessHours,   label: 'Business hours configured' },
    { done: !!data.whatsappNumber,  label: 'WhatsApp number connected' },
    { done: !!data.deliveryOptions, label: 'Delivery options set' },
    { done: true,                   label: 'Payment methods configured' },
  ];

  const allDone = checks.every((c) => c.done);

  return (
    <div className="onb-step onb-step-publish">
      <div className="onb-publish-hero">
        <div className="onb-publish-rocket">🚀</div>
        <h2 className="onb-step-title">Ready to Launch!</h2>
        <p className="onb-step-desc">
          Your WhatsApp ordering bot is configured and ready to go live.
          Once you publish, customers can start placing orders immediately.
        </p>
      </div>

      <div className="onb-checklist">
        <h3 className="onb-checklist-title">Setup Checklist</h3>
        {checks.map((c) => (
          <div key={c.label} className={`onb-check-item ${c.done ? 'done' : 'pending'}`}>
            <span className="onb-check-icon">{c.done ? '✅' : '⚪'}</span>
            <span>{c.label}</span>
          </div>
        ))}
      </div>

      <div className="onb-publish-info">
        <div className="onb-publish-info-item">
          <span className="onb-publish-info-icon">💬</span>
          <div>
            <strong>WhatsApp Bot Active</strong>
            <p>Customers message your WhatsApp number and the bot handles orders automatically.</p>
          </div>
        </div>
        <div className="onb-publish-info-item">
          <span className="onb-publish-info-icon">📊</span>
          <div>
            <strong>Dashboard Ready</strong>
            <p>Monitor orders, manage your menu, and view analytics from your dashboard.</p>
          </div>
        </div>
        <div className="onb-publish-info-item">
          <span className="onb-publish-info-icon">🔄</span>
          <div>
            <strong>Change Anytime</strong>
            <p>Update your menu, hours, and settings at any time from the Settings page.</p>
          </div>
        </div>
      </div>

      {!allDone && (
        <div className="onb-publish-warning">
          ⚠️ Some setup steps are incomplete. You can still publish and finish later in Settings.
        </div>
      )}

      <div className="onb-actions onb-actions-publish">
        <button className="btn btn-outline" onClick={onBack} disabled={saving}>← Back</button>
        <button className="btn btn-primary btn-lg" onClick={onPublish} disabled={saving}>
          {saving ? (
            <><span className="spinner-sm" /> Launching…</>
          ) : (
            '🚀 Go Live — Publish Now'
          )}
        </button>
      </div>
    </div>
  );
}
