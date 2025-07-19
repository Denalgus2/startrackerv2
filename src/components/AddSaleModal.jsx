import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { doc, updateDoc, collection, addDoc, serverTimestamp, increment, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { serviceCategories } from '../data/services';
import { X, Star, FileText, ShoppingBag, Tag } from 'lucide-react';

function AddSaleModal({ isOpen, onClose, staffId, staffName }) {
    const [formData, setFormData] = useState({ bilag: '', category: '', service: '' });
    const [forsikringAmount, setForsikringAmount] = useState('');
    const [existingSales, setExistingSales] = useState([]);

    // Calculate forsikring category based on amount
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
        if (isOpen && staffId) {
            setFormData({ bilag: '', category: '', service: '' });
            setForsikringAmount('');
            // Clear existing sales data first
            setExistingSales([]);

            // Fetch existing sales for this staff member (simplified query)
            const salesQuery = query(
                collection(db, 'sales'),
                where('staffId', '==', staffId)
                // Removed orderBy to avoid index requirement
            );
            const unsub = onSnapshot(salesQuery, (snapshot) => {
                const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort in JavaScript instead of Firestore
                salesData.sort((a, b) => {
                    if (!a.timestamp || !b.timestamp) return 0;
                    return b.timestamp.toDate() - a.timestamp.toDate();
                });
                setExistingSales(salesData);
            });
            return () => unsub();
        } else if (!isOpen) {
            // Clear data when modal closes
            setExistingSales([]);
        }
    }, [isOpen, staffId, staffName]);

    // Calculate multiplier progress for selected service
    const getMultiplierProgress = () => {
        if (!formData.category || !formData.service) return null;

        const service = formData.service;

        // Count existing sales of this service type
        const existingCount = existingSales.filter(sale =>
            sale.category === formData.category && sale.service === formData.service
        ).length;

        // Check if service has multiplier
        let multiplier = 1;
        if (service.includes(' x2')) multiplier = 2;
        else if (service.includes(' x3')) multiplier = 3;

        if (multiplier > 1) {
            const afterAdding = existingCount + 1;
            const currentComplete = Math.floor(existingCount / multiplier);
            const afterComplete = Math.floor(afterAdding / multiplier);
            const starsEarned = afterComplete - currentComplete;

            return {
                existing: existingCount,
                needed: multiplier,
                afterAdding,
                starsEarned,
                isMultiplier: true
            };
        }

        return {
            existing: existingCount,
            needed: 1,
            afterAdding: existingCount + 1,
            starsEarned: serviceCategories[formData.category][formData.service],
            isMultiplier: false
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let { bilag, category, service } = formData;

        // For forsikring, determine service from amount
        if (category === 'Forsikring') {
            if (!forsikringAmount || parseFloat(forsikringAmount) <= 0) {
                alert('Vennligst skriv inn et gyldig forsikringsbeløp');
                return;
            }
            service = getForsikringService(forsikringAmount);
        }

        if (!staffId || !bilag || !category || !service) return;

        // Calculate stars using the same logic as the preview
        let starsToAdd = 0;
        const multiplierInfo = getMultiplierProgress();
        if (multiplierInfo) {
            starsToAdd = multiplierInfo.starsEarned;
        } else {
            // Fallback to original logic if no multiplier info
            starsToAdd = serviceCategories[category][service];
        }

        const staffRef = doc(db, 'staff', staffId);

        // Only update stars if there are stars to add
        if (starsToAdd > 0) {
            await updateDoc(staffRef, { stars: increment(starsToAdd) });
        }

        await addDoc(collection(db, 'sales'), {
            staffId,
            staffName,
            bilag,
            category,
            service,
            stars: starsToAdd, // Use calculated stars instead of raw service value
            timestamp: serverTimestamp(),
            // Add forsikring amount if applicable
            ...(category === 'Forsikring' && { forsikringAmount: parseFloat(forsikringAmount) })
        });

        setFormData({ bilag: '', category: '', service: '' });
        setForsikringAmount('');
        onClose();
    };

    const selectedStars = formData.category && formData.service ? serviceCategories[formData.category][formData.service] : 0;
    const multiplierInfo = getMultiplierProgress();

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
                        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-xl w-full max-w-lg border-2 border-[#009A44] shadow-xl flex flex-col h-full max-h-[80vh] relative z-10"
                        style={{ backgroundColor: '#ffffff' }}
                    >
                        <header className="flex justify-between items-center p-6 border-b border-gray-200">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Registrer Salg</h3>
                                <p className="text-sm text-gray-600">For ansatt: <span className="font-semibold text-[#009A44]">{staffName}</span></p>
                            </div>
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors"><X size={24}/></button>
                        </header>

                        <form onSubmit={handleSubmit}>
                            <div className="p-6 space-y-5">
                                {/* Bilagsnummer */}
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

                                {/* Kategori */}
                                <div className="relative">
                                    <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <select required value={formData.category} onChange={e => {
                                        setFormData({...formData, category: e.target.value, service: ''});
                                        setForsikringAmount('');
                                    }} className="w-full pl-10 pr-3 py-3 appearance-none bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#009A44] outline-none transition-all">
                                        <option value="">Velg kategori...</option>
                                        {Object.keys(serviceCategories).filter(cat => cat !== 'Kundeklubb').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>

                                {/* Conditional: Forsikring Amount OR Service Selection */}
                                {formData.category === 'Forsikring' ? (
                                    <div className="space-y-3">
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
                                        {/* Preview for forsikring */}
                                        {forsikringAmount && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-sm text-blue-800">
                                                    <strong>{forsikringAmount}kr</strong> forsikring → kategoriseres som:
                                                    <strong className="ml-1">{getForsikringService(forsikringAmount)}</strong>
                                                </p>
                                            </div>
                                        )}
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

                                {/* Multiplier Progress Display */}
                                {multiplierInfo && (
                                    <div className="bg-[#009A44]/10 border border-[#009A44] rounded-lg p-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {multiplierInfo.isMultiplier ? 'Multiplier progresjon:' : 'Direkte stjerner:'}
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
                                            <p className="text-xs text-gray-600">
                                                {multiplierInfo.isMultiplier
                                                    ? `${staffName} har ${multiplierInfo.existing} av denne typen. ${multiplierInfo.starsEarned > 0 ? 'Dette vil gi stjerner!' : `Trenger ${multiplierInfo.needed - (multiplierInfo.existing % multiplierInfo.needed)} til for stjerner.`}`
                                                    : `Dette vil gi ${multiplierInfo.starsEarned} stjerner direkte.`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <footer className="flex justify-between items-center p-6 bg-gray-50 rounded-b-2xl border-t border-gray-200">
                                <div className="flex items-center gap-2 text-lg font-bold">
                                    <Star className="text-[#009A44]" />
                                    <span className="text-gray-900">{multiplierInfo?.starsEarned || 0}</span>
                                    <span className="text-gray-600 text-sm font-normal">stjerner vil bli lagt til</span>
                                </div>
                                <button type="submit" className="px-6 py-3 bg-[#009A44] text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                                    Registrer
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

