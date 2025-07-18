import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // This now contains your Tailwind CSS imports
import { AuthProvider } from './contexts/AuthContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        {/* We no longer need the ThemeProvider or CssBaseline */}
        <AuthProvider>
            <App />
        </AuthProvider>
    </React.StrictMode>
);