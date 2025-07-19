import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { nb } from 'date-fns/locale';
import { format } from 'date-fns';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import DeleteShiftModal from './DeleteShiftModal';

function ShiftCalendarModal({ isOpen, onClose, onSave, staffMember }) {
    const [days, setDays] = useState([]);
    const [showResetSection, setShowResetSection] = useState(false);
    const [newShiftCount, setNewShiftCount] = useState('');
    const [existingShifts, setExistingShifts] = useState([]);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [shiftToDelete, setShiftToDelete] = useState(null);

    // Load existing shifts when modal opens
    useEffect(() => {
        if (isOpen && staffMember?.id) {
            const shiftsQuery = query(
                collection(db, 'shifts'),
                where('staffId', '==', staffMember.id)
            );

            const unsubscribe = onSnapshot(shiftsQuery, (snapshot) => {
                const shiftsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: doc.data().date?.toDate() // Convert Firestore timestamp to Date
                })).sort((a, b) => a.date - b.date); // Sort by date

                setExistingShifts(shiftsData);
            });

            return () => unsubscribe();
        } else if (!isOpen) {
            // Clear selected days when modal closes
            setDays([]);
        }
    }, [isOpen, staffMember?.id]);

    const handleSave = async () => {
        if (!days || days.length === 0) return;

        try {
            // Filter out dates that already exist to prevent duplicates
            const existingDates = existingShifts.map(shift =>
                shift.date.toDateString() // Convert to string for comparison
            );

            const newDates = days.filter(day =>
                !existingDates.includes(day.toDateString())
            );

            if (newDates.length === 0) {
                alert('Alle valgte datoer er allerede registrert som vakter.');
                return;
            }

            // Save each new selected day as a separate shift record
            for (const day of newDates) {
                await addDoc(collection(db, 'shifts'), {
                    staffId: staffMember.id,
                    staffName: staffMember.name,
                    date: day,
                    timestamp: serverTimestamp()
                });
            }

            // Update the staff member's total shift count with only new dates
            await onSave(newDates.length);
            setDays([]);

            if (newDates.length < days.length) {
                const duplicates = days.length - newDates.length;
                alert(`${newDates.length} nye vakter ble lagret. ${duplicates} ${duplicates === 1 ? 'dato var' : 'datoer var'} allerede registrert.`);
            }
        } catch (error) {
            console.error('Error saving shifts:', error);
            alert('Det oppstod en feil ved lagring av vakter.');
        }
    };

    const handleDeleteShift = async (shift) => {
        try {
            await deleteDoc(doc(db, 'shifts', shift.id));
            // Decrease the staff member's total shift count without closing the modal
            const staffRef = doc(db, 'staff', staffMember.id);
            await updateDoc(staffRef, { shifts: increment(-1) });
            // Modal stays open for multiple deletions
        } catch (error) {
            console.error('Error deleting shift:', error);
            alert('Det oppstod en feil ved sletting av vakt.');
        }
    };

    const openDeleteModal = (shift) => {
        setShiftToDelete(shift);
        setDeleteModalOpen(true);
    };

    const handleReset = () => {
        const count = parseInt(newShiftCount);
        if (isNaN(count) || count < 0) {
            alert('Vennligst skriv inn et gyldig antall vakter (0 eller høyere)');
            return;
        }

        if (confirm(`Er du sikker på at du vil sette ${staffMember?.name || 'denne ansatte'} sine vakter til ${count}? Dette vil overskrive det nåværende antallet (${staffMember?.shifts || 0}).`)) {
            onSave(count, true); // true indicates this is a reset operation
            setNewShiftCount('');
            setShowResetSection(false);
            onClose();
        }
    };

    const removeDay = (dayToRemove) => {
        setDays(days.filter(day => day.getTime() !== dayToRemove.getTime()));
    };

    const clearAll = () => {
        setDays([]);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={(e) => {
                        // Don't close calendar if delete modal is open
                        if (!deleteModalOpen) {
                            onClose();
                        }
                    }}
                    className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
                    style={{ isolation: 'isolate' }}
                >
                    <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-xl p-6 w-full max-w-2xl border-2 border-[#009A44] shadow-xl relative z-10"
                        style={{ backgroundColor: '#ffffff' }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Registrer Vakter</h3>
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Calendar Section */}
                            <div className="flex justify-center">
                                <DayPicker
                                    mode="multiple"
                                    min={0}
                                    selected={days}
                                    onSelect={setDays}
                                    locale={nb}
                                    modifiers={{
                                        existingShift: existingShifts.map(shift => shift.date)
                                    }}
                                    modifiersStyles={{
                                        existingShift: {
                                            backgroundColor: '#dcfce7',
                                            border: '2px solid #16a34a',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            color: '#15803d'
                                        }
                                    }}
                                    styles={{
                                        caption: { color: '#009A44', fontWeight: 'bold' },
                                        day: { borderRadius: '8px' },
                                        day_selected: {
                                            backgroundColor: '#009A44',
                                            color: 'white',
                                            fontWeight: 'bold'
                                        },
                                        day_today: {
                                            backgroundColor: '#e6f7ff',
                                            color: '#009A44',
                                            fontWeight: 'bold'
                                        }
                                    }}
                                />
                            </div>

                            {/* Right Side - Two sections */}
                            <div className="flex flex-col space-y-6">
                                {/* Existing Shifts Section */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-semibold text-gray-900">Registrerte vakter ({existingShifts?.length || 0})</h4>
                                    </div>

                                    <div className="max-h-32 overflow-y-auto">
                                        {existingShifts?.length > 0 ? (
                                            <div className="space-y-2">
                                                {existingShifts.map((shift) => (
                                                    <div key={shift.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
                                                        <span className="text-xs text-green-800 font-medium">
                                                            {format(shift.date, 'EEE d. MMM yyyy', { locale: nb })}
                                                        </span>
                                                        <button
                                                            onClick={() => openDeleteModal(shift)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                                                            title="Slett denne vakten"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-16 text-gray-500 text-xs bg-gray-50 rounded-lg">
                                                Ingen vakter registrert ennå.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* New Selected Dates Section */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-semibold text-gray-900">Nye valg ({days?.length || 0})</h4>
                                        {days?.length > 0 && (
                                            <button
                                                onClick={clearAll}
                                                className="text-xs text-red-600 hover:text-red-800 underline"
                                            >
                                                Fjern alle
                                            </button>
                                        )}
                                    </div>

                                    <div className="max-h-32 overflow-y-auto">
                                        {days?.length > 0 ? (
                                            <div className="space-y-2">
                                                {days.sort((a, b) => a - b).map((day, index) => (
                                                    <div key={index} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-2">
                                                        <span className="text-xs text-blue-800 font-medium">
                                                            {format(day, 'EEE d. MMM yyyy', { locale: nb })}
                                                        </span>
                                                        <button
                                                            onClick={() => removeDay(day)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors"
                                                            title="Fjern denne dagen"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-16 text-gray-500 text-xs bg-gray-50 rounded-lg">
                                                Ingen nye dager valgt.<br/>
                                                Klikk på kalenderen.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reset Section */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-semibold text-gray-900">Nullstill vakter</h4>
                                <button
                                    onClick={() => setShowResetSection(!showResetSection)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    {showResetSection ? <X size={20} /> : <RotateCcw size={20} />}
                                </button>
                            </div>

                            {showResetSection ? (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-600 mb-2">
                                        Angi nytt antall vakter for å nullstille. Dette vil overskrive eksisterende vakter.
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={newShiftCount}
                                            onChange={(e) => setNewShiftCount(e.target.value)}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009A44] focus:border-transparent"
                                            placeholder="Antall vakter"
                                        />
                                        <button
                                            onClick={handleReset}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                        >
                                            Nullstill
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-500 text-sm">
                                    Klikk på ikonet for å nullstille vakter.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                                {days?.length > 0
                                    ? `${days.length} ${days.length === 1 ? 'vakt' : 'vakter'} vil bli lagt til`
                                    : 'Velg dager fra kalenderen'
                                }
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    Avbryt
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!days || days.length === 0}
                                    className="px-6 py-2 bg-[#009A44] text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                                >
                                    Lagre {days?.length || 0} {(days?.length || 0) === 1 ? 'vakt' : 'vakter'}
                                </button>
                            </div>
                        </div>

                        {/* Delete Shift Confirmation Modal */}
                        <DeleteShiftModal
                            isOpen={deleteModalOpen}
                            onClose={() => {
                                setDeleteModalOpen(false);
                                setShiftToDelete(null);
                            }}
                            onConfirm={async (shift) => {
                                // Delete the shift
                                await handleDeleteShift(shift);
                                // Close only the delete modal, keep calendar open
                                setDeleteModalOpen(false);
                                setShiftToDelete(null);
                                // Calendar stays open for more deletions
                            }}
                            shift={shiftToDelete}
                            staffName={staffMember?.name}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ShiftCalendarModal;
