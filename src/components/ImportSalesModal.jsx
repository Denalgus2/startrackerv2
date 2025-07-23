import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { serviceCategories } from '../data/services';
import { X, Plus, Trash2, Star, User } from 'lucide-react';
import { useNotification } from '../hooks/useNotification';
import NotificationModal from './NotificationModal';

function ImportSalesModal({ isOpen, onClose, staffList }) {
    const { notification, showSuccess, showError, hideNotification } = useNotification();
    const [selectedStaff, setSelectedStaff] = useState('');
    const [bilagEntries, setBilagEntries] = useState([]);
    const [currentBilag, setCurrentBilag] = useState({ bilag: '', category: '', service: '' });
    const [forsikringAmount, setForsikringAmount] = useState('');
    const [loading, setLoading] = useState(false);

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

    // Calculate total stars including multipliers
    const calculateStars = () => {
        const serviceCount = {};

        // Count how many of each service we have
        bilagEntries.forEach(entry => {
            const key = `${entry.category}:${entry.service}`;
            serviceCount[key] = (serviceCount[key] || 0) + 1;
        });

        let totalStars = 0;
        const multiplierProgress = {};

        // Calculate stars based on multipliers
        Object.entries(serviceCount).forEach(([key, count]) => {
            const [category, service] = key.split(':');
            const baseStars = serviceCategories[category][service];

            // Check if service has multiplier (x2, x3, etc.)
            if (service.includes(' x2')) {
                const completeSets = Math.floor(count / 2);
                totalStars += completeSets * baseStars;
                multiplierProgress[key] = { current: count, needed: 2, complete: completeSets, service };
            } else if (service.includes(' x3')) {
                const completeSets = Math.floor(count / 3);
                totalStars += completeSets * baseStars;
                multiplierProgress[key] = { current: count, needed: 3, complete: completeSets, service };
            } else {
                totalStars += count * baseStars;
            }
        });

        return { totalStars, multiplierProgress, serviceCount };
    };

    const addBilagEntry = () => {
        if (!currentBilag.bilag || !currentBilag.category) return;

        let finalService = currentBilag.service;

        // For forsikring, use the amount to determine service
        if (currentBilag.category === 'Forsikring') {
            if (!forsikringAmount || parseFloat(forsikringAmount) <= 0) {
                showError('Ugyldig beløp', 'Vennligst skriv inn et gyldig forsikringsbeløp');
                return;
            }
            finalService = getForsikringService(forsikringAmount);
        }

        if (!finalService) return;

        const entry = {
            ...currentBilag,
            service: finalService,
            id: Date.now()
        };

        // Add display amount for forsikring
        if (currentBilag.category === 'Forsikring') {
            entry.displayAmount = `${forsikringAmount}kr`;
        }

        setBilagEntries([...bilagEntries, entry]);
        setCurrentBilag({ bilag: '', category: '', service: '' });
        setForsikringAmount('');
    };

    const removeBilagEntry = (id) => {
        setBilagEntries(bilagEntries.filter(entry => entry.id !== id));
    };

    const handleImport = async () => {
        if (!selectedStaff || bilagEntries.length === 0) return;

        setLoading(true);
        try {
            const staffMember = staffList.find(s => s.id === selectedStaff);
            const { totalStars } = calculateStars(); // Destructure to get the actual number

            // Add each bilag as a sale record
            for (const entry of bilagEntries) {
                // Calculate stars for this individual sale based on multiplier logic
                let starsForThisSale = 0;
                const service = entry.service;

                // Check if this is a multiplier service
                if (service.includes(' x2') || service.includes(' x3')) {
                    // For multiplier services, individual sales get 0 stars
                    // Stars are only awarded when the multiplier threshold is reached
                    starsForThisSale = 0;
                } else {
                    // Non-multiplier services get their full star value
                    starsForThisSale = serviceCategories[entry.category][entry.service];
                }

                await addDoc(collection(db, 'sales'), {
                    staffId: selectedStaff,
                    staffName: staffMember.name,
                    bilag: entry.bilag,
                    category: entry.category,
                    service: entry.service,
                    stars: starsForThisSale,
                    timestamp: serverTimestamp()
                });
            }

            // Update staff total stars - now using the correct totalStars value
            if (totalStars > 0) {
                const staffRef = doc(db, 'staff', selectedStaff);
                await updateDoc(staffRef, { stars: increment(totalStars) });
            }

            // Reset form
            setSelectedStaff('');
            setBilagEntries([]);
            setCurrentBilag({ bilag: '', category: '', service: '' });
            onClose();

            showSuccess('Import fullført', `${bilagEntries.length} bilag er importert for ${staffMember.name}. Totalt ${totalStars} stjerner tildelt.`);

        } catch (error) {
            console.error('Import error:', error);
            showError('Import feil', 'Feil ved import: ' + error.message);
        }
        setLoading(false);
    };

    const resetForm = () => {
        setSelectedStaff('');
        setBilagEntries([]);
        setCurrentBilag({ bilag: '', category: '', service: '' });
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
                        style={{ isolation: 'isolate' }}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-xl w-full max-w-3xl border-2 border-[#009A44] shadow-xl relative z-10 flex flex-col max-h-[85vh]"
                            style={{ backgroundColor: '#ffffff' }}
                        >
                            <header className="flex justify-between items-center p-6 border-b border-gray-200">
                                <h3 className="text-xl font-bold text-gray-900">Manuell Salgsimport</h3>
                                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                                    <X size={24} />
                                </button>
                            </header>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Staff Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <User size={16} className="inline mr-2" />
                                        Velg ansatt
                                    </label>
                                    <select
                                        value={selectedStaff}
                                        onChange={(e) => setSelectedStaff(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009A44] outline-none"
                                    >
                                        <option value="">Velg en ansatt...</option>
                                        {staffList.map(staff => (
                                            <option key={staff.id} value={staff.id}>{staff.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Add New Bilag Section */}
                                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <h4 className="font-semibold text-gray-900 mb-4">Legg til nytt bilag</h4>

                                    {/* Multiplier explanation */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                        <p className="text-sm text-blue-800 font-medium mb-1">💡 Multiplier-info:</p>
                                        <p className="text-xs text-blue-700">
                                            Tjenester med "x2" eller "x3" må <strong>stackes</strong> for å gi stjerner.
                                            F.eks. "Teletime15 x3" trenger <strong>3 salg</strong> før du får 1 stjerne.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <input
                                            type="text"
                                            placeholder="Bilagsnummer"
                                            value={currentBilag.bilag}
                                            onChange={(e) => setCurrentBilag({...currentBilag, bilag: e.target.value})}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009A44] outline-none"
                                        />
                                        <select
                                            value={currentBilag.category}
                                            onChange={(e) => {
                                                setCurrentBilag({...currentBilag, category: e.target.value, service: ''});
                                                setForsikringAmount('');
                                            }}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009A44] outline-none"
                                        >
                                            <option value="">Velg kategori...</option>
                                            {Object.keys(serviceCategories).map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>

                                        {/* Conditional third column based on category */}
                                        {currentBilag.category === 'Forsikring' ? (
                                            <input
                                                type="number"
                                                placeholder="Forsikringsbeløp (kr)"
                                                value={forsikringAmount}
                                                onChange={(e) => setForsikringAmount(e.target.value)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009A44] outline-none"
                                                min="0"
                                                step="1"
                                            />
                                        ) : (
                                            <select
                                                value={currentBilag.service}
                                                onChange={(e) => setCurrentBilag({...currentBilag, service: e.target.value})}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009A44] outline-none"
                                                disabled={!currentBilag.category}
                                            >
                                                <option value="">Velg tjeneste...</option>
                                                {currentBilag.category && Object.keys(serviceCategories[currentBilag.category]).map(service => (
                                                    <option key={service} value={service}>
                                                        {service}
                                                        {service.includes(' x2') && ' (Trenger 2 for stjerne)'}
                                                        {service.includes(' x3') && ' (Trenger 3 for stjerne)'}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* Preview for forsikring */}
                                    {currentBilag.category === 'Forsikring' && forsikringAmount && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                            <p className="text-sm text-blue-800">
                                                <strong>{forsikringAmount}kr</strong> forsikring → kategoriseres som:
                                                <strong className="ml-1">{getForsikringService(forsikringAmount)}</strong>
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={addBilagEntry}
                                        disabled={
                                            !currentBilag.bilag ||
                                            !currentBilag.category ||
                                            (currentBilag.category === 'Forsikring' ? !forsikringAmount : !currentBilag.service)
                                        }
                                        className="flex items-center gap-2 px-4 py-2 bg-[#009A44] text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Plus size={16} />
                                        Legg til bilag
                                    </button>
                                </div>

                                {/* Bilag List */}
                                {bilagEntries.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-4">Lagt til bilag ({bilagEntries.length})</h4>
                                        <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                                            {bilagEntries.map((entry) => (
                                                <div key={entry.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                                                    <div className="flex-1">
                                                        <span className="font-medium">{entry.bilag}</span>
                                                        <span className="text-gray-500 mx-2">•</span>
                                                        <span className="text-sm text-gray-600">
                                                            {entry.category} - {entry.service}
                                                            {entry.displayAmount && (
                                                                <span className="ml-1 text-blue-600 font-medium">
                                                                    ({entry.displayAmount})
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-[#009A44] font-medium">
                                                            {serviceCategories[entry.category][entry.service]} ⭐
                                                        </span>
                                                        <button
                                                            onClick={() => removeBilagEntry(entry.id)}
                                                            className="text-red-500 hover:text-red-700 p-1"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Stars Summary */}
                                {bilagEntries.length > 0 && (
                                    <div className="bg-[#009A44]/10 border border-[#009A44] rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-semibold text-gray-900">Total stjerner:</span>
                                            <div className="flex items-center gap-2 text-lg font-bold text-[#009A44]">
                                                <Star size={20} />
                                                {calculateStars().totalStars}
                                            </div>
                                        </div>

                                        {/* Multiplier Progress */}
                                        {Object.keys(calculateStars().multiplierProgress).length > 0 && (
                                            <div className="border-t pt-3 mt-3">
                                                <p className="text-sm font-medium text-gray-700 mb-2">Multiplier progresjon:</p>
                                                <div className="space-y-2">
                                                    {Object.entries(calculateStars().multiplierProgress).map(([key, progress]) => (
                                                        <div key={key} className="flex items-center justify-between text-sm">
                                                            <span className="text-gray-600">{progress.service}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                    progress.current >= progress.needed 
                                                                        ? 'bg-green-100 text-green-800' 
                                                                        : 'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                    {progress.current}/{progress.needed}
                                                                </span>
                                                                {progress.complete > 0 && (
                                                                    <span className="text-[#009A44] font-medium">
                                                                        = {progress.complete} ⭐
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <footer className="flex justify-between items-center p-6 border-t border-gray-200">
                                <button
                                    onClick={resetForm}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Nullstill alt
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                    >
                                        Avbryt
                                    </button>
                                    <button
                                        onClick={handleImport}
                                        disabled={!selectedStaff || bilagEntries.length === 0 || loading}
                                        className="px-6 py-2 bg-[#009A44] text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Importerer...' : `Importer ${bilagEntries.length} bilag`}
                                    </button>
                                </div>
                            </footer>
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

export default ImportSalesModal;
