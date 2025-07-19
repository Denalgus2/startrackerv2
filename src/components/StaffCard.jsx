import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Plus, List, Calendar, Trash2, Edit, Plane } from 'lucide-react';
import AddSaleModal from './AddSaleModal';
import StaffHistoryModal from './StaffHistoryModal';
import ShiftCalendarModal from './ShiftCalendarModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import ManualStarModal from './ManualStarModal';
import ProfileStatsModal from './ProfileStatsModal';
import FerieModal from './FerieModal';
import { doc, updateDoc, increment, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

function StaffCard({ staffMember, areStarsHidden }) {
    const [isSaleModalOpen, setSaleModalOpen] = useState(false);
    const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
    const [isCalendarOpen, setCalendarOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isManualStarModalOpen, setManualStarModalOpen] = useState(false);
    const [isProfileStatsOpen, setProfileStatsOpen] = useState(false);
    const [isFerieModalOpen, setFerieModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const handleShiftsSave = async (numShifts) => {
        const staffRef = doc(db, 'staff', staffMember.id);
        await updateDoc(staffRef, { shifts: increment(numShifts) });
        setCalendarOpen(false);
    };

    const handleDeleteStaff = async () => {
        setIsDeleting(true);
        try {
            // Delete all sales records for this staff member
            const salesQuery = query(collection(db, 'sales'), where('staffId', '==', staffMember.id));
            const salesSnapshot = await getDocs(salesQuery);

            // Delete each sales record
            const deletePromises = salesSnapshot.docs.map(saleDoc =>
                deleteDoc(doc(db, 'sales', saleDoc.id))
            );
            await Promise.all(deletePromises);

            // Delete the staff member document
            await deleteDoc(doc(db, 'staff', staffMember.id));

            setDeleteModalOpen(false);
        } catch (error) {
            console.error('Error deleting staff member:', error);
            alert('Det oppstod en feil ved sletting av ansatt. Prøv igjen.');
        } finally {
            setIsDeleting(false);
        }
    };

    // Calculate stars per shift
    const starsPerShift = (staffMember.shifts && staffMember.shifts > 0)
        ? ((staffMember.stars || 0) / staffMember.shifts).toFixed(2)
        : '0.00';

    return (
        <>
            <motion.div variants={cardVariants} className="bg-surface rounded-xl border-2 border-[#009A44] shadow-sm p-5 flex flex-col justify-between h-full">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4 cursor-pointer hover:bg-background/50 rounded-lg p-2 -m-2 transition-colors"
                             onClick={() => setProfileStatsOpen(true)}
                             title="Klikk for detaljert statistikk">
                            <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center text-primary">
                                <User size={28}/>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-on-surface">{staffMember.name}</h3>
                                <p className="text-sm text-on-surface-secondary">{staffMember.shifts || 0} vakter</p>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => setCalendarOpen(true)} className="p-2 rounded-lg hover:bg-background text-on-surface-secondary">
                                <Calendar size={20}/>
                            </button>
                            <button
                                onClick={() => setFerieModalOpen(true)}
                                className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors"
                                title="Registrer ferie"
                            >
                                <Plane size={20}/>
                            </button>
                            <button
                                onClick={() => setManualStarModalOpen(true)}
                                className="p-2 rounded-lg hover:bg-yellow-50 text-yellow-600 hover:text-yellow-700 transition-colors"
                                title="Manuell stjerne-registrering"
                            >
                                <Edit size={20}/>
                            </button>
                            <button
                                onClick={() => setDeleteModalOpen(true)}
                                className="p-2 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                                title="Slett ansatt"
                            >
                                <Trash2 size={20}/>
                            </button>
                        </div>
                    </div>

                    <div className="bg-background p-4 rounded-lg text-center">
                        {areStarsHidden ? (
                            <span className="font-semibold text-2xl text-gray-400">•••</span>
                        ) : (
                            <div className="flex items-center justify-center gap-8">
                                <div className="text-center">
                                    <span className="font-bold text-3xl text-on-surface">{staffMember.stars || 0}</span>
                                    <p className="text-xs text-on-surface-secondary">Total</p>
                                </div>
                                <div className="text-center">
                                    <span className="font-bold text-3xl text-on-surface">{starsPerShift}</span>
                                    <p className="text-xs text-on-surface-secondary">Per vakt</p>
                                </div>
                            </div>
                        )}
                        <p className="text-sm text-on-surface-secondary mt-2">Stjerner</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-color">
                    <button onClick={() => setHistoryModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-background transition-colors text-on-surface-secondary text-sm">
                        <List size={16} />
                        <span>Historikk</span>
                    </button>
                    <button onClick={() => setSaleModalOpen(true)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-semibold">
                        <Plus size={16} />
                        <span>Legg til salg</span>
                    </button>
                </div>
            </motion.div>

            <AddSaleModal isOpen={isSaleModalOpen} onClose={() => setSaleModalOpen(false)} staffId={staffMember.id} staffName={staffMember.name} />
            <StaffHistoryModal isOpen={isHistoryModalOpen} onClose={() => setHistoryModalOpen(false)} staffMember={staffMember} />
            <ShiftCalendarModal isOpen={isCalendarOpen} onClose={() => setCalendarOpen(false)} onSave={handleShiftsSave}/>
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDeleteStaff}
                staffName={staffMember.name}
                isDeleting={isDeleting}
            />
            <ManualStarModal
                isOpen={isManualStarModalOpen}
                onClose={() => setManualStarModalOpen(false)}
                staffId={staffMember.id}
                staffName={staffMember.name}
            />
            <ProfileStatsModal
                isOpen={isProfileStatsOpen}
                onClose={() => setProfileStatsOpen(false)}
                staffMember={staffMember}
            />
            <FerieModal
                isOpen={isFerieModalOpen}
                onClose={() => setFerieModalOpen(false)}
                staffId={staffMember.id}
                staffName={staffMember.name}
            />
        </>
    );
}

export default StaffCard;