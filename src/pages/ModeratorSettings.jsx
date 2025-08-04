import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, updateDoc, setDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Settings, Plus, Edit3, Trash2, Star, Calendar, Megaphone, Save, AlertTriangle, Shield, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../hooks/useNotification';
import NotificationModal from '../components/NotificationModal';
import CompetitionsTab from '../components/CompetitionsTab';
import { serviceCategories } from '../data/services';

function ModeratorSettings() {
    const { userRole } = useAuth();
    const { notification, showSuccess, showError, showConfirmation, hideNotification } = useNotification();

    const [activeTab, setActiveTab] = useState('services');
    const [services, setServices] = useState({});
    const [systemSettings, setSystemSettings] = useState({});
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    // Service Management State
    const [editingService, setEditingService] = useState(null);
    const [newCategory, setNewCategory] = useState('');
    const [newService, setNewService] = useState({ name: '', stars: 1, multiplier: 1 });
    const [editForm, setEditForm] = useState({ name: '', stars: 1, multiplier: 1 });

    // Announcement State
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', type: 'info' });

    // Check permissions
    if (userRole !== 'moderator' && userRole !== 'admin') {
        return (
            <div className="text-center p-10">
                <Shield className="mx-auto h-12 w-12 text-red-500"/>
                <h2 className="mt-4 text-2xl font-bold">Ingen tilgang</h2>
                <p className="mt-2 text-gray-600">Du har ikke rettigheter til å se denne siden.</p>
            </div>
        );
    }

    useEffect(() => {
        // Load services from Firestore
        const servicesRef = doc(db, 'config', 'services');
        const unsubServices = onSnapshot(servicesRef, (doc) => {
            if (doc.exists()) {
                setServices(doc.data().categories || {});
            } else {
                // Document doesn't exist, initialize with empty object
                setServices({});
            }
            setLoading(false);
        }, (error) => {
            console.error('Error loading services:', error);
            setServices({});
            setLoading(false);
        });

        // Load system settings
        const settingsRef = doc(db, 'config', 'system');
        const unsubSettings = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                setSystemSettings(doc.data());
            } else {
                setSystemSettings({});
            }
        }, (error) => {
            console.error('Error loading system settings:', error);
            setSystemSettings({});
        });

        // Load announcements
        const announcementsRef = collection(db, 'announcements');
        const unsubAnnouncements = onSnapshot(announcementsRef, (snapshot) => {
            const announcementData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
            setAnnouncements(announcementData);
        }, (error) => {
            console.error('Error loading announcements:', error);
            setAnnouncements([]);
        });

        return () => {
            unsubServices();
            unsubSettings();
            unsubAnnouncements();
        };
    }, []);

    const saveServices = async () => {
        try {
            await setDoc(doc(db, 'config', 'services'), { categories: services });
            showSuccess('Tjenester oppdatert', 'Alle tjenester er lagret og vil være tilgjengelige umiddelbart.');
        } catch (error) {
            console.error('Error saving services:', error);
            showError('Feil', 'Kunne ikke lagre tjenester.');
        }
    };

    const addNewCategory = () => {
        if (!newCategory.trim()) return;
        setServices({
            ...services,
            [newCategory]: {}
        });
        setNewCategory('');
    };

    const deleteCategory = (categoryName) => {
        showConfirmation(
            'Slett kategori',
            `Er du sikker på at du vil slette kategorien "${categoryName}" og alle tjenestene i den?`,
            () => {
                const updatedServices = { ...services };
                delete updatedServices[categoryName];
                setServices(updatedServices);
            }
        );
    };

    const addServiceToCategory = (categoryName) => {
        if (!newService.name.trim() || newService.stars < 0) return;

        const serviceKey = newService.multiplier > 1
            ? `${newService.name} x${newService.multiplier}`
            : newService.name;

        // Get existing services from both standard categories and custom services
        const existingServices = {
            ...(serviceCategories[categoryName] || {}), // Standard services from services.js
            ...(services[categoryName] || {})           // Custom services from Firestore
        };

        setServices({
            ...services,
            [categoryName]: {
                ...existingServices,
                [serviceKey]: parseInt(newService.stars)
            }
        });
        setNewService({ name: '', stars: 1, multiplier: 1 });
    };

    const deleteService = (categoryName, serviceName) => {
        showConfirmation(
            'Slett tjeneste',
            `Er du sikker på at du vil slette tjenesten "${serviceName}"?`,
            () => {
                const updatedServices = { ...services };
                delete updatedServices[categoryName][serviceName];
                setServices(updatedServices);
            }
        );
    };

    const editService = (categoryName, serviceName, serviceData) => {
        const stars = typeof serviceData === 'object' ? serviceData.stars : serviceData;
        const multiplier = typeof serviceData === 'object' ? serviceData.multiplier || 1 : 1;

        // Extract multiplier from service name if it exists (like "x2", "x3")
        const hasMultiplierInName = serviceName.includes(' x');
        const cleanName = hasMultiplierInName ?
            serviceName.replace(/ x\d+$/, '') : serviceName;
        const actualMultiplier = hasMultiplierInName ?
            parseInt(serviceName.match(/ x(\d+)/)?.[1] || '1') : multiplier;

        setEditingService({ categoryName, serviceName });
        setEditForm({
            name: cleanName,
            stars: stars,
            multiplier: actualMultiplier
        });
    };

    const saveEditedService = () => {
        if (!editForm.name.trim() || editForm.stars < 1) return;

        const { categoryName, serviceName } = editingService;
        const updatedServices = { ...services };

        // Remove old service
        delete updatedServices[categoryName][serviceName];

        // Add updated service with new key if multiplier > 1
        const newServiceKey = editForm.multiplier > 1
            ? `${editForm.name} x${editForm.multiplier}`
            : editForm.name;

        updatedServices[categoryName][newServiceKey] = parseInt(editForm.stars);

        setServices(updatedServices);
        setEditingService(null);
        setEditForm({ name: '', stars: 1, multiplier: 1 });
    };

    const cancelEdit = () => {
        setEditingService(null);
        setEditForm({ name: '', stars: 1, multiplier: 1 });
    };

    const addAnnouncement = async () => {
        if (!newAnnouncement.title.trim() || !newAnnouncement.message.trim()) return;

        try {
            await addDoc(collection(db, 'announcements'), {
                ...newAnnouncement,
                createdAt: serverTimestamp(),
                createdBy: userRole,
                active: true
            });
            setNewAnnouncement({ title: '', message: '', type: 'info' });
            showSuccess('Kunngjøring lagt til', 'Kunngjøringen er nå synlig for alle ansatte.');
        } catch (error) {
            console.error('Error adding announcement:', error);
            showError('Feil', 'Kunne ikke legge til kunngjøring.');
        }
    };

    const deleteAnnouncement = async (id) => {
        try {
            await deleteDoc(doc(db, 'announcements', id));
            showSuccess('Kunngjøring slettet', 'Kunngjøringen er fjernet.');
        } catch (error) {
            console.error('Error deleting announcement:', error);
            showError('Feil', 'Kunne ikke slette kunngjøring.');
        }
    };

    const tabs = [
        { id: 'services', label: 'Tjenester & Stjerner', icon: Star },
        { id: 'competitions', label: 'Konkurranser', icon: Trophy },
        { id: 'announcements', label: 'Kunngjøringer', icon: Megaphone },
        { id: 'system', label: 'Systeminnstillinger', icon: Settings }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Laster moderatorinnstillinger...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="max-w-6xl mx-auto p-6">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <Settings className="h-8 w-8 text-white" />
                            <div>
                                <h1 className="text-2xl font-bold text-white">Moderator Kontrollpanel</h1>
                                <p className="text-blue-100">Administrer tjenester, kunngjøringer og systeminnstillinger</p>
                            </div>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <tab.icon size={16} />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        <AnimatePresence mode="wait">
                            {activeTab === 'services' && (
                                <ServicesTab
                                    services={services}
                                    setServices={setServices}
                                    newCategory={newCategory}
                                    setNewCategory={setNewCategory}
                                    newService={newService}
                                    setNewService={setNewService}
                                    addNewCategory={addNewCategory}
                                    deleteCategory={deleteCategory}
                                    addServiceToCategory={addServiceToCategory}
                                    deleteService={deleteService}
                                    editService={editService}
                                    saveEditedService={saveEditedService}
                                    cancelEdit={cancelEdit}
                                    saveServices={saveServices}
                                    editingService={editingService}
                                    setEditingService={setEditingService}
                                    editForm={editForm}
                                    setEditForm={setEditForm}
                                />
                            )}

                            {activeTab === 'competitions' && (
                                <CompetitionsTab />
                            )}

                            {activeTab === 'announcements' && (
                                <AnnouncementsTab
                                    announcements={announcements}
                                    newAnnouncement={newAnnouncement}
                                    setNewAnnouncement={setNewAnnouncement}
                                    addAnnouncement={addAnnouncement}
                                    deleteAnnouncement={deleteAnnouncement}
                                />
                            )}

                            {activeTab === 'system' && (
                                <SystemTab
                                    systemSettings={systemSettings}
                                    setSystemSettings={setSystemSettings}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

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

// Services Management Tab Component
function ServicesTab({ services, setServices, newCategory, setNewCategory, newService, setNewService, addNewCategory, deleteCategory, addServiceToCategory, deleteService, editService, saveEditedService, cancelEdit, saveServices, editingService, setEditingService, editForm, setEditForm }) {
    const [selectedCategory, setSelectedCategory] = useState('');
    const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);

    // Merge existing categories from services.js with any custom categories from Firestore
    const allCategories = { ...serviceCategories, ...services };
    const existingCategories = Object.keys(allCategories);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Administrer Tjenester og Stjerner</h2>
                    <p className="text-gray-600 text-sm mt-1">Konfigurer tjenester og hvor mange stjerner de gir</p>
                </div>
                <button
                    onClick={saveServices}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Save size={16} />
                    Lagre alle endringer
                </button>
            </div>

            {/* Add New Service Form */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    <Plus size={18} />
                    Legg til ny tjeneste
                </h3>

                <div className="space-y-4">
                    {/* Category Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Velg kategori
                        </label>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        if (e.target.value === 'new') {
                                            setShowNewCategoryForm(true);
                                            setSelectedCategory('');
                                        } else {
                                            setSelectedCategory(e.target.value);
                                            setShowNewCategoryForm(false);
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Velg eksisterende kategori...</option>
                                    {existingCategories.map(category => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                    <option value="new">+ Opprett ny kategori</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* New Category Input */}
                    {showNewCategoryForm && (
                        <div className="p-4 bg-white border border-blue-200 rounded-lg">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Navn på ny kategori
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="f.eks. 'Mobilabonnement', 'Forsikring', 'Lån'"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <button
                                    onClick={() => {
                                        addNewCategory();
                                        setSelectedCategory(newCategory);
                                        setShowNewCategoryForm(false);
                                    }}
                                    disabled={!newCategory.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Opprett
                                </button>
                                <button
                                    onClick={() => {
                                        setShowNewCategoryForm(false);
                                        setNewCategory('');
                                    }}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    Avbryt
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Service Details Form */}
                    {(selectedCategory || showNewCategoryForm) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white border border-blue-200 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tjenestenavn *
                                </label>
                                <input
                                    type="text"
                                    placeholder="f.eks. 'Mobilabonnement 500GB'"
                                    value={newService.name}
                                    onChange={(e) => setNewService({...newService, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Antall stjerner *
                                    <span className="text-xs text-gray-500 block">Hvor mange stjerner gir dette salget?</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="1"
                                        min="1"
                                        max="100"
                                        value={newService.stars}
                                        onChange={(e) => setNewService({...newService, stars: e.target.value})}
                                        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    <Star className="absolute right-2 top-1/2 transform -translate-y-1/2 text-yellow-500" size={16} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Salg-multiplier
                                    <span className="text-xs text-gray-500 block">Hvor mange salg trengs for å få stjernene?</span>
                                </label>
                                <select
                                    value={newService.multiplier}
                                    onChange={(e) => setNewService({...newService, multiplier: parseInt(e.target.value)})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value={1}>1 salg = stjerner (standard)</option>
                                    <option value={2}>2 salg = stjerner (x2)</option>
                                    <option value={3}>3 salg = stjerner (x3)</option>
                                    <option value={4}>4 salg = stjerner (x4)</option>
                                    <option value={5}>5 salg = stjerner (x5)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Add Service Button */}
                    {selectedCategory && newService.name && newService.stars && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    addServiceToCategory(selectedCategory);
                                    setNewService({ name: '', stars: '', multiplier: 1 });
                                }}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Plus size={16} />
                                Legg til tjeneste
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Existing Categories and Services */}
            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Eksisterende tjenester</h3>

                {/* Edit Service Modal */}
                {editingService && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rediger tjeneste</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tjenestenavn *
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Antall stjerner *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={editForm.stars}
                                            onChange={(e) => setEditForm({...editForm, stars: parseInt(e.target.value)})}
                                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <Star className="absolute right-2 top-1/2 transform -translate-y-1/2 text-yellow-500" size={16} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Salg-multiplier
                                    </label>
                                    <select
                                        value={editForm.multiplier}
                                        onChange={(e) => setEditForm({...editForm, multiplier: parseInt(e.target.value)})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value={1}>1 salg = stjerner (standard)</option>
                                        <option value={2}>2 salg = stjerner (x2)</option>
                                        <option value={3}>3 salg = stjerner (x3)</option>
                                        <option value={4}>4 salg = stjerner (x4)</option>
                                        <option value={5}>5 salg = stjerner (x5)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-6">
                                <button
                                    onClick={saveEditedService}
                                    disabled={!editForm.name.trim() || editForm.stars < 1}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save size={16} />
                                    Lagre endringer
                                </button>
                                <button
                                    onClick={cancelEdit}
                                    className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Avbryt
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {existingCategories.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Star size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen tjenester ennå</h3>
                        <p className="text-gray-600">Legg til din første tjeneste ovenfor for å komme i gang!</p>
                    </div>
                ) : (
                    Object.entries(allCategories).map(([categoryName, categoryServices]) => (
                        <div key={categoryName} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900 text-lg">
                                    {categoryName}
                                    {serviceCategories[categoryName] && (
                                        <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                            Standard
                                        </span>
                                    )}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">
                                        {Object.keys(categoryServices).length} tjeneste{Object.keys(categoryServices).length !== 1 ? 'r' : ''}
                                    </span>
                                    {!serviceCategories[categoryName] && (
                                        <button
                                            onClick={() => deleteCategory(categoryName)}
                                            className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Slett kategori"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="p-6">
                                {Object.keys(categoryServices).length === 0 ? (
                                    <p className="text-gray-500 italic">Ingen tjenester i denne kategorien ennå</p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.entries(categoryServices).map(([serviceName, serviceData]) => {
                                            // Handle both old format (just stars) and new format (object with stars and multiplier)
                                            const stars = typeof serviceData === 'object' ? serviceData.stars : serviceData;
                                            const multiplier = typeof serviceData === 'object' ? serviceData.multiplier || 1 : 1;

                                            // Check if service name includes multiplier info (like "x2", "x3")
                                            const hasMultiplierInName = serviceName.includes(' x');
                                            const displayMultiplier = hasMultiplierInName ?
                                                parseInt(serviceName.match(/ x(\d+)/)?.[1] || '1') : multiplier;

                                            return (
                                                <div key={serviceName} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex-1">
                                                            <h4 className="font-medium text-gray-900 mb-2">{serviceName}</h4>
                                                            <div className="flex items-center gap-3 text-sm">
                                                                <div className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                                                                    <Star size={14} fill="currentColor" />
                                                                    <span className="font-semibold">{stars} stjerne{stars !== 1 ? 'r' : ''}</span>
                                                                </div>
                                                                {displayMultiplier > 1 && (
                                                                    <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                                                        <span className="font-semibold">x{displayMultiplier}</span>
                                                                        <span className="text-xs">salg</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => editService(categoryName, serviceName, serviceData)}
                                                                className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                                                                title="Rediger tjeneste"
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteService(categoryName, serviceName)}
                                                                className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                                                                title="Slett tjeneste"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {displayMultiplier > 1 && (
                                                        <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                                            Krever {displayMultiplier} salg for å få {stars} stjerne{stars !== 1 ? 'r' : ''}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
}

// Announcements Tab Component
function AnnouncementsTab({ announcements, newAnnouncement, setNewAnnouncement, addAnnouncement, deleteAnnouncement }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <h2 className="text-xl font-semibold text-gray-900">Administrer Kunngjøringer</h2>

            {/* Add New Announcement */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-4">Ny kunngjøring</h3>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Tittel på kunngjøring"
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <textarea
                        placeholder="Melding..."
                        value={newAnnouncement.message}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                    <div className="flex items-center gap-4">
                        <select
                            value={newAnnouncement.type}
                            onChange={(e) => setNewAnnouncement({...newAnnouncement, type: e.target.value})}
                            className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="info">Info (Blå)</option>
                            <option value="success">Suksess (Grønn)</option>
                            <option value="warning">Advarsel (Gul)</option>
                            <option value="error">Viktig (Rød)</option>
                        </select>
                        <button
                            onClick={addAnnouncement}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Megaphone size={16} />
                            Publiser kunngjøring
                        </button>
                    </div>
                </div>
            </div>

            {/* Existing Announcements */}
            <div className="space-y-4">
                {announcements.map((announcement) => (
                    <div key={announcement.id} className={`p-4 rounded-lg border-2 ${
                        announcement.type === 'success' ? 'bg-green-50 border-green-200' :
                        announcement.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                        announcement.type === 'error' ? 'bg-red-50 border-red-200' :
                        'bg-blue-50 border-blue-200'
                    }`}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{announcement.title}</h4>
                                <p className="text-gray-700 mt-1">{announcement.message}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                    {announcement.createdAt?.toDate().toLocaleDateString('no-NO')} av {announcement.createdBy}
                                </p>
                            </div>
                            <button
                                onClick={() => deleteAnnouncement(announcement.id)}
                                className="text-red-600 hover:text-red-800 p-1 ml-4"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {announcements.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <Megaphone size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Ingen kunngjøringer ennå. Legg til din første kunngjøring ovenfor!</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// System Settings Tab Component
function SystemTab({ systemSettings, setSystemSettings }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <h2 className="text-xl font-semibold text-gray-900">Systeminnstillinger</h2>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-yellow-800">Kommende funksjoner</h3>
                        <p className="text-yellow-700 text-sm mt-1">
                            Avanserte systeminnstillinger som månedlige forsikringsbelønninger, automatiske stjerneresets og mer kommer snart!
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default ModeratorSettings;
