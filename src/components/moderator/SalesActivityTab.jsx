import { motion } from 'framer-motion';
import { Star, Trash2 } from 'lucide-react';

function SalesActivityTab({ sales, deleteSale }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Salg Aktivitet</h2>
                <div className="text-sm text-gray-600">
                    Siste {sales.length} salg
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="px-6 py-3 text-left font-medium">Ansatt</th>
                                <th className="px-6 py-3 text-left font-medium">Bilag</th>
                                <th className="px-6 py-3 text-left font-medium">Tjeneste</th>
                                <th className="px-6 py-3 text-center font-medium">Stjerner</th>
                                <th className="px-6 py-3 text-left font-medium">Tidspunkt</th>
                                <th className="px-6 py-3 text-right font-medium">Handlinger</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sales.map((sale, i) => (
                                <motion.tr
                                    key={sale.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    className="hover:bg-gray-50"
                                >
                                    <td className="px-6 py-4 font-medium text-gray-900">{sale.staffName}</td>
                                    <td className="px-6 py-4 text-gray-600">{sale.bilag}</td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">{sale.category}</p>
                                            <p className="text-xs text-gray-500">{sale.service}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1 text-yellow-600 font-bold">
                                            <Star size={14} />
                                            {sale.stars}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {sale.timestamp?.toDate().toLocaleDateString('no-NO', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => deleteSale(sale.id, sale.staffName, sale.stars)}
                                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                            title="Slett salg"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
}

export default SalesActivityTab;
