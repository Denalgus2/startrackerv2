import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import History from './pages/History.jsx';
import Login from './pages/Login.jsx';
import SignUp from './pages/SignUp.jsx'; // New
import VerifyEmail from './pages/VerifyEmail.jsx'; // New
import Admin from './pages/Admin.jsx'; // New

// This component protects routes that require a logged-in user
function PrivateRoute({ children }) {
    const { currentUser } = useAuth();
    return currentUser ? children : <Navigate to="/login" />;
}

// This component protects routes that require a VERIFIED logged-in user
function VerifiedRoute({ children }) {
    const { currentUser } = useAuth();
    if (!currentUser) return <Navigate to="/login" />;
    if (!currentUser.emailVerified) return <Navigate to="/verify-email" />;
    return children;
}

function App() {
    // Set basename for GitHub Pages deployment
    const basename = import.meta.env.PROD ? '/startrackerv2' : '';

    return (
        <Router basename={basename}>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/verify-email" element={<PrivateRoute><VerifyEmail /></PrivateRoute>} />

                <Route path="/" element={<VerifiedRoute><Layout><Dashboard /></Layout></VerifiedRoute>} />
                <Route path="/dashboard" element={<VerifiedRoute><Layout><Dashboard /></Layout></VerifiedRoute>} />
                <Route path="/history" element={<VerifiedRoute><Layout><History /></Layout></VerifiedRoute>} />
                <Route path="/admin" element={<VerifiedRoute><Layout><Admin /></Layout></VerifiedRoute>} />
            </Routes>
        </Router>
    );
}

export default App;