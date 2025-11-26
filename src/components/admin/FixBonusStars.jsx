import { useState } from 'react';
import { collection, getDocs, doc, writeBatch, increment, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { serviceCategories } from '../../data/services';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export default function FixBonusStars() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const runFix = async () => {
        setLoading(true);
        setResult(null);
        try {
            // 1. Get active bonus configuration
            const systemDoc = await getDoc(doc(db, 'config', 'system'));
            const activeBonus = systemDoc.exists() ? systemDoc.data().activeBonus : null;

            if (!activeBonus || !activeBonus.enabled) {
                setResult({ success: false, message: 'Ingen aktiv bonus funnet i systemet. Kan ikke rekalkulere bonus-baserte stjerner.' });
                setLoading(false);
                return;
            }

            // 2. Get all sales
            const salesSnapshot = await getDocs(collection(db, 'sales'));
            const sales = salesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // 3. Group by staff
            const staffSales = {};
            sales.forEach(sale => {
                if (!staffSales[sale.staffId]) staffSales[sale.staffId] = [];
                staffSales[sale.staffId].push(sale);
            });

            const batch = writeBatch(db);
            let updateCount = 0;
            const staffDiffs = {};
            const details = [];

            // 4. Process each staff member
            for (const staffId in staffSales) {
                const memberSales = staffSales[staffId];
                
                // Sort by timestamp to ensure correct sequence for multipliers
                memberSales.sort((a, b) => {
                    const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
                    const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
                    return tA - tB;
                });

                // Track progress for multipliers
                const serviceCounts = {};

                for (const sale of memberSales) {
                    // Check if sale falls within bonus period
                    const saleDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp);
                    const bonusStart = activeBonus.startDate ? new Date(activeBonus.startDate) : null;
                    const bonusEnd = activeBonus.endDate ? new Date(activeBonus.endDate) : null;
                    
                    if (bonusStart) bonusStart.setHours(0,0,0,0);
                    if (bonusEnd) bonusEnd.setHours(23,59,59,999);

                    const isBonusActive = (!bonusStart || saleDate >= bonusStart) && (!bonusEnd || saleDate <= bonusEnd);
                    const isBonusCategory = activeBonus.category === 'All' || activeBonus.category === sale.category;
                    
                    const bonusMultiplier = (isBonusActive && isBonusCategory) ? (activeBonus.multiplier || 1) : 1;

                    // Calculate expected stars
                    let expectedStars = sale.stars; // Default to current if no change logic applies
                    let shouldCheck = false;

                    // Logic for Multipliers (The main fix)
                    if (sale.service && (sale.service.includes(' x2') || sale.service.includes(' x3') || sale.service.includes(' x4') || sale.service.includes(' x5'))) {
                        shouldCheck = true;
                        const key = `${sale.category}:${sale.service}`;
                        const currentCount = serviceCounts[key] || 0;
                        
                        let multiplier = 1;
                        if (sale.service.includes(' x2')) multiplier = 2;
                        else if (sale.service.includes(' x3')) multiplier = 3;
                        else if (sale.service.includes(' x4')) multiplier = 4;
                        else if (sale.service.includes(' x5')) multiplier = 5;

                        const afterAdding = currentCount + 1;
                        
                        // NEW LOGIC: Apply bonus to the progress
                        const starsEarned = Math.floor((afterAdding * bonusMultiplier) / multiplier) - Math.floor((currentCount * bonusMultiplier) / multiplier);
                        
                        // Get base stars for service
                        let baseStars = 1; // Default
                        if (serviceCategories[sale.category] && serviceCategories[sale.category][sale.service]) {
                             baseStars = serviceCategories[sale.category][sale.service];
                        }
                        
                        expectedStars = starsEarned * baseStars;
                        
                        // Update count
                        serviceCounts[key] = afterAdding;
                    } 
                    // Logic for Recurring Forsikring (if needed)
                    else if (sale.category === 'Forsikring' && sale.insuranceType === 'Recurring') {
                        // Assuming recurring logic was already correct (stars * bonus)
                        // But if we want to be sure, we can re-calculate if we have the amount.
                        // For now, let's trust the existing value unless it's clearly wrong (e.g. 0 when it should be >0)
                        // The user's issue was mainly about the multiplier logic.
                    }
                    else {
                        // Standard service
                        // If we want to be thorough, we could re-calculate base * bonus here too.
                        // But let's stick to the multiplier fix to avoid unintended side effects.
                    }

                    // Compare and queue update if needed
                    if (shouldCheck && sale.stars !== expectedStars) {
                        const diff = expectedStars - sale.stars;
                        
                        // Update sale
                        const saleRef = doc(db, 'sales', sale.id);
                        batch.update(saleRef, { stars: expectedStars });
                        
                        // Track staff total diff
                        staffDiffs[staffId] = (staffDiffs[staffId] || 0) + diff;
                        
                        details.push({
                            id: sale.id,
                            staffName: sale.staffName,
                            service: sale.service,
                            oldStars: sale.stars,
                            newStars: expectedStars,
                            diff
                        });
                        
                        updateCount++;
                    }
                }
            }

            // Update staff totals
            for (const staffId in staffDiffs) {
                if (staffDiffs[staffId] !== 0) {
                    const staffRef = doc(db, 'staff', staffId);
                    batch.update(staffRef, { stars: increment(staffDiffs[staffId]) });
                }
            }

            if (updateCount > 0) {
                await batch.commit();
                setResult({ 
                    success: true, 
                    message: `Rettet ${updateCount} salg.`, 
                    details,
                    staffDiffs 
                });
            } else {
                setResult({ success: true, message: 'Ingen feil funnet med nåværende bonus-innstillinger.' });
            }

        } catch (error) {
            console.error(error);
            setResult({ success: false, message: 'Feil: ' + error.message });
        }
        setLoading(false);
    };

    return (
        <div className="bg-surface rounded-xl border border-border-color p-4 sm:p-6 shadow-sm mt-6">
            <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
                <RefreshCw size={20} />
                Rett Bonus/Multiplier Stjerner
            </h3>
            <p className="text-sm text-on-surface-secondary mb-4">
                Dette skriptet rekalkulerer stjerner for salg med "x2"/"x3" osv. basert på <strong>nåværende aktiv bonus</strong>. 
                Bruk dette hvis bonus-logikken var feil da salgene ble registrert.
            </p>
            
            <button
                onClick={runFix}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
                {loading ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                Kjør Fix Script
            </button>

            {result && (
                <div className={`mt-4 p-4 rounded-lg ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                    <div className="flex items-center gap-2 font-semibold">
                        {result.success ? <CheckCircle className="text-green-600" size={20} /> : <AlertCircle className="text-red-600" size={20} />}
                        <span className={result.success ? 'text-green-800' : 'text-red-800'}>{result.message}</span>
                    </div>
                    
                    {result.details && result.details.length > 0 && (
                        <div className="mt-3 max-h-60 overflow-y-auto text-sm">
                            <p className="font-medium mb-2">Endringer:</p>
                            {result.details.map((d, i) => (
                                <div key={i} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
                                    <span>{d.staffName} - {d.service}</span>
                                    <span className={d.diff > 0 ? 'text-green-600' : 'text-red-600'}>
                                        {d.oldStars} → {d.newStars} ({d.diff > 0 ? '+' : ''}{d.diff})
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
