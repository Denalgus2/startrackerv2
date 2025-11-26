import { motion } from 'framer-motion';
import { Star, TrendingUp, Clock, Users } from 'lucide-react';

function AnalyticsTab({ staff, sales, shifts }) {
    const totalStars = staff.reduce((sum, member) => sum + (member.stars || 0), 0);
    const totalSales = sales.length;
    const totalShifts = shifts.length;
    
    // Top performers
    const topPerformers = staff.slice(0, 5);

    // Recent activity by category
    const salesByCategory = sales.reduce((acc, sale) => {
        acc[sale.category] = (acc[sale.category] || 0) + 1;
        return acc;
    }, {});

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <h2 className="text-xl font-semibold text-gray-900">System Analyser</h2>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Star size={24} />
                        <div>
                            <p className="text-blue-100 text-sm">Totale Stjerner</p>
                            <p className="text-2xl font-bold">{totalStars}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl">
                    <div className="flex items-center gap-3">
                        <TrendingUp size={24} />
                        <div>
                            <p className="text-green-100 text-sm">Totale Salg</p>
                            <p className="text-2xl font-bold">{totalSales}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Clock size={24} />
                        <div>
                            <p className="text-purple-100 text-sm">Totale Vakter</p>
                            <p className="text-2xl font-bold">{totalShifts}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl">
                    <div className="flex items-center gap-3">
                        <Users size={24} />
                        <div>
                            <p className="text-orange-100 text-sm">Aktive Ansatte</p>
                            <p className="text-2xl font-bold">{staff.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performers */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Topp Presterende</h3>
                    <div className="space-y-3">
                        {topPerformers.map((member, index) => (
                            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                        index === 0 ? 'bg-yellow-500' : 
                                        index === 1 ? 'bg-gray-400' : 
                                        index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                                    }`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{member.name}</p>
                                        <p className="text-xs text-gray-500">{member.shifts || 0} vakter</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-yellow-600 font-bold">
                                    <Star size={16} />
                                    {member.stars || 0}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sales by Category */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Salg per Kategori</h3>
                    <div className="space-y-3">
                        {Object.entries(salesByCategory).map(([category, count]) => (
                            <div key={category} className="flex items-center justify-between">
                                <span className="text-gray-700">{category}</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-20 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${(count / totalSales) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 min-w-[2rem]">{count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default AnalyticsTab;
