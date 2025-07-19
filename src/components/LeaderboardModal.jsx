import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Trophy, Medal, Award, Star, TrendingUp, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import ProfileStatsModal from './ProfileStatsModal';

function LeaderboardModal({ isOpen, onClose }) {
    const [staff, setStaff] = useState([]);
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState(null);
    const [isProfileStatsOpen, setProfileStatsOpen] = useState(false);
    const [showStarsPerShift, setShowStarsPerShift] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        // Fetch staff data
        const staffUnsub = onSnapshot(query(collection(db, 'staff')), (snapshot) => {
            const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStaff(staffData);
        });

        // Fetch sales data for detailed breakdown
        const salesUnsub = onSnapshot(query(collection(db, 'sales')), (snapshot) => {
            const salesData = snapshot.docs.map(doc => doc.data());
            setSalesData(salesData);
            setLoading(false);
        });

        return () => {
            staffUnsub();
            salesUnsub();
        };
    }, [isOpen]);

    // Calculate detailed stats for each staff member
    const calculateStaffStats = () => {
        return staff.map(member => {
            const memberSales = salesData.filter(sale => sale.staffId === member.id);

            // Count sales by category
            const categoryStats = {};
            const serviceStats = {};
            let totalSales = 0;
            let manualStars = 0;

            memberSales.forEach(sale => {
                if (sale.isManual) {
                    manualStars += sale.stars;
                } else {
                    totalSales++;
                    categoryStats[sale.category] = (categoryStats[sale.category] || 0) + 1;
                    serviceStats[sale.service] = (serviceStats[sale.service] || 0) + 1;
                }
            });

            const shifts = member.shifts || 0;
            const totalStars = member.stars || 0;
            const starsPerShift = shifts > 0 ? totalStars / shifts : 0;

            return {
                ...member,
                totalSales,
                manualStars,
                categoryStats,
                serviceStats,
                salesStars: totalStars - manualStars,
                starsPerShift: Number(starsPerShift.toFixed(2))
            };
        }).sort((a, b) => {
            if (showStarsPerShift) {
                // Sort by stars per shift, but put people with 0 shifts at the bottom
                if (a.shifts === 0 && b.shifts === 0) return (b.stars || 0) - (a.stars || 0);
                if (a.shifts === 0) return 1;
                if (b.shifts === 0) return -1;
                return b.starsPerShift - a.starsPerShift;
            } else {
                return (b.stars || 0) - (a.stars || 0);
            }
        });
    };

    const leaderboard = calculateStaffStats();
    const winner = leaderboard[0];
    const isCompetitionOver = false; // You can set this based on your competition end date

    const getRankIcon = (position) => {
        switch (position) {
            case 1: return <Trophy className="text-yellow-500" size={24} />;
            case 2: return <Medal className="text-gray-400" size={24} />;
            case 3: return <Award className="text-orange-600" size={24} />;
            default: return <span className="text-2xl font-bold text-gray-400">#{position}</span>;
        }
    };

    const getRankBadge = (position) => {
        switch (position) {
            case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
            case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
            case 3: return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const handleProfileClick = (member) => {
        setSelectedMember(member);
        setProfileStatsOpen(true);
    };

    if (loading) {
        return (
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
                        style={{ isolation: 'isolate' }}
                    >
                        <div className="bg-white rounded-xl p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#009A44] mx-auto mb-4"></div>
                            <p>Laster leaderboard...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
                    style={{ isolation: 'isolate' }}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border-2 border-[#009A44] shadow-2xl relative z-10"
                        style={{ backgroundColor: '#ffffff' }}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#009A44] to-green-600 text-white p-6">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                    <Trophy size={32} className="text-yellow-300" />
                                    <div>
                                        <h2 className="text-2xl font-bold">Stjernekamp Leaderboard</h2>
                                        <p className="text-green-100">Live konkurranseresultater</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-white hover:text-green-200 transition-colors p-2 rounded-lg hover:bg-white/10"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Toggle for stars vs stars per shift */}
                            <div className="flex justify-center mb-4">
                                <div className="bg-white/10 rounded-full p-1 flex items-center gap-3">
                                    <button
                                        onClick={() => setShowStarsPerShift(false)}
                                        className={`px-4 py-2 rounded-full transition-all font-medium ${
                                            !showStarsPerShift 
                                                ? 'bg-white text-[#009A44] shadow-md' 
                                                : 'text-white hover:bg-white/10'
                                        }`}
                                    >
                                        Total Stjerner
                                    </button>
                                    <button
                                        onClick={() => setShowStarsPerShift(true)}
                                        className={`px-4 py-2 rounded-full transition-all font-medium ${
                                            showStarsPerShift 
                                                ? 'bg-white text-[#009A44] shadow-md' 
                                                : 'text-white hover:bg-white/10'
                                        }`}
                                    >
                                        Stjerner per Vakt
                                    </button>
                                </div>
                            </div>

                            {/* Top 3 Preview */}
                            {leaderboard.length >= 3 && (
                                <div className="flex justify-center gap-4 mb-4">
                                    {leaderboard.slice(0, 3).map((member, index) => (
                                        <motion.div
                                            key={member.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className={`text-center ${index === 0 ? 'order-2' : index === 1 ? 'order-1' : 'order-3'}`}
                                        >
                                            <div className={`w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-2 mx-auto ${index === 0 ? 'scale-110' : ''}`}>
                                                {getRankIcon(index + 1)}
                                            </div>
                                            <p className={`font-semibold ${index === 0 ? 'text-lg' : 'text-sm'}`}>{member.name}</p>
                                            <p className={`flex items-center justify-center gap-1 ${index === 0 ? 'text-yellow-200' : 'text-green-100'}`}>
                                                <Star size={16} />
                                                {member.stars || 0}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Detailed Leaderboard */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            <div className="space-y-3">
                                {leaderboard.map((member, index) => (
                                    <motion.div
                                        key={member.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer ${
                                            index === 0 
                                                ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300' 
                                                : 'bg-gray-50 border-gray-200 hover:border-[#009A44]'
                                        }`}
                                        onClick={() => handleProfileClick(member)}
                                        title="Klikk for detaljert statistikk"
                                    >
                                        {/* Rank */}
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${getRankBadge(index + 1)}`}>
                                            {index < 3 ? getRankIcon(index + 1) : `#${index + 1}`}
                                        </div>

                                        {/* Name and basic info */}
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-gray-900">{member.name}</h3>
                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <TrendingUp size={14} />
                                                    {member.totalSales} salg
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users size={14} />
                                                    {member.shifts || 0} vakter
                                                </span>
                                            </div>
                                        </div>

                                        {/* Stats breakdown */}
                                        <div className="text-right">
                                            <div className="flex items-center gap-1 text-2xl font-bold text-[#009A44] mb-1">
                                                <Star size={24} />
                                                {showStarsPerShift ? member.starsPerShift : (member.stars || 0)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {showStarsPerShift ? (
                                                    <span>
                                                        {member.shifts > 0
                                                            ? `${member.stars || 0} / ${member.shifts} vakter`
                                                            : 'Ingen vakter ennå'
                                                        }
                                                    </span>
                                                ) : (
                                                    <>
                                                        {member.salesStars > 0 && <span>{member.salesStars} fra salg</span>}
                                                        {member.manualStars > 0 && member.salesStars > 0 && <span> • </span>}
                                                        {member.manualStars > 0 && <span>{member.manualStars} manuelt</span>}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Category breakdown (expandable) */}
                                        <div className="text-xs text-gray-500 max-w-48">
                                            {Object.keys(member.categoryStats).length > 0 && (
                                                <div className="space-y-1">
                                                    {Object.entries(member.categoryStats).slice(0, 3).map(([category, count]) => (
                                                        <div key={category} className="flex justify-between">
                                                            <span className="truncate">{category}:</span>
                                                            <span className="font-medium">{count}</span>
                                                        </div>
                                                    ))}
                                                    {Object.keys(member.categoryStats).length > 3 && (
                                                        <div className="text-gray-400">+{Object.keys(member.categoryStats).length - 3} flere...</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Footer stats */}
                        <div className="bg-gray-50 px-6 py-4 border-t">
                            <div className="flex justify-between items-center text-sm text-gray-600">
                                <span>Total deltakere: {leaderboard.length}</span>
                                <span>Total stjerner delt ut: {leaderboard.reduce((sum, member) => sum + (member.stars || 0), 0)}</span>
                                <span>Total salg: {leaderboard.reduce((sum, member) => sum + member.totalSales, 0)}</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            <ProfileStatsModal
                isOpen={isProfileStatsOpen}
                onClose={() => setProfileStatsOpen(false)}
                staffMember={selectedMember}
            />
        </AnimatePresence>
    );
}

export default LeaderboardModal;
