import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

function NotificationModal({ isOpen, onClose, type = 'info', title, message, confirmText = 'OK', showCancel = false, cancelText = 'Avbryt', onConfirm }) {
    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle className="h-8 w-8 text-green-500" />;
            case 'error': return <AlertCircle className="h-8 w-8 text-red-500" />;
            case 'warning': return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
            default: return <Info className="h-8 w-8 text-blue-500" />;
        }
    };

    const getColors = () => {
        switch (type) {
            case 'success': return {
                bg: 'bg-green-50',
                border: 'border-green-200',
                button: 'bg-green-600 hover:bg-green-700',
                text: 'text-green-800'
            };
            case 'error': return {
                bg: 'bg-red-50',
                border: 'border-red-200',
                button: 'bg-red-600 hover:bg-red-700',
                text: 'text-red-800'
            };
            case 'warning': return {
                bg: 'bg-yellow-50',
                border: 'border-yellow-200',
                button: 'bg-yellow-600 hover:bg-yellow-700',
                text: 'text-yellow-800'
            };
            default: return {
                bg: 'bg-blue-50',
                border: 'border-blue-200',
                button: 'bg-blue-600 hover:bg-blue-700',
                text: 'text-blue-800'
            };
        }
    };

    const colors = getColors();

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        } else {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`bg-white rounded-xl w-full max-w-md border-2 ${colors.border} shadow-xl`}
                    >
                        <div className={`${colors.bg} rounded-t-xl px-6 py-4 border-b ${colors.border}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {getIcon()}
                                    <h3 className={`text-lg font-semibold ${colors.text}`}>
                                        {title}
                                    </h3>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                                {message}
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 p-6 pt-0">
                            {showCancel && (
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                >
                                    {cancelText}
                                </button>
                            )}
                            <button
                                onClick={handleConfirm}
                                className={`px-4 py-2 text-white rounded-lg font-medium transition-colors ${colors.button}`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default NotificationModal;
