import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(/* eslint-disable-next-line no-unused-vars */error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);

        // Check if it's a Firebase error
        const isFirebaseError = error.message && (
            error.message.includes('FIRESTORE') ||
            error.message.includes('permission-denied') ||
            error.message.includes('INTERNAL ASSERTION FAILED')
        );

        this.setState({
            error,
            errorInfo,
            isFirebaseError
        });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Determine if we're in development mode
            const isDevelopment = import.meta.env ?
                import.meta.env.MODE === 'development' :
                typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';

            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                        </div>

                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            {this.state.isFirebaseError ? 'Tilkoblingsfeil' : 'Noe gikk galt'}
                        </h2>

                        <p className="text-gray-600 mb-6">
                            {this.state.isFirebaseError
                                ? 'Det oppstod en feil med databasetilkoblingen. Prøv å laste siden på nytt.'
                                : 'En uventet feil oppstod. Vi jobber med å løse problemet.'
                            }
                        </p>

                        <button
                            onClick={this.handleReload}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                        >
                            <RefreshCcw size={16} />
                            Last siden på nytt
                        </button>

                        {isDevelopment && (
                            <details className="mt-6 text-left">
                                <summary className="cursor-pointer text-sm text-gray-500">
                                    Tekniske detaljer
                                </summary>
                                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                                    {this.state.error && this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;