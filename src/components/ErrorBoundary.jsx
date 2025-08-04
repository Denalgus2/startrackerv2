import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

function ErrorFallback({ error, resetErrorBoundary }) {
  const isDevelopment = import.meta.env.DEV;

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  // Log error to monitoring service in production
  React.useEffect(() => {
    if (!isDevelopment) {
      // Here you would integrate with error monitoring services like Sentry
      console.error('Production Error:', error);

      // Example: Send to analytics or error tracking
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.message,
          fatal: false
        });
      }
    }
  }, [error, isDevelopment]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Noe gikk galt
        </h1>

        <p className="text-gray-600 mb-6">
          Vi beklager, men det oppstod en uventet feil. Prøv å laste siden på nytt.
        </p>

        {isDevelopment && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
            <h3 className="font-medium text-red-800 mb-2">Feildetaljer (kun i utvikling):</h3>
            <pre className="text-sm text-red-700 overflow-auto max-h-32">
              {error.message}
            </pre>
            {error.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-red-800 font-medium">Stack trace</summary>
                <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-40">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Prøv igjen
          </button>

          <button
            onClick={handleReload}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Last siden på nytt
          </button>

          <button
            onClick={handleGoHome}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Hjem
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Hvis problemet vedvarer, kontakt systemadministrator.
        </p>
      </div>
    </div>
  );
}

function ErrorBoundary({ children, fallback }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={fallback || ErrorFallback}
      onError={(error, errorInfo) => {
        // Log to console in development
        if (import.meta.env.DEV) {
          console.error('Error Boundary caught an error:', error, errorInfo);
        }

        // In production, you would send this to your error monitoring service
        // Example: Sentry.captureException(error, { extra: errorInfo });
      }}
      onReset={() => {
        // Clear any error state
        window.location.reload();
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}

export default ErrorBoundary;
