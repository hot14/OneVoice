import React, { Component, ErrorInfo, ReactNode } from 'react';
import { error as loggerError } from '../lib/logger';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    resetKey: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error without sensitive data
    loggerError('Uncaught error:', error?.message);
    this.setState({ errorInfo });
    
    if (import.meta.env.DEV) {
      console.debug('Error info:', errorInfo);
    }
  }

  public componentDidUpdate(prevProps: Props, prevState: State) {
    // Reset error state when resetKey changes (recovery triggered)
    if (prevState.resetKey !== this.state.resetKey && !this.state.hasError) {
      loggerError('ErrorBoundary recovered');
    }
  }

  private handleReset = () => {
    const { onReset } = this.props;
    
    // Call parent's reset handler if provided
    if (onReset) {
      onReset();
    }
    
    // Reset ErrorBoundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      resetKey: this.state.resetKey + 1,
    });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI or default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4 text-sm">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="text-left mb-4 p-3 bg-gray-50 rounded-lg text-xs overflow-auto max-h-32">
                <summary className="font-semibold cursor-pointer">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {this.state.error?.stack}
                  {'\n\nComponent Stack:'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
