import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { serviceCategories } from '../data/services';
import { X, Star, Trash2, Edit3, Save, XCircle } from 'lucide-react';

function StaffHistoryModal({ isOpen, onClose, staffMember }) {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ bilag: '', category: '', service: '' });

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        const salesQuery = query(
            collection(db, 'sales'),
            where('staffId', '==', staffMember.id)
            // Removed orderBy to avoid index requirement
        );
        const unsub = onSnapshot(salesQuery, (snapshot) => {
            const salesData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            // Sort in JavaScript instead of Firestore
            salesData.sort((a, b) => {
                if (!a.timestamp || !b.timestamp) return 0;
                return b.timestamp.toDate() - a.timestamp.toDate();
            });
            setSales(salesData);
            setLoading(false);
        });
        return () => unsub();
    }, [isOpen, staffMember.id]);

    const startEdit = (sale) => {
        setEditingId(sale.id);
        setEditForm({
            bilag: sale.bilag,
            category: sale.category,
            service: sale.service
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ bilag: '', category: '', service: '' });
    };

    const saveEdit = async (sale) => {
        try {
            const oldStars = sale.stars;
            const newStars = serviceCategories[editForm.category][editForm.service];
            const starDifference = newStars - oldStars;

            // Update the sale record
            await updateDoc(doc(db, 'sales', sale.id), {
                bilag: editForm.bilag,
                category: editForm.category,
                service: editForm.service,
                stars: newStars
            });

            // Update staff total stars if they changed
            if (starDifference !== 0) {
                const staffRef = doc(db, 'staff', staffMember.id);
                await updateDoc(staffRef, { stars: increment(starDifference) });
            }

            setEditingId(null);
            setEditForm({ bilag: '', category: '', service: '' });
        } catch (error) {
            alert('Feil ved oppdatering: ' + error.message);
        }
    };

    const deleteSale = async (sale) => {
        if (!confirm(`Er du sikker på at du vil slette bilag ${sale.bilag}?`)) return;

        try {
            // Delete the sale record
            await deleteDoc(doc(db, 'sales', sale.id));

            // Subtract stars from staff total
            const staffRef = doc(db, 'staff', staffMember.id);
            await updateDoc(staffRef, { stars: increment(-sale.stars) });
        } catch (error) {
            alert('Feil ved sletting: ' + error.message);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
                    style={{ isolation: 'isolate' }}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-xl w-full max-w-4xl border-2 border-[#009A44] shadow-xl flex flex-col h-full max-h-[85vh] relative z-10"
                        style={{ backgroundColor: '#ffffff' }}
                    >
                        <header className="flex-shrink-0 flex justify-between items-center p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900">
                                Salgshistorikk for <span className="text-[#009A44]">{staffMember.name}</span>
                            </h3>
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                                <X size={24}/>
                            </button>
                        </header>

                        <div className="flex-grow overflow-y-auto">
                            {loading ? (
                                <p className="p-6 text-center text-gray-500">Laster historikk...</p>
                            ) : sales.length === 0 ? (
                                <p className="p-6 text-center text-gray-500">Ingen salg registrert.</p>
                            ) : (
                                <div className="p-6">
                                    <div className="space-y-3">
                                        {sales.map(sale => (
                                            <div key={sale.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#009A44] transition-colors">
                                                {editingId === sale.id ? (
                                                    // Edit Mode
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">Bilag</label>
                                                                <input
                                                                    type="text"
                                                                    value={editForm.bilag}
                                                                    onChange={(e) => setEditForm({...editForm, bilag: e.target.value})}
                                                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#009A44] outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                                                                <select
                                                                    value={editForm.category}
                                                                    onChange={(e) => setEditForm({...editForm, category: e.target.value, service: ''})}
                                                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#009A44] outline-none"
                                                                >
                                                                    <option value="">Velg kategori...</option>
                                                                    {Object.keys(serviceCategories).map(cat => (
                                                                        <option key={cat} value={cat}>{cat}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">Tjeneste</label>
                                                                <select
                                                                    value={editForm.service}
                                                                    onChange={(e) => setEditForm({...editForm, service: e.target.value})}
                                                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#009A44] outline-none"
                                                                    disabled={!editForm.category}
                                                                >
                                                                    <option value="">Velg tjeneste...</option>
                                                                    {editForm.category && Object.keys(serviceCategories[editForm.category]).map(service => (
                                                                        <option key={service} value={service}>{service}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => saveEdit(sale)}
                                                                disabled={!editForm.bilag || !editForm.category || !editForm.service}
                                                                className="flex items-center gap-2 px-3 py-2 bg-[#009A44] text-white rounded hover:bg-green-700 disabled:opacity-50"
                                                            >
                                                                <Save size={16} />
                                                                Lagre
                                                            </button>
                                                            <button
                                                                onClick={cancelEdit}
                                                                className="flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                                            >
                                                                <XCircle size={16} />
                                                                Avbryt
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // View Mode
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                                                            <div>
                                                                <div className="text-xs text-gray-500 mb-1">Dato</div>
                                                                <div className="text-sm font-medium">
                                                                    {sale.timestamp?.toDate().toLocaleDateString('no-NO') || 'N/A'}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {sale.timestamp?.toDate().toLocaleTimeString('no-NO', {hour: '2-digit', minute: '2-digit'}) || ''}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-gray-500 mb-1">Bilag</div>
                                                                <div className="text-sm font-medium">{sale.bilag}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-gray-500 mb-1">Tjeneste</div>
                                                                <div className="text-sm">{sale.category}</div>
                                                                <div className="text-xs text-gray-600">{sale.service}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-gray-500 mb-1">Stjerner</div>
                                                                <div className="flex items-center gap-1 text-[#009A44] font-bold">
                                                                    {sale.stars} <Star size={14} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 ml-4">
                                                            <button
                                                                onClick={() => startEdit(sale)}
                                                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                                                title="Rediger"
                                                            >
                                                                <Edit3 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteSale(sale)}
                                                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                                                title="Slett"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function AddSaleModal({ isOpen, onClose, staffId, staffName }) {
    const [formData, setFormData] = useState({ bilag: '', service: '', stars: 0 });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, 'sales'), {
                staffId,
                staffName,
                bilag: formData.bilag,
                service: formData.service,
                stars: Number(formData.stars),
                timestamp: serverTimestamp()
            });
            setFormData({ bilag: '', service: '', stars: 0 });
            onClose();
        } catch (err) {
            // handle error
        }
        setLoading(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/30 z-[99] grid place-items-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-surface rounded-xl w-full max-w-lg border-2 border-[#009A44] shadow-xl flex flex-col h-full max-h-[80vh] z-[100] relative"
                    >
                        <header className="flex justify-between items-center p-6 border-b border-border-color">
                            <div>
                                <h3 className="text-xl font-bold text-on-surface">Registrer Salg</h3>
                                <p className="text-sm text-on-surface-secondary">For ansatt: <span className="font-semibold text-primary">{staffName}</span></p>
                            </div>
                            <button onClick={onClose} className="text-on-surface-secondary hover:text-on-surface transition-colors"><X size={24}/></button>
                        </header>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={formData.bilag}
                                    onChange={e => setFormData({ ...formData, bilag: e.target.value })}
                                    placeholder="Bilagsnummer"
                                    className="w-full pl-3 pr-3 py-3 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={formData.service}
                                    onChange={e => setFormData({ ...formData, service: e.target.value })}
                                    placeholder="Tjeneste"
                                    className="w-full pl-3 pr-3 py-3 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    required
                                    min={0}
                                    value={formData.stars}
                                    onChange={e => setFormData({ ...formData, stars: e.target.value })}
                                    placeholder="Stjerner"
                                    className="w-full pl-3 pr-3 py-3 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-3 px-4 rounded-lg text-white font-bold text-lg bg-[#009A44] hover:bg-green-700 shadow-lg border-2 border-[#009A44] transition-all duration-150">
                                {loading ? 'Lagrer...' : 'Registrer'}
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default StaffHistoryModal;
export { AddSaleModal };
