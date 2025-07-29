import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getStoredUserData } from '../utils/biometricAuth';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [biometricSession, setBiometricSession] = useState(null);

    useEffect(() => {
        let userRoleListener = null;

        // Check for existing biometric session
        const checkBiometricSession = () => {
            const sessionData = sessionStorage.getItem('biometricSession');
            if (sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    // Check if session is still valid (24 hours)
                    const sessionAge = Date.now() - session.timestamp;
                    if (sessionAge < 24 * 60 * 60 * 1000) {
                        setBiometricSession(session);
                        return session;
                    } else {
                        // Session expired, remove it
                        sessionStorage.removeItem('biometricSession');
                    }
                } catch (error) {
                    console.error('Error parsing biometric session:', error);
                    sessionStorage.removeItem('biometricSession');
                }
            }
            return null;
        };

        // Handle biometric login events
        const handleBiometricLogin = (event) => {
            const { userData } = event.detail;
            const session = {
                userId: userData.userId,
                email: userData.email,
                timestamp: Date.now(),
                biometricVerified: true
            };
            sessionStorage.setItem('biometricSession', JSON.stringify(session));
            setBiometricSession(session);
        };

        // Check for biometric session on mount
        const existingSession = checkBiometricSession();

        const authStateListener = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Regular Firebase auth user
                setCurrentUser(user);
                setBiometricSession(null);
            } else if (biometricSession || existingSession) {
                // Biometric session user
                const session = biometricSession || existingSession;
                setCurrentUser({
                    uid: session.userId,
                    email: session.email,
                    isBiometric: true
                });
            } else {
                setCurrentUser(null);
            }

            setUserRole(null);

            // Clean up previous listener
            if (userRoleListener) {
                userRoleListener();
                userRoleListener = null;
            }

            const userId = user?.uid || biometricSession?.userId || existingSession?.userId;
            if (userId) {
                // When a user is logged in, listen for changes to their role document.
                const userDocRef = doc(db, 'users', userId);
                userRoleListener = onSnapshot(userDocRef,
                    (docSnap) => {
                        if (docSnap.exists()) {
                            setUserRole(docSnap.data().role);
                        } else {
                            setUserRole(null);
                        }
                        setLoading(false);
                    },
                    (error) => {
                        console.error('Error listening to user role:', error);
                        setUserRole(null);
                        setLoading(false);
                    }
                );
            } else {
                setLoading(false);
            }
        });

        // Add event listener for biometric login
        window.addEventListener('biometricLogin', handleBiometricLogin);

        return () => {
            if (authStateListener) {
                authStateListener();
            }
            if (userRoleListener) {
                userRoleListener();
            }
            window.removeEventListener('biometricLogin', handleBiometricLogin);
        };
    }, [biometricSession]);

    const logout = () => {
        // Clear biometric session
        sessionStorage.removeItem('biometricSession');
        setBiometricSession(null);
        
        // Sign out from Firebase
        auth.signOut();
    };

    const value = {
        currentUser,
        userRole,
        loading,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
