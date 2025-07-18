import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { nb } from 'date-fns/locale';

function ShiftCalendarModal({ isOpen, onClose, onSave }) {
    const [days, setDays] = useState([]);

    const handleSave = () => {
        if (!days || days.length === 0) return;
        onSave(days.length);
        setDays([]);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" style={{ isolation: 'isolate' }}>
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl p-6 w-full max-w-md border-2 border-[#009A44] shadow-xl relative z-10" style={{ backgroundColor: '#ffffff' }}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-on-surface">Registrer Vakter</h3>
                            <button onClick={onClose} className="text-on-surface-secondary hover:text-on-surface"><X /></button>
                        </div>
                        <div className="flex justify-center">
                            <DayPicker
                                mode="multiple"
                                min={0}
                                selected={days}
                                onSelect={setDays}
                                locale={nb}
                                styles={{
                                    caption: { color: '#00a960' },
                                    day: { borderRadius: '100%' },
                                }}
                            />
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <p className="text-sm text-on-surface-secondary">{days?.length || 0} dager valgt</p>
                            <button onClick={handleSave} disabled={!days || days.length === 0} className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-focus transition-colors disabled:opacity-50">
                                Lagre vakter
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ShiftCalendarModal;