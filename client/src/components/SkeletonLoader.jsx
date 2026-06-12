import React from 'react';

const pulse = {
  background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeletonPulse 1.4s ease-in-out infinite',
  borderRadius: 8,
};

export function SkeletonBox({ width = '100%', height = 20, style = {} }) {
  return <div style={{ ...pulse, width, height, ...style }} />;
}

export function SkeletonCard({ style = {} }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: 24,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', ...style,
    }}>
      <SkeletonBox height={12} width="40%" style={{ marginBottom: 12 }} />
      <SkeletonBox height={32} width="60%" style={{ marginBottom: 8 }} />
      <SkeletonBox height={10} width="30%" />
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <>
      <style>{`
        @keyframes skeletonPulse {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <table className="data-table">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <SkeletonBox height={16} width={c === 0 ? '80%' : '60%'} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function SkeletonDashboard() {
  return (
    <>
      <style>{`
        @keyframes skeletonPulse {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Stat cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </div>

      {/* Two-column section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SkeletonBox height={14} width="35%" style={{ marginBottom: 20 }} />
          <SkeletonBox height={180} />
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <SkeletonBox height={14} width="40%" style={{ marginBottom: 20 }} />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
              <SkeletonBox width={36} height={36} style={{ borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <SkeletonBox height={12} width="60%" style={{ marginBottom: 6 }} />
                <SkeletonBox height={10} width="40%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
