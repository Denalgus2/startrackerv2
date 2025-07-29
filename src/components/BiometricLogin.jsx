import { useState, useEffect } from 'react';
import { Fingerprint, Smartphone } from 'lucide-react';
import { 
    isBiometricSupported, 
    authenticateWithBiometric, 
    hasBiometricCredentials,
    createBiometricCredentials,
    getStoredUserData,
    getDeviceInfo
} from '../utils/biometricAuth';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const BiometricLogin = ({ onSuccess, onError }) => {
    const [isSupported, setIsSupported] = useState(false);
    const [hasCredentials, setHasCredentials] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showSetup, setShowSetup] = useState(false);

    useEffect(() => {
        const checkBiometricSupport = async () => {
            console.log('Checking biometric support...');
            const supported = await isBiometricSupported();
            console.log('Biometric supported:', supported);
            setIsSupported(supported);
            
            if (supported) {
                const hasStoredCredentials = hasBiometricCredentials();
                console.log('Has stored credentials:', hasStoredCredentials);
                setHasCredentials(hasStoredCredentials);
            }
        };

        checkBiometricSupport();
    }, []);

    const handleBiometricLogin = async () => {
        setIsLoading(true);
        
        try {
            const result = await authenticateWithBiometric();
            
            if (result.success) {
                // Get stored user data
                const storedUserData = getStoredUserData();
                
                if (storedUserData) {
                    // Verify user still exists in Firestore
                    const userRef = doc(db, 'users', storedUserData.userId);
                    const userSnap = await getDoc(userRef);
                    
                    if (userSnap.exists()) {
                        // For biometric auth, we'll use a custom token approach
                        // Since we can't use dummy passwords, we'll create a secure session
                        // This is a simplified approach - in production you'd want to use Firebase Custom Auth
                        
                        // Store a temporary session token
                        const sessionToken = {
                            userId: storedUserData.userId,
                            email: storedUserData.email,
                            timestamp: Date.now(),
                            biometricVerified: true
                        };
                        
                        sessionStorage.setItem('biometricSession', JSON.stringify(sessionToken));
                        
                        // Trigger a custom event to notify the auth context
                        window.dispatchEvent(new CustomEvent('biometricLogin', { 
                            detail: { userData: storedUserData } 
                        }));
                        
                        onSuccess && onSuccess();
                    } else {
                        throw new Error('User data not found');
                    }
                } else {
                    throw new Error('No stored user data');
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Biometric login failed:', error);
            onError && onError('Biometrisk innlogging feilet. Prøv å logge inn med passord.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetupBiometric = async (email, password) => {
        setIsLoading(true);
        
        try {
            // First, authenticate with email/password to get user ID
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userId = userCredential.user.uid;
            
            // Create biometric credentials
            const result = await createBiometricCredentials(userId, email);
            
            if (result.success) {
                setHasCredentials(true);
                setShowSetup(false);
                onSuccess && onSuccess();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Biometric setup failed:', error);
            onError && onError('Kunne ikke sette opp biometrisk innlogging.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isSupported) {
        // Show debug information on all devices for development
        const isDevelopment = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' || 
                            window.location.hostname.startsWith('192.168.') || 
                            window.location.hostname.startsWith('10.0.') || 
                            window.location.hostname.startsWith('172.');
        
        if (isDevelopment) {
            return (
                <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-2">
                        <strong>Biometrisk innlogging ikke tilgjengelig</strong>
                    </p>
                    <details className="text-xs text-yellow-700">
                        <summary className="cursor-pointer">Vis detaljer</summary>
                        <div className="mt-2 text-left space-y-1">
                            {(() => {
                                const deviceInfo = getDeviceInfo();
                                return (
                                    <>
                                        <p>• WebAuthn API: {deviceInfo.hasWebAuthn ? '✓ Støttet' : '✗ Ikke støttet'}</p>
                                        <p>• HTTPS: {deviceInfo.isSecure ? '✓ Sikker' : deviceInfo.isLocalNetwork ? '⚠ HTTP (lokalt nettverk)' : '✗ HTTP (krever HTTPS)'}</p>
                                        <p>• Mobil enhet: {deviceInfo.isMobile ? '✓ Mobil' : '✗ Desktop'}</p>
                                        <p>• Touch: {deviceInfo.hasTouch ? '✓ Touch' : '✗ Ingen touch'}</p>
                                        <p>• Platform: {deviceInfo.platform}</p>
                                        <p>• Vendor: {deviceInfo.vendor}</p>
                                        <p>• User Agent: {deviceInfo.userAgent.substring(0, 50)}...</p>
                                        <p>• Hostname: {window.location.hostname}</p>
                                        <p>• Protocol: {window.location.protocol}</p>
                                    </>
                                );
                            })()}
                        </div>
                    </details>
                    <div className="mt-3 text-xs text-yellow-700">
                        <p><strong>Løsninger:</strong></p>
                        <p>• Bruk HTTP: http://10.0.0.169:5174</p>
                        <p>• Test på en mobil enhet</p>
                        <p>• Sjekk at nettleseren støtter WebAuthn</p>
                    </div>
                </div>
            );
        }
        
        return null; // Don't show anything if biometric is not supported
    }

    return (
        <div className="space-y-4">
            {hasCredentials ? (
                <button
                    onClick={handleBiometricLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg text-white font-bold text-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 shadow-lg border-2 border-blue-600 transition-all duration-150"
                >
                    <Fingerprint className="h-5 w-5" />
                    {isLoading ? 'Autentiserer...' : 'Logg inn med biometri'}
                </button>
            ) : (
                <div className="text-center">
                    <button
                        onClick={() => setShowSetup(true)}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg text-blue-600 font-bold text-lg bg-blue-50 hover:bg-blue-100 border-2 border-blue-600 transition-all duration-150"
                    >
                        <Smartphone className="h-5 w-5" />
                        Aktiver biometrisk innlogging
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                        Logg inn én gang med passord for å aktivere biometrisk innlogging
                    </p>
                </div>
            )}

            {showSetup && (
                <BiometricSetupModal 
                    onSetup={handleSetupBiometric}
                    onCancel={() => setShowSetup(false)}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
};

const BiometricSetupModal = ({ onSetup, onCancel, isLoading }) => {
    const [email, setEmail] = useState('');
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

export default BiometricLogin; 