import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Calendar, Plane, Sun } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { nb } from 'date-fns/locale';
import { useNotification } from '../hooks/useNotification.jsx';
import NotificationModal from './NotificationModal';

function FerieModal({ isOpen, onClose, staffId, staffName }) {
    const { notification, showSuccess, showError, hideNotification } = useNotification();
    const [selectedDays, setSelectedDays] = useState([]);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!staffId || !selectedDays || selectedDays.length === 0) return;

        setLoading(true);
        try {
            const ferieDays = selectedDays.length;
            const staffRef = doc(db, 'staff', staffId);

            // Add ferie days to staff record
            await updateDoc(staffRef, {
                ferieDays: increment(ferieDays),
                lastFerieUpdate: serverTimestamp()
            });

            // Record ferie entry for tracking
            await addDoc(collection(db, 'ferie'), {
                staffId,
                staffName,
                dates: selectedDays.map(date => date.toISOString()),
                days: ferieDays,
                comment: comment.trim(),
                timestamp: serverTimestamp()
            });

            // Reset form and close
            setSelectedDays([]);
            setComment('');
            onClose();

            // Show success notification
            showSuccess('Ferie registrert', `Ferie for ${staffName} er registrert.`);

        } catch (error) {
            console.error('Error registering ferie:', error);
            showError('Feil ved registrering', 'Det oppstod en feil ved registrering av ferie. Prøv igjen.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
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
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-xl w-full max-w-lg border-2 border-blue-400 shadow-xl relative z-10"
                            style={{ backgroundColor: '#ffffff' }}
                        >
                            <header className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                        <Plane size={20} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">Registrer Ferie</h3>
                                        <p className="text-sm text-gray-600">
                                            For ansatt: <span className="font-semibold text-blue-600">{staffName}</span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-gray-500 hover:text-gray-700 transition-colors"
                                    disabled={loading}
                                >
                                    <X size={24}/>
                                </button>
                            </header>

                            <form onSubmit={handleSubmit}>
                                <div className="p-6 space-y-6">
                                    {/* Date Picker */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3">
                                            <Calendar size={16} className="inline mr-2" />
                                            Velg feriedager
                                        </label>
                                        <div className="flex justify-center bg-gray-50 rounded-lg p-4">
                                            <DayPicker
                                                mode="multiple"
                                                min={0}
                                                selected={selectedDays}
                                                onSelect={setSelectedDays}
                                                locale={nb}
                                                styles={{
                                                    caption: { color: '#3b82f6' },
                                                    day: { borderRadius: '6px' },
                                                }}
                                                className="text-sm"
                                            />
                                        </div>
                                        <p className="text-sm text-gray-600 mt-2 text-center">
                                            {selectedDays?.length || 0} dager valgt
                                        </p>
                                    </div>

                                    {/* Comment Field */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <Sun size={16} className="inline mr-2" />
                                            Kommentar (valgfritt)
                                        </label>
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="F.eks. sommerferie, vinterferie, familiebesøk..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-400 outline-none transition-all resize-none"
                                            rows={3}
                                        />
                                    </div>

                                    {/* Summary */}
                                    {selectedDays && selectedDays.length > 0 && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-blue-800">
                                                    Registrerer ferie for {staffName}
                                                </span>
                                                <div className="flex items-center gap-1 text-blue-700">
                                                    <Plane size={16} />
                                                    <span className="font-bold">{selectedDays.length} dager</span>
                                                </div>
                                            </div>
                                            {comment && (
                                                <p className="text-sm text-blue-600 mt-2">"{comment}"</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <footer className="flex justify-between items-center p-6 bg-gray-50 rounded-b-xl border-t border-gray-200">
                                    <div className="text-sm text-gray-600">
                                        {selectedDays?.length > 0 ? `${selectedDays.length} feriedager vil bli registrert` : 'Velg dager for å fortsette'}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!selectedDays || selectedDays.length === 0 || loading}
                                        className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Plane size={16} />
                                        {loading ? 'Registrerer...' : 'Registrer ferie'}
                                    </button>
                                </footer>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <NotificationModal
                isOpen={!!notification}
                onClose={hideNotification}
                type={notification?.type}
                title={notification?.title}
                message={notification?.message}
                confirmText={notification?.confirmText}
            />
        </>
    );
}

export default FerieModal;
