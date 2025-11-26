import { motion } from 'framer-motion';
import { FileText, Star, Edit3, X, CheckCircle } from 'lucide-react';

function BilagRequestsTab({ requests, handleApprove, handleDecline, openEditModal }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Ventende Bilag Forespørsler</h2>
                <div className="text-sm text-gray-600">
                    {requests.length} forespørsler venter på godkjenning
                </div>
            </div>

            {requests.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen ventende forespørsler</h3>
                    <p className="text-gray-600">Alle bilag forespørsler er behandlet!</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {requests.map((req, i) => (
                        <motion.div
                            key={req.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                        <FileText className="text-blue-600" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{req.staffName}</h3>
                                        <p className="text-sm text-gray-600">Bilag: {req.bilag}</p>
                                        <p className="text-xs text-gray-500">{req.category} - {req.service}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-lg font-bold text-yellow-600">
                                            <Star size={18} />
                                            {req.stars}
                                        </div>
                                        <p className="text-xs text-gray-500">stjerner</p>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(req)}
                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                            title="Rediger"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDecline(req)}
                                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Avslå"
                                        >
                                            <X size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleApprove(req)}
                                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                            title="Godkjenn"
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

export default BilagRequestsTab;
