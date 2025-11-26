import { motion } from 'framer-motion';
import { Clock, Trash2 } from 'lucide-react';

function ShiftsOverviewTab({ shifts, deleteShift }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Vakt Oversikt</h2>
                <div className="text-sm text-gray-600">
                    Siste {shifts.length} vakter
                </div>
            </div>

            <div className="grid gap-4">
                {shifts.map((shift, i) => (
                    <motion.div
                        key={shift.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <Clock className="text-green-600" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{shift.staffName}</h3>
                                    <p className="text-sm text-gray-600">
                                        {shift.timestamp?.toDate().toLocaleDateString('no-NO', {
                                            weekday: 'long',
                                            day: '2-digit',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Registrert: {shift.timestamp?.toDate().toLocaleTimeString('no-NO', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-lg font-bold text-gray-900">Vakt #{i + 1}</div>
                                    <p className="text-xs text-gray-500">Registrert vakt</p>
                                </div>

                                <button
                                    onClick={() => deleteShift(shift.id, shift.staffName)}
                                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Slett vakt"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

export default ShiftsOverviewTab;
