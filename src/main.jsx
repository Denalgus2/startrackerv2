import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { useSecurity } from './utils/security.js';
import { useAnalytics } from './utils/analytics.js';
import { useHealthMonitor } from './utils/healthMonitor.jsx';
import { BrowserRouter as Router } from 'react-router-dom';

// Production initialization wrapper
function ProductionWrapper({ children }) {
    // Initialize production systems
    useSecurity();
    useAnalytics();
    useHealthMonitor();

    // Set global error handler
    React.useEffect(() => {
        const handleUnhandledError = (event) => {
            console.error('Unhandled error:', event.error);
            // In production, send to error monitoring service
            if (import.meta.env.PROD && window.gtag) {
                window.gtag('event', 'exception', {
                    description: event.error?.message || 'Unknown error',
                    fatal: true
                });
            }
        };

        const handleUnhandledRejection = (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            // In production, send to error monitoring service
            if (import.meta.env.PROD && window.gtag) {
                window.gtag('event', 'exception', {
                    description: event.reason?.message || 'Promise rejection',
                    fatal: false
                });
            }
        };

        window.addEventListener('error', handleUnhandledError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleUnhandledError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    return children;
}

// Enhanced root rendering with production features
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
    <React.StrictMode>
        <Router>
            <ProductionWrapper>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </ProductionWrapper>
        </Router>
    </React.StrictMode>
);

// Register service worker in production
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const { useServiceWorker } = await import('./utils/serviceWorker.js');
            const [_useServiceWorker] = useState(() => {
                // Service worker will be initialized via the hook in App component
            });
        } catch (error) {
            console.error('Service worker registration failed:', error);
        }
    });
}
