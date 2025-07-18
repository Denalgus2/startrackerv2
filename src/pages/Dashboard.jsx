import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff, Upload, ClipboardCheck } from 'lucide-react';

import StaffCard from '../components/StaffCard';
import AddStaffModal from '../components/AddStaffModal';
import ImportSalesModal from '../components/ImportSalesModal';
import WeeklyReviewModal from '../components/WeeklyReviewModal';

function Dashboard() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isStaffModalOpen, setStaffModalOpen] = useState(false);
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [isReviewModalOpen, setReviewModalOpen] = useState(false);
    const [areStarsHidden, setAreStarsHidden] = useState(false);

    useEffect(() => {
        const staffQuery = query(collection(db, 'staff'));
        const unsub = onSnapshot(staffQuery, (snapshot) => {
            const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort by name in JavaScript instead of Firestore
            staffData.sort((a, b) => a.name.localeCompare(b.name));
            setStaff(staffData);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
        },
    };

    if (loading) return <div className="text-center p-10">Laster data...</div>;

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-3xl font-bold text-on-surface">Ansattoversikt</h2>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setAreStarsHidden(!areStarsHidden)} className="p-2 rounded-lg bg-surface border-2 border-[#009A44] text-on-surface-secondary hover:bg-green-50 transition-colors">
                        {areStarsHidden ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button onClick={() => setImportModalOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-surface border-2 border-[#009A44] text-on-surface-secondary hover:bg-green-50 transition-colors">
                        <Upload size={16} /><span>Importer Salg</span>
                    </button>
                    <button onClick={() => setReviewModalOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-surface border-2 border-[#009A44] text-on-surface-secondary hover:bg-green-50 transition-colors">
                        <ClipboardCheck size={16} /><span>Ukentlig Gjennomgang</span>
                    </button>
                    <button onClick={() => setStaffModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#009A44] hover:bg-green-700 shadow-lg border-2 border-[#009A44] transition-all duration-150">
                        <UserPlus size={16} /><span>Legg til ansatt</span>
                    </button>
                </div>
            </header>

            <main>
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                    {staff.map((member) => (
                        <StaffCard
                            key={member.id}
                            staffMember={member}
                            areStarsHidden={areStarsHidden}
                        />
                    ))}
                </motion.div>
            </main>

            <AddStaffModal isOpen={isStaffModalOpen} onClose={() => setStaffModalOpen(false)} />
            <ImportSalesModal isOpen={isImportModalOpen} onClose={() => setImportModalOpen(false)} staffList={staff} />
            <WeeklyReviewModal isOpen={isReviewModalOpen} onClose={() => setReviewModalOpen(false)} staffList={staff} />
        </div>
    );
}

export default Dashboard;