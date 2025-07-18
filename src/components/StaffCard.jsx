import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Star, Plus, List, Calendar } from 'lucide-react';
import AddSaleModal from './AddSaleModal';
import StaffHistoryModal from './StaffHistoryModal';
import ShiftCalendarModal from './ShiftCalendarModal';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

function StaffCard({ staffMember, areStarsHidden }) {
    const [isSaleModalOpen, setSaleModalOpen] = useState(false);
    const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
    const [isCalendarOpen, setCalendarOpen] = useState(false);

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const handleShiftsSave = async (numShifts) => {
        const staffRef = doc(db, 'staff', staffMember.id);
        await updateDoc(staffRef, { shifts: increment(numShifts) });
        setCalendarOpen(false);
    };

    return (
        <>
            <motion.div variants={cardVariants} className="bg-surface rounded-xl border-2 border-[#009A44] shadow-sm p-5 flex flex-col justify-between h-full">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center text-primary">
                                <User size={28}/>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-on-surface">{staffMember.name}</h3>
                                <p className="text-sm text-on-surface-secondary">{staffMember.shifts || 0} vakter</p>
                            </div>
                        </div>
                        <button onClick={() => setCalendarOpen(true)} className="p-2 rounded-lg hover:bg-background text-on-surface-secondary">
                            <Calendar size={20}/>
                        </button>
                    </div>

                    <div className="bg-background p-4 rounded-lg text-center">
                        {areStarsHidden ? (
                            <span className="font-semibold text-2xl text-gray-400">•••</span>
                        ) : (
                            <span className="font-bold text-4xl text-on-surface">{staffMember.stars || 0}</span>
                        )}
                        <p className="text-sm text-on-surface-secondary">Stjerner</p>
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
        </>
    );
}

export default StaffCard;