import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export function usePendingBilagCount() {
    const { userRole, currentUser, loading: authLoading } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        // Don't set up listeners until auth is ready
        if (authLoading || !currentUser) {
            setPendingCount(0);
            return;
        }

        // Only track for moderators and admins
        if (userRole !== 'moderator' && userRole !== 'admin') {
            setPendingCount(0);
            return;
        }

        let unsubscribe = null;

        try {
            const q = query(collection(db, 'bilagRequests'), where('status', '==', 'pending'));
            unsubscribe = onSnapshot(q,
                (snapshot) => {
                    setPendingCount(snapshot.size);
                },
                (error) => {
                    console.error('Error listening to pending bilag count:', error);
                    setPendingCount(0);
                }
            );
        } catch (error) {
            console.error('Error setting up pending bilag count listener:', error);
            setPendingCount(0);
        }

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [userRole, currentUser, authLoading]);

    return pendingCount;
}
