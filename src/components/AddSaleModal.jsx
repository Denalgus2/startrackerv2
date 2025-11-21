import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Star, FileText, ShoppingBag, Tag, Repeat, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';
import { useServices } from '../hooks/useServices';
import NotificationModal from './NotificationModal';

function AddSaleModal({ isOpen, onClose, staffId, staffName }) {
    const { userRole } = useAuth();
    const { notification, showSuccess, showError, hideNotification } = useNotification();
    const { serviceCategories, loading: servicesLoading } = useServices();
    const [formData, setFormData] = useState({ bilag: '', category: '', service: '' });
    const [forsikringAmount, setForsikringAmount] = useState('');
    const [insuranceType, setInsuranceType] = useState('One-time');
    const [existingSales, setExistingSales] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeBonus, setActiveBonus] = useState(null);

    // Load active bonus
    useEffect(() => {
        const systemRef = doc(db, 'config', 'system');
        const unsub = onSnapshot(systemRef, (doc) => {
            if (doc.exists() && doc.data().activeBonus) {
                setActiveBonus(doc.data().activeBonus);
            } else {
                setActiveBonus(null);
            }
        });
        return () => unsub();
    }, []);

    // Categories available for staff to submit manually
    const availableCategories = Object.keys(serviceCategories).filter(
        cat => cat !== 'Kundeklubb' && cat !== 'Annet'
    );

    // Calculate stars for recurring forsikring based on amount
    const getRecurringForsikringStars = (amount) => {
        const numAmount = parseFloat(amount);
        if (!numAmount || isNaN(numAmount)) return 0;
        
        if (numAmount < 100) return 2;
        if (numAmount >= 100 && numAmount <= 299) return 3;
        if (numAmount >= 300) return 4;
        return 0;
    };

    const getForsikringService = (amount, isRecurring = false) => {
        const numAmount = parseFloat(amount);
        if (!numAmount || !serviceCategories.Forsikring) {
            return null;
        }
        
        // For recurring, return a service name for tracking, but stars are calculated separately
        if (isRecurring) {
            if (numAmount < 100) return 'Gjentakende - Under 100kr';
            if (numAmount >= 100 && numAmount <= 299) return 'Gjentakende - 100-299kr';
            if (numAmount >= 300) return 'Gjentakende - 300kr+';
            return 'Gjentakende - Ukjent';
        }
        
        // Find matching service based on amount ranges in the configured services (for one-time)
        const forsikringServices = serviceCategories.Forsikring;
        
        // First check for exact range matches in configured services
        for (const [serviceName, serviceData] of Object.entries(forsikringServices)) {
            // Handle services with stored amount ranges (from ModeratorSettings)
            if (typeof serviceData === 'object' && serviceData.startAmount && serviceData.endAmount) {
                const startAmount = parseInt(serviceData.startAmount);
                const endAmount = parseInt(serviceData.endAmount);
                if (numAmount >= startAmount && numAmount <= endAmount) {
                    return serviceName;
                }
            }
        }

        // Then check for name-based matches (legacy support)
        for (const [serviceName, serviceData] of Object.entries(forsikringServices)) {
            // Extract amount range from service name (e.g., "500-999kr", "1500kr+")
            const rangeMatch = serviceName.match(/^(\d+)-(\d+)kr/);
            const minMatch = serviceName.match(/^(\d+)kr\+/);
            
            if (rangeMatch) {
                // Handle range like "500-999kr"
                const [, start, end] = rangeMatch;
                const startAmount = parseInt(start);
                const endAmount = parseInt(end);
                if (numAmount >= startAmount && numAmount <= endAmount) {
                    return serviceName;
                }
            } else if (minMatch) {
                // Handle minimum amount like "1500kr+"
                const [, minAmount] = minMatch;
                if (numAmount >= parseInt(minAmount)) {
                    return serviceName;
                }
            }
        }
        
        // If no exact match, try to find the best available service
        // Look for services that could potentially match the amount
        const availableServices = Object.keys(forsikringServices);
        
        // Try fallback mapping only if the service actually exists
        const fallbackMappings = [
            { condition: () => numAmount < 100, services: ['Mindre enn 100kr x3', 'Mindre enn 100kr', '0-99kr'] },
            { condition: () => numAmount >= 100 && numAmount <= 299, services: ['100-299kr x2', '100-299kr'] },
            { condition: () => numAmount >= 300 && numAmount <= 499, services: ['300-499kr'] },
            { condition: () => numAmount >= 500 && numAmount <= 999, services: ['500-999kr'] },
            { condition: () => numAmount >= 1000 && numAmount <= 1499, services: ['1000-1499kr'] },
            { condition: () => numAmount >= 1500, services: ['1500kr+', '1500-2000kr', '1500-3000kr'] }
        ];
        
        for (const mapping of fallbackMappings) {
            if (mapping.condition()) {
                for (const serviceName of mapping.services) {
                    if (availableServices.includes(serviceName)) {
                        return serviceName;
                    }
                }
            }
        }
        
        // If still no match, return the first available service as last resort
        return availableServices.length > 0 ? availableServices[0] : null;
    };

    useEffect(() => {
        if (formData.category === 'Forsikring') {
            const service = getForsikringService(forsikringAmount, insuranceType === 'Recurring');
            setFormData(prev => ({ ...prev, service: service }));
        }
    }, [forsikringAmount, formData.category, insuranceType, serviceCategories]);

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

    const getMultiplierProgress = (currentService = formData.service, currentCategory = formData.category) => {
        if (!currentCategory || !currentService) {
            return null;
        }
        
        let result = null;

        // For recurring forsikring, calculate stars directly based on amount (no multipliers)
        if (currentCategory === 'Forsikring' && insuranceType === 'Recurring') {
            const starsEarned = getRecurringForsikringStars(forsikringAmount);
            if (starsEarned !== 0) {
                result = { starsEarned, isMultiplier: false };
            }
        }
        
        // For one-time forsikring and other categories, use the standard multiplier logic
        else if (serviceCategories[currentCategory]) {
            const categoryServices = serviceCategories[currentCategory];
            const serviceData = categoryServices[currentService];
            
            if (serviceData) {
                const existingCount = existingSales.filter(sale => sale.category === currentCategory && sale.service === currentService).length;
                let multiplier = 1;
                if (currentService.includes(' x2')) multiplier = 2;
                else if (currentService.includes(' x3')) multiplier = 3;
                else if (currentService.includes(' x4')) multiplier = 4;
                else if (currentService.includes(' x5')) multiplier = 5;

                if (multiplier > 1) {
                    const afterAdding = existingCount + 1;
                    const starsEarned = Math.floor(afterAdding / multiplier) - Math.floor(existingCount / multiplier);
                    const baseStars = typeof serviceData === 'object' ? serviceData.stars : serviceData;
                    result = { starsEarned: starsEarned * baseStars, isMultiplier: true, existing: existingCount, needed: multiplier, afterAdding };
                } else {
                    const stars = typeof serviceData === 'object' ? serviceData.stars : serviceData;
                    result = { starsEarned: stars, isMultiplier: false };
                }
            }
        }

        // Apply Bonus if active and applicable
        if (result && activeBonus && activeBonus.enabled) {
            // Check if bonus is expired
            const now = new Date();
            const endDate = activeBonus.endDate ? new Date(activeBonus.endDate) : null;
            const startDate = activeBonus.startDate ? new Date(activeBonus.startDate) : null;
            
            // Reset time part for comparison
            now.setHours(0, 0, 0, 0);
            if (endDate) endDate.setHours(23, 59, 59, 999);
            if (startDate) startDate.setHours(0, 0, 0, 0);
            
            if ((!endDate || endDate >= now) && (!startDate || startDate <= now)) {
                // Check if category matches (or if bonus is for all categories)
                if (activeBonus.category === 'All' || activeBonus.category === currentCategory) {
                    const originalStars = result.starsEarned;
                    const bonusMultiplier = activeBonus.multiplier || 1;
                    const newStars = Math.round(originalStars * bonusMultiplier);
                    
                    if (newStars !== originalStars) {
                        result.starsEarned = newStars;
                        result.hasBonus = true;
                        result.originalStars = originalStars;
                        result.bonusDescription = activeBonus.description;
                    }
                }
            }
        }

        return result;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        let { bilag, category, service } = formData;

        if (category === 'Forsikring') {
            service = getForsikringService(forsikringAmount, insuranceType === 'Recurring');
        }

        if (!staffId || !bilag || !category || !service) {
            showError('Manglende informasjon', 'Vennligst fyll ut alle felter.');
            setLoading(false);
            return;
        }

        // Calculate stars - for recurring, use direct calculation; otherwise use multiplier logic
        let starsToAdd = 0;
        let bonusMetadata = {};

        if (category === 'Forsikring' && insuranceType === 'Recurring') {
            starsToAdd = getRecurringForsikringStars(forsikringAmount);
            
            // Apply bonus for recurring if active
            if (activeBonus && activeBonus.enabled) {
                const now = new Date();
                const endDate = activeBonus.endDate ? new Date(activeBonus.endDate) : null;
                const startDate = activeBonus.startDate ? new Date(activeBonus.startDate) : null;
                
                // Reset time part for comparison
                now.setHours(0, 0, 0, 0);
                if (endDate) endDate.setHours(23, 59, 59, 999);
                if (startDate) startDate.setHours(0, 0, 0, 0);
                
                if ((!endDate || endDate >= now) && (!startDate || startDate <= now)) {
                    if (activeBonus.category === 'All' || activeBonus.category === category) {
                        const originalStars = starsToAdd;
                        const bonusMultiplier = activeBonus.multiplier || 1;
                        starsToAdd = Math.round(originalStars * bonusMultiplier);
                        
                        if (starsToAdd !== originalStars) {
                            bonusMetadata = {
                                bonusApplied: true,
                                bonusMultiplier: bonusMultiplier,
                                originalStars: originalStars,
                                bonusDescription: activeBonus.description
                            };
                        }
                    }
                }
            }
        } else {
            // Pass the calculated service to ensure we use the latest value
            const multiplierInfo = getMultiplierProgress(service, category);
            starsToAdd = multiplierInfo ? multiplierInfo.starsEarned : 0;
            
            if (multiplierInfo && multiplierInfo.hasBonus) {
                bonusMetadata = {
                    bonusApplied: true,
                    bonusMultiplier: activeBonus.multiplier,
                    originalStars: multiplierInfo.originalStars,
                    bonusDescription: activeBonus.description
                };
            }
        }

        if (starsToAdd === undefined || starsToAdd === null || isNaN(starsToAdd)) {
            showError('Feil', 'Kunne ikke beregne stjerner for denne tjenesten. Kontakt administrator.');
            setLoading(false);
            return;
        }

        try {
            const isRecurringInsurance = category === 'Forsikring' && insuranceType === 'Recurring';

            // Auto-approve for moderators and admins
            if (userRole === 'moderator' || userRole === 'admin') {
                if (isRecurringInsurance) {
                    await addDoc(collection(db, 'sales'), {
                        staffId,
                        staffName,
                        bilag,
                        category,
                        service,
                        stars: starsToAdd,
                        timestamp: serverTimestamp(),
                        approvedBy: 'auto-approved',
                        forsikringAmount: parseFloat(forsikringAmount),
                        insuranceType: 'Recurring',
                        ...bonusMetadata
                    });

                    const staffRef = doc(db, 'staff', staffId);
                    await updateDoc(staffRef, { stars: increment(starsToAdd) });
                    showSuccess('Gjentakende forsikring registrert', `Bilag ${bilag} er registrert som gjentakende.`);
                } else {
                    await addDoc(collection(db, 'sales'), {
                        staffId,
                        staffName,
                        bilag,
                        category,
                        service,
                        stars: starsToAdd,
                        timestamp: serverTimestamp(),
                        approvedBy: 'auto-approved',
                        ...(category === 'Forsikring' && { 
                            forsikringAmount: parseFloat(forsikringAmount),
                            insuranceType: 'One-time'
                        }),
                        ...bonusMetadata
                    });

                    const staffRef = doc(db, 'staff', staffId);
                    await updateDoc(staffRef, { stars: increment(starsToAdd) });
                    showSuccess('Bilag registrert', `Bilag ${bilag} er automatisk godkjent og lagt til for ${staffName}!`);
                }
            } else {
                // For regular staff, create pending request
                const requestData = {
                    staffId,
                    staffName,
                    bilag,
                    category,
                    service,
                    stars: starsToAdd,
                    status: 'pending',
                    requestedAt: serverTimestamp(),
                    ...(category === 'Forsikring' && { 
                        forsikringAmount: parseFloat(forsikringAmount),
                        insuranceType: insuranceType
                    }),
                    ...bonusMetadata
                };

                if (isRecurringInsurance) {
                    requestData.type = 'Recurring';
                }

                await addDoc(collection(db, 'bilagRequests'), requestData);
                showSuccess('Forespørsel sendt', `Forespørsel om bilag ${bilag} er sendt til godkjenning!`);
            }

            setFormData({ bilag: '', category: '', service: '' });
            setForsikringAmount('');
            setInsuranceType('One-time');
            onClose();

        } catch (error) {
            console.error("Error submitting bilag request:", error);
            showError('Feil', 'Kunne ikke sende forespørsel. Prøv igjen.');
        } finally {
            setLoading(false);
        }
    };

    const multiplierInfo = getMultiplierProgress();

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-2 sm:p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-xl w-full max-w-sm sm:max-w-lg border-2 border-[#009A44] shadow-xl flex flex-col max-h-[95vh] sm:max-h-[90vh]"
                        >
                            <header className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                                        {userRole === 'moderator' || userRole === 'admin'
                                            ? 'Registrer Bilag'
                                            : 'Send inn Bilag for Godkjenning'
                                        }
                                    </h3>
                                    <p className="text-sm text-gray-600">For: <span className="font-semibold text-[#009A44] truncate">{staffName}</span></p>
                                </div>
                                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors p-1 -m-1 flex-shrink-0"><X size={20} className="sm:w-6 sm:h-6"/></button>
                            </header>

                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
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
                                            setInsuranceType('One-time');
                                        }} className="w-full pl-10 pr-3 py-3 appearance-none bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#009A44] outline-none transition-all">
                                            <option value="">Velg kategori...</option>
                                            {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                    </div>

                                    {formData.category === 'Forsikring' ? (
                                        <>
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
                                            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-300 rounded-lg">
                                                <Repeat className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <label className="text-sm font-medium text-gray-700 mb-1 block">Type forsikring:</label>
                                                    <div className="flex items-center gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="insuranceType"
                                                                value="One-time"
                                                                checked={insuranceType === 'One-time'}
                                                                onChange={e => setInsuranceType(e.target.value)}
                                                                className="w-4 h-4 text-[#009A44] focus:ring-[#009A44]"
                                                            />
                                                            <span className="text-sm text-gray-700">Engang</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="insuranceType"
                                                                value="Recurring"
                                                                checked={insuranceType === 'Recurring'}
                                                                onChange={e => setInsuranceType(e.target.value)}
                                                                className="w-4 h-4 text-[#009A44] focus:ring-[#009A44]"
                                                            />
                                                            <span className="text-sm text-gray-700">Gjentakende</span>
                                                        </label>
                                                    </div>
                                                    {insuranceType === 'Recurring' && forsikringAmount && (
                                                        <p className="text-xs text-blue-600 mt-2">
                                                            {forsikringAmount < 100 && '2 stjerner • '}
                                                            {forsikringAmount >= 100 && forsikringAmount <= 299 && '3 stjerner • '}
                                                            {forsikringAmount >= 300 && '4 stjerner • '}
                                                            Gis kun én gang
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    ) : formData.category && serviceCategories[formData.category] && (
                                        <div className="relative">
                                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                            <select required value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} className="w-full pl-10 pr-3 py-3 appearance-none bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#009A44] outline-none transition-all">
                                                <option value="">Velg tjeneste...</option>
                                                {Object.keys(serviceCategories[formData.category] || {}).map(item => <option key={item} value={item}>{item}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {multiplierInfo && (
                                        <div className="space-y-2">
                                            {multiplierInfo.hasBonus && (
                                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start gap-3">
                                                    <div className="p-1 bg-purple-100 rounded text-purple-600 mt-0.5">
                                                        <Zap size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-purple-900">Bonus aktiv!</p>
                                                        <p className="text-xs text-purple-700">{multiplierInfo.bonusDescription}</p>
                                                        <p className="text-xs text-purple-600 mt-1">
                                                            Originalt: {multiplierInfo.originalStars} stjerner → <span className="font-bold">Nå: {multiplierInfo.starsEarned} stjerner</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            
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
                                                        <span className={`font-bold flex items-center gap-1 ${multiplierInfo.hasBonus ? 'text-purple-600' : 'text-[#009A44]'}`}>
                                                            +{multiplierInfo.starsEarned} <Star size={14} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <footer className="flex flex-col sm:flex-row justify-between items-center gap-3 p-4 sm:p-6 bg-gray-50 rounded-b-xl border-t border-gray-200 mt-auto">
                                    <div className="flex items-center gap-2 text-base sm:text-lg font-bold">
                                        <Star className={multiplierInfo?.hasBonus ? "text-purple-600" : "text-[#009A44]"} />
                                        <span className="text-gray-900">{multiplierInfo?.starsEarned || 0}</span>
                                        <span className="text-gray-600 text-sm font-normal">potensielle stjerner</span>
                                    </div>
                                    <button type="submit" disabled={loading} className="w-full sm:w-auto px-6 py-3 bg-[#009A44] text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                                        {loading ? 'Sender...' : (userRole === 'moderator' || userRole === 'admin' ? 'Registrer Bilag' : 'Send til Godkjenning')}
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
                showCancel={notification?.showCancel}
                cancelText={notification?.cancelText}
                onConfirm={notification?.onConfirm}
            />
        </>
    );
}

export default AddSaleModal;
