import { LogOut, Home, History as HistoryIcon, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { auth } from '../firebase'; // Import auth for signout

const NavLink = ({ to, children, currentPath }) => {
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
            <span className="relative z-10 flex items-center gap-2">{children}</span>
        </button>
    );
};

function Layout({ children }) {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/login');
    };

    // Check if the current user is the admin
    const isAdmin = currentUser && currentUser.email === 'denis.ale.gusev@gmail.com';

    return (
        <div className="min-h-screen bg-background text-on-surface">
            <header className="w-full flex items-center justify-between px-6 py-4 bg-surface border-b-4" style={{ borderColor: '#009A44' }}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/42/Elkjop_logo_blue.png" alt="Elkjøp Logo" className="h-8 mr-4" />
                <nav className="flex gap-2">
                    <NavLink to="/" currentPath={location.pathname}><Home size={18}/> Dashboard</NavLink>
                    <NavLink to="/history" currentPath={location.pathname}><HistoryIcon size={18}/> Historikk</NavLink>
                    {isAdmin && <NavLink to="/admin" currentPath={location.pathname}><Shield size={18}/> Admin</NavLink>}
                </nav>
                <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white bg-[#009A44] hover:bg-green-700 font-semibold">
                    <LogOut size={18}/> Logg ut
                </button>
            </header>
            <main className="container mx-auto px-4 pt-24 pb-12">
                {children}
            </main>
        </div>
    );
}

export default Layout;