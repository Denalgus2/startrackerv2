import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import GlobalHistory from '../components/GlobalHistory';
import StaffHistory from '../components/StaffHistory';
import { AnimatePresence, motion } from 'framer-motion';

function History() {
    const { currentUser, loading: authLoading } = useAuth();
    const [sales, setSales] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('global');

    useEffect(() => {
        // Wait for auth before wiring listeners
        if (authLoading) {
            return;
        }

        if (!currentUser) {
            setSales([]);
            setStaff([]);
            setLoading(false);
            return;
        }

        let unsubSales = null;
        let unsubStaff = null;

        setLoading(true);

        try {
            const salesQuery = query(collection(db, 'sales'), orderBy('timestamp', 'desc'));
            unsubSales = onSnapshot(salesQuery,
                (snapshot) => {
                    setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoading(false);
                },
                (error) => {
                    console.error('Error listening to sales:', error);
                    setSales([]);
                    setLoading(false);
                }
            );

            unsubStaff = onSnapshot(collection(db, 'staff'),
                (snapshot) => {
                    setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                },
                (error) => {
                    console.error('Error listening to staff:', error);
                    setStaff([]);
                }
            );
        } catch (error) {
            console.error('Error setting up History listeners:', error);
            setLoading(false);
        }

        return () => {
            if (unsubSales) unsubSales();
            if (unsubStaff) unsubStaff();
        };
    }, [currentUser, authLoading]);

    if (loading) return <div className="text-center p-10">Laster historikk...</div>;

    const combinedHistory = sales;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-on-surface">Salgshistorikk</h2>
            <div className="flex border-b border-border-color">
                <TabButton name="Global Historikk" tab="global" activeTab={activeTab} setTab={setActiveTab} />
                <TabButton name="Ansatt Historikk" tab="staff" activeTab={activeTab} setTab={setActiveTab} />
            </div>
            <div className="mt-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'global'
                            ? <GlobalHistory sales={combinedHistory} />
                            : <StaffHistory sales={combinedHistory} staff={staff} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

const TabButton = ({ name, tab, activeTab, setTab }) => {
    const isActive = activeTab === tab;
    return (
        <button onClick={() => setTab(tab)} className="relative px-4 py-2 text-sm font-medium text-on-surface-secondary transition-colors hover:text-on-surface">
            {isActive && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            <span className="relative z-10 font-semibold">{name}</span>
        </button>
    )
}

export default History;