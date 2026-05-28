import React from 'react';

const StatCard = ({ title, value, icon, color = '#0de1e8', prefix = '', suffix = '' }) => {
  return (
    <div
      className="stat-card card-hover"
      style={{
        background: 'var(--surface, #fff)',
        borderRadius: 18,
        padding: '22px 20px 18px',
        boxShadow: 'var(--shadow-card, 0 2px 14px rgba(0,0,0,0.07))',
        border: '1px solid var(--border, #f0f4f8)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        transition: 'transform 0.18s, box-shadow 0.18s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 10px 28px ${color}28`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 14px rgba(0,0,0,0.07)';
      }}
    >
      {/* Decorative blob */}
      <div style={{
        position: 'absolute', top: -24, right: -24,
        width: 90, height: 90, borderRadius: '50%',
        background: color + '14', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -30, right: 10,
        width: 60, height: 60, borderRadius: '50%',
        background: color + '09', pointerEvents: 'none',
      }} />

      {/* Icon */}
      <div style={{
        width: 50, height: 50, borderRadius: 14,
        background: `linear-gradient(135deg, ${color}22, ${color}40)`,
        border: `1.5px solid ${color}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
      }}>
        <span className="material-icons" style={{ color, fontSize: 26 }}>{icon}</span>
      </div>

      {/* Value */}
      <div style={{
        fontSize: 30, fontWeight: 900, color: 'var(--text-primary, #1a202c)',
        lineHeight: 1, marginBottom: 6, letterSpacing: '-0.5px',
        fontFamily: 'Poppins, sans-serif',
      }}>
        {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}{suffix}
      </div>

      {/* Label */}
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted, #8a99b0)', letterSpacing: '0.02em' }}>
        {title}
      </div>

      {/* Bottom accent bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, ${color}, ${color}50)`,
        borderRadius: '0 0 18px 18px',
      }} />
    </div>
  );
};

export default StatCard;
