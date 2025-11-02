import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Minimize2, ExternalLink, Sparkles } from 'lucide-react';

function NewWebsitePopup() {
    const [isVisible, setIsVisible] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        // Check if popup was shown today
        const lastShownDate = localStorage.getItem('newWebsitePopupLastShown');
        const today = new Date().toDateString();

        if (lastShownDate !== today) {
            // Check if user has dismissed it permanently
            const isDismissed = localStorage.getItem('newWebsitePopupDismissed');
            if (!isDismissed) {
                setIsVisible(true);
                // Mark as shown today
                localStorage.setItem('newWebsitePopupLastShown', today);
            }
        }
    }, []);

    const handleMinimize = () => {
        setIsMinimized(true);
    };

    const handleRestore = () => {
        setIsMinimized(false);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('newWebsitePopupDismissed', 'true');
    };

    const handleClose = () => {
        setIsVisible(false);
    };

    if (!isVisible) return null;

    // Minimized state - small floating button
    if (isMinimized) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed bottom-4 right-4 z-[9999]"
            >
                <motion.button
                    onClick={handleRestore}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg flex items-center gap-2"
                >
                    <Sparkles size={20} />
                    <span className="text-sm font-medium hidden sm:inline">Ny nettside tilgjengelig</span>
                </motion.button>
            </motion.div>
        );
    }

    // Full popup state
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-2 sm:p-4"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-xl w-full max-w-md border-2 border-blue-200 shadow-xl"
                >
                    <div className="bg-blue-50 rounded-t-xl px-4 sm:px-6 py-4 border-b border-blue-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Sparkles className="h-6 w-6 text-blue-500" />
                                <h3 className="text-lg font-semibold text-blue-800">
                                    Oppdatert nettside tilgjengelig!
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleMinimize}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                    aria-label="Minimer"
                                >
                                    <Minimize2 size={20} />
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                    aria-label="Lukk"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6">
                        <p className="text-gray-700 text-base leading-relaxed mb-4">
                            Hei! Jeg ser at du bruker den gamle nettsiden. Visste du at en oppdatert og forbedret versjon er tilgjengelig? Hvorfor ikke prøve den ut?
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <a
                                href="https://stjernekamp-vfinal.vercel.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <span>Gå til ny nettside</span>
                                <ExternalLink size={18} />
                            </a>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm"
                            >
                                Ikke vis igjen
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default NewWebsitePopup;

