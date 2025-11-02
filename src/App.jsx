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
import PendingApproval from './pages/PendingApproval.jsx';
import NewWebsitePopup from './components/NewWebsitePopup.jsx';

// Protects routes that require a logged-in user (basic)
function PrivateRoute({ children }) {
    const { currentUser, loading } = useAuth();
    if (loading) return <div />; // lightweight hold to prevent route churn
    return currentUser ? children : <Navigate to="/login" replace />;
}

// --- New, more robust route protector ---
// Protects routes that require a VERIFIED and APPROVED user
function ApprovedRoute({ children }) {
    const { currentUser, userRole, loading } = useAuth();
    if (loading) return <div />;
    if (!currentUser) return <Navigate to="/login" replace />;
    if (!currentUser.emailVerified) return <Navigate to="/verify-email" replace />;
    if (userRole === 'pending') return <Navigate to="/pending-approval" replace />;
    if (userRole === 'staff' || userRole === 'moderator' || userRole === 'admin') return children;
    return <Navigate to="/login" replace />;
}

// Route protector for Moderators and Admins
function ModeratorRoute({ children }) {
    const { currentUser, userRole, loading } = useAuth();
    if (loading) return <div />;
    if (!currentUser) return <Navigate to="/login" replace />;
    if (!currentUser.emailVerified) return <Navigate to="/verify-email" replace />;
    if (userRole === 'pending') return <Navigate to="/pending-approval" replace />;
    if (userRole !== 'moderator' && userRole !== 'admin') return <Navigate to="/" replace />;
    return children;
}

// Route protector for Admins only
function AdminRoute({ children }) {
    const { currentUser, userRole, loading } = useAuth();
    if (loading) return <div />;
    if (!currentUser) return <Navigate to="/login" replace />;
    if (!currentUser.emailVerified) return <Navigate to="/verify-email" replace />;
    if (userRole === 'pending') return <Navigate to="/pending-approval" replace />;
    if (userRole !== 'admin') return <Navigate to="/" replace />;
    return children;
}


function App() {
    return (
    <Router basename="/startrackerv2">
            <ErrorBoundary>
                <NewWebsitePopup />
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