import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

function AnnouncementBanner() {
    const { currentUser, loading: authLoading } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [dismissedAnnouncements, setDismissedAnnouncements] = useState([]);

    useEffect(() => {
        // Don't set up Firestore listeners until auth is ready and user is authenticated
        if (authLoading || !currentUser) {
            return;
        }

        let unsubscribe = null;

        try {
            // Load announcements from Firestore
            const announcementsRef = collection(db, 'announcements');
            unsubscribe = onSnapshot(announcementsRef,
                (snapshot) => {
                    const announcementData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })).filter(announcement => announcement.active)
                      .sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));

                    setAnnouncements(announcementData);
                },
                (error) => {
                    console.error('Error listening to announcements:', error);
                    setAnnouncements([]);
                }
            );
        } catch (error) {
            console.error('Error setting up announcement listener:', error);
        }

        // Load dismissed announcements from localStorage
        const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
        setDismissedAnnouncements(dismissed);

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [currentUser, authLoading]);

    const dismissAnnouncement = (id) => {
        const newDismissed = [...dismissedAnnouncements, id];
        setDismissedAnnouncements(newDismissed);
        localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed));
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle size={20} />;
            case 'warning': return <AlertTriangle size={20} />;
            case 'error': return <AlertCircle size={20} />;
            default: return <Info size={20} />;
        }
    };

    const getColors = (type) => {
        switch (type) {
            case 'success': return {
                bg: 'bg-green-50 border-green-200',
                text: 'text-green-800',
                icon: 'text-green-600',
                button: 'text-green-600 hover:text-green-800'
            };
            case 'warning': return {
                bg: 'bg-yellow-50 border-yellow-200',
                text: 'text-yellow-800',
                icon: 'text-yellow-600',
                button: 'text-yellow-600 hover:text-yellow-800'
            };
            case 'error': return {
                bg: 'bg-red-50 border-red-200',
                text: 'text-red-800',
                icon: 'text-red-600',
                button: 'text-red-600 hover:text-red-800'
            };
            default: return {
                bg: 'bg-blue-50 border-blue-200',
                text: 'text-blue-800',
                icon: 'text-blue-600',
                button: 'text-blue-600 hover:text-blue-800'
            };
        }
    };

    // Filter out dismissed announcements
    const visibleAnnouncements = announcements.filter(
        announcement => !dismissedAnnouncements.includes(announcement.id)
    );

    if (visibleAnnouncements.length === 0) return null;

    return (
        <div className="space-y-3">
            <AnimatePresence>
                {visibleAnnouncements.map((announcement) => {
                    const colors = getColors(announcement.type);
                    return (
                        <motion.div
                            key={announcement.id}
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            className={`border rounded-lg p-4 shadow-sm ${colors.bg}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={colors.icon}>
                                    {getIcon(announcement.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-semibold ${colors.text}`}>
                                        {announcement.title}
                                    </h3>
                                    <p className={`mt-1 text-sm ${colors.text} opacity-90`}>
                                        {announcement.message}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {announcement.createdAt?.toDate().toLocaleDateString('no-NO', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <button
                                    onClick={() => dismissAnnouncement(announcement.id)}
                                    className={`p-1 rounded hover:bg-white/50 transition-colors ${colors.button}`}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

export default AnnouncementBanner;
