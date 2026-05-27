import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'inherit',
          padding: 24,
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ color: '#64748b', marginBottom: 24 }}>
            An unexpected error occurred. Please refresh the page or contact support if the issue persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 28px',
              borderRadius: 50,
              border: 'none',
              background: '#6366f1',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
