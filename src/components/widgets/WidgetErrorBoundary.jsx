/**
 * Widget Error Boundary Component
 * 
 * Catches errors in widgets and displays a fallback UI
 */

import React from 'react';

export class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Widget error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card-glow h-full p-4">
          <h3 className="text-lg font-semibold mb-2 text-red-400">Widget Error</h3>
          <p className="text-sm text-dark-text-tertiary mb-2">
            {this.state.error?.message || 'An error occurred'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="text-xs text-purple-400 hover:text-purple-300"
          >
            Reload Widget
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WidgetErrorBoundary;

