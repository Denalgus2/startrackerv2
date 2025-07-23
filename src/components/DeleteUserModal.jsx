import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

function DeleteUserModal({ isOpen, onClose, onConfirm, user }) {
    const [deleteOption, setDeleteOption] = useState('auth_profile'); // 'auth_profile' or 'full_purge'
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen || !user) return null;

    const handleConfirm = async () => {
        setIsDeleting(true);
        // The onConfirm function will be passed the user and the chosen option
        await onConfirm(user, deleteOption);
        setIsDeleting(false);
        onClose();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-xl border-4 border-red-500 shadow-xl max-w-lg w-full p-6 relative"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                            <AlertTriangle size={24} className="text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-on-surface">Slett Bruker</h3>
                            <p className="text-sm text-on-surface-secondary">Bekreft sletting av <strong className="text-on-surface">{user.displayName}</strong>.</p>
                        </div>
                    </div>

                    <div className="mb-6 space-y-4">
                        <p className="text-sm text-on-surface-secondary">
                            Velg hvor omfattende slettingen skal være. Denne handlingen kan ikke angres.
                        </p>
                        <div className="space-y-3">
                            <label className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg has-[:checked]:border-red-500 has-[:checked]:bg-red-50 cursor-pointer">
                                <input
                                    type="radio"
                                    name="delete-option"
                                    value="auth_profile"
                                    checked={deleteOption === 'auth_profile'}
                                    onChange={(e) => setDeleteOption(e.target.value)}
                                    className="mt-1"
                                />
                                <div>
                                    <h4 className="font-semibold text-on-surface">Kun brukerprofil og innlogging</h4>
                                    <p className="text-xs text-on-surface-secondary">Sletter brukeren fra innloggingssystemet (Authentication) og fjerner rollen (Firestore `users`). All salgshistorikk beholdes.</p>
                                </div>
                            </label>
                            <label className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg has-[:checked]:border-red-500 has-[:checked]:bg-red-50 cursor-pointer">
                                <input
                                    type="radio"
                                    name="delete-option"
                                    value="full_purge"
                                    checked={deleteOption === 'full_purge'}
                                    onChange={(e) => setDeleteOption(e.target.value)}
                                    className="mt-1"
                                />
                                <div>
                                    <h4 className="font-semibold text-on-surface">Full sletting (Alt)</h4>
                                    <p className="text-xs text-on-surface-secondary">Sletter brukerprofil, innlogging, ansattprofil (`staff`) og **all tilknyttet salgshistorikk**. Dataen vil være borte for alltid.</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} disabled={isDeleting} className="flex-1 py-2 px-4 rounded-lg border-2 border-border-color hover:bg-background disabled:opacity-50">
                            Avbryt
                        </button>
                        <button onClick={handleConfirm} disabled={isDeleting} className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50">
                            <Trash2 size={16} />
                            {isDeleting ? 'Sletter...' : 'Bekreft og Slett'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default DeleteUserModal;