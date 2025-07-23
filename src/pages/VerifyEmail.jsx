import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import { MailCheck } from 'lucide-react';
import { useNotification } from '../hooks/useNotification';
import NotificationModal from '../components/NotificationModal';

function VerifyEmail() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { notification, showSuccess, showError, hideNotification } = useNotification();
    const [isCreatingProfile, setIsCreatingProfile] = useState(false);
    // Use a ref to ensure the profile creation only runs once
    const profileCreatedRef = useRef(false);

    useEffect(() => {
        if (!currentUser) return;

        // If the user is already verified when they land here, proceed immediately.
        if (currentUser.emailVerified) {
            handleVerificationSuccess();
            return;
        }

        const interval = setInterval(async () => {
            await currentUser.reload();
            if (currentUser.emailVerified) {
                clearInterval(interval);
                handleVerificationSuccess();
            }
        }, 3000); // Check every 3 seconds

        return () => clearInterval(interval);
    }, [currentUser]);

    const handleVerificationSuccess = async () => {
        if (profileCreatedRef.current) return;
        profileCreatedRef.current = true;
        setIsCreatingProfile(true);

        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(userDocRef);

            if (!docSnap.exists()) {
                await setDoc(userDocRef, {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    role: 'pending',
                    createdAt: new Date(),
                });
            }

            // Navigate to the next step after profile is created.
            navigate('/pending-approval');

        } catch (error) {
            console.error("Error creating user profile in Firestore:", error);
            showError('Feil ved opprettelse', 'En feil oppstod under opprettelse av din profil. Vennligst kontakt en administrator.');
        }
    };

    const handleResend = async () => {
        if (currentUser) {
            try {
                await sendEmailVerification(currentUser);
                showSuccess('E-post sendt', 'Ny bekreftelses-e-post er sendt!');
            } catch (error) {
                showError('Feil ved sending', 'Feil ved sending av e-post. Prøv igjen om litt.');
            }
        }
    };

    return (
        <>
            <div className="flex items-center justify-center min-h-screen bg-background">
                <motion.div
                    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-lg p-8 text-center bg-surface rounded-xl shadow-lg border border-border-color"
                >
                    <MailCheck className="mx-auto h-16 w-16 text-primary" />
                    <h2 className="mt-6 text-3xl font-bold text-on-surface">Bekreft din e-post</h2>

                    {isCreatingProfile ? (
                        <p className="mt-4 text-on-surface-secondary">
                            E-post bekreftet! Oppretter din profil...
                        </p>
                    ) : (
                        <>
                            <p className="mt-4 text-on-surface-secondary">
                                En bekreftelseslenke er sendt til <strong>{currentUser?.email}</strong>.
                            </p>
                            <p className="mt-2 text-on-surface-secondary">
                                Vennligst sjekk innboksen din og klikk på lenken. Denne siden vil automatisk fortsette når du er bekreftet.
                            </p>
                            <button
                                onClick={handleResend}
                                className="mt-6 text-sm text-primary hover:underline"
                            >
                                Fikk du ikke e-posten? Send på nytt.
                            </button>
                        </>
                    )}
                </motion.div>
            </div>

            <NotificationModal
                isOpen={!!notification}
                onClose={hideNotification}
                type={notification?.type}
                title={notification?.title}
                message={notification?.message}
                confirmText={notification?.confirmText}
            />
        </>
    );
}

export default VerifyEmail;
