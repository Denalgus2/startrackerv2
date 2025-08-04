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

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Konkurranser</h2>
                        <p className="text-gray-600 text-sm">Administrer konkurranser og belønninger for ansatte</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={16} />
                        Ny konkurranse
                    </button>
                </div>

                {/* Competition Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AnimatePresence>
                        {competitions.map((competition) => (
                            <motion.div
                                key={competition.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                                            <Trophy className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{competition.title}</h3>
                                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(competition.status)}`}>
                                                {getStatusText(competition.status)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleCompetitionStatus(competition)}
                                            className={`p-2 rounded-lg transition-colors ${
                                                competition.status === 'active' 
                                                    ? 'text-yellow-600 hover:bg-yellow-100' 
                                                    : 'text-green-600 hover:bg-green-100'
                                            }`}
                                            title={competition.status === 'active' ? 'Pause konkurranse' : 'Start konkurranse'}
                                        >
                                            {competition.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingCompetition(competition);
                                                setShowCreateModal(true);
                                            }}
                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                            title="Rediger konkurranse"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button
                                            onClick={() => deleteCompetition(competition.id, competition.title)}
                                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Slett konkurranse"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-gray-600 text-sm">{competition.description}</p>

                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            <span>
                                                {competition.startDate?.toDate().toLocaleDateString('no-NO')} -
                                                {competition.endDate?.toDate().toLocaleDateString('no-NO')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Target size={14} />
                                            <span>{competition.targetServices?.length || 0} tjenester</span>
                                        </div>
                                    </div>

                                    {competition.reward && (
                                        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <Award className="h-4 w-4 text-yellow-600" />
                                            <span className="text-sm text-yellow-800 font-medium">
                                                Belønning: {competition.reward}
                                            </span>
                                        </div>
                                    )}

                                    {competition.targetServices && competition.targetServices.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium text-gray-700">Inkluderte tjenester:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {competition.targetServices.slice(0, 3).map((service, index) => (
                                                    <span key={index} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                        {service.category} - {service.service}
                                                    </span>
                                                ))}
                                                {competition.targetServices.length > 3 && (
                                                    <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                        +{competition.targetServices.length - 3} flere
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {competitions.length === 0 && (
                    <div className="text-center py-12">
                        <Trophy size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen konkurranser ennå</h3>
                        <p className="text-gray-600 mb-6">Opprett din første konkurranse for å motivere teamet!</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                        >
                            <Plus size={16} />
                            Opprett konkurranse
                        </button>
                    </div>
                )}
            </motion.div>

            {/* Create/Edit Competition Modal */}
            <CompetitionModal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setEditingCompetition(null);
                }}
                competition={editingCompetition}
                serviceCategories={serviceCategories}
            />

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
                                    Starttidspunkt *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.startDateTime || ''}
                                    onChange={(e) => setFormData({...formData, startDateTime: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Slutttidspunkt *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.endDateTime || ''}
                                    onChange={(e) => setFormData({...formData, endDateTime: e.target.value})}
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
