import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { doc, updateDoc, collection, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Star, FileText, MessageSquare } from 'lucide-react';

function ManualStarModal({ isOpen, onClose, staffId, staffName }) {
    const [formData, setFormData] = useState({
        reference: '',
        referenceType: 'bilag', // 'bilag' or 'comment'
        stars: 1
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { reference, referenceType, stars } = formData;

        if (!staffId || !reference.trim() || !stars || stars < 1) return;

        try {
            const staffRef = doc(db, 'staff', staffId);
            const starsToAdd = parseInt(stars);

            // Update staff total stars
            await updateDoc(staffRef, { stars: increment(starsToAdd) });

            // Add manual entry to sales collection for history tracking
            await addDoc(collection(db, 'sales'), {
                staffId,
                staffName,
                bilag: referenceType === 'bilag' ? reference : `Manual: ${reference}`,
                category: 'Manuell registrering',
                service: referenceType === 'bilag' ? 'Bilagsnummer' : 'Kommentar',
                stars: starsToAdd,
                timestamp: serverTimestamp(),
                isManual: true,
                referenceType,
                comment: referenceType === 'comment' ? reference : null
            });

            // Reset form and close
            setFormData({ reference: '', referenceType: 'bilag', stars: 1 });
            onClose();
        } catch (error) {
            console.error('Error adding manual stars:', error);
            alert('Det oppstod en feil ved registrering av stjerner. Prøv igjen.');
        }
    };

    return (
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
                        className="bg-white rounded-xl w-full max-w-lg border-2 border-[#009A44] shadow-xl relative z-10"
                        style={{ backgroundColor: '#ffffff' }}
                    >
                        <header className="flex justify-between items-center p-6 border-b border-gray-200">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Manuell Stjerne-registrering</h3>
                                <p className="text-sm text-gray-600">
                                    For ansatt: <span className="font-semibold text-[#009A44]">{staffName}</span>
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <X size={24}/>
                            </button>
                        </header>

                        <form onSubmit={handleSubmit}>
                            <div className="p-6 space-y-5">
                                {/* Reference Type Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Referanse type
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                value="bilag"
                                                checked={formData.referenceType === 'bilag'}
                                                onChange={(e) => setFormData({...formData, referenceType: e.target.value})}
                                                className="text-[#009A44] focus:ring-[#009A44]"
                                            />
                                            <FileText size={16} className="text-gray-500" />
                                            <span className="text-sm text-gray-700">Bilagsnummer</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                value="comment"
                                                checked={formData.referenceType === 'comment'}
                                                onChange={(e) => setFormData({...formData, referenceType: e.target.value})}
                                                className="text-[#009A44] focus:ring-[#009A44]"
                                            />
                                            <MessageSquare size={16} className="text-gray-500" />
                                            <span className="text-sm text-gray-700">Kommentar</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Reference Input */}
                                <div className="relative">
                                    {formData.referenceType === 'bilag' ? (
                                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    ) : (
                                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    )}
                                    <input
                                        type="text"
                                        required
                                        value={formData.reference}
                                        onChange={e => setFormData({...formData, reference: e.target.value})}
                                        placeholder={formData.referenceType === 'bilag' ? 'Skriv inn bilagsnummer' : 'Skriv inn kommentar'}
                                        className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#009A44] outline-none transition-all"
                                    />
                                </div>

                                {/* Stars Input */}
                                <div className="relative">
                                    <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="10"
                                        value={formData.stars}
                                        onChange={e => setFormData({...formData, stars: e.target.value})}
                                        placeholder="Antall stjerner"
                                        className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#009A44] outline-none transition-all"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                        stjerner
                                    </div>
                                </div>

                                {/* Preview */}
                                {formData.reference && formData.stars && (
                                    <div className="bg-[#009A44]/10 border border-[#009A44] rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">
                                                    {formData.referenceType === 'bilag' ? 'Bilag' : 'Kommentar'}:
                                                    <span className="text-gray-900 ml-1">{formData.reference}</span>
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 text-[#009A44] font-bold">
                                                <Star size={16} />
                                                <span>+{formData.stars}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <footer className="flex justify-between items-center p-6 bg-gray-50 rounded-b-xl border-t border-gray-200">
                                <div className="text-sm text-gray-600">
                                    Dette vil legge til {formData.stars || 0} stjerner til {staffName}
                                </div>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-[#009A44] text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                >
                                    <Star size={16} />
                                    Legg til stjerner
                                </button>
                            </footer>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ManualStarModal;
