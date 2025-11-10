import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, KeyRound, User } from 'lucide-react';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ElkjopBanner = () => (
    <img src="https://upload.wikimedia.org/wikipedia/commons/4/42/Elkjop_logo_blue.png" alt="Elkjøp Banner" className="mx-auto mb-4 w-48 h-auto" />
);

function SignUp() {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // --- Validation ---
        if (password !== confirmPassword) {
            setError('Passordene stemmer ikke overens.');
            setLoading(false);
            return;
        }
        if (password.length < 6) {
            setError('Passordet må være minst 6 tegn langt.');
            setLoading(false);
            return;
        }
        if (!username.trim() || username.length < 3) {
            setError('Brukernavn må være minst 3 tegn langt.');
            setLoading(false);
            return;
        }
        if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
            setError('Brukernavn kan kun inneholde bokstaver, tall, punktum, bindestrek og understrek.');
            setLoading(false);
            return;
        }

        try {
            const emailLower = email.toLowerCase();
            const usernameLower = username.toLowerCase();

            // --- Check if username is already taken ---
            const usernameRef = doc(db, 'usernames', usernameLower);
            const usernameSnap = await getDoc(usernameRef);
            if (usernameSnap.exists()) {
                setError('Dette brukernavnet er allerede tatt.');
                setLoading(false);
                return;
            }

            // Create user in Auth
            const userCredential = await createUserWithEmailAndPassword(auth, emailLower, password);
            const user = userCredential.user;

            // Update Auth profile with the chosen username
            await updateProfile(user, { displayName: username });

            // Create a mapping from the lowercase username to the user's UID and email for easy login lookup
            await setDoc(usernameRef, { uid: user.uid, email: emailLower });

            // The AuthContext will handle creating the document in the 'users' collection.

            await sendEmailVerification(user);
            navigate('/verify-email');

        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError('Denne e-posten er allerede registrert.');
            } else {
                console.error('Registration error:', err);
                setError('Kunne ikke opprette konto. Prøv igjen.');
            }
        } finally {
            setLoading(false);
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
                    <p className="text-sm text-on-surface-secondary mt-2">Kontoen må verifiseres og godkjennes av en administrator.</p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-secondary" />
                        <input type="email" required placeholder="E-post" value={email} onChange={(e) => setEmail(e.target.value)}
                               className="w-full pl-10 pr-3 py-3 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none"/>
                    </div>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-secondary" />
                        <input type="text" required placeholder="Brukernavn" value={username} onChange={(e) => setUsername(e.target.value)}
                               className="w-full pl-10 pr-3 py-3 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none"/>
                    </div>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-secondary" />
                        <input type="password" required placeholder="Passord (minst 6 tegn)" value={password} onChange={(e) => setPassword(e.target.value)}
                               className="w-full pl-10 pr-3 py-3 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none"/>
                    </div>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-secondary" />
                        <input type="password" required placeholder="Gjenta passord" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                               className={`w-full pl-10 pr-3 py-3 bg-background border rounded-lg text-on-surface focus:ring-2 outline-none transition-all ${
                                   confirmPassword && password !== confirmPassword
                                       ? 'border-red-500 focus:ring-red-500'
                                       : 'border-border-color focus:ring-primary'
                               }`}/>
                    </div>

                    {error && <p className="text-danger text-sm text-center">{error}</p>}

                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} type="submit"
                                   disabled={loading}
                                   className="w-full py-3 px-4 rounded-lg text-white font-bold text-lg bg-[#009A44] hover:bg-green-700 shadow-lg border-2 border-[#009A44] transition-all duration-150 disabled:opacity-50">
                        {loading ? 'Registrerer...' : 'Registrer deg'}
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
