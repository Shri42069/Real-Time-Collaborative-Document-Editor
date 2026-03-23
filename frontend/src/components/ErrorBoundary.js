import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', gap: 16, padding: 24,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 14, color: '#888', margin: 0, textAlign: 'center', maxWidth: 400 }}>
          {this.state.error?.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          style={{
            padding: '9px 20px', background: '#534AB7', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{
            padding: '9px 20px', background: 'transparent', color: '#666',
            border: '1px solid #ddd', borderRadius: 8, fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Back to dashboard
        </button>
      </div>
    );
  }
}
