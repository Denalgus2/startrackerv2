import { AnimatePresence, motion } from 'framer-motion';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

function DeleteShiftModal({ isOpen, onClose, onConfirm, shift, staffName }) {
    if (!shift) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent any event bubbling
                        // Only close this modal, not parent
                    }}
                    className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
                    style={{ isolation: 'isolate' }}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-xl p-6 w-full max-w-md border-2 border-red-500 shadow-xl relative z-10"
                        style={{ backgroundColor: '#ffffff' }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-full">
                                    <AlertTriangle className="text-red-600" size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Slett vakt</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-gray-700 mb-4">
                                Er du sikker på at du vil slette denne vakten?
                            </p>

                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Trash2 className="text-red-600" size={16} />
                                    <span className="font-semibold text-red-800">Vakt som slettes:</span>
                                </div>
                                <p className="text-red-700">
                                    <strong>{staffName}</strong> - {format(shift.date, 'EEEE d. MMMM yyyy', { locale: nb })}
                                </p>
                            </div>

                            <p className="text-sm text-gray-600 mt-4">
                                Denne handlingen kan ikke angres. Vakttellingen vil bli redusert med 1.
                            </p>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Avbryt
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent any event bubbling
                                    onConfirm(shift);
                                    // Don't call onClose() here - let the parent handle it
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={16} />
                                Slett vakt
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default DeleteShiftModal;
