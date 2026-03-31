import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AccessDenied({ module }) {
  const { user, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
      fontFamily: 'Poppins, sans-serif',
      padding: '24px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '56px 48px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
        border: '1px solid #f0f4f8',
      }}>
        {/* Icon */}
        <div style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #fff5f5, #fed7d7)',
          border: '3px solid #fc8181',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 28px',
        }}>
          <span className="material-icons" style={{ fontSize: '44px', color: '#e53e3e' }}>lock</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#2d3748', margin: '0 0 8px' }}>
          Access Denied
        </h1>
        <p style={{ fontSize: '15px', color: '#718096', margin: '0 0 24px', lineHeight: 1.6 }}>
          You don't have permission to access{' '}
          {module ? (
            <strong style={{ color: '#4a5568' }}>"{module}"</strong>
          ) : 'this page'}.
        </p>

        {/* Info box */}
        <div style={{
          background: '#fffbeb',
          border: '1.5px solid #fef3c7',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '32px',
          textAlign: 'left',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span className="material-icons" style={{ fontSize: '18px', color: '#d69e2e', marginTop: '2px', flexShrink: 0 }}>info</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#744210', marginBottom: '4px' }}>
                Permission required
              </div>
              <div style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>
                This module has not been enabled for your account.
                Please contact your <strong>Super Admin</strong> to request access.
              </div>
            </div>
          </div>
        </div>

        {/* User info badge */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#f7fafc',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '28px',
            textAlign: 'left',
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #76C442, #5fa832)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              flexShrink: 0,
            }}>
              {(user.name || 'A').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#2d3748' }}>{user.name}</div>
              <div style={{ fontSize: '11px', color: '#a0aec0' }}>{user.email}</div>
            </div>
            <span style={{
              marginLeft: 'auto',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '10px',
              fontWeight: 700,
              background: '#76C44220',
              color: '#276749',
            }}>
              {user.role}
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '11px 22px',
              border: '1.5px solid #e2e8f0',
              borderRadius: '10px',
              background: '#fff',
              color: '#4a5568',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>arrow_back</span>
            Go Back
          </button>
          <button
            onClick={() => navigate(getDashboardPath())}
            style={{
              padding: '11px 22px',
              border: 'none',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #76C442, #5fa832)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(118,196,66,0.35)',
            }}
          >
            <span className="material-icons" style={{ fontSize: '16px' }}>home</span>
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
