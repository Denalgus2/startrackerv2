import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Mail, KeyRound } from 'lucide-react';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ElkjopBanner = () => (
    <img src="https://upload.wikimedia.org/wikipedia/commons/4/42/Elkjop_logo_blue.png" alt="Elkjøp Banner" className="mx-auto mb-4 w-48 h-auto" />
);

function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // 1. Check if email is whitelisted
        const whitelistRef = doc(db, 'whitelist', email.toLowerCase());
        const docSnap = await getDoc(whitelistRef);

        if (!docSnap.exists()) {
            setError("Denne e-postadressen er ikke godkjent for registrering.");
            return;
        }

        // 2. Create user if whitelisted
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(userCredential.user);
            navigate('/verify-email');
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError('Denne e-posten er allerede i bruk.');
            } else {
                setError('Kunne ikke opprette konto. Prøv igjen.');
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <motion.div
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md p-8 space-y-6 bg-surface rounded-xl shadow-lg border-4"
                style={{ borderColor: '#009A44' }}
            >
                <div className="text-center">
                    <ElkjopBanner />
                    <h2 className="mt-6 text-3xl font-bold text-on-surface">Opprett Konto</h2>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-secondary" />
                        <input type="email" required placeholder="E-post" value={email} onChange={(e) => setEmail(e.target.value)}
                               className="w-full pl-10 pr-3 py-3 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none"/>
                    </div>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-secondary" />
                        <input type="password" required placeholder="Passord (minst 6 tegn)" value={password} onChange={(e) => setPassword(e.target.value)}
                               className="w-full pl-10 pr-3 py-3 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none"/>
                    </div>

                    {error && <p className="text-danger text-sm text-center">{error}</p>}

                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} type="submit"
                                   className="w-full py-3 px-4 rounded-lg text-white font-bold text-lg bg-[#009A44] hover:bg-green-700 shadow-lg border-2 border-[#009A44] transition-all duration-150">
                        Registrer deg
                    </motion.button>
                </form>
                <p className="text-center text-sm text-on-surface-secondary">
                    Har du allerede en konto? <Link to="/login" className="font-medium text-primary hover:underline">Logg inn</Link>
                </p>
            </motion.div>
        </div>
    );
}

export default SignUp;