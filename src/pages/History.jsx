import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import GlobalHistory from '../components/GlobalHistory';
import StaffHistory from '../components/StaffHistory';
import { AnimatePresence, motion } from 'framer-motion';

function History() {
    const [sales, setSales] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('global');

    useEffect(() => {
        const salesQuery = query(collection(db, 'sales'), orderBy('timestamp', 'desc'));
        const unsubSales = onSnapshot(salesQuery, (snapshot) => {
            setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        const unsubStaff = onSnapshot(collection(db, 'staff'), (snapshot) => {
            setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => { unsubSales(); unsubStaff(); };
    }, []);

    if (loading) return <div className="text-center p-10">Laster historikk...</div>;

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
                        {activeTab === 'global' ? <GlobalHistory sales={sales} /> : <StaffHistory sales={sales} staff={staff} />}
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