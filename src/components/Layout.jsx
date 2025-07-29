import { LogOut, Home, History as HistoryIcon, Shield, CheckSquare, User, Settings, BarChart3, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../firebase';
import AnnouncementBanner from './AnnouncementBanner';
import { usePendingBilagCount } from '../hooks/usePendingBilagCount';
import { useState } from 'react';

const NavLink = ({ to, children, currentPath, badge, onClick }) => {
    const navigate = useNavigate();
    const isActive = currentPath === to;

    const handleClick = () => {
        navigate(to);
        if (onClick) onClick();
    };

    return (
        <button
            onClick={handleClick}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full sm:w-auto ${
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
    const { currentUser, userRole, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const pendingBilagCount = usePendingBilagCount();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
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

    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <div className="min-h-screen bg-background text-on-surface">
            <header className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-surface border-b-4 relative" style={{ borderColor: '#009A44' }}>
                {/* Logo */}
                <div className="flex items-center">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/4/42/Elkjop_logo_blue.png" alt="Elkjøp Logo" className="h-6 sm:h-8 mr-2 sm:mr-4" />
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden sm:flex gap-2">
                    <NavLink to="/dashboard" currentPath={location.pathname}><Home size={18}/> Dashboard</NavLink>

                    {/* Show History only for regular staff */}
                    {!isModerator && !isAdmin && (
                        <NavLink to="/history" currentPath={location.pathname}><HistoryIcon size={18}/> Historikk</NavLink>
                    )}

                    {/* Settings link for all users */}
                    <NavLink to="/settings" currentPath={location.pathname}><Settings size={18}/> Innstillinger</NavLink>

                    {/* Moderator and Admin links */}
                    {(isModerator || isAdmin) && (
                        <>
                            <NavLink to="/moderator" currentPath={location.pathname} badge={pendingBilagCount}>
                                <BarChart3 size={18}/> Kontrollpanel
                            </NavLink>
                        </>
                    )}

                    {isAdmin && <NavLink to="/admin" currentPath={location.pathname}><Shield size={18}/> Admin</NavLink>}
                </nav>

                {/* Right side with user info and logout */}
                <div className="flex items-center gap-2 sm:gap-4">
                    {/* User info display - hidden on mobile */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border-color">
                        <User size={16} className="text-primary" />
                        <div className="text-sm">
                            <div className="font-semibold text-on-surface">{currentUser?.displayName || currentUser?.email}</div>
                            <div className="text-xs text-on-surface-secondary">{getRoleDisplayText(userRole)}</div>
                        </div>
                    </div>

                    {/* Logout button - hidden on mobile */}
                    <button 
                        onClick={handleLogout} 
                        className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white bg-[#009A44] hover:bg-green-700 font-semibold"
                    >
                        <LogOut size={18}/> Logg ut
                    </button>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="sm:hidden p-2 rounded-lg hover:bg-gray-100"
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </header>

            {/* Mobile Navigation Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="sm:hidden bg-surface border-b border-border-color overflow-hidden"
                    >
                        <div className="px-4 py-4 space-y-2">
                            {/* User info for mobile */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border-color mb-4">
                                <User size={16} className="text-primary" />
                                <div className="text-sm flex-1">
                                    <div className="font-semibold text-on-surface truncate">{currentUser?.displayName || currentUser?.email}</div>
                                    <div className="text-xs text-on-surface-secondary">{getRoleDisplayText(userRole)}</div>
                                </div>
                            </div>

                            {/* Navigation links */}
                            <NavLink to="/dashboard" currentPath={location.pathname} onClick={closeMobileMenu}>
                                <Home size={18}/> Dashboard
                            </NavLink>

                            {/* Show History only for regular staff */}
                            {!isModerator && !isAdmin && (
                                <NavLink to="/history" currentPath={location.pathname} onClick={closeMobileMenu}>
                                    <HistoryIcon size={18}/> Historikk
                                </NavLink>
                            )}

                            {/* Settings link for all users */}
                            <NavLink to="/settings" currentPath={location.pathname} onClick={closeMobileMenu}>
                                <Settings size={18}/> Innstillinger
                            </NavLink>

                            {/* Moderator and Admin links */}
                            {(isModerator || isAdmin) && (
                                <>
                                    <NavLink to="/moderator" currentPath={location.pathname} badge={pendingBilagCount} onClick={closeMobileMenu}>
                                        <BarChart3 size={18}/> Kontrollpanel
                                    </NavLink>
                                </>
                            )}

                            {isAdmin && (
                                <NavLink to="/admin" currentPath={location.pathname} onClick={closeMobileMenu}>
                                    <Shield size={18}/> Admin
                                </NavLink>
                            )}

                            {/* Logout button for mobile */}
                            <button 
                                onClick={handleLogout} 
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white bg-[#009A44] hover:bg-green-700 font-semibold mt-4"
                            >
                                <LogOut size={18}/> Logg ut
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="container mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-12">
                {/* Announcement Banner */}
                <div className="mb-4 sm:mb-6">
                    <AnnouncementBanner />
                </div>

                {children}
            </main>
        </div>
    );
}

export default Layout;
