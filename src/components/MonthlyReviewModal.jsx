import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Calendar, Clock, Star, CheckCircle, AlertCircle, Users, Shuffle, UserCheck } from 'lucide-react';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from '../firebase';

function MonthlyReviewModal({ isOpen, onClose, staffList }) {
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
    const [saving, setSaving] = useState(false);
    const [vakterCounts, setVakterCounts] = useState({});
    const [loading, setLoading] = useState(false);
    const [alreadyAwarded, setAlreadyAwarded] = useState(false);
    const [showTieResolution, setShowTieResolution] = useState(false);
    const [tieResolutionMethod, setTieResolutionMethod] = useState('all');
    const [selectedStaffForTie, setSelectedStaffForTie] = useState(null);
    const [customStarAmount, setCustomStarAmount] = useState(2);
    const [monthlySales, setMonthlySales] = useState([]);
    
    // New state for MVP stats
    const [mvpStats, setMvpStats] = useState({
        mostInsurance: { staffId: '', count: 0, manual: false },
        mostAvs: { staffId: '', count: 0, manual: false },
        highestRevenue: { staffId: '', amount: '' },
        highestEarnings: { staffId: '', amount: '' },
        highestGm: { staffId: '', percent: '' },
        academyCompleted: [] // Array of staff IDs
    });

    // Get current month info
    function getCurrentMonth() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        return {
            start: startOfMonth,
            end: endOfMonth,
            month: now.getMonth() + 1,
            monthName: now.toLocaleDateString('no-NO', { month: 'long' }),
            year: now.getFullYear()
        };
    }

    // Format date for display
    function formatDate(date) {
        return date.toLocaleDateString('no-NO', {
            day: 'numeric',
            month: 'long'
        });
    }

    // Change month
    function changeMonth(direction) {
        const newStart = new Date(selectedMonth.start);
        newStart.setMonth(newStart.getMonth() + direction);

        const endOfMonth = new Date(newStart.getFullYear(), newStart.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        const monthName = newStart.toLocaleDateString('no-NO', { month: 'long' });

        setSelectedMonth({
            start: newStart,
            end: endOfMonth,
            month: newStart.getMonth() + 1,
            monthName: monthName,
            year: newStart.getFullYear()
        });
    }

    const autoMvp = useMemo(() => {
        const toTop = (counts) => {
            let topId = '';
            let max = 0;
            let second = 0;
            Object.entries(counts || {}).forEach(([staffId, value]) => {
                if (value > max) {
                    second = max;
                    max = value;
                    topId = staffId;
                } else if (value > second) {
                    second = value;
                }
            });
            return { staffId: topId, max, secondMax: second };
        };

        const insuranceCounts = {};
        const avsCounts = {};

        monthlySales.forEach(sale => {
            if (!sale.staffId || !sale.category) return;
            if (sale.category === 'Forsikring') {
                insuranceCounts[sale.staffId] = (insuranceCounts[sale.staffId] || 0) + 1;
            }
            if (sale.category === 'AVS/Support') {
                avsCounts[sale.staffId] = (avsCounts[sale.staffId] || 0) + 1;
            }
        });

        return {
            forsikring: toTop(insuranceCounts),
            avs: toTop(avsCounts),
            vakter: toTop(vakterCounts)
        };
    }, [monthlySales, vakterCounts]);

    // Load shifts and sales for selected month
    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        setVakterCounts({});
        setAlreadyAwarded(false);
        setShowTieResolution(false);
        setTieResolutionMethod('all');
        setSelectedStaffForTie(null);
        
        // Reset MVP stats
        setMvpStats({
            mostInsurance: { staffId: '', count: 0, manual: false },
            mostAvs: { staffId: '', count: 0, manual: false },
            highestRevenue: { staffId: '', amount: '' },
            highestEarnings: { staffId: '', amount: '' },
            highestGm: { staffId: '', percent: '' },
            academyCompleted: []
        });

        // Check if stars have already been awarded for this month
        const monthlyReviewQuery = query(
            collection(db, 'monthlyReviews'),
            where('month', '==', selectedMonth.month),
            where('year', '==', selectedMonth.year)
        );

        const reviewUnsubscribe = onSnapshot(monthlyReviewQuery, (snapshot) => {
            if (!snapshot.empty) {
                setAlreadyAwarded(true);
            }
        });

        // Load all shifts
        const shiftsQuery = query(collection(db, 'shifts'));
        const shiftsUnsubscribe = onSnapshot(shiftsQuery, (snapshot) => {
            const monthStart = new Date(selectedMonth.start);
            monthStart.setHours(0, 0, 0, 0);
            const monthEnd = new Date(selectedMonth.end);
            monthEnd.setHours(23, 59, 59, 999);

            const shifts = snapshot.docs
                .map(doc => {
                    const data = doc.data();
                    let date;
                    
                    // Handle different date formats from Firestore
                    if (data.date) {
                        if (data.date.toDate) {
                            date = data.date.toDate();
                        } else if (data.date instanceof Timestamp) {
                            date = data.date.toDate();
                        } else if (data.date instanceof Date) {
                            date = data.date;
                        } else {
                            // Try to parse as date string
                            date = new Date(data.date);
                        }
                    } else {
                        return null;
                    }

                    return {
                        id: doc.id,
                        staffId: data.staffId,
                        date: date
                    };
                })
                .filter(shift => shift !== null && shift.date);

            // Filter shifts for selected month
            const monthShifts = shifts.filter(shift => {
                if (!shift.date || isNaN(shift.date.getTime())) return false;
                const shiftDate = new Date(shift.date);
                shiftDate.setHours(0, 0, 0, 0);
                return shiftDate >= monthStart && shiftDate <= monthEnd;
            });

            // Count vakter per staff member
            const counts = {};
            monthShifts.forEach(shift => {
                counts[shift.staffId] = (counts[shift.staffId] || 0) + 1;
            });

            setVakterCounts(counts);
        });

        // Load sales for MVP calculation
        const salesQuery = query(
            collection(db, 'sales'),
            where('timestamp', '>=', selectedMonth.start),
            where('timestamp', '<=', selectedMonth.end)
        );

        const salesUnsubscribe = onSnapshot(salesQuery, (snapshot) => {
            const sales = snapshot.docs.map(doc => doc.data());
            setMonthlySales(sales);
            
            // Calculate Most Insurance Sold
            const insuranceCounts = {};
            sales.filter(s => s.category === 'Forsikring').forEach(s => {
                insuranceCounts[s.staffId] = (insuranceCounts[s.staffId] || 0) + 1;
            });
            
            let maxInsurance = 0;
            let maxInsuranceStaffId = '';
            for (const [staffId, count] of Object.entries(insuranceCounts)) {
                if (count > maxInsurance) {
                    maxInsurance = count;
                    maxInsuranceStaffId = staffId;
                }
            }

            // Calculate Most AVS Sold
            const avsCounts = {};
            sales.filter(s => s.category === 'AVS/Support').forEach(s => {
                avsCounts[s.staffId] = (avsCounts[s.staffId] || 0) + 1;
            });

            let maxAvs = 0;
            let maxAvsStaffId = '';
            for (const [staffId, count] of Object.entries(avsCounts)) {
                if (count > maxAvs) {
                    maxAvs = count;
                    maxAvsStaffId = staffId;
                }
            }

            setMvpStats(prev => ({
                ...prev,
                mostInsurance: { ...prev.mostInsurance, staffId: maxInsuranceStaffId, count: maxInsurance },
                mostAvs: { ...prev.mostAvs, staffId: maxAvsStaffId, count: maxAvs }
            }));
            
            setLoading(false);
        });

        return () => {
            reviewUnsubscribe();
            shiftsUnsubscribe();
            salesUnsubscribe();
        };
    }, [isOpen, selectedMonth]);

    // Calculate stars for vakter based on difference
    // Base: 2 stars if difference >= 3
    function calculateVakterStars(vakter, maxVakter, secondMaxVakter) {
        if (vakter === maxVakter && maxVakter > 0) {
            // Requirement: Must be at least 3 shifts more than the others
            if (secondMaxVakter !== null && (maxVakter - secondMaxVakter) >= 3) {
                return customStarAmount;
            }
        }
        return 0;
    }

    // Sync auto-calculated MVPs unless manually overridden
    useEffect(() => {
        setMvpStats(prev => ({
            ...prev,
            mostInsurance: {
                ...prev.mostInsurance,
                count: autoMvp.forsikring.max,
                staffId: prev.mostInsurance.manual ? prev.mostInsurance.staffId : (autoMvp.forsikring.staffId || '')
            },
            mostAvs: {
                ...prev.mostAvs,
                count: autoMvp.avs.max,
                staffId: prev.mostAvs.manual ? prev.mostAvs.staffId : (autoMvp.avs.staffId || '')
            }
        }));
    }, [autoMvp]);

    const handleAwardStars = async () => {
        if (alreadyAwarded) {
            if (!confirm('Stjerner er allerede tildelt for denne måneden. Vil du tildele på nytt?')) {
                return;
            }
        }

        const winnerInfo = getWinnerInfo();
        
        setSaving(true);
        try {
            const awardPromises = [];
            const staffAwarded = [];
            let totalStarsAwarded = 0;

            // 1. Award Vakter Stars (if applicable)
            if (winnerInfo.stars > 0 && winnerInfo.maxVakterStaffIds.length === 1) {
                const staffId = winnerInfo.maxVakterStaffIds[0];
                const staffMember = staffList.find(s => s.id === staffId);
                if (staffMember) {
                    const staffRef = doc(db, 'staff', staffId);
                    awardPromises.push(updateDoc(staffRef, { stars: increment(winnerInfo.stars) }));
                    awardPromises.push(addDoc(collection(db, 'sales'), {
                        staffId: staffId,
                        staffName: staffMember.name,
                        bilag: `MANEDLIG-${selectedMonth.monthName.toUpperCase()}-${selectedMonth.year}-VAKTER`,
                        category: 'Annet',
                        service: `Mest antall vakter (${winnerInfo.maxVakter} vakter)`,
                        stars: winnerInfo.stars,
                        timestamp: serverTimestamp(),
                        monthlyReview: true,
                        reviewMonth: selectedMonth.month,
                        reviewYear: selectedMonth.year,
                        isHighest: true
                    }));
                    staffAwarded.push(`${staffMember.name} (Vakter: ${winnerInfo.stars}⭐)`);
                    totalStarsAwarded += winnerInfo.stars;
                }
            }

            // 2. Award MVP Stars
            const mvpCategories = [
                { key: 'mostInsurance', label: 'Mest forsikring', stars: 2, valueKey: 'count', unit: ' stk' },
                { key: 'mostAvs', label: 'Mest AVS', stars: 2, valueKey: 'count', unit: ' stk' },
                { key: 'highestRevenue', label: 'Høyest omsetning', stars: 2, valueKey: 'amount', unit: ' kr' },
                { key: 'highestEarnings', label: 'Høyest inntjening', stars: 2, valueKey: 'amount', unit: ' kr' },
                { key: 'highestGm', label: 'Høyest GM%', stars: 2, valueKey: 'percent', unit: '%' }
            ];

            for (const cat of mvpCategories) {
                const stat = mvpStats[cat.key];
                if (stat && stat.staffId) {
                    const staffMember = staffList.find(s => s.id === stat.staffId);
                    if (staffMember) {
                        const staffRef = doc(db, 'staff', stat.staffId);
                        const valueLabel = cat.valueKey && stat[cat.valueKey] ? ` (${stat[cat.valueKey]}${cat.unit || ''})` : '';
                        awardPromises.push(updateDoc(staffRef, { stars: increment(cat.stars) }));
                        awardPromises.push(addDoc(collection(db, 'sales'), {
                            staffId: stat.staffId,
                            staffName: staffMember.name,
                            bilag: `MANEDLIG-${selectedMonth.monthName.toUpperCase()}-${selectedMonth.year}-${cat.key.toUpperCase()}`,
                            category: 'Annet',
                            service: `${cat.label}${valueLabel}`,
                            stars: cat.stars,
                            timestamp: serverTimestamp(),
                            monthlyReview: true,
                            reviewMonth: selectedMonth.month,
                            reviewYear: selectedMonth.year,
                            isHighest: true,
                            manualOverride: !!stat.manual
                        }));
                        staffAwarded.push(`${staffMember.name} (${cat.label}: ${cat.stars}⭐${valueLabel})`);
                        totalStarsAwarded += cat.stars;
                    }
                }
            }

            // 3. Award Academy Stars
            for (const staffId of mvpStats.academyCompleted) {
                const staffMember = staffList.find(s => s.id === staffId);
                if (staffMember) {
                    const staffRef = doc(db, 'staff', staffId);
                    awardPromises.push(updateDoc(staffRef, { stars: increment(5) }));
                    awardPromises.push(addDoc(collection(db, 'sales'), {
                        staffId: staffId,
                        staffName: staffMember.name,
                        bilag: `MANEDLIG-${selectedMonth.monthName.toUpperCase()}-${selectedMonth.year}-ACADEMY`,
                        category: 'Annet',
                        service: `Fullført alle academy kurs`,
                        stars: 5,
                        timestamp: serverTimestamp(),
                        monthlyReview: true,
                        reviewMonth: selectedMonth.month,
                        reviewYear: selectedMonth.year
                    }));
                    staffAwarded.push(`${staffMember.name} (Academy: 5⭐)`);
                    totalStarsAwarded += 5;
                }
            }

            await Promise.all(awardPromises);

            // Prepare the monthly review data for records
            const reviewData = {
                month: selectedMonth.month,
                monthName: selectedMonth.monthName,
                year: selectedMonth.year,
                monthStart: selectedMonth.start,
                monthEnd: selectedMonth.end,
                dateRange: `${formatDate(selectedMonth.start)} - ${formatDate(selectedMonth.end)}`,
                vakterCounts: vakterCounts,
                mvpStats: mvpStats,
                staffAwarded: staffAwarded,
                totalStarsAwarded: totalStarsAwarded,
                createdAt: serverTimestamp(),
                createdBy: 'admin'
            };

            // Save to Firestore
            await addDoc(collection(db, 'monthlyReviews'), reviewData);

            alert(`Månedlig gjennomgang fullført! Totalt ${totalStarsAwarded} stjerner delt ut.`);
            setAlreadyAwarded(true);
            onClose();
        } catch (error) {
            console.error('Error awarding stars:', error);
            alert('Feil ved tildeling: ' + error.message);
        }
        setSaving(false);
    };


    // Calculate preview stars and find winner(s)
    const getWinnerInfo = () => {
        let maxVakter = 0;
        let maxVakterStaffIds = [];
        let secondMaxVakter = null;

        const countsArray = [];
        for (const [staffId, count] of Object.entries(vakterCounts)) {
            if (count > 0) {
                countsArray.push({ staffId, vakter: count });
                if (count > maxVakter) {
                    secondMaxVakter = maxVakter;
                    maxVakter = count;
                    maxVakterStaffIds = [staffId];
                } else if (count === maxVakter && maxVakter > 0) {
                    maxVakterStaffIds.push(staffId);
                } else if (count > (secondMaxVakter || 0)) {
                    secondMaxVakter = count;
                }
            }
        }

        if (countsArray.length > 1) {
            countsArray.sort((a, b) => b.vakter - a.vakter);
            // Find all with max vakter
            maxVakterStaffIds = countsArray
                .filter(item => item.vakter === maxVakter)
                .map(item => item.staffId);
            
            // Find second max
            if (countsArray.length > maxVakterStaffIds.length) {
                secondMaxVakter = countsArray[maxVakterStaffIds.length].vakter;
            }
        }

        const stars = maxVakterStaffIds.length > 0 ? calculateVakterStars(maxVakter, maxVakter, secondMaxVakter) : 0;
        const isTie = maxVakterStaffIds.length > 1;

        return {
            maxVakter,
            maxVakterStaffIds,
            maxVakterStaffId: maxVakterStaffIds[0], // For backward compatibility
            secondMaxVakter,
            stars,
            isTie
        };
    };

    const handleMvpChange = (field, value, subField = null, markManual = false) => {
        setMvpStats(prev => {
            if (subField) {
                return {
                    ...prev,
                    [field]: { ...prev[field], [subField]: value, ...(markManual ? { manual: true } : {}) }
                };
            }
            return { ...prev, [field]: value };
        });
    };

    const toggleAcademy = (staffId) => {
        setMvpStats(prev => {
            const current = prev.academyCompleted || [];
            if (current.includes(staffId)) {
                return { ...prev, academyCompleted: current.filter(id => id !== staffId) };
            } else {
                return { ...prev, academyCompleted: [...current, staffId] };
            }
        });
    };

    const getStaffName = (id) => staffList.find(s => s.id === id)?.name || '';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" style={{ isolation: 'isolate' }}>
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl w-full max-w-3xl border-2 border-[#009A44] shadow-xl flex flex-col h-full max-h-[85vh] relative z-10" style={{ backgroundColor: '#ffffff' }}>
                        <header className="flex-shrink-0 p-6 border-b border-gray-200">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Månedlig Gjennomgang - MVP & Vakter</h3>
                                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Month Navigation */}
                            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                                <button
                                    onClick={() => changeMonth(-1)}
                                    className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                                >
                                    ← Forrige måned
                                </button>

                                <div className="text-center">
                                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                        <Calendar size={20} />
                                        {selectedMonth.monthName.charAt(0).toUpperCase() + selectedMonth.monthName.slice(1)} {selectedMonth.year}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        {formatDate(selectedMonth.start)} - {formatDate(selectedMonth.end)}
                                    </div>
                                </div>

                                <button
                                    onClick={() => changeMonth(1)}
                                    className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                                >
                                    Neste måned →
                                </button>
                            </div>
                        </header>

                        <div className="flex-grow p-6 overflow-y-auto space-y-6">
                            {alreadyAwarded && (
                                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle size={20} className="text-yellow-600" />
                                        <p className="text-sm text-yellow-800">
                                            <strong>Stjerner allerede tildelt:</strong> Stjerner er allerede tildelt for denne måneden. 
                                            Du kan tildele på nytt hvis nødvendig.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* MVP Section */}
                            <div className="space-y-4">
                                <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">MVP Stjerner</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                    {/* Most Insurance */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mest antall forsikring (2⭐)</label>
                                        <div className="text-xs text-gray-500 mb-2">
                                            Automatisk: {mvpStats.mostInsurance.count || 0} stk {autoMvp.forsikring.staffId ? `(${getStaffName(autoMvp.forsikring.staffId)})` : ''}
                                        </div>
                                        <select 
                                            className="w-full p-2 border rounded"
                                            value={mvpStats.mostInsurance.staffId}
                                            onChange={(e) => handleMvpChange('mostInsurance', e.target.value, 'staffId', true)}
                                        >
                                            <option value="">Velg ansatt...</option>
                                            {staffList.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Most AVS */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mest antall AVS (2⭐)</label>
                                        <div className="text-xs text-gray-500 mb-2">
                                            Automatisk: {mvpStats.mostAvs.count || 0} stk {autoMvp.avs.staffId ? `(${getStaffName(autoMvp.avs.staffId)})` : ''}
                                        </div>
                                        <select 
                                            className="w-full p-2 border rounded"
                                            value={mvpStats.mostAvs.staffId}
                                            onChange={(e) => handleMvpChange('mostAvs', e.target.value, 'staffId', true)}
                                        >
                                            <option value="">Velg ansatt...</option>
                                            {staffList.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Highest Revenue */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Høyest omsetning (2⭐)</label>
                                        <div className="flex gap-2">
                                            <select 
                                                className="w-1/2 p-2 border rounded"
                                                value={mvpStats.highestRevenue.staffId}
                                                onChange={(e) => handleMvpChange('highestRevenue', e.target.value, 'staffId')}
                                            >
                                                <option value="">Velg ansatt...</option>
                                                {staffList.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Beløp kr"
                                                value={mvpStats.highestRevenue.amount}
                                                onChange={(e) => handleMvpChange('highestRevenue', e.target.value, 'amount')}
                                                className="w-1/2 p-2 border rounded"
                                            />
                                        </div>
                                    </div>

                                    {/* Highest Earnings */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Høyest inntjening (2⭐)</label>
                                        <div className="flex gap-2">
                                            <select 
                                                className="w-1/2 p-2 border rounded"
                                                value={mvpStats.highestEarnings.staffId}
                                                onChange={(e) => handleMvpChange('highestEarnings', e.target.value, 'staffId')}
                                            >
                                                <option value="">Velg ansatt...</option>
                                                {staffList.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Beløp kr"
                                                value={mvpStats.highestEarnings.amount}
                                                onChange={(e) => handleMvpChange('highestEarnings', e.target.value, 'amount')}
                                                className="w-1/2 p-2 border rounded"
                                            />
                                        </div>
                                    </div>

                                    {/* Highest GM% */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Høyest GM% (2⭐)</label>
                                        <div className="flex gap-2">
                                            <select 
                                                className="w-1/2 p-2 border rounded"
                                                value={mvpStats.highestGm.staffId}
                                                onChange={(e) => handleMvpChange('highestGm', e.target.value, 'staffId')}
                                            >
                                                <option value="">Velg ansatt...</option>
                                                {staffList.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Prosent %"
                                                value={mvpStats.highestGm.percent}
                                                onChange={(e) => handleMvpChange('highestGm', e.target.value, 'percent')}
                                                className="w-1/2 p-2 border rounded"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Academy Courses */}
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Fullført alle academy kurs (5⭐)</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {staffList.map(staff => (
                                            <label key={staff.id} className="flex items-center space-x-2 p-2 bg-white rounded border cursor-pointer hover:bg-gray-50">
                                                <input
                                                    type="checkbox"
                                                    checked={mvpStats.academyCompleted.includes(staff.id)}
                                                    onChange={() => toggleAcademy(staff.id)}
                                                    className="rounded text-[#009A44] focus:ring-[#009A44]"
                                                />
                                                <span className="text-sm">{staff.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Vakter Section */}
                            <div className="space-y-4">
                                <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Mest antall vakter</h4>

                                {(() => {
                                    const winnerInfo = getWinnerInfo();
                                    if (winnerInfo.isTie && !showTieResolution) {
                                        return (
                                            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-4">
                                                <div className="flex items-start gap-2">
                                                    <Users size={20} className="text-orange-600 mt-0.5" />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold text-orange-900 mb-2">Uavgjort oppdaget!</p>
                                                        <p className="text-sm text-orange-800 mb-3">
                                                            {winnerInfo.maxVakterStaffIds.length} {winnerInfo.maxVakterStaffIds.length === 1 ? 'person' : 'personer'} har samme antall vakter ({winnerInfo.maxVakter}). Velg hvordan du vil løse dette.
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {winnerInfo.maxVakterStaffIds.map(staffId => {
                                                                const staff = staffList.find(s => s.id === staffId);
                                                                return staff ? (
                                                                    <span key={staffId} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                                                                        {staff.name}
                                                                    </span>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                {showTieResolution && (() => {
                                    const winnerInfo = getWinnerInfo();
                                    return (
                                        <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 mb-4">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <Users size={20} className="text-purple-600" />
                                                    <p className="font-semibold text-purple-900">Løs uavgjort for {winnerInfo.maxVakter} vakter</p>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-purple-200 cursor-pointer hover:bg-purple-50">
                                                        <input
                                                            type="radio"
                                                            name="tieResolution"
                                                            value="all"
                                                            checked={tieResolutionMethod === 'all'}
                                                            onChange={(e) => setTieResolutionMethod(e.target.value)}
                                                            className="text-purple-600"
                                                        />
                                                        <Users size={18} className="text-purple-600" />
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900">Gi alle {winnerInfo.maxVakterStaffIds.length} personer stjerner</p>
                                                            <p className="text-xs text-gray-600">Alle får {customStarAmount} stjerner (med bonus hvis aktuelt)</p>
                                                        </div>
                                                    </label>

                                                    <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-purple-200 cursor-pointer hover:bg-purple-50">
                                                        <input
                                                            type="radio"
                                                            name="tieResolution"
                                                            value="custom"
                                                            checked={tieResolutionMethod === 'custom'}
                                                            onChange={(e) => setTieResolutionMethod(e.target.value)}
                                                            className="text-purple-600"
                                                        />
                                                        <Star size={18} className="text-purple-600" />
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900">Egendefinert antall stjerner for alle</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={customStarAmount}
                                                                    onChange={(e) => setCustomStarAmount(parseInt(e.target.value) || 2)}
                                                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setTieResolutionMethod('custom');
                                                                    }}
                                                                />
                                                                <span className="text-xs text-gray-600">stjerner til alle</span>
                                                            </div>
                                                        </div>
                                                    </label>

                                                    <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-purple-200 cursor-pointer hover:bg-purple-50">
                                                        <input
                                                            type="radio"
                                                            name="tieResolution"
                                                            value="random"
                                                            checked={tieResolutionMethod === 'random'}
                                                            onChange={(e) => setTieResolutionMethod(e.target.value)}
                                                            className="text-purple-600"
                                                        />
                                                        <Shuffle size={18} className="text-purple-600" />
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900">Tilfeldig valg</p>
                                                            <p className="text-xs text-gray-600">Velg én person tilfeldig</p>
                                                        </div>
                                                    </label>

                                                    <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-purple-200 cursor-pointer hover:bg-purple-50">
                                                        <input
                                                            type="radio"
                                                            name="tieResolution"
                                                            value="specific"
                                                            checked={tieResolutionMethod === 'specific'}
                                                            onChange={(e) => setTieResolutionMethod(e.target.value)}
                                                            className="text-purple-600"
                                                        />
                                                        <UserCheck size={18} className="text-purple-600" />
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900">Velg spesifikk person</p>
                                                            {tieResolutionMethod === 'specific' && (
                                                                <select
                                                                    value={selectedStaffForTie || ''}
                                                                    onChange={(e) => setSelectedStaffForTie(e.target.value)}
                                                                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <option value="">Velg person...</option>
                                                                    {winnerInfo.maxVakterStaffIds.map(staffId => {
                                                                        const staff = staffList.find(s => s.id === staffId);
                                                                        return staff ? (
                                                                            <option key={staffId} value={staffId}>{staff.name}</option>
                                                                        ) : null;
                                                                    })}
                                                                </select>
                                                            )}
                                                        </div>
                                                    </label>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        setShowTieResolution(false);
                                                        setTieResolutionMethod('all');
                                                        setSelectedStaffForTie(null);
                                                    }}
                                                    className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                                                >
                                                    Avbryt
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                    <div className="flex items-start gap-2 mb-3">
                                        <Star size={20} className="text-blue-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-blue-900 mb-1">Stjerner per måned</p>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={customStarAmount}
                                                    onChange={(e) => setCustomStarAmount(parseInt(e.target.value) || 2)}
                                                    className="w-20 px-2 py-1 border border-blue-300 rounded text-sm bg-white"
                                                />
                                                <span className="text-xs text-blue-700">stjerner (base)</span>
                                            </div>
                                            <p className="text-xs text-blue-700 mt-2">
                                                Krever minst 3 flere vakter enn nummer to. Verdien over er hvor mange stjerner som deles ut (default 2).
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="text-center py-8 text-gray-500">Laster vakter...</div>
                                ) : (
                                    <>
                                        <div className="text-sm text-gray-600 mb-4">
                                            Antall vakter registrert for {selectedMonth.monthName} {selectedMonth.year}:
                                        </div>

                                        {(() => {
                                            const winnerInfo = getWinnerInfo();
                                            const hasVakter = Object.keys(vakterCounts).length > 0;

                                            return (
                                                <>
                                                    {staffList.map(staff => {
                                                        const vakterCount = vakterCounts[staff.id] || 0;
                                                        const isWinner = winnerInfo.maxVakterStaffIds.includes(staff.id) && vakterCount > 0;
                                                        const isTied = winnerInfo.isTie && isWinner;

                                                        return (
                                                            <div key={staff.id} className={`p-4 rounded-lg ${
                                                                isTied ? 'bg-purple-50 border-2 border-purple-300' :
                                                                isWinner ? 'bg-green-50 border-2 border-green-300' :
                                                                'bg-gray-50'
                                                            }`}>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <Clock size={20} className="text-gray-400" />
                                                                        <div>
                                                                            <p className="font-semibold text-gray-900">
                                                                                {staff.name}
                                                                                {isTied && <span className="ml-2 text-xs text-purple-600">(Uavgjort)</span>}
                                                                            </p>
                                                                            <p className="text-sm text-gray-600">
                                                                                {vakterCount} {vakterCount === 1 ? 'vakt' : 'vakter'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    {isWinner && (
                                                                        <div className="flex items-center gap-2 text-green-700 font-bold">
                                                                            <Star size={20} />
                                                                            <span>{winnerInfo.stars} stjerner</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {!hasVakter && (
                                                        <div className="text-center py-8 text-gray-500">
                                                            <AlertCircle size={48} className="mx-auto mb-2 text-gray-400" />
                                                            <p>Ingen vakter registrert for denne måneden.</p>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </>
                                )}
                            </div>

                        </div>

                        <footer className="flex-shrink-0 flex justify-between items-center p-6 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                                {(() => {
                                    const winnerInfo = getWinnerInfo();
                                    if (winnerInfo.maxVakterStaffIds.length > 0) {
                                        if (winnerInfo.isTie) {
                                            const winners = winnerInfo.maxVakterStaffIds
                                                .map(id => staffList.find(s => s.id === id)?.name)
                                                .filter(Boolean);
                                            return `${winners.length} personer med ${winnerInfo.maxVakter} vakter`;
                                        } else {
                                            const winner = staffList.find(s => s.id === winnerInfo.maxVakterStaffId);
                                            return winner ? `${winner.name} vil få ${winnerInfo.stars} stjerner` : '';
                                        }
                                    }
                                    return 'Velg måned for å se vakter';
                                })()}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Avbryt
                                </button>
                                {(() => {
                                    const winnerInfo = getWinnerInfo();
                                    const hasTie = winnerInfo.isTie && !showTieResolution;
                                    
                                    return (
                                        <>
                                            {hasTie ? (
                                                <button
                                                    onClick={handleAwardStars}
                                                    disabled={saving || loading || Object.keys(vakterCounts).length === 0}
                                                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    <Users size={18} />
                                                    Løs uavgjort konflikt
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleAwardStars}
                                                    disabled={saving || loading || Object.keys(vakterCounts).length === 0 || (showTieResolution && tieResolutionMethod === 'specific' && !selectedStaffForTie)}
                                                    className="px-6 py-2 bg-[#009A44] text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {saving ? (
                                                        <>Lagrer...</>
                                                    ) : showTieResolution ? (
                                                        <>
                                                            <Star size={18} />
                                                            Bekreft tildeling
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Star size={18} />
                                                            Tildel stjerner
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </footer>
                    </motion.div>
                </motion.div>
            )}

        </AnimatePresence>
    );
}

export default MonthlyReviewModal;

