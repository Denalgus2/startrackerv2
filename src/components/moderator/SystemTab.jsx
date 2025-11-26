import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Save } from 'lucide-react';
import { collection, query, where, getDocs, writeBatch, doc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNotification } from '../../hooks/useNotification';

function SystemTab({ systemSettings, updateSystemSettings, serviceCategories }) {
    const { showSuccess, showError, showConfirmation } = useNotification();
    const [bonusData, setBonusData] = useState({
        enabled: false,
        category: 'Forsikring',
        multiplier: 2,
        description: 'Dobbel stjerne-uke!',
        startDate: '',
        endDate: ''
    });
    const [isApplyingRetroactive, setIsApplyingRetroactive] = useState(false);

    useEffect(() => {
        if (systemSettings?.activeBonus) {
            setBonusData({
                enabled: systemSettings.activeBonus.enabled || false,
                category: systemSettings.activeBonus.category || 'Forsikring',
                multiplier: systemSettings.activeBonus.multiplier || 2,
                description: systemSettings.activeBonus.description || '',
                startDate: systemSettings.activeBonus.startDate || '',
                endDate: systemSettings.activeBonus.endDate || ''
            });
        }
    }, [systemSettings]);

    const handleSaveBonus = () => {
        updateSystemSettings({
            activeBonus: bonusData
        });

        // Check if start date is in the past and offer retroactive update
        if (bonusData.enabled && bonusData.startDate) {
            const start = new Date(bonusData.startDate);
            const now = new Date();
            // Reset time part for comparison
            start.setHours(0, 0, 0, 0);
            now.setHours(0, 0, 0, 0);

            if (start <= now) {
                showConfirmation(
                    'Tilbakevirkende kraft?',
                    'Startdatoen er i fortiden. Vil du oppdatere eksisterende salg i denne perioden med bonusen?',
                    () => applyRetroactiveBonus()
                );
            }
        }
    };

    const applyRetroactiveBonus = async () => {
        if (!bonusData.enabled || !bonusData.startDate) return;
        setIsApplyingRetroactive(true);

        try {
            const startDate = new Date(bonusData.startDate);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = bonusData.endDate ? new Date(bonusData.endDate) : new Date();
            endDate.setHours(23, 59, 59, 999);

            // Query sales in range
            const salesRef = collection(db, 'sales');
            const q = query(
                salesRef, 
                where('timestamp', '>=', startDate),
                where('timestamp', '<=', endDate)
            );

            const snapshot = await getDocs(q);
            let updatedCount = 0;
            const batch = writeBatch(db);
            const staffUpdates = {}; // Map of staffId -> star difference

            snapshot.docs.forEach(doc => {
                const sale = doc.data();
                
                // Check category match
                if (bonusData.category !== 'All' && sale.category !== bonusData.category) return;
                
                // Check if bonus already applied (avoid double dipping)
                if (sale.bonusApplied) return;

                // Calculate new stars
                const originalStars = sale.stars;
                // If it was a recurring insurance, the stars are stored directly.
                // If it was a normal sale, stars are also stored directly.
                // We just multiply the current stars.
                // NOTE: This assumes the current stars are the "base" stars. 
                // If a previous bonus was applied, we might be multiplying on top of it, 
                // but we checked !sale.bonusApplied above.
                
                const newStars = Math.round(originalStars * bonusData.multiplier);
                const difference = newStars - originalStars;

                if (difference !== 0) {
                    // Update sale document
                    const saleRef = doc.ref;
                    batch.update(saleRef, {
                        stars: newStars,
                        bonusApplied: true,
                        bonusMultiplier: bonusData.multiplier,
                        originalStars: originalStars,
                        bonusDescription: bonusData.description + ' (Etterregistrert)'
                    });

                    // Track staff updates
                    if (!staffUpdates[sale.staffId]) {
                        staffUpdates[sale.staffId] = 0;
                    }
                    staffUpdates[sale.staffId] += difference;
                    updatedCount++;
                }
            });

            // Commit batch updates for sales
            if (updatedCount > 0) {
                await batch.commit();

                // Update staff totals
                // We can't do this in the same batch easily if there are many staff, 
                // but for now let's do individual updates or a new batch
                const staffBatch = writeBatch(db);
                for (const [staffId, diff] of Object.entries(staffUpdates)) {
                    const staffRef = doc(db, 'staff', staffId);
                    staffBatch.update(staffRef, { stars: increment(diff) });
                }
                await staffBatch.commit();

                showSuccess('Oppdatering fullført', `${updatedCount} salg ble oppdatert med bonus.`);
            } else {
                showSuccess('Ingen endringer', 'Ingen salg trengte oppdatering.');
            }

        } catch (error) {
            console.error('Error applying retroactive bonus:', error);
            showError('Feil', 'Kunne ikke oppdatere eksisterende salg: ' + error.message);
        } finally {
            setIsApplyingRetroactive(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <h2 className="text-xl font-semibold text-gray-900">Systeminnstillinger</h2>

            {/* Active Bonus Configuration */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Zap className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-purple-900">Midlertidig Bonus</h3>
                        <p className="text-purple-700 text-sm">Aktiver ekstra stjerner for en periode</p>
                    </div>
                </div>

                <div className="space-y-4 bg-white p-4 rounded-lg border border-purple-100">
                    <div className="flex items-center justify-between">
                        <label className="font-medium text-gray-700">Status</label>
                        <div className="flex items-center gap-3">
                            <span className={`text-sm font-medium ${bonusData.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                                {bonusData.enabled ? 'AKTIV' : 'INAKTIV'}
                            </span>
                            <button
                                onClick={() => setBonusData({ ...bonusData, enabled: !bonusData.enabled })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    bonusData.enabled ? 'bg-purple-600' : 'bg-gray-200'
                                }`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    bonusData.enabled ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                            <select
                                value={bonusData.category}
                                onChange={(e) => setBonusData({ ...bonusData, category: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                disabled={!bonusData.enabled}
                            >
                                <option value="All">Alle kategorier</option>
                                {Object.keys(serviceCategories).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Multiplier</label>
                            <select
                                value={bonusData.multiplier}
                                onChange={(e) => setBonusData({ ...bonusData, multiplier: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                disabled={!bonusData.enabled}
                            >
                                <option value="1.5">1.5x Stjerner</option>
                                <option value="2">2x Stjerner (Dobbel)</option>
                                <option value="3">3x Stjerner (Trippel)</option>
                                <option value="4">4x Stjerner</option>
                                <option value="5">5x Stjerner</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse (vises til ansatte)</label>
                            <input
                                type="text"
                                value={bonusData.description}
                                onChange={(e) => setBonusData({ ...bonusData, description: e.target.value })}
                                placeholder="F.eks. Dobbel stjerne-uke på forsikring!"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                disabled={!bonusData.enabled}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Startdato</label>
                            <input
                                type="date"
                                value={bonusData.startDate}
                                onChange={(e) => setBonusData({ ...bonusData, startDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                disabled={!bonusData.enabled}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Utløpsdato (valgfritt)</label>
                            <input
                                type="date"
                                value={bonusData.endDate}
                                onChange={(e) => setBonusData({ ...bonusData, endDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                disabled={!bonusData.enabled}
                            />
                        </div>
                        
                        <div className="md:col-span-2">
                            <p className="text-xs text-gray-500">
                                Bonuser er aktive mellom startdato og utløpsdato. Hvis startdato er i fortiden, kan du velge å oppdatere tidligere salg når du lagrer.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2 gap-3">
                        {bonusData.enabled && bonusData.startDate && (
                            <button
                                onClick={applyRetroactiveBonus}
                                disabled={isApplyingRetroactive}
                                className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            >
                                {isApplyingRetroactive ? 'Oppdaterer...' : 'Oppdater eksisterende salg nå'}
                            </button>
                        )}
                        <button
                            onClick={handleSaveBonus}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            <Save size={16} />
                            Lagre Bonusinnstillinger
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default SystemTab;
