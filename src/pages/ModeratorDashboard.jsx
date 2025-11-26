import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, increment, deleteDoc, addDoc, serverTimestamp, orderBy, limit, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Users, TrendingUp, Clock, BarChart3, Settings, Shield, Trophy, Megaphone, Menu, X } from 'lucide-react';
import { useNotification } from '../hooks/useNotification';
import NotificationModal from '../components/NotificationModal';
import EditBilagRequestModal from '../components/EditBilagRequestModal';
import { AnimatePresence } from 'framer-motion';

// Import sub-components
import BilagRequestsTab from '../components/moderator/BilagRequestsTab';
import StaffManagementTab from '../components/moderator/StaffManagementTab';
import SalesActivityTab from '../components/moderator/SalesActivityTab';
import ShiftsOverviewTab from '../components/moderator/ShiftsOverviewTab';
import AnalyticsTab from '../components/moderator/AnalyticsTab';
import ServicesTab from '../components/moderator/ServicesTab';
import CompetitionsTab from '../components/CompetitionsTab';
import AnnouncementsTab from '../components/moderator/AnnouncementsTab';
import SystemTab from '../components/moderator/SystemTab';

function ModeratorDashboard() {
    const { userRole, currentUser } = useAuth();
    const { notification, showSuccess, showError, showConfirmation, hideNotification } = useNotification();

    // State for tabs
    const [activeTab, setActiveTab] = useState('requests');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Data State
    const [requests, setRequests] = useState([]);
    const [staff, setStaff] = useState([]);
    const [sales, setSales] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [services, setServices] = useState({});
    const [systemSettings, setSystemSettings] = useState({});
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    // Edit Modal State
    const [editingRequest, setEditingRequest] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    // Service Edit Modal State
    const [editServiceModalOpen, setEditServiceModalOpen] = useState(false);
    const [editServiceData, setEditServiceData] = useState({ 
        category: '', 
        name: '', 
        stars: 1, 
        multiplier: 1, 
        originalName: '', 
        isRecurring: false,
        startAmount: '',
        endAmount: ''
    });

    // New Service State
    const [newCategory, setNewCategory] = useState('');
    const [newService, setNewService] = useState({ 
        name: '', 
        stars: 1, 
        multiplier: 1, 
        isRecurring: false,
        startAmount: '',
        endAmount: ''
    });

    // New Announcement State
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', message: '', type: 'info' });

    // Permissions check
    if (userRole !== 'moderator' && userRole !== 'admin') {
        return (
            <div className="text-center p-10">
                <Shield className="mx-auto h-12 w-12 text-red-500"/>
                <h2 className="mt-4 text-2xl font-bold">Ingen tilgang</h2>
                <p className="mt-2 text-gray-600">Du har ikke rettigheter til å se denne siden.</p>
            </div>
        );
    }

    // Load all data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);

            // 1. Load pending bilag requests
            const requestsQuery = query(collection(db, 'bilagRequests'), where('status', '==', 'pending'));
            const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
                const requestData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setRequests(requestData);
            });

            // 2. Load staff data
            const unsubStaff = onSnapshot(collection(db, 'staff'), (snapshot) => {
                const staffData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setStaff(staffData.sort((a, b) => (b.stars || 0) - (a.stars || 0)));
            });

            // 3. Load recent sales
            const salesQuery = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(50));
            const unsubSales = onSnapshot(salesQuery, (snapshot) => {
                const salesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setSales(salesData);
            });

            // 4. Load recent shifts
            const shiftsQuery = query(collection(db, 'shifts'), orderBy('timestamp', 'desc'), limit(30));
            const unsubShifts = onSnapshot(shiftsQuery, (snapshot) => {
                const shiftsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setShifts(shiftsData);
            });

            // 5. Load services
            const servicesRef = doc(db, 'config', 'services');
            const unsubServices = onSnapshot(servicesRef, (doc) => {
                if (doc.exists()) {
                    setServices(doc.data().categories || {});
                } else {
                    setServices({});
                }
            });

            // 6. Load system settings
            const settingsRef = doc(db, 'config', 'system');
            const unsubSettings = onSnapshot(settingsRef, (doc) => {
                if (doc.exists()) {
                    setSystemSettings(doc.data());
                } else {
                    setSystemSettings({});
                }
            });

            // 7. Load announcements
            const announcementsRef = collection(db, 'announcements');
            const unsubAnnouncements = onSnapshot(announcementsRef, (snapshot) => {
                const announcementData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
                setAnnouncements(announcementData);
                setLoading(false); // Set loading false after all listeners are attached
            });

            return () => {
                unsubRequests();
                unsubStaff();
                unsubSales();
                unsubShifts();
                unsubServices();
                unsubSettings();
                unsubAnnouncements();
            };
        };

        loadData();
    }, []);

    // --- Handlers for Bilag Requests ---
    const handleApprove = async (request) => {
        const message = request.category === 'Forsikring' && request.type === 'Recurring'
            ? `Godkjenne OG SETTE SOM GJENTAKENDE bilag ${request.bilag} for ${request.staffName}?`
            : `Godkjenne bilag ${request.bilag} for ${request.staffName}? Dette vil tildele ${request.stars} stjerner.`;

        showConfirmation(
            'Bekreft godkjenning',
            message,
            async () => {
                try {
                    if (request.category === 'Forsikring' && request.type === 'Recurring') {
                        await addDoc(collection(db, 'sales'), {
                            staffId: request.staffId,
                            staffName: request.staffName,
                            bilag: request.bilag,
                            category: request.category,
                            service: request.service,
                            stars: request.stars,
                            timestamp: serverTimestamp(),
                            approvedBy: userRole,
                            insuranceType: 'Recurring',
                            forsikringAmount: request.forsikringAmount
                        });
                        const staffRef = doc(db, 'staff', request.staffId);
                        await updateDoc(staffRef, { stars: increment(request.stars) });
                    } else {
                        await addDoc(collection(db, 'sales'), {
                            staffId: request.staffId,
                            staffName: request.staffName,
                            bilag: request.bilag,
                            category: request.category,
                            service: request.service,
                            stars: request.stars,
                            timestamp: serverTimestamp(),
                            approvedBy: userRole,
                            ...(request.forsikringAmount && { forsikringAmount: request.forsikringAmount })
                        });
                        const staffRef = doc(db, 'staff', request.staffId);
                        await updateDoc(staffRef, { stars: increment(request.stars) });
                    }
                    await deleteDoc(doc(db, 'bilagRequests', request.id));
                    showSuccess('Bilag godkjent', `Bilag ${request.bilag} er godkjent.`);
                } catch (error) {
                    console.error("Error approving request:", error);
                    showError('Feil', 'En feil oppstod under godkjenning.');
                }
            }
        );
    };

    const handleDecline = async (request) => {
        showConfirmation(
            'Bekreft avslag',
            `Avslå bilag ${request.bilag} for ${request.staffName}?`,
            async () => {
                try {
                    await deleteDoc(doc(db, 'bilagRequests', request.id));
                    showSuccess('Bilag avslått', `Bilag ${request.bilag} er avslått.`);
                } catch (error) {
                    console.error("Error declining request:", error);
                    showError('Feil', 'En feil oppstod under avslag.');
                }
            }
        );
    };

    const openEditModal = (request) => {
        setEditingRequest(request);
        setIsEditModalOpen(true);
    };

    // --- Handlers for Staff Management ---
    const adjustStaffStars = async (staffId, adjustment, reason) => {
        showConfirmation(
            'Juster stjerner',
            `${adjustment > 0 ? 'Legge til' : 'Trekke fra'} ${Math.abs(adjustment)} stjerner${reason ? ` - ${reason}` : ''}?`,
            async () => {
                try {
                    const staffRef = doc(db, 'staff', staffId);
                    const currentStaff = staff.find(s => s.id === staffId);
                    const currentStars = currentStaff?.stars || 0;
                    const newTotalStars = Math.max(0, currentStars + adjustment);
                    await updateDoc(staffRef, { stars: newTotalStars });

                    await addDoc(collection(db, 'starAdjustments'), {
                        staffId,
                        staffName: staff.find(s => s.id === staffId)?.name,
                        adjustment,
                        reason: reason || 'Moderator justering',
                        timestamp: serverTimestamp(),
                        moderator: currentUser.displayName || currentUser.email
                    });

                    showSuccess('Stjerner justert', `Stjerner er ${adjustment > 0 ? 'lagt til' : 'trukket fra'} for ansatt.`);
                } catch (error) {
                    console.error("Error adjusting stars:", error);
                    showError('Feil', 'Kunne ikke justere stjerner.');
                }
            }
        );
    };

    const resetStaffStars = async (staffId, staffName) => {
        showConfirmation(
            'Nullstill stjerner',
            `Nullstille alle stjerner for ${staffName}? Dette kan ikke angres.`,
            async () => {
                try {
                    const staffRef = doc(db, 'staff', staffId);
                    await updateDoc(staffRef, { stars: 0 });

                    await addDoc(collection(db, 'starAdjustments'), {
                        staffId,
                        staffName,
                        adjustment: 'reset',
                        reason: 'Stjerner nullstilt av moderator',
                        timestamp: serverTimestamp(),
                        moderator: currentUser.displayName || currentUser.email
                    });

                    showSuccess('Stjerner nullstilt', `Alle stjerner for ${staffName} er nullstilt.`);
                } catch (error) {
                    console.error("Error resetting stars:", error);
                    showError('Feil', 'Kunne ikke nullstille stjerner.');
                }
            }
        );
    };

    // --- Handlers for Sales & Shifts ---
    const deleteSale = async (saleId, staffName, stars) => {
        showConfirmation(
            'Slett salg',
            `Slette salg for ${staffName}? Dette vil trekke fra ${stars} stjerner.`,
            async () => {
                try {
                    await deleteDoc(doc(db, 'sales', saleId));
                    showSuccess('Salg slettet', 'Salget er slettet og stjerner er justert.');
                } catch (error) {
                    console.error("Error deleting sale:", error);
                    showError('Feil', 'Kunne ikke slette salg.');
                }
            }
        );
    };

    const deleteShift = async (shiftId, staffName) => {
        showConfirmation(
            'Slett vakt',
            `Slette vakt for ${staffName}?`,
            async () => {
                try {
                    await deleteDoc(doc(db, 'shifts', shiftId));
                    showSuccess('Vakt slettet', 'Vakten er slettet.');
                } catch (error) {
                    console.error("Error deleting shift:", error);
                    showError('Feil', 'Kunne ikke slette vakt.');
                }
            }
        );
    };

    // --- Handlers for Services ---
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

    const addServiceToCategory = async (categoryName) => {
        if (newService.stars < 0) return;

        let serviceKey = '';
        if (categoryName === 'Forsikring') {
            if (newService.name.trim()) {
                serviceKey = newService.name.trim();
            } else if (newService.startAmount && newService.endAmount) {
                const start = parseInt(newService.startAmount);
                const end = parseInt(newService.endAmount);
                if (start && end && start < end) {
                    serviceKey = `${start}-${end}kr`;
                }
            }
        } else {
            if (!newService.name.trim()) return;
            serviceKey = newService.name.trim();
        }
        
        if (!serviceKey) return;
        
        if (newService.multiplier > 1) {
            serviceKey = `${serviceKey} x${newService.multiplier}`;
        }

        const updatedCategory = {
            ...services[categoryName],
            [serviceKey]: {
                stars: parseInt(newService.stars),
                multiplier: newService.multiplier,
                isRecurring: newService.isRecurring || false,
                startAmount: newService.startAmount || undefined,
                endAmount: newService.endAmount || undefined
            }
        };
        const updatedServices = {
            ...services,
            [categoryName]: updatedCategory
        };
        setServices(updatedServices);
        setNewService({ name: '', stars: 1, multiplier: 1, isRecurring: false, startAmount: '', endAmount: '' });
        
        try {
            await setDoc(doc(db, 'config', 'services'), { categories: updatedServices });
            showSuccess('Tjeneste lagt til', 'Tjenesten er lagret i Firestore.');
        } catch (error) {
            showError('Feil', 'Kunne ikke lagre tjenesten til Firestore.');
        }
    };

    const deleteService = async (categoryName, serviceName) => {
        showConfirmation(
            'Slett tjeneste',
            `Er du sikker på at du vil slette tjenesten "${serviceName}"?`,
            async () => {
                const updatedServices = { ...services };
                delete updatedServices[categoryName][serviceName];
                setServices(updatedServices);
                try {
                    await setDoc(doc(db, 'config', 'services'), { categories: updatedServices });
                    showSuccess('Tjeneste slettet', 'Tjenesten er fjernet fra Firestore.');
                } catch (error) {
                    showError('Feil', 'Kunne ikke slette tjenesten fra Firestore.');
                }
            }
        );
    };

    const openEditServiceModal = (category, serviceName, serviceData) => {
        const amountMatch = serviceName.match(/^(\d+)-(\d+)kr/);
        const startAmount = amountMatch ? amountMatch[1] : '';
        const endAmount = amountMatch ? amountMatch[2] : '';
        const cleanName = amountMatch ? serviceName.replace(/^\d+-\d+kr/, '').trim() : serviceName;
        
        setEditServiceData({
            category,
            name: cleanName.replace(/ x\d+$/, ''),
            stars: typeof serviceData === 'object' ? serviceData.stars : serviceData,
            multiplier: typeof serviceData === 'object' ? serviceData.multiplier || 1 : 1,
            isRecurring: typeof serviceData === 'object' ? serviceData.isRecurring || false : false,
            startAmount: typeof serviceData === 'object' ? serviceData.startAmount || startAmount : startAmount,
            endAmount: typeof serviceData === 'object' ? serviceData.endAmount || endAmount : endAmount,
            originalName: serviceName
        });
        setEditServiceModalOpen(true);
    };

    const saveEditService = async () => {
        const { category, name, stars, multiplier, originalName, isRecurring, startAmount, endAmount } = editServiceData;
        if (stars < 0) return;
        
        let serviceKey = '';
        if (category === 'Forsikring') {
            if (name.trim()) {
                serviceKey = name.trim();
            } else if (startAmount && endAmount) {
                const start = parseInt(startAmount);
                const end = parseInt(endAmount);
                if (start && end && start < end) {
                    serviceKey = `${start}-${end}kr`;
                }
            }
        } else {
            if (!name.trim()) return;
            serviceKey = name.trim();
        }
        
        if (!serviceKey) return;
        
        if (multiplier > 1) {
            serviceKey = `${serviceKey} x${multiplier}`;
        }
        
        const updatedCategory = { ...services[category] };
        if (originalName !== serviceKey) {
            delete updatedCategory[originalName];
        }
        updatedCategory[serviceKey] = { 
            stars: parseInt(stars), 
            multiplier,
            isRecurring: isRecurring || false,
            startAmount: startAmount || undefined,
            endAmount: endAmount || undefined
        };
        const updatedServices = { ...services, [category]: updatedCategory };
        setServices(updatedServices);
        setEditServiceModalOpen(false);
        
        try {
            await setDoc(doc(db, 'config', 'services'), { categories: updatedServices });
            showSuccess('Tjeneste oppdatert', 'Endringene er lagret i Firestore.');
        } catch (error) {
            showError('Feil', 'Kunne ikke oppdatere tjenesten i Firestore.');
        }
    };

    // --- Handlers for Announcements ---
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

    // --- Handlers for System Settings ---
    const updateSystemSettings = async (newSettings) => {
        try {
            await setDoc(doc(db, 'config', 'system'), newSettings, { merge: true });
            showSuccess('Systeminnstillinger oppdatert', 'Endringene er lagret.');
        } catch (error) {
            console.error('Error updating system settings:', error);
            showError('Feil', 'Kunne ikke oppdatere systeminnstillinger.');
        }
    };

    // Tab Configuration
    const tabs = [
        { id: 'requests', label: 'Forespørsler', icon: FileText, count: requests.length },
        { id: 'staff', label: 'Ansatte', icon: Users, count: staff.length },
        { id: 'sales', label: 'Salg', icon: TrendingUp, count: sales.length },
        { id: 'shifts', label: 'Vakter', icon: Clock, count: shifts.length },
        { id: 'analytics', label: 'Analyser', icon: BarChart3 },
        { id: 'services', label: 'Tjenester', icon: Settings },
        { id: 'competitions', label: 'Konkurranser', icon: Trophy },
        { id: 'announcements', label: 'Kunngjøringer', icon: Megaphone },
        { id: 'system', label: 'System', icon: Shield }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Laster moderator dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="max-w-7xl mx-auto p-4 sm:p-6">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col md:flex-row min-h-[80vh]">
                    
                    {/* Sidebar Navigation (Desktop) */}
                    <div className="hidden md:flex flex-col w-64 bg-gray-50 border-r border-gray-200">
                        <div className="p-6 border-b border-gray-200 bg-white">
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Shield className="text-blue-600" />
                                Kontrollpanel
                            </h1>
                            <p className="text-xs text-gray-500 mt-1">Moderator verktøy</p>
                        </div>
                        <nav className="flex-1 overflow-y-auto py-4">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center justify-between px-6 py-3 text-sm font-medium transition-colors ${
                                        activeTab === tab.id
                                            ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <tab.icon size={18} />
                                        {tab.label}
                                    </div>
                                    {tab.count !== undefined && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                                            activeTab === tab.id 
                                                ? 'bg-blue-100 text-blue-700' 
                                                : 'bg-gray-200 text-gray-600'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Mobile Navigation Header */}
                    <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Shield className="text-blue-600" size={20} />
                            Kontrollpanel
                        </h1>
                        <button 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 rounded-lg hover:bg-gray-100"
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>

                    {/* Mobile Menu Overlay */}
                    {isMobileMenuOpen && (
                        <div className="md:hidden absolute inset-0 z-50 bg-white pt-20 px-4 pb-4 overflow-y-auto">
                            <nav className="space-y-2">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                            activeTab === tab.id
                                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                : 'text-gray-600 hover:bg-gray-100 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <tab.icon size={18} />
                                            {tab.label}
                                        </div>
                                        {tab.count !== undefined && (
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                                                activeTab === tab.id 
                                                    ? 'bg-blue-100 text-blue-700' 
                                                    : 'bg-gray-200 text-gray-600'
                                            }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-1 bg-white overflow-y-auto h-[80vh] md:h-auto">
                        <div className="p-6">
                            <AnimatePresence mode="wait">
                                {activeTab === 'requests' && (
                                    <BilagRequestsTab
                                        requests={requests}
                                        handleApprove={handleApprove}
                                        handleDecline={handleDecline}
                                        openEditModal={openEditModal}
                                    />
                                )}

                                {activeTab === 'staff' && (
                                    <StaffManagementTab
                                        staff={staff}
                                        adjustStaffStars={adjustStaffStars}
                                        resetStaffStars={resetStaffStars}
                                    />
                                )}

                                {activeTab === 'sales' && (
                                    <SalesActivityTab
                                        sales={sales}
                                        deleteSale={deleteSale}
                                    />
                                )}

                                {activeTab === 'shifts' && (
                                    <ShiftsOverviewTab
                                        shifts={shifts}
                                        deleteShift={deleteShift}
                                    />
                                )}

                                {activeTab === 'analytics' && (
                                    <AnalyticsTab
                                        staff={staff}
                                        sales={sales}
                                        shifts={shifts}
                                    />
                                )}

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
                                        saveServices={saveServices}
                                        openEditModal={openEditServiceModal}
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
                                        updateSystemSettings={updateSystemSettings}
                                        serviceCategories={services}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <EditBilagRequestModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onUpdate={() => console.log("Request updated!")}
                request={editingRequest}
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

            {/* Edit Service Modal */}
            {editServiceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Rediger tjeneste</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tjenestenavn *</label>
                                <input
                                    type="text"
                                    value={editServiceData.name}
                                    onChange={e => setEditServiceData({ ...editServiceData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Antall stjerner *</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={editServiceData.stars}
                                    onChange={e => setEditServiceData({ ...editServiceData, stars: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Salg-multiplier</label>
                                <select
                                    value={editServiceData.multiplier}
                                    onChange={e => setEditServiceData({ ...editServiceData, multiplier: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value={1}>1 salg = stjerner (standard)</option>
                                    <option value={2}>2 salg = stjerner (x2)</option>
                                    <option value={3}>3 salg = stjerner (x3)</option>
                                    <option value={4}>4 salg = stjerner (x4)</option>
                                    <option value={5}>5 salg = stjerner (x5)</option>
                                </select>
                            </div>
                            {editServiceData.category === 'Forsikring' && (
                                <div className="border-t border-gray-200 pt-4">
                                    <h4 className="font-medium text-gray-700 mb-3">Beløpsområde</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Fra beløp (kr)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={editServiceData.startAmount}
                                                onChange={(e) => setEditServiceData({...editServiceData, startAmount: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Til beløp (kr)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={editServiceData.endAmount}
                                                onChange={(e) => setEditServiceData({...editServiceData, endAmount: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            {editServiceData.category === 'Forsikring' && (
                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            id="editIsRecurring"
                                            checked={editServiceData.isRecurring}
                                            onChange={(e) => setEditServiceData({...editServiceData, isRecurring: e.target.checked})}
                                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <div className="flex-1">
                                            <label htmlFor="editIsRecurring" className="font-medium text-gray-700">
                                                Abonnement/Kontinuerlig forsikring
                                            </label>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Markér dette hvis forsikringen er et månedlig abonnement. Stjerner gis kun én gang ved første salg.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setEditServiceModalOpen(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                                Avbryt
                            </button>
                            <button
                                onClick={saveEditService}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Lagre endringer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default ModeratorDashboard;
