import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuth } from './contexts/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { NotificationProvider } from './components/NotificationSystem.jsx';
import { PageLoader, SuspenseFallback } from './components/LoadingSystem.jsx';
import { useServiceWorker } from './utils/serviceWorker.js';
import { usePerformanceMonitor, useMemoryMonitor } from './utils/performance.js';
import { useOnlineStatus } from './components/NotificationSystem.jsx';

// Lazy load components for better performance
const Layout = lazy(() => import('./components/Layout.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const History = lazy(() => import('./pages/History.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const SignUp = lazy(() => import('./pages/SignUp.jsx'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const Moderator = lazy(() => import('./pages/Moderator.jsx'));
const ModeratorSettings = lazy(() => import('./pages/ModeratorSettings.jsx'));
const PendingApproval = lazy(() => import('./pages/PendingApproval.jsx'));

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

// Main App component with production features
function AppContent() {
    const _basename = import.meta.env.BASE_URL;

    // Initialize production systems
    useServiceWorker();
    usePerformanceMonitor('App');
    useMemoryMonitor();
    useOnlineStatus();

    return (
        <ErrorBoundary>
            <Suspense fallback={<PageLoader message="Laster applikasjon..." />}>
                <Routes>
                    {/* Public Routes */}
                    <Route
                        path="/login"
                        element={
                            <Suspense fallback={<SuspenseFallback />}>
                                <Login />
                            </Suspense>
                        }
                    />
                    <Route
                        path="/signup"
                        element={
                            <Suspense fallback={<SuspenseFallback />}>
                                <SignUp />
                            </Suspense>
                        }
                    />

                    {/* Routes for users who have registered but may not be approved */}
                    <Route
                        path="/pending-approval"
                        element={
                            <PrivateRoute>
                                <Suspense fallback={<SuspenseFallback />}>
                                    <PendingApproval />
                                </Suspense>
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/verify-email"
                        element={
                            <PrivateRoute>
                                <Suspense fallback={<SuspenseFallback />}>
                                    <VerifyEmail />
                                </Suspense>
                            </PrivateRoute>
                        }
                    />

                    {/* Main application routes protected by verification and approval */}
                    <Route
                        path="/"
                        element={
                            <ApprovedRoute>
                                <Suspense fallback={<SuspenseFallback />}>
                                    <Layout>
                                        <Dashboard />
                                    </Layout>
                                </Suspense>
                            </ApprovedRoute>
                        }
                    />
                    <Route
                        path="/dashboard"
                        element={
                            <ApprovedRoute>
                                <Suspense fallback={<SuspenseFallback />}>
                                    <Layout>
                                        <Dashboard />
                                    </Layout>
                                </Suspense>
                            </ApprovedRoute>
                        }
                    />
                    <Route
                        path="/history"
                        element={
                            <ApprovedRoute>
                                <Suspense fallback={<SuspenseFallback />}>
                                    <Layout>
                                        <History />
                                    </Layout>
                                </Suspense>
                            </ApprovedRoute>
                        }
                    />

                    {/* Role-specific routes */}
                    <Route
                        path="/moderator"
                        element={
                            <ModeratorRoute>
                                <Suspense fallback={<SuspenseFallback />}>
                                    <Layout>
                                        <Moderator />
                                    </Layout>
                                </Suspense>
                            </ModeratorRoute>
                        }
                    />
                    <Route
                        path="/moderator/settings"
                        element={
                            <ModeratorRoute>
                                <Suspense fallback={<SuspenseFallback />}>
                                    <Layout>
                                        <ModeratorSettings />
                                    </Layout>
                                </Suspense>
                            </ModeratorRoute>
                        }
                    />
                    <Route
                        path="/admin"
                        element={
                            <AdminRoute>
                                <Suspense fallback={<SuspenseFallback />}>
                                    <Layout>
                                        <Admin />
                                    </Layout>
                                </Suspense>
                            </AdminRoute>
                        }
                    />
                </Routes>
            </Suspense>
        </ErrorBoundary>
    );
}

function App() {
    return (
        <NotificationProvider>
            <AppContent />
        </NotificationProvider>
    );
}

export default App;
