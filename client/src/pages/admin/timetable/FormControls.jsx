import React from 'react';
import { labelStyle, errStyle } from './constants';

export const Field = ({ label, error, children }) => (
  <div style={{ marginBottom: '14px' }}>
    <label style={labelStyle}>{label}</label>
    {children}
    {error && <div style={errStyle}>{error}</div>}
  </div>
);

export const Col2 = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
    {children}
  </div>
);
