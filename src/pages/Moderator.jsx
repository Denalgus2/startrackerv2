import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, increment, deleteDoc, addDoc, serverTimestamp, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, CheckCircle, X, Users, TrendingUp, Calendar, Settings, Shield, Star, Award, AlertTriangle, Eye, Edit3, Trash2, BarChart3, Clock } from 'lucide-react';
import EditBilagRequestModal from '../components/EditBilagRequestModal';
import { useNotification } from '../hooks/useNotification';
import NotificationModal from '../components/NotificationModal';
import { motion, AnimatePresence } from 'framer-motion';

function Moderator() {
    const { userRole, currentUser } = useAuth();
    const { notification, showSuccess, showError, showConfirmation, hideNotification } = useNotification();

    // State for different tabs
    const [activeTab, setActiveTab] = useState('requests');
    const [requests, setRequests] = useState([]);
    const [staff, setStaff] = useState([]);
    const [sales, setSales] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingRequest, setEditingRequest] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

            // Load pending bilag requests
            const requestsQuery = query(collection(db, 'bilagRequests'), where('status', '==', 'pending'));
            const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
                const requestData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setRequests(requestData);
            });

            // Load staff data
            const unsubStaff = onSnapshot(collection(db, 'staff'), (snapshot) => {
                const staffData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setStaff(staffData.sort((a, b) => (b.stars || 0) - (a.stars || 0)));
            });

            // Load recent sales
            const salesQuery = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(50));
            const unsubSales = onSnapshot(salesQuery, (snapshot) => {
                const salesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setSales(salesData);
            });

            // Load recent shifts
            const shiftsQuery = query(collection(db, 'shifts'), orderBy('timestamp', 'desc'), limit(30));
            const unsubShifts = onSnapshot(shiftsQuery, (snapshot) => {
                const shiftsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setShifts(shiftsData);
                setLoading(false);
            });

            return () => {
                unsubRequests();
                unsubStaff();
                unsubSales();
                unsubShifts();
            };
        };

        loadData();
    }, []);

    const handleApprove = async (request) => {
        showConfirmation(
            'Bekreft godkjenning',
            `Godkjenne bilag ${request.bilag} for ${request.staffName}? Dette vil tildele ${request.stars} stjerner.`,
            async () => {
                try {
                    // Add to sales collection
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

                    // Update staff stars
                    const staffRef = doc(db, 'staff', request.staffId);
                    await updateDoc(staffRef, { stars: increment(request.stars) });

                    // Delete the request (no need to update status first since we're deleting it)
                    const requestRef = doc(db, 'bilagRequests', request.id);
                    await deleteDoc(requestRef);

                    showSuccess('Bilag godkjent', `Bilag ${request.bilag} er godkjent og ${request.stars} stjerner er tildelt ${request.staffName}.`);
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

    // Additional moderator functions
    const adjustStaffStars = async (staffId, adjustment, reason) => {
        showConfirmation(
            'Juster stjerner',
            `${adjustment > 0 ? 'Legge til' : 'Trekke fra'} ${Math.abs(adjustment)} stjerner${reason ? ` - ${reason}` : ''}?`,
            async () => {
                try {
                    const staffRef = doc(db, 'staff', staffId);
                    await updateDoc(staffRef, { stars: increment(adjustment) });

                    // Log the adjustment
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

                    // Log the reset
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

    // Tab configuration
    const tabs = [
        { id: 'requests', label: 'Bilag Forespørsler', icon: FileText, count: requests.length },
        { id: 'staff', label: 'Ansatt Oversikt', icon: Users, count: staff.length },
        { id: 'sales', label: 'Salg Aktivitet', icon: TrendingUp, count: sales.length },
        { id: 'shifts', label: 'Vakt Oversikt', icon: Clock, count: shifts.length },
        { id: 'analytics', label: 'Analyser', icon: BarChart3 }
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
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <Shield className="h-8 w-8 text-white" />
                            <div>
                                <h1 className="text-2xl font-bold text-white">Moderator Dashboard</h1>
                                <p className="text-purple-100">Administrer ansatte, salg og systemaktivitet</p>
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
                                            ? 'border-purple-500 text-purple-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <tab.icon size={16} />
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                            activeTab === tab.id 
                                                ? 'bg-purple-100 text-purple-800' 
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content */}
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
                        </AnimatePresence>
                    </div>
                </div>
            </div>

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
        </>
    );
}

// Bilag Requests Tab Component
function BilagRequestsTab({ requests, handleApprove, handleDecline, openEditModal }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Ventende Bilag Forespørsler</h2>
                <div className="text-sm text-gray-600">
                    {requests.length} forespørsler venter på godkjenning
                </div>
            </div>

            {requests.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen ventende forespørsler</h3>
                    <p className="text-gray-600">Alle bilag forespørsler er behandlet!</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {requests.map((req, i) => (
                        <motion.div
                            key={req.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                        <FileText className="text-blue-600" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{req.staffName}</h3>
                                        <p className="text-sm text-gray-600">Bilag: {req.bilag}</p>
                                        <p className="text-xs text-gray-500">{req.category} - {req.service}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-lg font-bold text-yellow-600">
                                            <Star size={18} />
                                            {req.stars}
                                        </div>
                                        <p className="text-xs text-gray-500">stjerner</p>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(req)}
                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                            title="Rediger"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDecline(req)}
                                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Avslå"
                                        >
                                            <X size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleApprove(req)}
                                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                            title="Godkjenn"
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

// Staff Management Tab Component
function StaffManagementTab({ staff, adjustStaffStars, resetStaffStars }) {
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [adjustmentAmount, setAdjustmentAmount] = useState('');
    const [adjustmentReason, setAdjustmentReason] = useState('');

    const handleStarAdjustment = (staffId, amount) => {
        const reason = adjustmentReason.trim() || 'Moderator justering';
        adjustStaffStars(staffId, parseInt(amount), reason);
        setSelectedStaff(null);
        setAdjustmentAmount('');
        setAdjustmentReason('');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Ansatt Administrasjon</h2>
                <div className="text-sm text-gray-600">
                    {staff.length} ansatte totalt
                </div>
            </div>

            <div className="grid gap-4">
                {staff.map((member, i) => (
                    <motion.div
                        key={member.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {member.name?.charAt(0) || 'A'}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{member.name}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <span>Vakter: {member.shifts || 0}</span>
                                        <span>Salg: {member.totalSales || 0}</span>
                                        <span>Avg. per vakt: {member.shifts > 0 ? ((member.stars || 0) / member.shifts).toFixed(1) : '0.0'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-2xl font-bold text-yellow-600">
                                        <Star size={24} />
                                        {member.stars || 0}
                                    </div>
                                    <p className="text-xs text-gray-500">totale stjerner</p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedStaff(member)}
                                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                    >
                                        Juster Stjerner
                                    </button>
                                    <button
                                        onClick={() => resetStaffStars(member.id, member.name)}
                                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                    >
                                        Nullstill
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Star Adjustment Modal */}
            {selectedStaff && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold mb-4">Juster stjerner for {selectedStaff.name}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Justering (+ for å legge til, - for å trekke fra)
                                </label>
                                <input
                                    type="number"
                                    value={adjustmentAmount}
                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="f.eks. +5 eller -3"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Begrunnelse (valgfritt)
                                </label>
                                <input
                                    type="text"
                                    value={adjustmentReason}
                                    onChange={(e) => setAdjustmentReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="f.eks. Bonus for god innsats"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setSelectedStaff(null)}
                                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Avbryt
                            </button>
                            <button
                                onClick={() => handleStarAdjustment(selectedStaff.id, adjustmentAmount)}
                                disabled={!adjustmentAmount}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                Juster
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// Sales Activity Tab Component
function SalesActivityTab({ sales, deleteSale }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Salg Aktivitet</h2>
                <div className="text-sm text-gray-600">
                    Siste {sales.length} salg
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium">Ansatt</th>
                                <th className="px-6 py-3 text-left font-medium">Bilag</th>
                                <th className="px-6 py-3 text-left font-medium">Tjeneste</th>
                                <th className="px-6 py-3 text-center font-medium">Stjerner</th>
                                <th className="px-6 py-3 text-left font-medium">Tidspunkt</th>
                                <th className="px-6 py-3 text-right font-medium">Handlinger</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sales.map((sale, i) => (
                                <motion.tr
                                    key={sale.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    className="hover:bg-gray-50"
                                >
                                    <td className="px-6 py-4 font-medium text-gray-900">{sale.staffName}</td>
                                    <td className="px-6 py-4 text-gray-600">{sale.bilag}</td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">{sale.category}</p>
                                            <p className="text-xs text-gray-500">{sale.service}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1 text-yellow-600 font-bold">
                                            <Star size={14} />
                                            {sale.stars}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {sale.timestamp?.toDate().toLocaleDateString('no-NO', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => deleteSale(sale.id, sale.staffName, sale.stars)}
                                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Slett salg"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
}

// Shifts Overview Tab Component
function ShiftsOverviewTab({ shifts, deleteShift }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Vakt Oversikt</h2>
                <div className="text-sm text-gray-600">
                    Siste {shifts.length} vakter
                </div>
            </div>

            <div className="grid gap-4">
                {shifts.map((shift, i) => (
                    <motion.div
                        key={shift.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <Clock className="text-green-600" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{shift.staffName}</h3>
                                    <p className="text-sm text-gray-600">
                                        {shift.timestamp?.toDate().toLocaleDateString('no-NO', {
                                            weekday: 'long',
                                            day: '2-digit',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Registrert: {shift.timestamp?.toDate().toLocaleTimeString('no-NO', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-lg font-bold text-gray-900">Vakt #{i + 1}</div>
                                    <p className="text-xs text-gray-500">Registrert vakt</p>
                                </div>

                                <button
                                    onClick={() => deleteShift(shift.id, shift.staffName)}
                                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Slett vakt"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

// Analytics Tab Component
function AnalyticsTab({ staff, sales, shifts }) {
    const totalStars = staff.reduce((sum, member) => sum + (member.stars || 0), 0);
    const totalSales = sales.length;
    const totalShifts = shifts.length;
    const avgStarsPerStaff = staff.length > 0 ? (totalStars / staff.length).toFixed(1) : 0;
    const avgSalesPerDay = sales.length > 0 ? (sales.length / 7).toFixed(1) : 0; // Assuming last week

    // Top performers
    const topPerformers = staff.slice(0, 5);

    // Recent activity by category
    const salesByCategory = sales.reduce((acc, sale) => {
        acc[sale.category] = (acc[sale.category] || 0) + 1;
        return acc;
    }, {});

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <h2 className="text-xl font-semibold text-gray-900">System Analyser</h2>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Star size={24} />
                        <div>
                            <p className="text-blue-100 text-sm">Totale Stjerner</p>
                            <p className="text-2xl font-bold">{totalStars}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl">
                    <div className="flex items-center gap-3">
                        <TrendingUp size={24} />
                        <div>
                            <p className="text-green-100 text-sm">Totale Salg</p>
                            <p className="text-2xl font-bold">{totalSales}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Clock size={24} />
                        <div>
                            <p className="text-purple-100 text-sm">Totale Vakter</p>
                            <p className="text-2xl font-bold">{totalShifts}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Users size={24} />
                        <div>
                            <p className="text-orange-100 text-sm">Aktive Ansatte</p>
                            <p className="text-2xl font-bold">{staff.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performers */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Topp Presterende</h3>
                    <div className="space-y-3">
                        {topPerformers.map((member, index) => (
                            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                        index === 0 ? 'bg-yellow-500' : 
                                        index === 1 ? 'bg-gray-400' : 
                                        index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                                    }`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{member.name}</p>
                                        <p className="text-xs text-gray-500">{member.shifts || 0} vakter</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-yellow-600 font-bold">
                                    <Star size={16} />
                                    {member.stars || 0}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sales by Category */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Salg per Kategori</h3>
                    <div className="space-y-3">
                        {Object.entries(salesByCategory).map(([category, count]) => (
                            <div key={category} className="flex items-center justify-between">
                                <span className="text-gray-700">{category}</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-20 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${(count / totalSales) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 min-w-[2rem]">{count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default Moderator;
