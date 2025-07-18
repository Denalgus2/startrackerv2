import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { X } from 'lucide-react';

function AddStaffModal({ isOpen, onClose }) {
    const [name, setName] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        await addDoc(collection(db, "staff"), { name: name.trim(), stars: 0, shifts: 0 });
        setName('');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
                    style={{ isolation: 'isolate' }}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-xl p-6 w-full max-w-lg border-2 border-[#009A44] shadow-xl relative z-10"
                        style={{ backgroundColor: '#ffffff' }}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-on-surface">Legg til ny ansatt</h3>
                            <button onClick={onClose} className="text-on-surface-secondary hover:text-on-surface transition-colors"><X /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <input
                                type="text"
                                required autoFocus
                                className="w-full p-3 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                                placeholder="Fullt navn på ansatt"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                            <div className="flex justify-end mt-6">
                                <button type="submit" className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-focus transition-colors">
                                    Lagre Ansatt
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default AddStaffModal;