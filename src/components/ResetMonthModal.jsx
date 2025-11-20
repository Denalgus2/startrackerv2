import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Calendar, RotateCcw, Trash2 } from 'lucide-react';
import { collection, updateDoc, doc, increment, query, where, getDocs, Timestamp, deleteDoc } from "firebase/firestore";
import { db } from '../firebase';

function ResetMonthModal({ isOpen, onClose }) {
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
    const [saving, setSaving] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Get current month info
    function getCurrentMonth() {
        const now = new Date();
        return {
            month: now.getMonth() + 1,
            monthName: now.toLocaleDateString('no-NO', { month: 'long' }),
            year: now.getFullYear()
        };
    }

    // Format date for display
    function formatMonthName(month, year) {
        const date = new Date(year, month - 1, 1);
        return date.toLocaleDateString('no-NO', { month: 'long', year: 'numeric' });
    }

    // Change month
    function changeMonth(direction) {
        const newDate = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
        newDate.setMonth(newDate.getMonth() + direction);
        
        setSelectedMonth({
            month: newDate.getMonth() + 1,
            monthName: newDate.toLocaleDateString('no-NO', { month: 'long' }),
            year: newDate.getFullYear()
        });
    }

    const handleReset = async () => {
        setSaving(true);
        try {
            const monthStart = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
            monthStart.setHours(0, 0, 0, 0);
            const monthEnd = new Date(selectedMonth.year, selectedMonth.month, 0);
            monthEnd.setHours(23, 59, 59, 999);

            const deletePromises = [];
            
            // Delete all shifts for the selected month
            const shiftsQuery = query(collection(db, 'shifts'));
            const shiftsSnapshot = await getDocs(shiftsQuery);

            shiftsSnapshot.docs.forEach(docSnapshot => {
                const data = docSnapshot.data();
                let shiftDate;
                
                if (data.date) {
                    if (data.date.toDate) {
                        shiftDate = data.date.toDate();
                    } else if (data.date instanceof Timestamp) {
                        shiftDate = data.date.toDate();
                    } else if (data.date instanceof Date) {
                        shiftDate = data.date;
                    } else {
                        shiftDate = new Date(data.date);
                    }
                }

                if (shiftDate && !isNaN(shiftDate.getTime()) && shiftDate >= monthStart && shiftDate <= monthEnd) {
                    deletePromises.push(deleteDoc(doc(db, 'shifts', docSnapshot.id)));
                    
                    // Update staff shift count
                    if (data.staffId) {
                        const staffRef = doc(db, 'staff', data.staffId);
                        deletePromises.push(updateDoc(staffRef, { shifts: increment(-1) }));
                    }
                }
            });

            // Delete monthly review record if it exists
            const monthlyReviewQuery = query(
                collection(db, 'monthlyReviews'),
                where('month', '==', selectedMonth.month),
                where('year', '==', selectedMonth.year)
            );
            const reviewSnapshot = await getDocs(monthlyReviewQuery);

            reviewSnapshot.docs.forEach(docSnapshot => {
                deletePromises.push(deleteDoc(doc(db, 'monthlyReviews', docSnapshot.id)));
            });

            // Remove stars that were awarded for this month
            const salesQuery = query(
                collection(db, 'sales'),
                where('monthlyReview', '==', true),
                where('reviewMonth', '==', selectedMonth.month),
                where('reviewYear', '==', selectedMonth.year)
            );
            const salesSnapshot = await getDocs(salesQuery);

            salesSnapshot.docs.forEach(docSnapshot => {
                const saleData = docSnapshot.data();
                if (saleData.staffId && saleData.stars) {
                    // Remove stars from staff member
                    const staffRef = doc(db, 'staff', saleData.staffId);
                    deletePromises.push(updateDoc(staffRef, { stars: increment(-saleData.stars) }));
                    
                    // Delete the sales record
                    deletePromises.push(deleteDoc(doc(db, 'sales', docSnapshot.id)));
                }
            });

            await Promise.all(deletePromises);

            alert(`Alle vakter og stjerner for ${selectedMonth.monthName} ${selectedMonth.year} er nullstilt.`);
            setShowConfirm(false);
            onClose();
        } catch (error) {
            console.error('Error resetting month:', error);
            alert('Feil ved nullstilling: ' + error.message);
        }
        setSaving(false);
    };

    if (!showConfirm) {
        return (
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
                        onClick={onClose}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-xl w-full max-w-md border-2 border-red-300 shadow-xl p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Nullstill måned</h3>
                                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Velg måned å nullstille:
                                </label>
                                
                                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                                    <button
                                        onClick={() => changeMonth(-1)}
                                        className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                                    >
                                        ← Forrige
                                    </button>

                                    <div className="text-center">
                                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                                            <Calendar size={20} />
                                            {selectedMonth.monthName.charAt(0).toUpperCase() + selectedMonth.monthName.slice(1)} {selectedMonth.year}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => changeMonth(1)}
                                        className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                                    >
                                        Neste →
                                    </button>
                                </div>
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                <p className="text-sm text-red-800">
                                    <strong>Advarsel:</strong> Dette vil slette alle vakter og fjerne alle stjerner som ble tildelt for {selectedMonth.monthName} {selectedMonth.year}.
                                </p>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Avbryt
                                </button>
                                <button
                                    onClick={() => setShowConfirm(true)}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                                >
                                    <RotateCcw size={18} />
                                    Fortsett
                                </button>
                            </div>
                        </motion.div>
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
                    className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
                    onClick={() => setShowConfirm(false)}
                >
                    <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.95 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-xl w-full max-w-md border-2 border-red-300 shadow-xl p-6"
                    >
                        <div className="flex items-start gap-4 mb-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <Trash2 size={24} className="text-red-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                    Bekreft nullstilling
                                </h3>
                                <p className="text-sm text-gray-700 mb-4">
                                    Er du sikker på at du vil nullstille alle vakter og fjerne alle stjerner som ble tildelt for <strong>{selectedMonth.monthName} {selectedMonth.year}</strong>?
                                </p>
                                <p className="text-sm font-semibold text-red-600">
                                    Denne handlingen kan ikke angres!
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={saving}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                            >
                                Avbryt
                            </button>
                            <button
                                onClick={handleReset}
                                disabled={saving}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving ? (
                                    <>Nullstiller...</>
                                ) : (
                                    <>
                                        <RotateCcw size={18} />
                                        Bekreft nullstilling
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ResetMonthModal;

