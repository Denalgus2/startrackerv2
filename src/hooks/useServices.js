import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

// Hook to get services from Firestore instead of hardcoded data
export function useServices() {
    const { currentUser, loading: authLoading } = useAuth();
    const [serviceCategories, setServiceCategories] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Don't set up listeners until auth is ready
        if (authLoading) {
            return;
        }

        // If no user is authenticated, use fallback data
        if (!currentUser) {
            setServiceCategories({
                Forsikring: {
                    'Mindre enn 100kr x3': 1,
                    '100-299kr x2': 1,
                    '300-499kr': 1,
                    '500-999kr': 2,
                    '1000-1499kr': 3,
                    '1500kr+': 4,
                },
                'AVS/Support': {
                    'MOBOFUSM': 1,
                    'Teletime15 x3': 1,
                    'Pctime15 x3': 1,
                    'Mdatime15 x3': 1,
                    'Teletime30 x2': 1,
                    'Pctime30 x2': 1,
                    'Mdatime30 x2': 1,
                    'Teletime60': 1,
                    'Pctime60': 1,
                    'Mdatime60': 1,
                    'RTGWEARABLES x2': 1,
                    'Annen RTG': 1,
                    'SUPPORTAVTALE 6mnd': 2,
                    'SUPPORTAVTALE 12mnd': 3,
                    'SUPPORTAVTALE 24mnd': 4,
                    'SUPPORTAVTALE 36mnd': 5,
                    'Installasjon hvitevare': 3,
                    'Returgreen': 1,
                },
                'Kundeklubb': {
                    '20%': 1,
                    '40%': 2,
                    '60%': 3,
                    '80%': 4,
                    '100%': 5,
                },
                'Annet': {
                    'Kunnskap Sjekkliste': 3,
                    'Todolist - Fylt ut 1 uke': 1,
                    'Todolist - Alt JA 1 uke': 2
                }
            });
            setLoading(false);
            return;
        }

        let unsubscribe = null;

        try {
            const servicesRef = doc(db, 'config', 'services');
            unsubscribe = onSnapshot(servicesRef,
                (doc) => {
                    if (doc.exists()) {
                        setServiceCategories(doc.data().categories || {});
                    } else {
                        // Fallback to default services if none exist in Firestore
                        setServiceCategories({
                            Forsikring: {
                                'Mindre enn 100kr x3': 1,
                                '100-299kr x2': 1,
                                '300-499kr': 1,
                                '500-999kr': 2,
                                '1000-1499kr': 3,
                                '1500kr+': 4,
                            },
                            'AVS/Support': {
                                'MOBOFUSM': 1,
                                'Teletime15 x3': 1,
                                'Pctime15 x3': 1,
                                'Mdatime15 x3': 1,
                                'Teletime30 x2': 1,
                                'Pctime30 x2': 1,
                                'Mdatime30 x2': 1,
                                'Teletime60': 1,
                                'Pctime60': 1,
                                'Mdatime60': 1,
                                'RTGWEARABLES x2': 1,
                                'Annen RTG': 1,
                                'SUPPORTAVTALE 6mnd': 2,
                                'SUPPORTAVTALE 12mnd': 3,
                                'SUPPORTAVTALE 24mnd': 4,
                                'SUPPORTAVTALE 36mnd': 5,
                                'Installasjon hvitevare': 3,
                                'Returgreen': 1,
                            },
                            'Kundeklubb': {
                                '20%': 1,
                                '40%': 2,
                                '60%': 3,
                                '80%': 4,
                                '100%': 5,
                            },
                            'Annet': {
                                'Kunnskap Sjekkliste': 3,
                                'Todolist - Fylt ut 1 uke': 1,
                                'Todolist - Alt JA 1 uke': 2
                            }
                        });
                    }
                    setLoading(false);
                },
                (error) => {
                    console.error('Error listening to services config:', error);
                    // Use fallback data on error
                    setServiceCategories({
                        Forsikring: {
                            'Mindre enn 100kr x3': 1,
                            '100-299kr x2': 1,
                            '300-499kr': 1,
                            '500-999kr': 2,
                            '1000-1499kr': 3,
                            '1500kr+': 4,
                        },
                        'AVS/Support': {
                            'MOBOFUSM': 1,
                            'Teletime15 x3': 1,
                            'Pctime15 x3': 1,
                            'Mdatime15 x3': 1,
                            'Teletime30 x2': 1,
                            'Pctime30 x2': 1,
                            'Mdatime30 x2': 1,
                            'Teletime60': 1,
                            'Pctime60': 1,
                            'Mdatime60': 1,
                            'RTGWEARABLES x2': 1,
                            'Annen RTG': 1,
                            'SUPPORTAVTALE 6mnd': 2,
                            'SUPPORTAVTALE 12mnd': 3,
                            'SUPPORTAVTALE 24mnd': 4,
                            'SUPPORTAVTALE 36mnd': 5,
                            'Installasjon hvitevare': 3,
                            'Returgreen': 1,
                        },
                        'Kundeklubb': {
                            '20%': 1,
                            '40%': 2,
                            '60%': 3,
                            '80%': 4,
                            '100%': 5,
                        },
                        'Annet': {
                            'Kunnskap Sjekkliste': 3,
                            'Todolist - Fylt ut 1 uke': 1,
                            'Todolist - Alt JA 1 uke': 2
                        }
                    });
                    setLoading(false);
                }
            );
        } catch (error) {
            console.error('Error setting up services config listener:', error);
            setLoading(false);
        }

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [currentUser, authLoading]);

    return { serviceCategories, loading };
}
