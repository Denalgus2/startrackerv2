import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { serviceCategories } from '../data/services';
import { X, Save, FileText, ShoppingBag, Tag } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotification } from '../hooks/useNotification';
import NotificationModal from './NotificationModal';

function EditBilagRequestModal({ isOpen, onClose, request }) {
    const { notification, showSuccess, showError, hideNotification } = useNotification();
    const [formData, setFormData] = useState({ bilag: '', category: '', service: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // When the modal opens, populate the form with the request's current data
        if (request) {
            setFormData({
                bilag: request.bilag || '',
                category: request.category || '',
                service: request.service || '',
            });
        }
    }, [request]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const requestRef = doc(db, 'bilagRequests', request.id);

            // Calculate new stars based on the potentially edited service
            const newStars = serviceCategories[formData.category]?.[formData.service] || 0;

            const updatedData = {
                ...formData,
                stars: newStars, // Update stars based on the new service
            };

            await updateDoc(requestRef, updatedData);
            onClose();
            showSuccess('Forespørsel oppdatert', 'Bilag-forespørselen er oppdatert.');
        } catch (error) {
            console.error("Error updating request:", error);
            showError('Feil', 'Kunne ikke oppdatere forespørselen.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !request) return null;

    return (
        <>
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-xl w-full max-w-lg border-2 border-blue-500 shadow-xl"
                    >
                        <header className="flex justify-between items-center p-6 border-b border-gray-200">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Rediger Forespørsel</h3>
                                <p className="text-sm text-gray-600">For: <span className="font-semibold text-blue-600">{request.staffName}</span></p>
                            </div>
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={24}/></button>
                        </header>

                        <form onSubmit={handleSubmit}>
                            <div className="p-6 space-y-5">
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text" required
                                        value={formData.bilag}
                                        onChange={e => setFormData({...formData, bilag: e.target.value})}
                                        className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div className="relative">
                                    <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value, service: ''})} className="w-full pl-10 pr-3 py-3 appearance-none bg-gray-50 border border-gray-300 rounded-lg">
                                        <option value="">Velg kategori...</option>
                                        {Object.keys(serviceCategories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                {formData.category && (
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <select required value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} className="w-full pl-10 pr-3 py-3 appearance-none bg-gray-50 border border-gray-300 rounded-lg">
                                            <option value="">Velg tjeneste...</option>
                                            {Object.keys(serviceCategories[formData.category]).map(item => <option key={item} value={item}>{item}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <footer className="flex justify-end p-6 bg-gray-50 rounded-b-xl border-t border-gray-200">
                                <button type="submit" disabled={loading} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
                                    <Save size={16} />
                                    {loading ? 'Lagrer...' : 'Lagre Endringer'}
                                </button>
                            </footer>
                        </form>
                    </motion.div>
                </motion.div>
            </AnimatePresence>

            <NotificationModal
                isOpen={!!notification}
                onClose={hideNotification}
                type={notification?.type}
                title={notification?.title}
                message={notification?.message}
                confirmText={notification?.confirmText}
                showCancel={notification?.showCancel}
                cancelText={notification?.cancelText}
                onConfirm={notification?.onConfirm}
            />
        </>
    );
}

export default EditBilagRequestModal;
