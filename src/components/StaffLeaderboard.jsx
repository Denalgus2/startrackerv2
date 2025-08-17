import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, Star, TrendingUp, Users, Timer } from 'lucide-react';
import ProfileStatsModal from './ProfileStatsModal';

// Props:
// - currentUser: auth user object
// - competition: optional { id, title, endDate, participants }
// If competition is provided, only participants are shown and sales are filtered by competitionId.
function StaffLeaderboard({ currentUser, competition }) {

    // Added prop: forceCompetitionStars (default false)
    const [staff, setStaff] = useState([]);
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState(null);
    const [isProfileStatsOpen, setProfileStatsOpen] = useState(false);
    const [showStarsPerShift, setShowStarsPerShift] = useState(false);

    // Accept forceCompetitionStars prop
    const participantSet = useMemo(() => new Set(competition?.participants || []), [competition]);
    const showCountdown = Boolean(competition?.endDate?.toDate);

    useEffect(() => {
        const staffUnsub = onSnapshot(query(collection(db, 'staff')), (snapshot) => {
            const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // If competition is set, limit to participants
            setStaff(competition ? staffData.filter(s => participantSet.has(s.id)) : staffData);
        });

        // Always load sales by competition if forceCompetitionStars or competition is set
        let salesQuery;
        if (competition || (typeof forceCompetitionStars !== 'undefined' && forceCompetitionStars)) {
            if (competition) {
                salesQuery = query(collection(db, 'sales'), where('competitionId', '==', competition.id));
            } else {
                // If no competition selected, load all sales (global)
                salesQuery = query(collection(db, 'sales'));
            }
        } else {
            salesQuery = query(collection(db, 'sales'));
        }
        const salesUnsub = onSnapshot(salesQuery, (snapshot) => {
            const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSalesData(salesData);
            setLoading(false);
        });

        return () => {
            staffUnsub();
            salesUnsub();
        };
    }, [competition, participantSet]);

    const calculateStaffStats = () => {
        return staff.map(member => {
            const memberSales = salesData.filter(sale => sale.staffId === member.id);
            const totalSales = memberSales.length;
            const shifts = member.shifts || 0;
            // Always compute stars from salesData subset if forceCompetitionStars or competition is set
            const totalStars = (typeof forceCompetitionStars !== 'undefined' && forceCompetitionStars) || competition
                ? memberSales.reduce((sum, s) => sum + (s.stars || 0), 0)
                : (member.stars || 0);
            const starsPerShift = shifts > 0 ? totalStars / shifts : 0;

            return {
                ...member,
                totalSales,
                starsPerShift: Number(starsPerShift.toFixed(2)),
                stars: totalStars
            };
        }).sort((a, b) => {
            if (showStarsPerShift) {
                if (a.shifts === 0 && b.shifts === 0) return (b.stars || 0) - (a.stars || 0);
                if (a.shifts === 0) return 1;
                if (b.shifts === 0) return -1;
                return b.starsPerShift - a.starsPerShift;
            } else {
                // Always compare by computed total from sales subset if forceCompetitionStars or competition is set
                const aStars = ((typeof forceCompetitionStars !== 'undefined' && forceCompetitionStars) || competition)
                    ? salesData.filter(s => s.staffId === a.id).reduce((sum, s) => sum + (s.stars || 0), 0)
                    : (a.stars || 0);
                const bStars = ((typeof forceCompetitionStars !== 'undefined' && forceCompetitionStars) || competition)
                    ? salesData.filter(s => s.staffId === b.id).reduce((sum, s) => sum + (s.stars || 0), 0)
                    : (b.stars || 0);
                return bStars - aStars;
            }
        });
    };

    const leaderboard = calculateStaffStats();

    const getRankIcon = (position) => {
        if (position === 1) return <Trophy className="text-yellow-500" size={24} />;
        if (position === 2) return <Medal className="text-gray-400" size={24} />;
        if (position === 3) return <Award className="text-orange-600" size={24} />;
        return <span className="text-2xl font-bold text-gray-400">#{position}</span>;
    };

    const getRankBadge = (position) => {
        if (position === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
        if (position === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
        if (position === 3) return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
        return 'bg-gray-100 text-gray-700';
    };

    const handleProfileClick = (member) => {
        setSelectedMember(member);
        setProfileStatsOpen(true);
    };

    if (loading) return <div className="text-center p-10">Laster leaderboard...</div>;

    return (
        <>
            {competition && (
                <div className="max-w-4xl mx-auto mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
                    <div>
                        <div className="text-sm text-blue-800">Konkurranse</div>
                        <div className="text-base font-semibold text-blue-900">{competition.title}</div>
                    </div>
                    {showCountdown && (
                        <Countdown endDate={competition.endDate.toDate()} />
                    )}
                </div>
            )}
            <div className="flex justify-center mb-6">
                <div className="bg-gray-100 rounded-full p-1 flex items-center gap-3 border border-gray-200 shadow-sm">
                    <button
                        onClick={() => setShowStarsPerShift(false)}
                        className={`px-4 py-2 rounded-full transition-all text-sm font-semibold ${
                            !showStarsPerShift ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Total Stjerner
                    </button>
                    <button
                        onClick={() => setShowStarsPerShift(true)}
                        className={`px-4 py-2 rounded-full transition-all text-sm font-semibold ${
                            showStarsPerShift ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Stjerner per Vakt
                    </button>
                </div>
            </div>

            <div className="space-y-3 max-w-4xl mx-auto">
                {leaderboard.map((member, index) => {
                    // --- Check if the current row belongs to the logged-in user ---
                    const isCurrentUser = currentUser && member.uid === currentUser.uid;

                    // --- Dynamically apply classes for highlighting ---
                    const rankClass = index === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300' : 'bg-surface border-border-color hover:border-primary';
                    const highlightClass = isCurrentUser ? 'border-primary border-2 shadow-lg ring-2 ring-primary/20' : '';

                    return (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer ${rankClass} ${highlightClass}`}
                            onClick={() => handleProfileClick(member)}
                            title="Klikk for detaljert statistikk"
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold shrink-0 ${getRankBadge(index + 1)}`}>
                                {index < 3 ? getRankIcon(index + 1) : `#${index + 1}`}
                            </div>

                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-on-surface">{member.name}</h3>
                                <div className="flex items-center gap-4 text-sm text-on-surface-secondary">
                                    <span className="flex items-center gap-1"><TrendingUp size={14} />{member.totalSales} salg</span>
                                    <span className="flex items-center gap-1"><Users size={14} />{member.shifts || 0} vakter</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="flex items-center justify-end gap-1 text-2xl font-bold text-primary mb-1">
                                    <Star size={24} />
                                    {showStarsPerShift ? member.starsPerShift : (
                                        competition
                                            ? salesData.filter(s => s.staffId === member.id).reduce((sum, s) => sum + (s.stars || 0), 0)
                                            : (member.stars || 0)
                                    )}
                                </div>
                                <div className="text-xs text-on-surface-secondary">
                                    {showStarsPerShift ? 'Stjerner / vakt' : 'Totalt'}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <ProfileStatsModal
                isOpen={isProfileStatsOpen}
                onClose={() => setProfileStatsOpen(false)}
                staffMember={selectedMember}
            />
        </>
    );
}

export default StaffLeaderboard;

function Countdown({ endDate }) {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    const diff = Math.max(0, endDate.getTime() - now.getTime());
    const seconds = Math.floor(diff / 1000) % 60;
    const minutes = Math.floor(diff / (1000 * 60)) % 60;
    const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const ended = diff <= 0;
    return (
        <div className={`flex items-center gap-2 text-sm font-medium ${ended ? 'text-gray-600' : 'text-blue-900'}`} title={endDate.toLocaleString('no-NO')}>
            <Timer size={16} />
            {ended ? 'Avsluttet' : `${days}d ${hours}t ${minutes}m ${seconds}s`}
        </div>
    );
}