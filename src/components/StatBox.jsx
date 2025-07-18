import { motion } from 'framer-motion';

function StatBox({ title, value, icon }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface border border-border-color p-5 rounded-xl flex items-center gap-5"
        >
            <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-background">
                {icon}
            </div>
            <div>
                <p className="text-on-surface-secondary text-sm">{title}</p>
                <p className="text-white text-2xl font-bold">{value}</p>
            </div>
        </motion.div>
    );
}

export default StatBox;