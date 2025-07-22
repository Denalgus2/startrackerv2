import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MailCheck, LogOut, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { useEffect, useState } from 'react';

function PendingApproval() {
    const { currentUser, userRole } = useAuth();
    const navigate = useNavigate();
    const [isApproved, setIsApproved] = useState(false);

    // Monitor for role changes and show approval animation
    useEffect(() => {
        if (userRole && userRole !== 'pending') {
            setIsApproved(true);
            // Show success message briefly before redirecting
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        }
    }, [userRole, navigate]);

    const handleLogout = async () => {
        await auth.signOut();
        navigate('/login');
    };

    if (isApproved) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-lg p-8 text-center bg-surface rounded-xl shadow-lg border border-green-500"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    >
                        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                    </motion.div>
                    <h2 className="mt-6 text-3xl font-bold text-green-600">Konto Godkjent!</h2>
                    <p className="mt-4 text-on-surface">
                        Gratulerer <strong>{currentUser?.displayName || currentUser?.email}</strong>!
                    </p>
                    <p className="mt-2 text-on-surface-secondary">
                        Din konto er godkjent. Du blir automatisk videresendt til dashbordet...
                    </p>
                    <div className="mt-6">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                                className="bg-green-500 h-2 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 2 }}
                            />
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <motion.div
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg p-8 text-center bg-surface rounded-xl shadow-lg border border-border-color"
            >
                <MailCheck className="mx-auto h-16 w-16 text-primary" />
                <h2 className="mt-6 text-3xl font-bold text-on-surface">Konto Venter på Godkjenning</h2>
                <p className="mt-4 text-on-surface-secondary">
                    Takk for din registrering, <strong>{currentUser?.displayName || currentUser?.email}</strong>!
                </p>
                <p className="mt-2 text-on-surface-secondary">
                    Din konto må godkjennes av en administrator før du får tilgang. Vennligst vent på bekreftelse.
                </p>
                <div className="mt-8">
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 w-full max-w-xs mx-auto px-4 py-2 rounded-lg bg-[#009A44] text-white font-semibold hover:bg-green-700 shadow"
                    >
                        <LogOut size={16}/> Logg ut
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default PendingApproval;