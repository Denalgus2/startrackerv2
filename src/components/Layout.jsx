import { LogOut, Home, History as HistoryIcon, Shield, CheckSquare, User, Settings, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { auth } from '../firebase';
import AnnouncementBanner from './AnnouncementBanner';
import { usePendingBilagCount } from '../hooks/usePendingBilagCount';

const NavLink = ({ to, children, currentPath, badge }) => {
    const navigate = useNavigate();
    const isActive = currentPath === to;

    return (
        <button
            onClick={() => navigate(to)}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'text-primary font-semibold' : 'text-on-surface-secondary hover:text-on-surface'
            }`}
        >
            {isActive && (
                <motion.div
                    layoutId="active-nav-link"
                    className="absolute inset-0 bg-primary/10 rounded-lg"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
            )}
            <span className="relative z-10 flex items-center gap-2">
                {children}
                {badge > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
            </span>
        </button>
    );
};

function Layout({ children }) {
    const { currentUser, userRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const pendingBilagCount = usePendingBilagCount();

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/login');
    };

    const isAdmin = userRole === 'admin';
    const isModerator = userRole === 'moderator';

    // Get role display text
    const getRoleDisplayText = (role) => {
        switch(role) {
            case 'admin': return 'Admin';
            case 'moderator': return 'Moderator';
            case 'staff': return 'Ansatt';
            default: return 'Bruker';
        }
    };

    return (
        <div className="min-h-screen bg-background text-on-surface">
            <header className="w-full flex items-center justify-between px-6 py-4 bg-surface border-b-4" style={{ borderColor: '#009A44' }}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/42/Elkjop_logo_blue.png" alt="Elkjøp Logo" className="h-8 mr-4" />
                <nav className="flex gap-2">
                    <NavLink to="/dashboard" currentPath={location.pathname}><Home size={18}/> Dashboard</NavLink>

                    {/* Show History only for regular staff */}
                    {!isModerator && !isAdmin && (
                        <NavLink to="/history" currentPath={location.pathname}><HistoryIcon size={18}/> Historikk</NavLink>
                    )}

                    {/* Moderator and Admin links */}
                    {(isModerator || isAdmin) && (
                        <>
                            <NavLink to="/moderator" currentPath={location.pathname} badge={pendingBilagCount}>
                                <BarChart3 size={18}/> Kontrollpanel
                            </NavLink>
                            <NavLink to="/moderator/settings" currentPath={location.pathname}><Settings size={18}/> Innstillinger</NavLink>
                        </>
                    )}

                    {isAdmin && <NavLink to="/admin" currentPath={location.pathname}><Shield size={18}/> Admin</NavLink>}
                </nav>

                {/* Right side with user info and logout */}
                <div className="flex items-center gap-4">
                    {/* User info display */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border-color">
                        <User size={16} className="text-primary" />
                        <div className="text-sm">
                            <div className="font-semibold text-on-surface">{currentUser?.displayName || currentUser?.email}</div>
                            <div className="text-xs text-on-surface-secondary">{getRoleDisplayText(userRole)}</div>
                        </div>
                    </div>

                    {/* Logout button */}
                    <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white bg-[#009A44] hover:bg-green-700 font-semibold">
                        <LogOut size={18}/> Logg ut
                    </button>
                </div>
            </header>

            <main className="container mx-auto px-4 pt-6 pb-12">
                {/* Announcement Banner */}
                <div className="mb-6">
                    <AnnouncementBanner />
                </div>

                {children}
            </main>
        </div>
    );
}

export default Layout;
