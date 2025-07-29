import { useState, useEffect } from 'react';
import { Fingerprint, Trash2, Shield } from 'lucide-react';
import { 
    isBiometricSupported, 
    hasBiometricCredentials,
    removeBiometricCredentials,
    createBiometricCredentials
} from '../utils/biometricAuth';
import { useAuth } from '../contexts/AuthContext';

const BiometricSettings = () => {
    const [isSupported, setIsSupported] = useState(false);
    const [hasCredentials, setHasCredentials] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showSetup, setShowSetup] = useState(false);
    const { currentUser } = useAuth();

    useEffect(() => {
        const checkBiometricSupport = async () => {
            const supported = await isBiometricSupported();
            setIsSupported(supported);
            
            if (supported) {
                const hasStoredCredentials = hasBiometricCredentials();
                setHasCredentials(hasStoredCredentials);
            }
        };

        checkBiometricSupport();
    }, []);

    const handleEnableBiometric = async (email, password) => {
        setIsLoading(true);
        
        try {
            // Import signInWithEmailAndPassword here to avoid circular dependency
            const { signInWithEmailAndPassword } = await import('firebase/auth');
            const { auth } = await import('../firebase');
            
            // First, authenticate with email/password to get user ID
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userId = userCredential.user.uid;
            
            // Create biometric credentials
            const result = await createBiometricCredentials(userId, email);
            
            if (result.success) {
                setHasCredentials(true);
                setShowSetup(false);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Biometric setup failed:', error);
            alert('Kunne ikke aktivere biometrisk innlogging. Sjekk at e-post og passord er riktig.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisableBiometric = () => {
        if (window.confirm('Er du sikker på at du vil deaktivere biometrisk innlogging?')) {
            removeBiometricCredentials();
            setHasCredentials(false);
        }
    };

    if (!isSupported) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-yellow-600" />
                    <div>
                        <h3 className="font-medium text-yellow-800">Biometrisk innlogging ikke tilgjengelig</h3>
                        <p className="text-sm text-yellow-700 mt-1">
                            Din enhet støtter ikke biometrisk innlogging eller du bruker ikke en mobil enhet.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Fingerprint className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold">Biometrisk innlogging</h3>
            </div>
            
            <p className="text-sm text-gray-600">
                Aktiver fingeravtrykk eller ansiktsgjenkjenning for rask innlogging på denne enheten.
            </p>

            {hasCredentials ? (
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Fingerprint className="h-5 w-5 text-green-600" />
                            <div>
                                <p className="font-medium text-green-800">Biometrisk innlogging aktivert</p>
                                <p className="text-sm text-green-700">Du kan logge inn med fingeravtrykk eller ansiktsgjenkjenning</p>
                            </div>
                        </div>
                        <button
                            onClick={handleDisableBiometric}
                            className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="text-sm">Deaktiver</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-600 mb-3">
                            Biometrisk innlogging er ikke aktivert på denne enheten.
                        </p>
                        <button
                            onClick={() => setShowSetup(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Fingerprint className="h-4 w-4" />
                            Aktiver biometrisk innlogging
                        </button>
                    </div>
                </div>
            )}

            {showSetup && (
                <BiometricSetupModal 
                    onSetup={handleEnableBiometric}
                    onCancel={() => setShowSetup(false)}
                    isLoading={isLoading}
                    userEmail={currentUser?.email}
                />
            )}
        </div>
    );
};

const BiometricSetupModal = ({ onSetup, onCancel, isLoading, userEmail }) => {
    const [email, setEmail] = useState(userEmail || '');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSetup(email, password);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Aktiver biometrisk innlogging</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Logg inn med ditt passord for å aktivere biometrisk innlogging på denne enheten.
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="email"
                        placeholder="E-post"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <input
                        type="password"
                        placeholder="Passord"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isLoading}
                            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Avbryt
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                        >
                            {isLoading ? 'Aktiverer...' : 'Aktiver'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BiometricSettings; 