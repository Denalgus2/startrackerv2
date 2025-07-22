import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where, getDocs, updateDoc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { MailPlus, Trash2, ShieldAlert, RefreshCw, AlertCircle } from 'lucide-react';
import { serviceCategories } from '../data/services';

function Admin() {
    const { currentUser } = useAuth();
    const [whitelist, setWhitelist] = useState([]);
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [correctionInProgress, setCorrectionInProgress] = useState(false);
    const [correctionResults, setCorrectionResults] = useState(null);

    useEffect(() => {
        // Only set up listener if user is admin
        if (currentUser?.email === 'denis.ale.gusev@gmail.com') {
            const unsub = onSnapshot(collection(db, 'whitelist'), (snapshot) => {
                setWhitelist(snapshot.docs.map(doc => doc.id));
                setLoading(false);
            }, (error) => {
                console.error('Firestore permission error:', error);
                setLoading(false);
                // Set empty whitelist if permission denied
                setWhitelist([]);
            });
            return () => unsub();
        } else {
            setLoading(false);
        }
    }, [currentUser]);

    // Hardcoded check for the admin user
    if (currentUser?.email !== 'denis.ale.gusev@gmail.com') {
        return (
            <div className="text-center p-10">
                <ShieldAlert className="mx-auto h-12 w-12 text-danger"/>
                <h2 className="mt-4 text-2xl font-bold">Ingen tilgang</h2>
                <p className="mt-2 text-on-surface-secondary">Du har ikke rettigheter til å se denne siden.</p>
            </div>
        );
    }

    const handleAddEmail = async (e) => {
        e.preventDefault();
        if (!newEmail) return;
        const emailToAdd = newEmail.toLowerCase();
        const whitelistRef = doc(db, 'whitelist', emailToAdd);
        await setDoc(whitelistRef, { addedAt: new Date() });
        setNewEmail('');
    };

    const handleDeleteEmail = async (email) => {
        if (window.confirm(`Er du sikker på at du vil fjerne ${email}?`)) {
            const whitelistRef = doc(db, 'whitelist', email);
            await deleteDoc(whitelistRef);
        }
    };

    const findAndFixKundelubbEntries = async () => {
        setCorrectionInProgress(true);
        setCorrectionResults(null);

        try {
            // Query all Kundeklubb sales
            const salesQuery = query(
                collection(db, 'sales'),
                where('category', '==', 'Kundeklubb')
            );

            const salesSnapshot = await getDocs(salesQuery);
            const incorrectEntries = [];
            const staffUpdates = {};

            // Check each Kundeklubb entry
            salesSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const service = data.service;
                const currentStars = data.stars;
                const correctStars = serviceCategories['Kundeklubb'][service];

                if (currentStars !== correctStars) {
                    const starDifference = correctStars - currentStars;
                    incorrectEntries.push({
                        id: doc.id,
                        staffId: data.staffId,
                        staffName: data.staffName,
                        service: service,
                        currentStars: currentStars,
                        correctStars: correctStars,
                        difference: starDifference,
                        data: data
                    });

                    // Track staff updates
                    if (!staffUpdates[data.staffId]) {
                        staffUpdates[data.staffId] = {
                            name: data.staffName,
                            totalDifference: 0
                        };
                    }
                    staffUpdates[data.staffId].totalDifference += starDifference;
                }
            });

            if (incorrectEntries.length === 0) {
                setCorrectionResults({
                    success: true,
                    message: 'Ingen feil funnet! Alle Kundeklubb-oppføringer har riktige stjerneverdier.',
                    correctedEntries: 0,
                    staffAffected: 0
                });
                setCorrectionInProgress(false);
                return;
            }

            // Create batch for updates
            const batch = writeBatch(db);

            // Update each incorrect sales entry
            incorrectEntries.forEach(entry => {
                const salesRef = doc(db, 'sales', entry.id);
                batch.update(salesRef, { stars: entry.correctStars });
            });

            // Update staff star totals
            Object.entries(staffUpdates).forEach(([staffId, update]) => {
                if (update.totalDifference !== 0) {
                    const staffRef = doc(db, 'staff', staffId);
                    batch.update(staffRef, {
                        stars: increment(update.totalDifference)
                    });
                }
            });

            // Execute batch
            await batch.commit();

            setCorrectionResults({
                success: true,
                message: 'Kundeklubb-oppføringer er rettet!',
                correctedEntries: incorrectEntries.length,
                staffAffected: Object.keys(staffUpdates).length,
                details: incorrectEntries,
                staffUpdates: staffUpdates
            });

        } catch (error) {
            console.error('Error correcting Kundeklubb entries:', error);
            setCorrectionResults({
                success: false,
                message: 'Feil under retting: ' + error.message,
                correctedEntries: 0,
                staffAffected: 0
            });
        }

        setCorrectionInProgress(false);
    };

    const handleLogout = () => {
        // Implement logout functionality
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <h2 className="text-3xl font-bold text-on-surface mb-6">Admin Panel</h2>

            {/* Kundeklubb Correction Tool */}
            <div className="bg-surface rounded-xl border border-border-color p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
                    <RefreshCw size={20} />
                    Rett Kundeklubb Stjerneverdier
                </h3>
                <p className="text-sm text-on-surface-secondary mb-4">
                    Dette verktøyet finner og retter alle Kundeklubb-oppføringer som har feil stjerneverdier
                    (f.eks. 60% = 2 stjerner i stedet for 3 stjerner).
                </p>

                <div className="flex gap-3 mb-4">
                    <button
                        onClick={findAndFixKundelubbEntries}
                        disabled={correctionInProgress}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-focus disabled:opacity-50"
                    >
                        {correctionInProgress ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                Retter...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={16} />
                                Finn og Rett Feil
                            </>
                        )}
                    </button>
                </div>

                {correctionResults && (
                    <div className={`p-4 rounded-lg ${correctionResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {correctionResults.success ? (
                                <div className="text-green-600">✅</div>
                            ) : (
                                <AlertCircle size={20} className="text-red-600" />
                            )}
                            <span className={`font-semibold ${correctionResults.success ? 'text-green-800' : 'text-red-800'}`}>
                                {correctionResults.message}
                            </span>
                        </div>

                        {correctionResults.success && correctionResults.correctedEntries > 0 && (
                            <div className="text-sm text-green-700 mt-2">
                                <p>📊 {correctionResults.correctedEntries} oppføringer rettet</p>
                                <p>👥 {correctionResults.staffAffected} ansatte påvirket</p>

                                {correctionResults.staffUpdates && (
                                    <div className="mt-3">
                                        <p className="font-medium">Stjerne-endringer per ansatt:</p>
                                        <div className="mt-1 space-y-1">
                                            {Object.entries(correctionResults.staffUpdates).map(([staffId, update]) => (
                                                <div key={staffId} className="text-xs">
                                                    • {update.name}: {update.totalDifference > 0 ? '+' : ''}{update.totalDifference} stjerner
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Email Whitelist Section */}
            <div className="bg-surface rounded-xl border border-border-color p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-on-surface mb-4">Legg til godkjent e-post</h3>
                <form onSubmit={handleAddEmail} className="flex gap-2">
                    <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="ny.ansatt@elkjop.no"
                        className="flex-grow p-2 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none"
                    />
                    <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-focus">
                        <MailPlus size={16}/> Legg til
                    </button>
                </form>
            </div>

            <div className="mt-8 bg-surface rounded-xl border border-border-color shadow-sm">
                <h3 className="text-lg font-semibold text-on-surface p-4 border-b border-border-color">Godkjente E-poster ({whitelist.length})</h3>
                {loading ? <p className="p-4">Laster...</p> : (
                    <ul className="divide-y divide-border-color">
                        {whitelist.map(email => (
                            <li key={email} className="flex justify-between items-center p-4">
                                <span className="text-on-surface-secondary">{email}</span>
                                <button onClick={() => handleDeleteEmail(email)} className="text-danger p-1 rounded-md hover:bg-danger/10">
                                    <Trash2 size={18}/>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default Admin;