import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Plus, Edit3, Trash2, Play, Pause, Award, Calendar, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../hooks/useNotification';
import { useServices } from '../hooks/useServices';
import { useAuth } from '../contexts/AuthContext';
import NotificationModal from '../components/NotificationModal';

function CompetitionsTab() {
    const { notification, showSuccess, showError, showConfirmation, hideNotification } = useNotification();
    const { serviceCategories } = useServices();
    const { currentUser, loading: authLoading } = useAuth();
    const [competitions, setCompetitions] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCompetition, setEditingCompetition] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Don't set up Firestore listeners until auth is ready and user is authenticated
        if (authLoading || !currentUser) {
            setLoading(false);
            return;
        }

        // Add a small delay to ensure auth token is fully ready
        const timer = setTimeout(() => {
            const competitionsRef = collection(db, 'competitions');
            let unsubscribe = null;

            try {
                unsubscribe = onSnapshot(competitionsRef,
                    (snapshot) => {
                        const competitionData = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));

                        // Sort in memory instead of in the query
                        competitionData.sort((a, b) => {
                            const aTime = a.createdAt?.toDate() || new Date(0);
                            const bTime = b.createdAt?.toDate() || new Date(0);
                            return bTime - aTime;
                        });

                        setCompetitions(competitionData);
                        setLoading(false);
                    },
                    (error) => {
                        console.error('Error listening to competitions:', error);
                        if (error.code === 'permission-denied') {
                            showError('Tilgangsfeil', 'Du har ikke tilgang til å se konkurranser. Kontakt administrator.');
                        } else if (error.code === 'unauthenticated') {
                            showError('Autentiseringsfeil', 'Du er ikke logget inn. Vennligst logg inn på nytt.');
                        } else {
                            showError('Feil', 'Kunne ikke laste konkurranser. Prøver å koble til på nytt...');
                            // Retry after 2 seconds
                            setTimeout(() => {
                                if (currentUser && !authLoading) {
                                    window.location.reload();
                                }
                            }, 2000);
                        }
                        setLoading(false);
                    }
                );
            } catch (error) {
                console.error('Error setting up competitions listener:', error);
                showError('Feil', 'Kunne ikke koble til database.');
                setLoading(false);
            }

            return () => {
                if (unsubscribe) {
                    unsubscribe();
                }
            };
        }, 100); // Small delay to ensure auth is ready

        return () => {
            clearTimeout(timer);
        };
    }, [showError, currentUser, authLoading]);

    const deleteCompetition = async (id, title) => {
        showConfirmation(
            'Slett konkurranse',
            `Er du sikker på at du vil slette konkurransen "${title}"? Dette kan ikke angres.`,
            async () => {
                try {
                    await deleteDoc(doc(db, 'competitions', id));
                    showSuccess('Konkurranse slettet', 'Konkurransen er slettet.');
                } catch (error) {
                    console.error('Error deleting competition:', error);
                    showError('Feil', 'Kunne ikke slette konkurransen.');
                }
            }
        );
    };

    const toggleCompetitionStatus = async (competition) => {
        try {
            const newStatus = competition.status === 'active' ? 'paused' : 'active';
            await updateDoc(doc(db, 'competitions', competition.id), {
                status: newStatus,
                lastUpdated: serverTimestamp()
            });

            const actionText = newStatus === 'active' ? 'startet' : 'pauset';
            showSuccess('Status endret', `Konkurransen "${competition.title}" er ${actionText}.`);
        } catch (error) {
            console.error('Error updating competition status:', error);
            showError('Feil', 'Kunne ikke endre konkurransestatus.');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 border-green-200';
            case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'ended': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-blue-100 text-blue-800 border-blue-200';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'active': return 'Aktiv';
            case 'paused': return 'Pauset';
            case 'ended': return 'Avsluttet';
            default: return 'Ukjent';
        }
    };

    // Helper to get active konkurranse and its state
    const now = new Date();
    const getKonkurranseState = (konk) => {
        const start = konk.start ? new Date(konk.start) : null;
        const end = konk.end ? new Date(konk.end) : null;
        if (!start || !end) return 'ukjent';
        if (now < start) return 'not_started';
        if (now >= start && now <= end) return 'ongoing';
        if (now > end) return 'ended';
        return 'ukjent';
    };
    const getCountdown = (targetDate) => {
        const diff = targetDate - now;
        if (diff <= 0) return '00:00:00';
        const hours = Math.floor(diff / 1000 / 60 / 60);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        const secs = Math.floor((diff / 1000) % 60);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Laster konkurranser...</p>
                </div>
            </div>
        );
    }

    // Render competitions with countdowns and type
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2"><Trophy size={20}/> Konkurranser</h2>
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow"
                    onClick={() => setShowCreateModal(true)}
                >
                    <Plus size={16}/> Ny konkurranse
                </button>
            </div>
            {competitions.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                    <Trophy size={48} className="mx-auto mb-4 text-gray-300"/>
                    <p>Ingen konkurranser er opprettet ennå.</p>
                </div>
            )}
            {competitions.map((konk) => {
                const state = getKonkurranseState(konk);
                const start = konk.start ? new Date(konk.start) : null;
                const end = konk.end ? new Date(konk.end) : null;
                let countdownLabel = '';
                let countdownValue = '';
                if (state === 'not_started' && start) {
                    countdownLabel = 'Starter om:';
                    countdownValue = getCountdown(start);
                } else if (state === 'ongoing' && end) {
                    countdownLabel = 'Slutter om:';
                    countdownValue = getCountdown(end);
                }
                return (
                    <div key={konk.id} className={`border rounded-xl p-4 mb-4 ${getStatusColor(state)}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <div className="font-bold text-lg">{konk.name}</div>
                                <div className="text-sm text-gray-700">{konk.pointType === 'stars' ? 'Stjerner' : 'Poeng'} | {konk.start && new Date(konk.start).toLocaleString()} - {konk.end && new Date(konk.end).toLocaleString()}</div>
                                <div className="text-xs text-gray-500">Status: {getStatusText(state)}</div>
                                {countdownLabel && (
                                    <div className="mt-1 text-xs font-semibold text-blue-700">{countdownLabel} <span className="font-mono">{countdownValue}</span></div>
                                )}
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                                {konk.levels && konk.levels.length > 0 && (
                                    <div className="text-xs text-gray-700">Nivåer: {konk.levels.length}</div>
                                )}
                                {konk.servicePoints && Object.keys(konk.servicePoints).length > 0 && (
                                    <div className="text-xs text-gray-700">Tjenester: {Object.keys(konk.servicePoints).length}</div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
            <CompetitionModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                serviceCategories={serviceCategories}
            />
        </div>
    );
}

// Competition Creation/Edit Modal
function CompetitionModal({ isOpen, onClose, competition, serviceCategories }) {
    const { showSuccess, showError } = useNotification();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        reward: '',
        targetServices: [],
        multiplier: 1,
        status: 'active'
    });

    useEffect(() => {
        if (competition) {
            setFormData({
                title: competition.title || '',
                description: competition.description || '',
                startDate: competition.startDate?.toDate().toISOString().split('T')[0] || '',
                endDate: competition.endDate?.toDate().toISOString().split('T')[0] || '',
                reward: competition.reward || '',
                targetServices: competition.targetServices || [],
                multiplier: competition.multiplier || 1,
                status: competition.status || 'active'
            });
        } else {
            setFormData({
                title: '',
                description: '',
                startDate: '',
                endDate: '',
                reward: '',
                targetServices: [],
                multiplier: 1,
                status: 'active'
            });
        }
    }, [competition, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const competitionData = {
                ...formData,
                startDate: new Date(formData.startDate),
                endDate: new Date(formData.endDate),
                multiplier: parseFloat(formData.multiplier),
                lastUpdated: serverTimestamp(),
                ...(competition ? {} : { createdAt: serverTimestamp() })
            };

            if (competition) {
                await updateDoc(doc(db, 'competitions', competition.id), competitionData);
                showSuccess('Konkurranse oppdatert', 'Konkurransen er oppdatert.');
            } else {
                await addDoc(collection(db, 'competitions'), competitionData);
                showSuccess('Konkurranse opprettet', 'Ny konkurranse er opprettet og aktiv.');
            }

            onClose();
        } catch (error) {
            console.error('Error saving competition:', error);
            showError('Feil', 'Kunne ikke lagre konkurransen.');
        } finally {
            setLoading(false);
        }
    };

    const addTargetService = (category, service) => {
        const newService = { category, service };
        if (!formData.targetServices.some(s => s.category === category && s.service === service)) {
            setFormData({
                ...formData,
                targetServices: [...formData.targetServices, newService]
            });
        }
    };

    const removeTargetService = (index) => {
        setFormData({
            ...formData,
            targetServices: formData.targetServices.filter((_, i) => i !== index)
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-blue-500 shadow-xl">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-xl font-bold text-gray-900">
                            {competition ? 'Rediger konkurranse' : 'Opprett ny konkurranse'}
                        </h3>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tittel *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="f.eks. Forsikringskonkurranse Mars"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Belønning
                                </label>
                                <input
                                    type="text"
                                    value={formData.reward}
                                    onChange={(e) => setFormData({...formData, reward: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="f.eks. 1000kr gavekort"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Beskrivelse
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                placeholder="Beskriv konkurransen og reglene..."
                            />
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Startdato *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sluttdato *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Target Services */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Inkluderte tjenester (valgfritt - tom = alle tjenester)
                            </label>

                            {/* Selected Services */}
                            {formData.targetServices.length > 0 && (
                                <div className="mb-3 flex flex-wrap gap-2">
                                    {formData.targetServices.map((service, index) => (
                                        <span key={index} className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                                            {service.category} - {service.service}
                                            <button
                                                type="button"
                                                onClick={() => removeTargetService(index)}
                                                className="ml-2 text-blue-600 hover:text-blue-800"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Service Selection */}
                            <div className="border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                                {Object.entries(serviceCategories).map(([category, services]) => (
                                    <div key={category} className="mb-4">
                                        <h4 className="font-medium text-gray-900 mb-2">{category}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {Object.keys(services).map((service) => (
                                                <button
                                                    key={service}
                                                    type="button"
                                                    onClick={() => addTargetService(category, service)}
                                                    className="text-left px-2 py-1 text-sm text-gray-600 hover:bg-blue-50 rounded transition-colors"
                                                >
                                                    {service}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Avbryt
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Lagrer...' : (competition ? 'Oppdater' : 'Opprett')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CompetitionsTab;
