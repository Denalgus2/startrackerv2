import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckSquare, Calendar, TrendingUp, DollarSign, Users } from 'lucide-react';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment } from "firebase/firestore";
import { db } from '../firebase';

function WeeklyReviewModal({ isOpen, onClose, staffList }) {
    const [weeklyData, setWeeklyData] = useState({});
    const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
    const [saving, setSaving] = useState(false);

    function getCurrentWeek() {
        const now = new Date();
        const startOfWeek = new Date(now);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return {
            start: startOfWeek,
            end: endOfWeek,
            weekNumber: getWeekNumber(startOfWeek),
            year: startOfWeek.getFullYear()
        };
    }

    function getWeekNumber(date) {
        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getDay();
        const daysToThursday = 4 - (dayOfWeek === 0 ? 7 : dayOfWeek);
        targetDate.setDate(targetDate.getDate() + daysToThursday);
        const year = targetDate.getFullYear();
        const jan4 = new Date(year, 0, 4);
        const weekNumber = Math.ceil(((targetDate - jan4) / 86400000 + jan4.getDay() + 1) / 7);
        return weekNumber;
    }

    function formatDate(date) {
        return date.toLocaleDateString('no-NO', { day: 'numeric', month: 'long' });
    }

    function changeWeek(direction) {
        const newStart = new Date(selectedWeek.start);
        newStart.setDate(newStart.getDate() + direction * 7);

        const newEnd = new Date(newStart);
        newEnd.setDate(newStart.getDate() + 6);
        newEnd.setHours(23, 59, 59, 999);

        setSelectedWeek({
            start: newStart,
            end: newEnd,
            weekNumber: getWeekNumber(newStart),
            year: newStart.getFullYear()
        });
    }

    const handleDataChange = (staffId, field, value) => {
        setWeeklyData(prev => ({
            ...prev,
            [staffId]: {
                ...prev[staffId],
                [field]: value
            }
        }));
    };

    const getSupermarginStars = (value) => {
        const percent = parseFloat(value);
        if (isNaN(percent)) return 0;
        if (percent >= 100) return 5;
        if (percent >= 80) return 4;
        if (percent >= 60) return 3;
        if (percent >= 40) return 2;
        if (percent >= 20) return 1;
        return 0;
    };

    const getCsPerTimeStars = (value) => {
        const amount = parseFloat(value);
        if (isNaN(amount)) return 0;
        if (amount >= 200) return 5;
        if (amount >= 150) return 4;
        if (amount >= 100) return 3;
        if (amount >= 50) return 2;
        if (amount >= 20) return 1;
        return 0;
    };

    const getKundeklubbAntallStars = (value) => {
        const count = parseInt(value, 10);
        if (isNaN(count)) return 0;
        if (count >= 15) return 5;
        if (count >= 10) return 4;
        if (count >= 7) return 3;
        if (count >= 5) return 2;
        if (count >= 3) return 1;
        return 0;
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            for (const [staffId, data] of Object.entries(weeklyData)) {
                let starsToAward = 0;
                const staffMember = staffList.find(s => s.id === staffId);
                if (!staffMember) continue;

                starsToAward += getSupermarginStars(data.supermargin);
                starsToAward += getCsPerTimeStars(data.csPerTime);
                starsToAward += getKundeklubbAntallStars(data.kundeklubbAntall);

                if (data.kunnskapSjekkliste) {
                    starsToAward += 3;
                }

                if (data.todolist === 'fylt-ut-1-uke') {
                    starsToAward += 1;
                } else if (data.todolist === 'alt-ja-1-uke') {
                    starsToAward += 2;
                }

                if (starsToAward > 0) {
                    const staffRef = doc(db, 'staff', staffId);
                    await updateDoc(staffRef, { stars: increment(starsToAward) });

                    const salesPromises = [];

                    const supermarginStars = getSupermarginStars(data.supermargin);
                    if (supermarginStars > 0) {
                        const supermargin = parseFloat(data.supermargin);
                        salesPromises.push(addDoc(collection(db, 'sales'), {
                            staffId,
                            staffName: staffMember.name,
                            bilag: `UKENTLIG-UKE${selectedWeek.weekNumber}-${selectedWeek.year}-SUPERMARGIN-${supermargin}%`,
                            category: 'Annet',
                            service: `Supermargin ${supermargin}%`,
                            stars: supermarginStars,
                            timestamp: serverTimestamp(),
                            weeklyReview: true,
                            reviewWeek: selectedWeek.weekNumber,
                            reviewYear: selectedWeek.year
                        }));
                    }

                    const csStars = getCsPerTimeStars(data.csPerTime);
                    if (csStars > 0) {
                        const csPerTime = parseFloat(data.csPerTime);
                        salesPromises.push(addDoc(collection(db, 'sales'), {
                            staffId,
                            staffName: staffMember.name,
                            bilag: `UKENTLIG-UKE${selectedWeek.weekNumber}-${selectedWeek.year}-CS-PER-TIME-${csPerTime}kr`,
                            category: 'Annet',
                            service: `CS per time ${csPerTime}kr`,
                            stars: csStars,
                            timestamp: serverTimestamp(),
                            weeklyReview: true,
                            reviewWeek: selectedWeek.weekNumber,
                            reviewYear: selectedWeek.year
                        }));
                    }

                    const kundeklubbStars = getKundeklubbAntallStars(data.kundeklubbAntall);
                    if (kundeklubbStars > 0) {
                        salesPromises.push(addDoc(collection(db, 'sales'), {
                            staffId,
                            staffName: staffMember.name,
                            bilag: `UKENTLIG-UKE${selectedWeek.weekNumber}-${selectedWeek.year}-KUNDEKLUBB-ANTALL-${data.kundeklubbAntall}`,
                            category: 'Kundeklubb',
                            service: `Kundeklubb ${data.kundeklubbAntall} stk`,
                            stars: kundeklubbStars,
                            timestamp: serverTimestamp(),
                            weeklyReview: true,
                            reviewWeek: selectedWeek.weekNumber,
                            reviewYear: selectedWeek.year
                        }));
                    }

                    if (data.kunnskapSjekkliste) {
                        salesPromises.push(addDoc(collection(db, 'sales'), {
                            staffId,
                            staffName: staffMember.name,
                            bilag: `UKENTLIG-UKE${selectedWeek.weekNumber}-${selectedWeek.year}-KUNNSKAP-SJEKKLISTE`,
                            category: 'Annet',
                            service: 'Kunnskap Sjekkliste',
                            stars: 3,
                            timestamp: serverTimestamp(),
                            weeklyReview: true,
                            reviewWeek: selectedWeek.weekNumber,
                            reviewYear: selectedWeek.year
                        }));
                    }

                    if (data.todolist) {
                        const serviceType = data.todolist === 'fylt-ut-1-uke'
                            ? 'Todolist - Fylt ut 1 uke'
                            : 'Todolist - Alt JA 1 uke';
                        const stars = data.todolist === 'fylt-ut-1-uke' ? 1 : 2;
                        const todoDescription = data.todolist === 'fylt-ut-1-uke' ? 'FYLT-UT' : 'ALT-JA';

                        salesPromises.push(addDoc(collection(db, 'sales'), {
                            staffId,
                            staffName: staffMember.name,
                            bilag: `UKENTLIG-UKE${selectedWeek.weekNumber}-${selectedWeek.year}-TODOLIST-${todoDescription}`,
                            category: 'Annet',
                            service: serviceType,
                            stars: stars,
                            timestamp: serverTimestamp(),
                            weeklyReview: true,
                            reviewWeek: selectedWeek.weekNumber,
                            reviewYear: selectedWeek.year
                        }));
                    }

                    await Promise.all(salesPromises);
                }
            }

            const reviewData = {
                weekNumber: selectedWeek.weekNumber,
                year: selectedWeek.year,
                weekStart: selectedWeek.start,
                weekEnd: selectedWeek.end,
                dateRange: `${formatDate(selectedWeek.start)} - ${formatDate(selectedWeek.end)}`,
                staffData: weeklyData,
                createdAt: serverTimestamp(),
                createdBy: 'admin'
            };

            await addDoc(collection(db, 'weeklyReviews'), reviewData);

            alert(`Ukentlig gjennomgang for uke ${selectedWeek.weekNumber} er lagret og stjerner er tildelt!`);
            setWeeklyData({});
            onClose();
        } catch (error) {
            console.error('Error saving weekly review:', error);
            alert('Feil ved lagring: ' + error.message);
        }
        setSaving(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" style={{ isolation: 'isolate' }}>
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl w-full max-w-3xl border-2 border-[#009A44] shadow-xl flex flex-col h-full max-h-[85vh] relative z-10" style={{ backgroundColor: '#ffffff' }}>
                        <header className="flex-shrink-0 p-6 border-b border-gray-200">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Ukentlig Gjennomgang</h3>
                                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Week Navigation */}
                            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                                <button
                                    onClick={() => changeWeek(-1)}
                                    className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                                >
                                    ← Forrige uke
                                </button>

                                <div className="text-center">
                                    <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                        <Calendar size={20} />
                                        Uke {selectedWeek.weekNumber}, {selectedWeek.year}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        {formatDate(selectedWeek.start)} - {formatDate(selectedWeek.end)}
                                    </div>
                                </div>

                                <button
                                    onClick={() => changeWeek(1)}
                                    className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                                >
                                    Neste uke →
                                </button>
                            </div>
                        </header>

                        <div className="flex-grow p-6 overflow-y-auto space-y-4">
                            <div className="text-sm text-gray-600 mb-4">
                                Registrer ukentlige resultater for alle ansatte i uke {selectedWeek.weekNumber}.
                            </div>

                            {staffList.map(staff => (
                                <div key={staff.id} className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="font-semibold text-gray-900">{staff.name}</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Supermargin %
                                                <span className="text-xs text-gray-500 ml-2">(20/40/60/80/100% ⇒ 1-5⭐)</span>
                                            </label>
                                            <div className="relative">
                                                <TrendingUp size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.1"
                                                    placeholder="0-100"
                                                    value={weeklyData[staff.id]?.supermargin || ''}
                                                    onChange={(e) => handleDataChange(staff.id, 'supermargin', e.target.value)}
                                                    className="pl-9 w-full py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009A44] outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                CS per time (kr)
                                                <span className="text-xs text-gray-500 ml-2">(20/50/100/150/200+ ⇒ 1-5⭐)</span>
                                            </label>
                                            <div className="relative">
                                                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.1"
                                                    placeholder="0"
                                                    value={weeklyData[staff.id]?.csPerTime || ''}
                                                    onChange={(e) => handleDataChange(staff.id, 'csPerTime', e.target.value)}
                                                    className="pl-9 w-full py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009A44] outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Kundeklubb Antall
                                                <span className="text-xs text-gray-500 ml-2">(3-4/5-6/7-9/10-14/15+ ⇒ 1-5⭐)</span>
                                            </label>
                                            <div className="relative">
                                                <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={weeklyData[staff.id]?.kundeklubbAntall || ''}
                                                    onChange={(e) => handleDataChange(staff.id, 'kundeklubbAntall', e.target.value)}
                                                    className="pl-9 w-full py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009A44] outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Kunnskap Sjekkliste (3 ⭐)
                                            </label>
                                            <div className="flex items-center gap-2 py-2">
                                                <CheckSquare size={16} className="text-gray-400"/>
                                                <label className="text-sm text-gray-700">Alle punkter OK?</label>
                                                <input
                                                    type="checkbox"
                                                    checked={weeklyData[staff.id]?.kunnskapSjekkliste || false}
                                                    onChange={(e) => handleDataChange(staff.id, 'kunnskapSjekkliste', e.target.checked)}
                                                    className="h-5 w-5 rounded border-gray-300 text-[#009A44] focus:ring-[#009A44]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Todolist denne uken
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={`todolist-${staff.id}`}
                                                    value="fylt-ut-1-uke"
                                                    checked={weeklyData[staff.id]?.todolist === 'fylt-ut-1-uke'}
                                                    onChange={(e) => handleDataChange(staff.id, 'todolist', e.target.value)}
                                                    className="text-[#009A44] focus:ring-[#009A44]"
                                                />
                                                <span className="text-sm">Fylt ut 1 uke (1 ⭐)</span>
                                            </label>
                                            <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={`todolist-${staff.id}`}
                                                    value="alt-ja-1-uke"
                                                    checked={weeklyData[staff.id]?.todolist === 'alt-ja-1-uke'}
                                                    onChange={(e) => handleDataChange(staff.id, 'todolist', e.target.value)}
                                                    className="text-[#009A44] focus:ring-[#009A44]"
                                                />
                                                <span className="text-sm">Alt JA 1 uke (2 ⭐)</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <footer className="flex-shrink-0 flex justify-between items-center p-6 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                                Data vil bli lagret i Firestore som en ukentlig rapport
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Avbryt
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || Object.keys(weeklyData).length === 0}
                                    className="px-6 py-2 bg-[#009A44] text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Lagrer...' : `Lagre Uke ${selectedWeek.weekNumber}`}
                                </button>
                            </div>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
export default WeeklyReviewModal;

