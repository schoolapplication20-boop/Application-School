import React, { useState } from 'react';

export default function CredentialCard({ label, value, mono }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{ background: 'var(--surface-alt)', border: '1.5px solid var(--border-strong)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
      </div>
      <button onClick={copy} title="Copy" style={{ border: 'none', background: copied ? '#f0fff4' : 'var(--border-strong)', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: copied ? '#0de1e8' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, fontFamily: 'Poppins, sans-serif', flexShrink: 0, transition: 'all 0.2s' }}>
        <span className="material-icons" style={{ fontSize: 15 }}>{copied ? 'check' : 'content_copy'}</span>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
