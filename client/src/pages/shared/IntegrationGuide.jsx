import React, { useState } from 'react';

const SECTIONS = [
  { key: 'whatsapp', label: 'WhatsApp Setup', icon: 'chat', color: '#25D366' },
  { key: 'sms',      label: 'SMS Setup',      icon: 'sms',  color: '#4f46e5' },
];

function Step({ n, title, children }) {
  return (
    <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-alt)',
        border: '1.5px solid var(--border-strong)', color: 'var(--text-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, flexShrink: 0,
      }}>
        {n}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );
}

function Callout({ type = 'info', children }) {
  const styles = {
    info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', icon: 'info' },
    warning: { bg: '#fffaf0', border: '#fbd38d', color: '#92400e', icon: 'warning' },
  };
  const s = styles[type];
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start', background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: s.color, marginBottom: 18,
    }}>
      <span className="material-icons" style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }}>{s.icon}</span>
      <div style={{ lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function Code({ children }) {
  return <code style={{ background: 'var(--surface-alt)', padding: '1px 6px', borderRadius: 4, fontSize: 12.5 }}>{children}</code>;
}

function WhatsAppSteps() {
  return (
    <div>
      <Callout type="warning">
        Each school connects its <strong>own</strong> WhatsApp Business phone number — MySkoolz does not
        provide a shared number. A school admin (or you, on their behalf) must complete this setup once per school.
      </Callout>

      <Step n={1} title="Create a Meta Business Account">
        Go to <Code>business.facebook.com</Code> and create a Business Account if the school doesn't already
        have one. Meta may ask for business verification (registration documents, address, phone) — this can
        take anywhere from a few minutes to a couple of days.
      </Step>

      <Step n={2} title="Create a Meta App with the WhatsApp product">
        Go to <Code>developers.facebook.com/apps</Code> → Create App → choose type <strong>"Business"</strong> →
        add the <strong>WhatsApp</strong> product to the app from the dashboard.
      </Step>

      <Step n={3} title="Add and verify the school's phone number">
        Inside the app, go to <strong>WhatsApp → API Setup</strong>. A test number is provided by default, but
        for real use you must add the school's own number under <strong>Settings → Phone Numbers → Add Phone Number</strong>
        and verify it via SMS/call. This number cannot already be active on a personal WhatsApp or Business app.
      </Step>

      <Step n={4} title="Copy the Phone Number ID">
        Still on the <strong>API Setup</strong> page, copy the <strong>Phone Number ID</strong> shown under the
        verified number. You'll paste this into MySkoolz shortly.
      </Step>

      <Step n={5} title="Generate a permanent access token">
        Temporary tokens (24h) shown on the API Setup page are not enough for production. Instead:
        <ol style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          <li>Go to <strong>Business Settings → Users → System Users → Add</strong>, create a System User with the Admin role.</li>
          <li>Under that System User, click <strong>Add Assets</strong> and assign the WhatsApp App you created.</li>
          <li>Click <strong>Generate New Token</strong>, select the app, and enable the <Code>whatsapp_business_messaging</Code> and
              {' '}<Code>whatsapp_business_management</Code> permissions. Set no expiration.</li>
          <li>Copy the token immediately — Meta only shows it once.</li>
        </ol>
      </Step>

      <Step n={6} title="Enter credentials in MySkoolz">
        Go to the school's <strong>Admin → WhatsApp → Settings</strong> tab, paste the Phone Number ID and
        Access Token, add a display number for reference, and Save.
      </Step>

      <Step n={7} title="Create and submit message templates">
        Meta does not allow free-text messages for reminders sent outside an active customer conversation —
        only pre-approved templates. In <strong>Meta Business Manager → WhatsApp Manager → Message Templates</strong>,
        create one template each for:
        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          <li><strong>Fee Reminder</strong> — e.g. body variables for parent name, student name, amount, due date</li>
          <li><strong>Payment Confirmation</strong> — e.g. student name, amount paid, receipt number, date</li>
          <li><strong>Receipt Link</strong> — same as above, plus a <strong>URL button</strong> component with a dynamic suffix</li>
        </ul>
        Submit each for review. Approval usually takes a few hours, sometimes up to 2 days.
      </Step>

      <Step n={8} title="Register the approved templates in MySkoolz">
        Once Meta approves a template, go to <strong>Admin → WhatsApp → Templates → New Template</strong> and enter
        the exact Meta template name, language code, and the variable order matching your approved template's
        <Code>{'{{1}}, {{2}}, ...'}</Code> placeholders. Set <strong>Approval Status</strong> to "Approved" — MySkoolz
        won't offer a template for sending until you do this.
      </Step>

      <Step n={9} title="Send a test message">
        Before rolling out to all parents, send a Fee Reminder to yourself or one test student and confirm it
        arrives correctly on WhatsApp.
      </Step>

      <Step n={10} title="Turn the module on (Owner only)">
        As Application Owner: go to <strong>Owner Dashboard → Feature Control</strong>, turn on the platform-wide
        WhatsApp switch (if not already on), select the school, and enable the WhatsApp toggle for that school.
      </Step>
    </div>
  );
}

function SmsSteps() {
  return (
    <div>
      <Callout type="info">
        MySkoolz currently sends SMS through <strong>MSG91</strong> for the whole platform. Each school still
        registers its own Sender ID and DLT credentials below — only the underlying gateway is shared.
      </Callout>

      <Step n={1} title="Create an MSG91 account">
        Sign up at <Code>msg91.com</Code> and verify the account email and phone number.
      </Step>

      <Step n={2} title="Copy the Auth Key">
        In the MSG91 dashboard, go to <strong>Settings (gear icon) → API</strong> and copy the <strong>Auth Key</strong>.
      </Step>

      <Step n={3} title="Complete DLT registration">
        Indian telecom regulations (TRAI) require all SMS senders to register on a DLT (Distributed Ledger
        Technology) platform before sending SMS to Indian numbers. MSG91 provides a guided DLT registration
        flow under <strong>Dashboard → DLT</strong>. You'll need the school's business PAN and/or GST details.
        Entity approval typically takes 24–48 hours.
      </Step>

      <Step n={4} title="Register a Sender ID">
        Once the entity is DLT-approved, register a <strong>Sender ID</strong> — a 6-character alphanumeric code
        representing the school (e.g. <Code>MYSKLZ</Code>) — linked to that DLT entity.
      </Step>

      <Step n={5} title="Register message templates on DLT">
        Register the exact wording of each SMS you plan to send (fee reminders, receipts, announcements, etc.)
        on the DLT platform. Once approved, note the <strong>Template ID</strong> (also called DLT_TE_ID or PE_ID)
        for each — this is required for promotional-category templates and recommended for transactional ones.
      </Step>

      <Step n={6} title="Enter credentials in MySkoolz">
        Go to the school's <strong>Admin → SMS Notifications → Settings</strong> tab and enter: Auth Key, Sender ID,
        DLT Template ID (per message type, optional but recommended), Route (usually <Code>4</Code> for
        transactional traffic), and Country Code (<Code>91</Code>). Save.
      </Step>

      <Step n={7} title="Send a test message">
        Test-send an SMS to yourself before enabling it for parents at large.
      </Step>

      <Step n={8} title="Confirm the module is enabled (Owner only)">
        As Application Owner: go to <strong>Owner Dashboard → Feature Control</strong>, select the school, and
        confirm the SMS toggle is on.
      </Step>
    </div>
  );
}

export default function IntegrationGuide() {
  const [active, setActive] = useState('whatsapp');

  return (
    <div style={{ padding: '24px', maxWidth: '820px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <span className="material-icons" style={{ fontSize: 28, color: 'var(--text-primary)' }}>menu_book</span>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>Integration Setup Guide</h1>
      </div>
      <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 14 }}>
        Step-by-step instructions for registering a school with Meta (WhatsApp) and MSG91 (SMS) so notifications
        can actually be sent. Visible to Super Admins and the Application Owner only.
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setActive(s.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: 'none',
              background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              color: active === s.key ? s.color : 'var(--text-secondary)',
              borderBottom: active === s.key ? `2px solid ${s.color}` : '2px solid transparent',
              marginBottom: -1,
            }}>
            <span className="material-icons" style={{ fontSize: 16 }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      <div className="data-table-card" style={{ padding: 24 }}>
        {active === 'whatsapp' ? <WhatsAppSteps /> : <SmsSteps />}
      </div>
    </div>
  );
}
