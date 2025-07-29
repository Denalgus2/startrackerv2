import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Shield, Bell, Smartphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import BiometricSettings from '../components/BiometricSettings';

function UserSettings() {
    const { currentUser, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', label: 'Profil', icon: User },
        { id: 'security', label: 'Sikkerhet', icon: Shield },
        { id: 'notifications', label: 'Varsler', icon: Bell },
        { id: 'mobile', label: 'Mobil', icon: Smartphone }
    ];

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Settings className="h-8 w-8 text-white" />
                        <div>
                            <h1 className="text-2xl font-bold text-white">Innstillinger</h1>
                            <p className="text-blue-100">Administrer din konto og preferanser</p>
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
                    {activeTab === 'profile' && (
                        <ProfileTab currentUser={currentUser} />
                    )}

                    {activeTab === 'security' && (
                        <SecurityTab currentUser={currentUser} logout={logout} />
                    )}

                    {activeTab === 'notifications' && (
                        <NotificationsTab />
                    )}

                    {activeTab === 'mobile' && (
                        <MobileTab />
                    )}
                </div>
            </div>
        </div>
    );
}

// Profile Tab Component
function ProfileTab({ currentUser }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <h2 className="text-xl font-semibold text-gray-900">Profilinformasjon</h2>
            
            <div className="bg-gray-50 rounded-lg p-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            E-post
                        </label>
                        <input
                            type="email"
                            value={currentUser?.email || ''}
                            disabled
                            className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            E-postadressen kan ikke endres
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bruker-ID
                        </label>
                        <input
                            type="text"
                            value={currentUser?.uid || ''}
                            disabled
                            className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 text-sm"
                        />
                    </div>

                    {currentUser?.isBiometric && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <Smartphone className="h-5 w-5 text-blue-600" />
                                <div>
                                    <p className="font-medium text-blue-800">Biometrisk innlogging aktiv</p>
                                    <p className="text-sm text-blue-700">Du er logget inn med biometrisk autentisering</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// Security Tab Component
function SecurityTab({ currentUser, logout }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <h2 className="text-xl font-semibold text-gray-900">Sikkerhet</h2>
            
            <div className="space-y-4">
                {/* Biometric Authentication Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <BiometricSettings />
                </div>

                {/* Password Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Passord</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        For å endre passord, kontakt en administrator.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div>
                                <p className="font-medium text-yellow-800">Passordendring</p>
                                <p className="text-sm text-yellow-700 mt-1">
                                    Passordendring er for øyeblikket kun tilgjengelig via administrator.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logout Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Sesjon</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Logg ut fra din nåværende sesjon.
                    </p>
                    <button
                        onClick={logout}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Logg ut
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// Notifications Tab Component
function NotificationsTab() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <h2 className="text-xl font-semibold text-gray-900">Varsler</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-yellow-800">Varselinnstillinger</h3>
                        <p className="text-yellow-700 text-sm mt-1">
                            Varselinnstillinger kommer snart! Du vil kunne tilpasse hvordan du mottar varsler om nye konkurranser, resultater og mer.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// Mobile Tab Component
function MobileTab() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <h2 className="text-xl font-semibold text-gray-900">Mobilopplevelse</h2>
            
            <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                        <Smartphone className="h-6 w-6 text-blue-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-blue-800">Mobiloptimalisert</h3>
                            <p className="text-blue-700 text-sm mt-1">
                                StarTracker er optimalisert for mobilbruk. Du kan legge til denne nettsiden på hjemmeskjermen for en app-lignende opplevelse.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                        <Shield className="h-6 w-6 text-green-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-green-800">Biometrisk innlogging</h3>
                            <p className="text-green-700 text-sm mt-1">
                                På mobile enheter kan du aktivere fingeravtrykk eller ansiktsgjenkjenning for rask innlogging. Gå til Sikkerhet-fanen for å sette opp.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default UserSettings; 