import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, increment, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import { Check, X, Edit, Clock, User, FileText, ShoppingBag, Star } from 'lucide-react';
import EditBilagRequestModal from '../components/EditBilagRequestModal'; // Import the new modal

function Moderator() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingRequest, setEditingRequest] = useState(null); // State to hold the request being edited
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'bilagRequests'), where('status', '==', 'pending'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requestData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRequests(requestData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleApproval = async (request, newStatus) => {
        const requestRef = doc(db, 'bilagRequests', request.id);

        if (newStatus === 'approved') {
            if (!window.confirm(`Godkjenne bilag ${request.bilag} for ${request.staffName}? Dette vil tildele ${request.stars} stjerner.`)) return;

            try {
                await addDoc(collection(db, 'sales'), {
                    staffId: request.staffId,
                    staffName: request.staffName,
                    bilag: request.bilag,
                    category: request.category,
                    service: request.service,
                    stars: request.stars,
                    timestamp: serverTimestamp(),
                    approvedAt: serverTimestamp(),
                });

                const staffRef = doc(db, 'staff', request.staffId);
                await updateDoc(staffRef, { stars: increment(request.stars) });

                await deleteDoc(requestRef);

            } catch (error) {
                console.error("Error approving request: ", error);
                alert("En feil oppstod under godkjenning.");
            }
        } else if (newStatus === 'denied') {
            if (!window.confirm(`Avslå bilag ${request.bilag} for ${request.staffName}?`)) return;
            await deleteDoc(requestRef);
        }
    };

    const openEditModal = (request) => {
        setEditingRequest(request);
        setIsEditModalOpen(true);
    };

    return (
        <>
            <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-on-surface mb-6">Godkjenning av Bilag</h2>
                <div className="bg-surface rounded-xl border border-border-color shadow-sm">
                    <div className="p-4 border-b border-border-color">
                        <h3 className="text-lg font-semibold text-on-surface">
                            Ventende forespørsler ({requests.length})
                        </h3>
                    </div>
                    {loading ? (
                        <p className="p-4 text-center">Laster forespørsler...</p>
                    ) : requests.length === 0 ? (
                        <p className="p-4 text-center text-on-surface-secondary">Ingen ventende forespørsler.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-background text-xs text-on-surface-secondary uppercase">
                                <tr>
                                    <th className="px-6 py-3">Ansatt</th>
                                    <th className="px-6 py-3">Bilag</th>
                                    <th className="px-6 py-3">Tjeneste</th>
                                    <th className="px-6 py-3 text-center">Stjerner</th>
                                    <th className="px-6 py-3 text-right">Handlinger</th>
                                </tr>
                                </thead>
                                <tbody>
                                {requests.map((req, i) => (
                                    <motion.tr
                                        key={req.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="border-b border-border-color last:border-b-0 hover:bg-background"
                                    >
                                        <td className="px-6 py-4 font-medium"><User className="inline mr-2 h-4 w-4"/>{req.staffName}</td>
                                        <td className="px-6 py-4"><FileText className="inline mr-2 h-4 w-4"/>{req.bilag}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium">{req.category}</p>
                                            <p className="text-xs text-on-surface-secondary">{req.service}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-primary">
                                            <div className="flex items-center justify-center gap-1">
                                                <Star size={16}/> {req.stars}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => openEditModal(req)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Edit size={16}/></button>
                                                <button onClick={() => handleApproval(req, 'denied')} className="p-2 text-red-600 hover:bg-red-100 rounded-lg"><X size={16}/></button>
                                                <button onClick={() => handleApproval(req, 'approved')} className="p-2 text-green-600 hover:bg-green-100 rounded-lg"><Check size={16}/></button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <EditBilagRequestModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onUpdate={() => console.log("Request updated!")} // Optional: Add a success message
                request={editingRequest}
            />
        </>
    );
}

export default Moderator;
