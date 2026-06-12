import React from 'react';
import { labelStyle, errStyle } from './constants';

export const Col2 = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>{children}</div>
);

export const Field = ({ label, required, optional, error, children }) => (
  <div>
    <label style={labelStyle}>
      {label}{required && ' *'}
      {optional && <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '11px' }}> (Optional)</span>}
    </label>
    {children}
    {error && <p style={errStyle}>{error}</p>}
  </div>
);

// ─── Section divider ──────────────────────────────────────────────────────────
export const Section = ({ icon, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 12px', paddingBottom: 8, borderBottom: '1.5px solid var(--border)' }}>
    <div style={{ width: 28, height: 28, borderRadius: 7, background: '#0de1e818', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="material-icons" style={{ fontSize: 15, color: '#0de1e8' }}>{icon}</span>
    </div>
    <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
  </div>
);
