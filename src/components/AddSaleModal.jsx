import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { serviceCategories } from '../data/services';
import { X, Star, FileText, ShoppingBag, Tag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function AddSaleModal({ isOpen, onClose, staffId, staffName }) {
    const { userRole } = useAuth();
    const [formData, setFormData] = useState({ bilag: '', category: '', service: '' });
    const [forsikringAmount, setForsikringAmount] = useState('');
    const [existingSales, setExistingSales] = useState([]);
    const [loading, setLoading] = useState(false);

    // Categories available for staff to submit manually
    const availableCategories = Object.keys(serviceCategories).filter(
        cat => cat !== 'Kundeklubb' && cat !== 'Annet'
    );

    const getForsikringService = (amount) => {
        const numAmount = parseFloat(amount);
        if (numAmount < 100) return 'Mindre enn 100kr x3';
        if (numAmount >= 100 && numAmount <= 299) return '100-299kr x2';
        if (numAmount >= 300 && numAmount <= 499) return '300-499kr';
        if (numAmount >= 500 && numAmount <= 999) return '500-999kr';
        if (numAmount >= 1000 && numAmount <= 1499) return '1000-1499kr';
        if (numAmount >= 1500) return '1500kr+';
        return null;
    };

    useEffect(() => {
        if (formData.category === 'Forsikring') {
            const service = getForsikringService(forsikringAmount);
            setFormData(prev => ({ ...prev, service: service }));
        }
    }, [forsikringAmount, formData.category]);

    useEffect(() => {
        if (isOpen && staffId) {
            const salesQuery = query(collection(db, 'sales'), where('staffId', '==', staffId));
            const unsub = onSnapshot(salesQuery, (snapshot) => {
                const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                salesData.sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));
                setExistingSales(salesData);
            });
            return () => unsub();
        }
    }, [isOpen, staffId]);

    const getMultiplierProgress = () => {
        if (!formData.category || !formData.service) return null;
        const service = formData.service;
        const existingCount = existingSales.filter(sale => sale.category === formData.category && sale.service === formData.service).length;
        let multiplier = 1;
        if (service.includes(' x2')) multiplier = 2;
        else if (service.includes(' x3')) multiplier = 3;

        if (multiplier > 1) {
            const afterAdding = existingCount + 1;
            const starsEarned = Math.floor(afterAdding / multiplier) - Math.floor(existingCount / multiplier);
            return { starsEarned, isMultiplier: true, existing: existingCount, needed: multiplier, afterAdding };
        }
        return { starsEarned: serviceCategories[formData.category][formData.service], isMultiplier: false };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        let { bilag, category, service } = formData;

        if (category === 'Forsikring') {
            service = getForsikringService(forsikringAmount);
        }

        if (!staffId || !bilag || !category || !service) {
            alert('Vennligst fyll ut alle felter.');
            setLoading(false);
            return;
        }

        const multiplierInfo = getMultiplierProgress();
        const starsToAdd = multiplierInfo ? multiplierInfo.starsEarned : serviceCategories[category][service];

        try {
            // Auto-approve for moderators and admins
            if (userRole === 'moderator' || userRole === 'admin') {
                // Directly add to sales collection
                await addDoc(collection(db, 'sales'), {
                    staffId,
                    staffName,
                    bilag,
                    category,
                    service,
                    stars: starsToAdd,
                    timestamp: serverTimestamp(),
                    approvedBy: 'auto-approved',
                    ...(category === 'Forsikring' && { forsikringAmount: parseFloat(forsikringAmount) })
                });

                setFormData({ bilag: '', category: '', service: '' });
                setForsikringAmount('');
                onClose();
                alert('Bilag automatisk godkjent og lagt til!');
            } else {
                // For regular staff, create pending request
                await addDoc(collection(db, 'bilagRequests'), {
                    staffId,
                    staffName,
                    bilag,
                    category,
                    service,
                    stars: starsToAdd,
                    status: 'pending',
                    requestedAt: serverTimestamp(),
                    ...(category === 'Forsikring' && { forsikringAmount: parseFloat(forsikringAmount) })
                });

                setFormData({ bilag: '', category: '', service: '' });
                setForsikringAmount('');
                onClose();
                alert('Forespørsel om bilag er sendt til godkjenning!');
            }

        } catch (error) {
            console.error("Error submitting bilag request:", error);
            alert("Feil: Kunne ikke sende forespørsel.");
        } finally {
            setLoading(false);
        }
    };

    const multiplierInfo = getMultiplierProgress();

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-xl w-full max-w-lg border-2 border-[#009A44] shadow-xl flex flex-col max-h-[90vh]"
                    >
                        <header className="flex justify-between items-center p-6 border-b border-gray-200">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Send inn Bilag for Godkjenning</h3>
                                <p className="text-sm text-gray-600">For: <span className="font-semibold text-[#009A44]">{staffName}</span></p>
                            </div>
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors"><X size={24}/></button>
                        </header>

                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                            <div className="p-6 space-y-5 overflow-y-auto">
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text" required
                                        value={formData.bilag}
                                        onChange={e => setFormData({...formData, bilag: e.target.value})}
                                        placeholder="Bilagsnummer"
                                        className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#009A44] outline-none transition-all"
                                    />
                                </div>

                                <div className="relative">
                                    <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <select required value={formData.category} onChange={e => {
                                        setFormData({...formData, category: e.target.value, service: ''});
                                        setForsikringAmount('');
                                    }} className="w-full pl-10 pr-3 py-3 appearance-none bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#009A44] outline-none transition-all">
                                        <option value="">Velg kategori...</option>
                                        {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>

                                {formData.category === 'Forsikring' ? (
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input
                                            type="number" required
                                            value={forsikringAmount}
                                            onChange={e => setForsikringAmount(e.target.value)}
                                            placeholder="Forsikringsbeløp (kr)"
                                            min="0"
                                            step="1"
                                            className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#009A44] outline-none transition-all"
                                        />
                                    </div>
                                ) : formData.category && (
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <select required value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} className="w-full pl-10 pr-3 py-3 appearance-none bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#009A44] outline-none transition-all">
                                            <option value="">Velg tjeneste...</option>
                                            {Object.keys(serviceCategories[formData.category]).map(item => <option key={item} value={item}>{item}</option>)}
                                        </select>
                                    </div>
                                )}

                                {multiplierInfo && (
                                    <div className="bg-[#009A44]/10 border border-[#009A44] rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700">
                                                {multiplierInfo.isMultiplier ? 'Multiplier progresjon:' : 'Potensielle stjerner:'}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {multiplierInfo.isMultiplier && (
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                        multiplierInfo.afterAdding >= multiplierInfo.needed
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {multiplierInfo.existing}/{multiplierInfo.needed} → {multiplierInfo.afterAdding}/{multiplierInfo.needed}
                                                    </span>
                                                )}
                                                <span className="text-[#009A44] font-bold flex items-center gap-1">
                                                    +{multiplierInfo.starsEarned} <Star size={14} />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <footer className="flex justify-between items-center p-6 bg-gray-50 rounded-b-xl border-t border-gray-200 mt-auto">
                                <div className="flex items-center gap-2 text-lg font-bold">
                                    <Star className="text-[#009A44]" />
                                    <span className="text-gray-900">{multiplierInfo?.starsEarned || 0}</span>
                                    <span className="text-gray-600 text-sm font-normal">potensielle stjerner</span>
                                </div>
                                <button type="submit" disabled={loading} className="px-6 py-3 bg-[#009A44] text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                                    {loading ? 'Sender...' : 'Send til Godkjenning'}
                                </button>
                            </footer>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default AddSaleModal;
