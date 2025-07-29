import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff, Upload, ClipboardCheck, Trophy, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

import StaffCard from '../components/StaffCard';
import AddStaffModal from '../components/AddStaffModal';
import ImportSalesModal from '../components/ImportSalesModal';
import WeeklyReviewModal from '../components/WeeklyReviewModal';
import LeaderboardModal from '../components/LeaderboardModal';
import StaffLeaderboard from '../components/StaffLeaderboard';
import AddSaleModal from '../components/AddSaleModal';

// --- Admin & Moderator View (unchanged) ---
const AdminDashboard = ({ staff }) => {
    const [isStaffModalOpen, setStaffModalOpen] = useState(false);
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [isReviewModalOpen, setReviewModalOpen] = useState(false);
    const [isLeaderboardOpen, setLeaderboardOpen] = useState(false);
    const [areStarsHidden, setAreStarsHidden] = useState(false);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
        },
    };

    return (
        <div className="space-y-6">
            <header className="space-y-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">Ansattoversikt</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setAreStarsHidden(!areStarsHidden)} className="p-2 rounded-lg bg-surface border-2 border-[#009A44] text-on-surface-secondary hover:bg-green-50 transition-colors">
                        {areStarsHidden ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button onClick={() => setLeaderboardOpen(true)} className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm bg-surface border-2 border-yellow-400 text-yellow-600 hover:bg-yellow-50 transition-colors">
                        <Trophy size={14} className="sm:w-4 sm:h-4"/><span className="hidden sm:inline">Leaderboard</span>
                    </button>
                    <button onClick={() => setImportModalOpen(true)} className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm bg-surface border-2 border-[#009A44] text-on-surface-secondary hover:bg-green-50 transition-colors">
                        <Upload size={14} className="sm:w-4 sm:h-4"/><span className="hidden sm:inline">Importer</span>
                    </button>
                    <button onClick={() => setReviewModalOpen(true)} className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm bg-surface border-2 border-[#009A44] text-on-surface-secondary hover:bg-green-50 transition-colors">
                        <ClipboardCheck size={14} className="sm:w-4 sm:h-4"/><span className="hidden sm:inline">Gjennomgang</span>
                    </button>
                    <button onClick={() => setStaffModalOpen(true)} className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#009A44] hover:bg-green-700 shadow-lg border-2 border-[#009A44] transition-all duration-150">
                        <UserPlus size={14} className="sm:w-4 sm:h-4"/><span>Legg til ansatt</span>
                    </button>
                </div>
            </header>

            <main>
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {staff.map((member) => (
                        <StaffCard key={member.id} staffMember={member} areStarsHidden={areStarsHidden} />
                    ))}
                </motion.div>
            </main>

            <AddStaffModal isOpen={isStaffModalOpen} onClose={() => setStaffModalOpen(false)} />
            <ImportSalesModal isOpen={isImportModalOpen} onClose={() => setImportModalOpen(false)} staffList={staff} />
            <WeeklyReviewModal isOpen={isReviewModalOpen} onClose={() => setReviewModalOpen(false)} staffList={staff} />
            <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
        </div>
    );
};


// --- Staff View ---
const StaffDashboard = ({ staff, currentUser }) => {
    const [isSaleModalOpen, setSaleModalOpen] = useState(false);

    const selfProfile = staff.find(member => member.uid === currentUser.uid);

    return (
        <div className="space-y-6">
            <header className="space-y-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">Leaderboard</h2>
                {selfProfile && (
                    <button
                        onClick={() => setSaleModalOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 sm:py-2 rounded-lg text-sm font-semibold text-white bg-[#009A44] hover:bg-green-700 shadow-lg border-2 border-[#009A44] transition-all duration-150"
                    >
                        <Send size={16} /><span>Send inn bilag</span>
                    </button>
                )}
            </header>
            <main>
                {/* --- Pass the currentUser prop here --- */}
                <StaffLeaderboard currentUser={currentUser} />
            </main>
            {selfProfile && (
                <AddSaleModal
                    isOpen={isSaleModalOpen}
                    onClose={() => setSaleModalOpen(false)}
                    staffId={selfProfile.id}
                    staffName={selfProfile.name}
                />
            )}
        </div>
    );
};


// --- Main Dashboard Component ---
function Dashboard() {
    const { currentUser, userRole, loading: authLoading } = useAuth();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Don't set up Firestore listeners until auth is ready and user is authenticated
        if (authLoading || !currentUser) {
            setLoading(false);
            return;
        }

        let unsub = null;

        try {
            const staffQuery = query(collection(db, 'staff'));
            unsub = onSnapshot(staffQuery,
                (snapshot) => {
                    const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    staffData.sort((a, b) => a.name.localeCompare(b.name));
                    setStaff(staffData);
                    setLoading(false);
                },
                (error) => {
                    console.error('Error listening to staff:', error);
                    setStaff([]);
                    setLoading(false);
                }
            );
        } catch (error) {
            console.error('Error setting up Dashboard listeners:', error);
            setLoading(false);
        }

        return () => {
            if (unsub) {
                unsub();
            }
        };
    }, [currentUser, authLoading]);

    if (loading) return <div className="text-center p-10">Laster data...</div>;

    if (userRole === 'admin' || userRole === 'moderator') {
        return <AdminDashboard staff={staff} />;
    }

    return <StaffDashboard staff={staff} currentUser={currentUser} />;
}

export default Dashboard;

