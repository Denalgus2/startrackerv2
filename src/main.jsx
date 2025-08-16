import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // This now contains your Tailwind CSS imports
import { AuthProvider } from './contexts/AuthContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
    // Disable StrictMode to avoid double-mount dev behavior that can reset form state
    // Re-enable if needed once login flow is fully stable
    <AuthProvider>
        <App />
    </AuthProvider>
);