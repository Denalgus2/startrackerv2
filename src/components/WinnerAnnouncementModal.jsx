import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Crown, Star, Medal, Award, Sparkles, TrendingUp, ShoppingBag } from 'lucide-react';

function WinnerAnnouncementModal({ isOpen, onClose }) {
    const [staff, setStaff] = useState([]);
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;

        const staffUnsub = onSnapshot(query(collection(db, 'staff')), (snapshot) => {
            const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStaff(staffData);
        });

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

    const calculateDetailedStats = () => {
        return staff.map(member => {
            const memberSales = salesData.filter(sale => sale.staffId === member.id && !sale.isManual);

            const categoryBreakdown = {};
            const serviceBreakdown = {};

            memberSales.forEach(sale => {
                categoryBreakdown[sale.category] = (categoryBreakdown[sale.category] || 0) + 1;
                serviceBreakdown[sale.service] = (serviceBreakdown[sale.service] || 0) + 1;
            });

            return {
                ...member,
                totalSales: memberSales.length,
                categoryBreakdown,
                serviceBreakdown,
                topCategory: Object.entries(categoryBreakdown).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Ingen',
                topCategoryCount: Object.entries(categoryBreakdown).sort(([,a], [,b]) => b - a)[0]?.[1] || 0
            };
        }).sort((a, b) => (b.stars || 0) - (a.stars || 0));
    };

    const leaderboard = calculateDetailedStats();
    const winner = leaderboard[0];
    const runnerUp = leaderboard[1];
    const third = leaderboard[2];

    if (loading) {
        return null;
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-gradient-to-br from-yellow-400/20 via-orange-400/20 to-red-400/20 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
                    style={{ isolation: 'isolate' }}
                >
                    <motion.div
                        initial={{ scale: 0.8, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.8, y: 50 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl relative z-10 border-4 border-gradient-to-r from-yellow-400 to-orange-500"
                        style={{ backgroundColor: '#ffffff' }}
                    >
                        {/* Celebration Header */}
                        <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white p-8 relative overflow-hidden">
                            {/* Floating sparkles */}
                            <div className="absolute inset-0 overflow-hidden">
                                {[...Array(20)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute"
                                        style={{
                                            left: `${Math.random() * 100}%`,
                                            top: `${Math.random() * 100}%`,
                                        }}
                                        animate={{
                                            y: [0, -10, 0],
                                            rotate: [0, 180, 360],
                                            scale: [1, 1.2, 1],
                                        }}
                                        transition={{
                                            duration: 2 + Math.random() * 2,
                                            repeat: Infinity,
                                            delay: Math.random() * 2,
                                        }}
                                    >
                                        <Sparkles size={16} className="text-yellow-200" />
                                    </motion.div>
                                ))}
                            </div>

                            <div className="relative z-10 text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                                    className="mb-6"
                                >
                                    <Crown size={80} className="text-yellow-200 mx-auto mb-4" />
                                    <h1 className="text-5xl font-bold mb-2">🎉 STJERNEKAMP VINNER! 🎉</h1>
                                    <p className="text-xl text-yellow-100">Gratulerer til alle deltakere!</p>
                                </motion.div>
                            </div>
                        </div>

                        {/* Winner Spotlight */}
                        {winner && (
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="bg-gradient-to-br from-yellow-50 to-orange-50 p-8 border-b-4 border-yellow-300"
                            >
                                <div className="flex items-center justify-center gap-8 max-w-4xl mx-auto">
                                    <div className="text-center">
                                        <motion.div
                                            animate={{ rotate: [0, 10, -10, 0] }}
                                            transition={{ duration: 0.5, delay: 0.7 }}
                                            className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4 mx-auto shadow-2xl"
                                        >
                                            <Trophy size={64} className="text-white" />
                                        </motion.div>
                                        <h2 className="text-4xl font-bold text-gray-900 mb-2">{winner.name}</h2>
                                        <div className="flex items-center justify-center gap-2 text-3xl font-bold text-yellow-600 mb-4">
                                            <Star size={32} />
                                            <span>{winner.stars || 0} STJERNER</span>
                                        </div>
                                        <div className="bg-white rounded-xl p-6 shadow-lg">
                                            <div className="grid grid-cols-3 gap-6 text-center">
                                                <div>
                                                    <div className="text-2xl font-bold text-[#009A44]">{winner.totalSales}</div>
                                                    <div className="text-sm text-gray-600">Total Salg</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-blue-600">{winner.shifts || 0}</div>
                                                    <div className="text-sm text-gray-600">Vakter</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-purple-600">{winner.topCategoryCount}</div>
                                                    <div className="text-sm text-gray-600">{winner.topCategory}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Top 3 Podium */}
                        <div className="p-8">
                            <h3 className="text-2xl font-bold text-center mb-8 text-gray-900">🏆 TOPP 3 🏆</h3>
                            <div className="flex justify-center items-end gap-8 mb-8">
                                {/* 2nd place */}
                                {runnerUp && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.8 }}
                                        className="text-center"
                                    >
                                        <div className="w-20 h-20 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
                                            <Medal size={40} className="text-white" />
                                        </div>
                                        <div className="bg-gradient-to-t from-gray-200 to-gray-300 rounded-t-lg p-4 h-24 flex flex-col justify-end">
                                            <div className="text-lg font-bold text-gray-800">{runnerUp.name}</div>
                                            <div className="flex items-center justify-center gap-1 text-gray-700">
                                                <Star size={16} />
                                                {runnerUp.stars || 0}
                                            </div>
                                        </div>
                                        <div className="bg-gray-400 text-white py-2 px-4 rounded-b-lg font-bold">2. PLASS</div>
                                    </motion.div>
                                )}

                                {/* 1st place */}
                                {winner && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 }}
                                        className="text-center"
                                    >
                                        <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-3 shadow-xl">
                                            <Crown size={48} className="text-white" />
                                        </div>
                                        <div className="bg-gradient-to-t from-yellow-300 to-yellow-400 rounded-t-lg p-4 h-32 flex flex-col justify-end">
                                            <div className="text-xl font-bold text-yellow-900">{winner.name}</div>
                                            <div className="flex items-center justify-center gap-1 text-yellow-800">
                                                <Star size={18} />
                                                {winner.stars || 0}
                                            </div>
                                        </div>
                                        <div className="bg-yellow-500 text-white py-2 px-4 rounded-b-lg font-bold">🥇 VINNER</div>
                                    </motion.div>
                                )}

                                {/* 3rd place */}
                                {third && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 1.0 }}
                                        className="text-center"
                                    >
                                        <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mb-3 shadow-lg">
                                            <Award size={40} className="text-white" />
                                        </div>
                                        <div className="bg-gradient-to-t from-orange-200 to-orange-300 rounded-t-lg p-4 h-24 flex flex-col justify-end">
                                            <div className="text-lg font-bold text-orange-800">{third.name}</div>
                                            <div className="flex items-center justify-center gap-1 text-orange-700">
                                                <Star size={16} />
                                                {third.stars || 0}
                                            </div>
                                        </div>
                                        <div className="bg-orange-500 text-white py-2 px-4 rounded-b-lg font-bold">3. PLASS</div>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Detailed Statistics */}
                        <div className="bg-gray-50 p-6 max-h-64 overflow-y-auto">
                            <h4 className="text-lg font-bold mb-4 text-gray-900 text-center">📊 DETALJERTE RESULTATER</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {leaderboard.slice(0, 6).map((member, index) => (
                                    <motion.div
                                        key={member.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.8 + index * 0.1 }}
                                        className="bg-white rounded-lg p-4 shadow-md border-l-4 border-[#009A44]"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-gray-900">{index + 1}. {member.name}</span>
                                            <div className="flex items-center gap-1 text-[#009A44]">
                                                <Star size={16} />
                                                <span className="font-bold">{member.stars || 0}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            <div className="flex justify-between">
                                                <span>Salg:</span>
                                                <span className="font-medium">{member.totalSales}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Vakter:</span>
                                                <span className="font-medium">{member.shifts || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Topp kategori:</span>
                                                <span className="font-medium text-xs">{member.topCategory} ({member.topCategoryCount})</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Close button */}
                        <div className="p-6 text-center border-t bg-white">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onClose}
                                className="px-8 py-3 bg-gradient-to-r from-[#009A44] to-green-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all"
                            >
                                Lukk resultater
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default WinnerAnnouncementModal;
