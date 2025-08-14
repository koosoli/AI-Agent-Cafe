import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  copied: boolean;
  copyError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    copied: false,
    copyError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false, copyError: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  private handleCopy = async () => {
    if (this.state.error) {
      const errorDetails = `Error: ${this.state.error.toString()}\n\nStack Trace:\n${this.state.error.stack}`;
      try {
        await navigator.clipboard.writeText(errorDetails);
        this.setState({ copied: true, copyError: false });
        setTimeout(() => this.setState({ copied: false }), 2000);
      } catch (err) {
        console.error("Failed to copy error details to clipboard:", err);
        this.setState({ copyError: true });
        setTimeout(() => this.setState({ copyError: false }), 3000);
      }
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
            fontFamily: "'VT323', monospace",
            backgroundColor: '#1f1a15',
            color: '#fbbF24',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            textAlign: 'center',
            padding: '2rem',
            userSelect: 'text',
        }}>
          <h1 style={{ fontSize: '3rem', textShadow: '2px 2px #000' }}>A critical error has occurred.</h1>
          <p style={{ fontSize: '1.5rem', marginTop: '1rem' }}>
            The simulation has become unstable. Please copy the details and refresh the page.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
             <button
                onClick={this.handleReload}
                style={{
                  backgroundColor: '#3b82f6', // blue-500
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  textTransform: 'uppercase',
                  boxShadow: '4px 4px 0px #1e40af', // blue-800
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'VT323', monospace",
                  fontSize: '1.25rem'
                }}
              >
                Reload Page
              </button>
          </div>
          <div style={{ position: 'relative', marginTop: '1rem', maxWidth: '80%', width: '100%' }}>
            <pre style={{
              backgroundColor: '#000',
              border: '2px solid #fbbF24',
              padding: '1rem',
              overflow: 'auto',
              textAlign: 'left',
              color: '#ff6b6b',
              fontSize: '1rem',
              maxHeight: '40vh',
            }}>
              {`Error: ${this.state.error?.toString()}\n\nStack Trace:\n${this.state.error?.stack}`}
            </pre>
            <button
              onClick={this.handleCopy}
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                backgroundColor: this.state.copied ? '#22c55e' : (this.state.copyError ? '#ef4444' : '#4a5568'),
                color: 'white',
                padding: '0.5rem 1rem',
                textTransform: 'uppercase',
                boxShadow: '2px 2px 0px #2d3748',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'VT323', monospace",
                fontSize: '1rem'
              }}
            >
              {this.state.copied ? 'Copied!' : (this.state.copyError ? 'Copy Failed!' : 'Copy Details')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;