import { motion } from 'framer-motion';

const tableRowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.02,
        },
    }),
};

function GlobalHistory({ sales }) {
    return (
        <div className="bg-surface rounded-lg border border-border-color overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-background text-xs text-on-surface-secondary uppercase">
                <tr>
                    <th className="px-6 py-3">Dato</th>
                    <th className="px-6 py-3">Ansatt</th>
                    <th className="px-6 py-3">Bilag</th>
                    <th className="px-6 py-3">Tjeneste</th>
                    <th className="px-6 py-3 text-right">Stjerner</th>
                </tr>
                </thead>
                <tbody>
                {sales.map((sale, i) => (
                    <motion.tr
                        key={sale.id}
                        custom={i}
                        variants={tableRowVariants}
                        initial="hidden"
                        animate="visible"
                        className="border-b border-border-color last:border-b-0 hover:bg-background"
                    >
                        <td className="px-6 py-4">{sale.timestamp?.toDate().toLocaleString() || 'N/A'}</td>
                        <td className="px-6 py-4 font-medium text-on-surface">{sale.staffName}</td>
                        <td className="px-6 py-4">{sale.bilag}</td>
                        <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                                <span>{`${sale.category} - ${sale.service}`}</span>
                                {sale.insuranceType === 'Recurring' && (
                                    <span className="inline-flex w-fit rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                                        Gjentakende forsikring
                                    </span>
                                )}
                            </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-right text-secondary">{sale.stars}</td>
                    </motion.tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

export default GlobalHistory;