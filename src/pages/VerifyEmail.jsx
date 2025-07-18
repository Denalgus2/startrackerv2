import { useAuth } from '../contexts/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import { motion } from 'framer-motion';
import { MailCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function VerifyEmail() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const interval = setInterval(async () => {
            await currentUser?.reload?.();
            if (currentUser?.emailVerified) {
                navigate('/dashboard');
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [currentUser, navigate]);

    const handleResend = async () => {
        if (currentUser) {
            await sendEmailVerification(currentUser);
            alert("Ny bekreftelses-e-post er sendt!");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <motion.div
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg p-8 text-center bg-surface rounded-xl shadow-lg border border-border-color"
            >
                <MailCheck className="mx-auto h-16 w-16 text-primary" />
                <h2 className="mt-6 text-3xl font-bold text-on-surface">Bekreft din e-post</h2>
                <p className="mt-4 text-on-surface-secondary">
                    En bekreftelseslenke er sendt til <strong>{currentUser?.email}</strong>.
                </p>
                <p className="mt-2 text-on-surface-secondary">
                    Vennligst sjekk innboksen din og klikk på lenken for å fullføre registreringen. Du kan lukke denne siden etter bekreftelse.
                </p>
                <p className="mt-2 text-on-surface-secondary">
                    Kun personer på Elkjøps whitelist kan registrere seg og motta bekreftelses-e-post.
                </p>
                <button
                    onClick={handleResend}
                    className="mt-6 text-sm text-primary hover:underline"
                >
                    Fikk du ikke e-posten? Send på nytt.
                </button>
                <div className="mt-8">
                    <button
                        onClick={() => window.history.back()}
                        className="px-4 py-2 rounded-lg bg-[#009A44] text-white font-semibold hover:bg-green-700 shadow"
                    >
                        Tilbake
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default VerifyEmail;