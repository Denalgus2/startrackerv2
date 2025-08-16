import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let userRoleListener = null;

        const authStateListener = onAuthStateChanged(auth, async (user) => {
            // Enter a loading state whenever auth changes so routes don't bounce while role resolves
            setLoading(true);
            setCurrentUser(user);
            setUserRole(null);

            // Clean up previous listener
            if (userRoleListener) {
                userRoleListener();
                userRoleListener = null;
            }

            if (user) {
                // Best-effort backfill: ensure the public username mapping contains an email
                try {
                    const username = user.displayName?.trim()?.toLowerCase();
                    const email = user.email?.toLowerCase();
                    if (username && email) {
                        const usernameRef = doc(db, 'usernames', username);
                        await setDoc(usernameRef, { uid: user.uid, email }, { merge: true });
                    }
                } catch (e) {
                    // Non-fatal
                    console.warn('Username mapping backfill failed:', e);
                }

                // When a user is logged in, listen for changes to their role document.
                const userDocRef = doc(db, 'users', user.uid);
                userRoleListener = onSnapshot(userDocRef,
                    (docSnap) => {
                        if (docSnap.exists()) {
                            setUserRole(docSnap.data().role);
                        } else {
                            // If the document doesn't exist, the role is simply null.
                            // The VerifyEmail page is now responsible for creating it.
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
                // User is logged out.
                setLoading(false);
            }
        });

        return () => {
            if (authStateListener) {
                authStateListener();
            }
            if (userRoleListener) {
                userRoleListener();
            }
        };
    }, []);

    const value = {
        currentUser,
        userRole,
        loading
    };

    if (loading) {
        // Optional: lightweight splash to avoid blank page during initial load
        return <div className="min-h-screen flex items-center justify-center bg-background text-on-surface-secondary">Laster...</div>;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
