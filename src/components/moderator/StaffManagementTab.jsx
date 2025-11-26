import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

function StaffManagementTab({ staff, adjustStaffStars, resetStaffStars }) {
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [adjustmentAmount, setAdjustmentAmount] = useState('');
    const [adjustmentReason, setAdjustmentReason] = useState('');

    const handleStarAdjustment = (staffId, amount) => {
        const reason = adjustmentReason.trim() || 'Moderator justering';
        adjustStaffStars(staffId, parseInt(amount), reason);
        setSelectedStaff(null);
        setAdjustmentAmount('');
        setAdjustmentReason('');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Ansatt Administrasjon</h2>
                <div className="text-sm text-gray-600">
                    {staff.length} ansatte totalt
                </div>
            </div>

            <div className="grid gap-4">
                {staff.map((member, i) => (
                    <motion.div
                        key={member.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {member.name?.charAt(0) || 'A'}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{member.name}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <span>Vakter: {member.shifts || 0}</span>
                                        <span>Salg: {member.totalSales || 0}</span>
                                        <span>Avg. per vakt: {member.shifts > 0 ? ((member.stars || 0) / member.shifts).toFixed(1) : '0.0'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-2xl font-bold text-yellow-600">
                                        <Star size={24} />
                                        {member.stars || 0}
                                    </div>
                                    <p className="text-xs text-gray-500">totale stjerner</p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedStaff(member)}
                                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                    >
                                        Juster Stjerner
                                    </button>
                                    <button
                                        onClick={() => resetStaffStars(member.id, member.name)}
                                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                    >
                                        Nullstill
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Star Adjustment Modal */}
            {selectedStaff && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold mb-4">Juster stjerner for {selectedStaff.name}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Justering (+ for å legge til, - for å trekke fra)
                                </label>
                                <input
                                    type="number"
                                    value={adjustmentAmount}
                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="f.eks. +5 eller -3"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Begrunnelse (valgfritt)
                                </label>
                                <input
                                    type="text"
                                    value={adjustmentReason}
                                    onChange={(e) => setAdjustmentReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="f.eks. Bonus for god innsats"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setSelectedStaff(null)}
                                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Avbryt
                            </button>
                            <button
                                onClick={() => handleStarAdjustment(selectedStaff.id, adjustmentAmount)}
                                disabled={!adjustmentAmount}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                Juster
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

export default StaffManagementTab;
