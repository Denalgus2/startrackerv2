import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import History from './pages/History.jsx';
import Login from './pages/Login.jsx';
import SignUp from './pages/SignUp.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import Admin from './pages/Admin.jsx';
import Moderator from './pages/Moderator.jsx';
import ModeratorSettings from './pages/ModeratorSettings.jsx';
import UserSettings from './pages/UserSettings.jsx';
import PendingApproval from './pages/PendingApproval.jsx';

// Protects routes that require a logged-in user (basic)
function PrivateRoute({ children }) {
    const { currentUser } = useAuth();
    return currentUser ? children : <Navigate to="/login" />;
}

// --- New, more robust route protector ---
// Protects routes that require a VERIFIED and APPROVED user
function ApprovedRoute({ children }) {
    const { currentUser, userRole } = useAuth();

    if (!currentUser) {
        return <Navigate to="/login" />;
    }
    if (!currentUser.emailVerified) {
        return <Navigate to="/verify-email" />;
    }
    if (userRole === 'pending') {
        return <Navigate to="/pending-approval" />;
    }
    // Only allow users with an actual role to proceed
    if (userRole === 'staff' || userRole === 'moderator' || userRole === 'admin') {
        return children;
    }
    // Fallback for any other case (e.g., role is null while loading)
    return <Navigate to="/login" />;
}

// Route protector for Moderators and Admins
function ModeratorRoute({ children }) {
    const { currentUser, userRole } = useAuth();
    if (!currentUser) return <Navigate to="/login" />;
    if (!currentUser.emailVerified) return <Navigate to="/verify-email" />;
    if (userRole === 'pending') return <Navigate to="/pending-approval" />;
    if (userRole !== 'moderator' && userRole !== 'admin') return <Navigate to="/" />;
    return children;
}

// Route protector for Admins only
function AdminRoute({ children }) {
    const { currentUser, userRole } = useAuth();
    if (!currentUser) return <Navigate to="/login" />;
    if (!currentUser.emailVerified) return <Navigate to="/verify-email" />;
    if (userRole === 'pending') return <Navigate to="/pending-approval" />;
    if (userRole !== 'admin') return <Navigate to="/" />;
    return children;
}


function App() {
    const basename = import.meta.env.PROD ? '/startrackerv2' : '';

    return (
        <Router basename={basename}>
            <ErrorBoundary>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<SignUp />} />

                    {/* Routes for users who have registered but may not be approved */}
                    <Route path="/pending-approval" element={<PrivateRoute><PendingApproval /></PrivateRoute>} />
                    <Route path="/verify-email" element={<PrivateRoute><VerifyEmail /></PrivateRoute>} />

                    {/* Main application routes protected by verification and approval */}
                    <Route path="/" element={<ApprovedRoute><Layout><Dashboard /></Layout></ApprovedRoute>} />
                    <Route path="/dashboard" element={<ApprovedRoute><Layout><Dashboard /></Layout></ApprovedRoute>} />
                    <Route path="/history" element={<ApprovedRoute><Layout><History /></Layout></ApprovedRoute>} />
                    <Route path="/settings" element={<ApprovedRoute><Layout><UserSettings /></Layout></ApprovedRoute>} />

                    {/* Role-specific routes */}
                    <Route path="/moderator" element={<ModeratorRoute><Layout><Moderator /></Layout></ModeratorRoute>} />
                    <Route path="/moderator/settings" element={<ModeratorRoute><Layout><ModeratorSettings /></Layout></ModeratorRoute>} />
                    <Route path="/admin" element={<AdminRoute><Layout><Admin /></Layout></AdminRoute>} />
                </Routes>
            </ErrorBoundary>
        </Router>
    );
}

export default App;