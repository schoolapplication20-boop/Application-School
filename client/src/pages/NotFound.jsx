import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const { isAuthenticated, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 100%)',
      fontFamily: 'Poppins, sans-serif', textAlign: 'center', padding: '24px',
    }}>
      <div style={{ fontSize: 80, marginBottom: 8 }}>🏫</div>
      <h1 style={{ fontSize: 96, fontWeight: 900, color: '#4f46e5', margin: 0, lineHeight: 1 }}>404</h1>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: '16px 0 8px' }}>
        Page Not Found
      </h2>
      <p style={{ color: '#64748b', fontSize: 16, maxWidth: 420, lineHeight: 1.6, marginBottom: 32 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '10px 24px', borderRadius: 8, border: '2px solid #4f46e5',
            background: 'transparent', color: '#4f46e5', fontWeight: 600,
            fontSize: 14, cursor: 'pointer',
          }}
        >
          ← Go Back
        </button>
        <Link
          to={isAuthenticated ? getDashboardPath() : '/login'}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: '#4f46e5', color: '#fff', fontWeight: 600,
            fontSize: 14, textDecoration: 'none',
          }}
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Go to Login'}
        </Link>
      </div>
    </div>
  );
}
