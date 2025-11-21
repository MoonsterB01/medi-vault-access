import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * @class ErrorBoundary
 * @description A React error boundary component that catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle, fallbackMessage } = this.props;
      const isDatabaseError = this.state.error?.message?.includes('infinite recursion') || 
                               this.state.error?.message?.includes('row-level security') ||
                               this.state.error?.message?.includes('permission denied');

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <CardTitle className="text-2xl">
                  {fallbackTitle || 'Something went wrong'}
                </CardTitle>
              </div>
              <CardDescription>
                {fallbackMessage || 'An error occurred while loading this page. Please try again.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDatabaseError && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Database Access Issue</AlertTitle>
                  <AlertDescription>
                    There appears to be a database permission or configuration issue. This has been logged and will be reviewed.
                    Please try refreshing the page or contact support if the issue persists.
                  </AlertDescription>
                </Alert>
              )}

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Alert variant="destructive">
                  <AlertTitle>Error Details (Development Only)</AlertTitle>
                  <AlertDescription className="mt-2">
                    <pre className="text-xs overflow-auto max-h-40 p-2 bg-muted rounded">
                      {this.state.error.message}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={this.handleGoHome}>
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
                <Button onClick={this.handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * @function withErrorBoundary
 * @description Higher-order component that wraps a component with an ErrorBoundary
 * @param Component The component to wrap
 * @param errorBoundaryProps Optional props for the ErrorBoundary
 * @returns A new component wrapped with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}