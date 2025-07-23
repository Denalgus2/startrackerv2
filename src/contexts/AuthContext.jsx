import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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

        const authStateListener = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setUserRole(null);

            // Clean up previous listener
            if (userRoleListener) {
                userRoleListener();
                userRoleListener = null;
            }

            if (user) {
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

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
