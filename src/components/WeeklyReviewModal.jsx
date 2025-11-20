import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Percent, CheckSquare, Calendar, TrendingUp, DollarSign, Users, Clock } from 'lucide-react';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment } from "firebase/firestore";
import { db } from '../firebase';
import { serviceCategories } from '../data/services';

function WeeklyReviewModal({ isOpen, onClose, staffList }) {
    const [weeklyData, setWeeklyData] = useState({});
    const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
    const [saving, setSaving] = useState(false);

    // Get current week info
    function getCurrentWeek() {
        const now = new Date();
        const startOfWeek = new Date(now);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
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

    // Calculate week number (corrected for Norwegian week numbering)
    function getWeekNumber(date) {
        // Create a copy of the date to avoid modifying the original
        const targetDate = new Date(date);

        // Set to nearest Thursday (current date + 4 - current day of week)
        // Sunday = 0, Monday = 1, etc. We want Monday = 1, Sunday = 7
        const dayOfWeek = targetDate.getDay();
        const daysToThursday = 4 - (dayOfWeek === 0 ? 7 : dayOfWeek);
        targetDate.setDate(targetDate.getDate() + daysToThursday);

        // Get the year of this Thursday
        const year = targetDate.getFullYear();

        // Find January 4th of this year (which is always in week 1)
        const jan4 = new Date(year, 0, 4);

        // Calculate the difference in weeks
        const weekNumber = Math.ceil(((targetDate - jan4) / 86400000 + jan4.getDay() + 1) / 7);

        return weekNumber;
    }

    // Format date for display
    function formatDate(date) {
        return date.toLocaleDateString('no-NO', {
            day: 'numeric',
            month: 'long'
        });
    }

    // Change week
    function changeWeek(direction) {
        const newStart = new Date(selectedWeek.start);
        newStart.setDate(newStart.getDate() + (direction * 7));

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

    const handleSave = async () => {
        setSaving(true);
        try {
            // First pass: Calculate supermargin and CS per time to find highest values
            let highestSupermargin = 0;
            let highestSupermarginStaffId = null;
            let highestCSPerTime = 0;
            let highestCSPerTimeStaffId = null;
            let highestKundeklubbAntall = 0;
            let highestKundeklubbAntallStaffId = null;

            for (const [staffId, data] of Object.entries(weeklyData)) {
                // Find highest supermargin (>25%)
                if (data.supermargin) {
                    const supermargin = parseFloat(data.supermargin);
                    if (supermargin > 25 && supermargin > highestSupermargin) {
                        highestSupermargin = supermargin;
                        highestSupermarginStaffId = staffId;
                    }
                }

                // Find highest CS per time (>25 NOK)
                if (data.csPerTime) {
                    const csPerTime = parseFloat(data.csPerTime);
                    if (csPerTime > 25 && csPerTime > highestCSPerTime) {
                        highestCSPerTime = csPerTime;
                        highestCSPerTimeStaffId = staffId;
                    }
                }

                // Find highest Kundeklubb antall
                if (data.kundeklubbAntall) {
                    const antall = parseInt(data.kundeklubbAntall);
                    if (antall > highestKundeklubbAntall) {
                        highestKundeklubbAntall = antall;
                        highestKundeklubbAntallStaffId = staffId;
                    }
                }
            }

            // Second pass: Calculate and award stars for each staff member
            for (const [staffId, data] of Object.entries(weeklyData)) {
                let starsToAward = 0;
                const staffMember = staffList.find(s => s.id === staffId);

                if (!staffMember) continue;

                // Calculate Supermargin stars (>25% = 5 stars, highest = 6 stars)
                if (data.supermargin) {
                    const supermargin = parseFloat(data.supermargin);
                    if (supermargin > 25) {
                        const stars = (staffId === highestSupermarginStaffId) ? 6 : 5;
                        starsToAward += stars;
                    }
                }

                // Calculate CS per time stars (>25 NOK = 5 stars, highest = 6 stars)
                if (data.csPerTime) {
                    const csPerTime = parseFloat(data.csPerTime);
                    if (csPerTime > 25) {
                        const stars = (staffId === highestCSPerTimeStaffId) ? 6 : 5;
                        starsToAward += stars;
                    }
                }

                // Calculate Kundeklubb antall stars (highest gets 5 stars)
                if (data.kundeklubbAntall && staffId === highestKundeklubbAntallStaffId) {
                    starsToAward += 5;
                }

                // Calculate Kundeklubb percent stars (existing logic - keep for backward compatibility)
                if (data.kundeklubb) {
                    const percentage = parseInt(data.kundeklubb);
                    let serviceType = '';
                    if (percentage >= 100) serviceType = '100%';
                    else if (percentage >= 80) serviceType = '80%';
                    else if (percentage >= 60) serviceType = '60%';
                    else if (percentage >= 40) serviceType = '40%';
                    else if (percentage >= 20) serviceType = '20%';

                    if (serviceType) {
                        starsToAward += serviceCategories['Kundeklubb'][serviceType];
                    }
                }

                // Calculate Kunnskap Sjekkliste stars
                if (data.kunnskapSjekkliste) {
                    starsToAward += 3; // Kunnskap Sjekkliste gives 3 stars
                }

                // Calculate Todolist stars
                if (data.todolist === 'fylt-ut-1-uke') {
                    starsToAward += 1; // Fylt ut 1 uke gives 1 star
                } else if (data.todolist === 'alt-ja-1-uke') {
                    starsToAward += 2; // Alt JA 1 uke gives 2 stars
                }

                // Update staff member's star count if they earned stars
                if (starsToAward > 0) {
                    const staffRef = doc(db, 'staff', staffId);
                    await updateDoc(staffRef, { stars: increment(starsToAward) });

                    // Create sales records for tracking
                    const salesPromises = [];

                    // Add supermargin sale if applicable
                    if (data.supermargin) {
                        const supermargin = parseFloat(data.supermargin);
                        if (supermargin > 25) {
                            const stars = (staffId === highestSupermarginStaffId) ? 6 : 5;
                            salesPromises.push(addDoc(collection(db, 'sales'), {
                                staffId,
                                staffName: staffMember.name,
                                bilag: `UKENTLIG-UKE${selectedWeek.weekNumber}-${selectedWeek.year}-SUPERMARGIN-${supermargin}%`,
                                category: 'Annet',
                                service: `Supermargin ${supermargin}%`,
                                stars: stars,
                                timestamp: serverTimestamp(),
                                weeklyReview: true,
                                reviewWeek: selectedWeek.weekNumber,
                                reviewYear: selectedWeek.year,
                                isHighest: staffId === highestSupermarginStaffId
                            }));
                        }
                    }

                    // Add CS per time sale if applicable
                    if (data.csPerTime) {
                        const csPerTime = parseFloat(data.csPerTime);
                        if (csPerTime > 25) {
                            const stars = (staffId === highestCSPerTimeStaffId) ? 6 : 5;
                            salesPromises.push(addDoc(collection(db, 'sales'), {
                                staffId,
                                staffName: staffMember.name,
                                bilag: `UKENTLIG-UKE${selectedWeek.weekNumber}-${selectedWeek.year}-CS-PER-TIME-${csPerTime}kr`,
                                category: 'Annet',
                                service: `CS per time ${csPerTime}kr`,
                                stars: stars,
                                timestamp: serverTimestamp(),
                                weeklyReview: true,
                                reviewWeek: selectedWeek.weekNumber,
                                reviewYear: selectedWeek.year,
                                isHighest: staffId === highestCSPerTimeStaffId
                            }));
                        }
                    }

                    // Add Kundeklubb antall sale if applicable (highest gets 5 stars)
                    if (data.kundeklubbAntall && staffId === highestKundeklubbAntallStaffId) {
                        salesPromises.push(addDoc(collection(db, 'sales'), {
                            staffId,
                            staffName: staffMember.name,
                            bilag: `UKENTLIG-UKE${selectedWeek.weekNumber}-${selectedWeek.year}-KUNDEKLUBB-ANTALL-${data.kundeklubbAntall}`,
                            category: 'Kundeklubb',
                            service: 'Høyest antall',
                            stars: 5,
                            timestamp: serverTimestamp(),
                            weeklyReview: true,
                            reviewWeek: selectedWeek.weekNumber,
                            reviewYear: selectedWeek.year,
                            isHighest: true
                        }));
                    }

                    // Add kundeklubb percent sale if applicable (existing logic)
                    if (data.kundeklubb) {
                        const percentage = parseInt(data.kundeklubb);
                        let serviceType = '';
                        if (percentage >= 100) serviceType = '100%';
                        else if (percentage >= 80) serviceType = '80%';
                        else if (percentage >= 60) serviceType = '60%';
                        else if (percentage >= 40) serviceType = '40%';

                        if (serviceType) {
                            salesPromises.push(addDoc(collection(db, 'sales'), {
                                staffId,
                                staffName: staffMember.name,
                                bilag: `UKENTLIG-UKE${selectedWeek.weekNumber}-${selectedWeek.year}-KUNDEKLUBB-${percentage}%`,
                                category: 'Kundeklubb',
                                service: serviceType,
                                stars: serviceCategories['Kundeklubb'][serviceType],
                                timestamp: serverTimestamp(),
                                weeklyReview: true,
                                reviewWeek: selectedWeek.weekNumber,
                                reviewYear: selectedWeek.year
                            }));
                        }
                    }

                    // Add kunnskap sjekkliste sale if applicable
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

                    // Add todolist sale if applicable
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

                    // Execute all sales record creation
                    await Promise.all(salesPromises);
                }
            }

            // Prepare the weekly review data for records
            const reviewData = {
                weekNumber: selectedWeek.weekNumber,
                year: selectedWeek.year,
                weekStart: selectedWeek.start,
                weekEnd: selectedWeek.end,
                dateRange: `${formatDate(selectedWeek.start)} - ${formatDate(selectedWeek.end)}`,
                staffData: weeklyData,
                createdAt: serverTimestamp(),
                createdBy: 'admin' // You could use current user's email here
            };

            // Save to Firestore
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
                                                <span className="text-xs text-gray-500 ml-2">(&gt;25% = 5⭐, høyest = 6⭐)</span>
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
                                                <span className="text-xs text-gray-500 ml-2">(&gt;25kr = 5⭐, høyest = 6⭐)</span>
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
                                                <span className="text-xs text-gray-500 ml-2">(høyest = 5⭐)</span>
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
                                        <div className="relative">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Kundeklubb %
                                                <span className="text-xs text-gray-500 ml-2">(eksisterende system)</span>
                                            </label>
                                            <div className="relative">
                                                <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    placeholder="0-100"
                                                    value={weeklyData[staff.id]?.kundeklubb || ''}
                                                    onChange={(e) => handleDataChange(staff.id, 'kundeklubb', e.target.value)}
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

