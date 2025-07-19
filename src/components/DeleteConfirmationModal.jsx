import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, staffName, isDeleting }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={(e) => {
                        // Close modal if clicking on backdrop (but not during deletion)
                        if (e.target === e.currentTarget && !isDeleting) {
                            onClose();
                        }
                    }}
                    className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
                    style={{ isolation: 'isolate' }}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="bg-white rounded-xl border-4 border-red-500 shadow-xl max-w-md w-full p-6 relative z-10"
                        onClick={(e) => e.stopPropagation()}
                        style={{ backgroundColor: '#ffffff' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <AlertTriangle size={20} className="text-red-600" />
                                </div>
                                <h3 className="text-xl font-bold text-on-surface">Slett ansatt</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-lg hover:bg-background text-on-surface-secondary"
                                disabled={isDeleting}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="mb-6">
                            <p className="text-on-surface mb-2">
                                Er du sikker på at du vil slette <strong>{staffName}</strong>?
                            </p>
                            <p className="text-sm text-on-surface-secondary">
                                Denne handlingen kan ikke angres. All salgshistorikk og data for denne ansatte vil bli permanent slettet.
                            </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isDeleting}
                                className="flex-1 py-3 px-4 rounded-lg border-2 border-border-color text-on-surface-secondary hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Avbryt
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isDeleting}
                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Trash2 size={16} />
                                {isDeleting ? 'Sletter...' : 'Slett ansatt'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
