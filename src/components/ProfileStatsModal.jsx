import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { X, User, Star, TrendingUp, Calendar, Target, Award, CheckCircle, Users, ShoppingBag } from 'lucide-react';

function ProfileStatsModal({ isOpen, onClose, staffMember }) {
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !staffMember?.id) return;

        const salesQuery = query(
            collection(db, 'sales'),
            where('staffId', '==', staffMember.id)
        );

        const unsubscribe = onSnapshot(salesQuery, (snapshot) => {
            const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSalesData(sales);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, staffMember?.id]);

    if (!staffMember) return null;

    const calculateDetailedStats = () => {
        const regularSales = salesData.filter(sale => !sale.isManual);
        const manualEntries = salesData.filter(sale => sale.isManual);

        // Category breakdown
        const categoryStats = {};
        const serviceStats = {};

        regularSales.forEach(sale => {
            categoryStats[sale.category] = (categoryStats[sale.category] || 0) + 1;
            serviceStats[sale.service] = (serviceStats[sale.service] || 0) + 1;
        });

        // Special calculations for specific categories
        const forsikringBreakdown = {
            'Mindre enn 100kr x3': serviceStats['Mindre enn 100kr x3'] || 0,
            '100-299kr x2': serviceStats['100-299kr x2'] || 0,
            '300-499kr': serviceStats['300-499kr'] || 0,
            '500kr+': serviceStats['500kr+'] || 0
        };

        const avsBreakdown = {
            'MOBOFUSM': serviceStats['MOBOFUSM'] || 0,
            'Teletime15 x3': serviceStats['Teletime15 x3'] || 0,
            'Pctime15 x3': serviceStats['Pctime15 x3'] || 0,
            'Mdatime15 x3': serviceStats['Mdatime15 x3'] || 0,
            'Teletime30 x2': serviceStats['Teletime30 x2'] || 0,
            'Pctime30 x2': serviceStats['Pctime30 x2'] || 0,
            'Mdatime30 x2': serviceStats['Mdatime30 x2'] || 0,
            'Teletime60': serviceStats['Teletime60'] || 0,
            'Pctime60': serviceStats['Pctime60'] || 0,
            'Mdatime60': serviceStats['Mdatime60'] || 0,
            'RTGWEARABLES x2': serviceStats['RTGWEARABLES x2'] || 0,
            'Annen RTG': serviceStats['Annen RTG'] || 0,
            'SUPPORTAVTALE 6mnd': serviceStats['SUPPORTAVTALE 6mnd'] || 0,
            'SUPPORTAVTALE 12mnd': serviceStats['SUPPORTAVTALE 12mnd'] || 0,
            'SUPPORTAVTALE 24mnd': serviceStats['SUPPORTAVTALE 24mnd'] || 0,
            'SUPPORTAVTALE 36mnd': serviceStats['SUPPORTAVTALE 36mnd'] || 0,
            'Installasjon hvitevare': serviceStats['Installasjon hvitevare'] || 0,
            'Returgreen': serviceStats['Returgreen'] || 0
        };

        const kundeklubbBreakdown = {
            '40%': serviceStats['40%'] || 0,
            '60%': serviceStats['60%'] || 0,
            '80%': serviceStats['80%'] || 0,
            '100%': serviceStats['100%'] || 0
        };

        const annetBreakdown = {
            'Kunnskap Sjekkliste': serviceStats['Kunnskap Sjekkliste'] || 0,
            'Todolist - Fylt ut 1 uke': serviceStats['Todolist - Fylt ut 1 uke'] || 0,
            'Todolist - Alt JA 1 uke': serviceStats['Todolist - Alt JA 1 uke'] || 0
        };

        // Calculate clever metrics
        const kundeklubbScore = (kundeklubbBreakdown['40%'] * 40 + kundeklubbBreakdown['60%'] * 60 +
                                kundeklubbBreakdown['80%'] * 80 + kundeklubbBreakdown['100%'] * 100) /
                               (Object.values(kundeklubbBreakdown).reduce((a, b) => a + b, 0) || 1);

        const todolistEfficiency = kundeklubbBreakdown['Todolist - Alt JA 1 uke'] /
                                  (annetBreakdown['Todolist - Fylt ut 1 uke'] || 1);

        return {
            totalSales: regularSales.length,
            manualEntries: manualEntries.length,
            categoryStats,
            serviceStats,
            forsikringBreakdown,
            avsBreakdown,
            kundeklubbBreakdown,
            annetBreakdown,
            kundeklubbScore: isNaN(kundeklubbScore) ? 0 : kundeklubbScore,
            todolistEfficiency: isNaN(todolistEfficiency) ? 0 : todolistEfficiency,
            starsFromSales: (staffMember.stars || 0) - manualEntries.reduce((sum, entry) => sum + entry.stars, 0),
            starsFromManual: manualEntries.reduce((sum, entry) => sum + entry.stars, 0)
        };
    };

    const stats = calculateDetailedStats();

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
                            <p>Laster profil statistikk...</p>
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
                        className="bg-white rounded-xl w-full max-w-6xl max-h-[95vh] overflow-hidden border-2 border-[#009A44] shadow-2xl relative z-10"
                        style={{ backgroundColor: '#ffffff' }}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#009A44] to-green-600 text-white p-6">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                        <User size={32} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-bold">{staffMember.name}</h2>
                                        <div className="flex items-center gap-4 text-green-100">
                                            <span className="flex items-center gap-1">
                                                <Star size={16} />
                                                {staffMember.stars || 0} stjerner
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={16} />
                                                {staffMember.shifts || 0} vakter
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <TrendingUp size={16} />
                                                {((staffMember.stars || 0) / (staffMember.shifts || 1)).toFixed(2)} per vakt
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <ShoppingBag size={16} />
                                                {stats.totalSales} salg
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-white hover:text-green-200 transition-colors p-2 rounded-lg hover:bg-white/10"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Overview Stats */}
                                <div className="space-y-6">
                                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                                        <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                                            <TrendingUp size={24} />
                                            Oversikt
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-blue-700">{stats.starsFromSales}</div>
                                                <div className="text-sm text-blue-600">Stjerner fra salg</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-purple-700">{stats.starsFromManual}</div>
                                                <div className="text-sm text-purple-600">Manuelle stjerner</div>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-blue-200">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-green-700">
                                                    {((staffMember.stars || 0) / (staffMember.shifts || 1)).toFixed(2)}
                                                </div>
                                                <div className="text-sm text-green-600">Stjerner per vakt</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {staffMember.shifts ? `${staffMember.stars || 0} stjerner / ${staffMember.shifts} vakter` : 'Ingen vakter registrert'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Forsikring Breakdown */}
                                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                                        <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
                                            <Award size={24} />
                                            Forsikring
                                        </h3>
                                        <div className="space-y-3">
                                            {Object.entries(stats.forsikringBreakdown).map(([service, count]) => (
                                                <div key={service} className="flex justify-between items-center">
                                                    <span className="text-green-700 text-sm">{service}</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 h-2 bg-green-200 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-green-500 transition-all duration-500"
                                                                style={{ width: `${Math.min((count / Math.max(...Object.values(stats.forsikringBreakdown))) * 100, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="font-bold text-green-800 w-8 text-right">{count}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Kundeklubb & Todolist Intelligence */}
                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                                        <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                                            <Users size={24} />
                                            Kundeklubb & Todolist
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="bg-white rounded-lg p-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-medium text-purple-800">Kundeklubb Gjennomsnitt</span>
                                                    <span className="text-2xl font-bold text-purple-700">{stats.kundeklubbScore.toFixed(1)}%</span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2 text-xs">
                                                    {Object.entries(stats.kundeklubbBreakdown).map(([percentage, count]) => (
                                                        <div key={percentage} className="text-center">
                                                            <div className="font-bold text-purple-600">{count}</div>
                                                            <div className="text-purple-500">{percentage}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-medium text-purple-800">Todolist Effektivitet</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg font-bold text-purple-700">
                                                            {(stats.todolistEfficiency * 100).toFixed(0)}%
                                                        </span>
                                                        {stats.todolistEfficiency >= 0.8 && <CheckCircle size={16} className="text-green-500" />}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-purple-600 mt-1">
                                                    {stats.annetBreakdown['Todolist - Alt JA 1 uke']}/{stats.annetBreakdown['Todolist - Fylt ut 1 uke']} perfekte uker
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* AVS/Support Details */}
                                <div className="space-y-6">
                                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                                        <h3 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
                                            <Target size={24} />
                                            AVS/Support Tjenester
                                        </h3>
                                        <div className="space-y-2 max-h-80 overflow-y-auto">
                                            {Object.entries(stats.avsBreakdown)
                                                .filter(([, count]) => count > 0)
                                                .sort(([,a], [,b]) => b - a)
                                                .map(([service, count]) => (
                                                <div key={service} className="flex justify-between items-center py-2 border-b border-orange-200 last:border-b-0">
                                                    <div className="flex-1">
                                                        <span className={`text-sm font-medium ${
                                                            service === 'MOBOFUSM' ? 'text-blue-700' :
                                                            service.includes('SUPPORTAVTALE') ? 'text-green-700' :
                                                            service.includes('Installasjon') ? 'text-purple-700' :
                                                            'text-orange-700'
                                                        }`}>
                                                            {service}
                                                        </span>
                                                        {service.includes('x2') && (
                                                            <span className="ml-2 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                                                                Multiplier: {Math.floor(count / 2)} stjerner
                                                            </span>
                                                        )}
                                                        {service.includes('x3') && (
                                                            <span className="ml-2 px-2 py-1 bg-red-200 text-red-800 text-xs rounded-full">
                                                                Multiplier: {Math.floor(count / 3)} stjerner
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold text-orange-800 text-lg">{count}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {Object.values(stats.avsBreakdown).every(count => count === 0) && (
                                                <p className="text-orange-600 text-center py-4">Ingen AVS/Support salg ennå</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Performance Badges */}
                                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
                                        <h3 className="text-xl font-bold text-yellow-900 mb-4 flex items-center gap-2">
                                            <Award size={24} />
                                            Prestasjoner
                                        </h3>
                                        <div className="flex flex-wrap gap-3">
                                            {stats.totalSales >= 10 && (
                                                <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                                    🎯 Salgsekspert
                                                </div>
                                            )}
                                            {stats.avsBreakdown['MOBOFUSM'] >= 5 && (
                                                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                                    📱 MOBOFUSM Spesialist
                                                </div>
                                            )}
                                            {stats.kundeklubbScore >= 80 && (
                                                <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                                    ⭐ Kundeklubb Mester
                                                </div>
                                            )}
                                            {stats.todolistEfficiency >= 0.8 && (
                                                <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                                    ✅ Todolist Ninja
                                                </div>
                                            )}
                                            {(staffMember.stars || 0) >= 50 && (
                                                <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                                    🌟 Stjerne Champion
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ProfileStatsModal;
