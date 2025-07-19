import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Mail, KeyRound, User } from 'lucide-react';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Check if passwords match
        if (password !== confirmPassword) {
            setError('Passordene stemmer ikke overens.');
            return;
        }

        // Check password length
        if (password.length < 6) {
            setError('Passordet må være minst 6 tegn langt.');
            return;
        }

        // Check if username is provided and valid
        if (!username.trim() || username.length < 3) {
            setError('Brukernavn må være minst 3 tegn langt.');
            return;
        }

        // Check if username contains only valid characters (alphanumeric, underscore, dash)
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            setError('Brukernavn kan kun inneholde bokstaver, tall, _ og -.');
            return;
        }

        try {
            // Check if username is already taken
            const usernameRef = doc(db, 'usernames', username.toLowerCase());
            const usernameSnap = await getDoc(usernameRef);

            if (usernameSnap.exists()) {
                setError('Dette brukernavnet er allerede tatt.');
                return;
            }

            // Check if email is whitelisted
            const whitelistRef = doc(db, 'whitelist', email.toLowerCase());
            const docSnap = await getDoc(whitelistRef);

            if (!docSnap.exists()) {
                setError("Denne e-postadressen er ikke godkjent for registrering.");
                return;
            }

            // Create user if whitelisted and username is available
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Update the user profile with the username
            await updateProfile(user, {
                displayName: username
            });

            // Store username mapping in Firestore
            await setDoc(usernameRef, {
                email: email.toLowerCase(),
                uid: user.uid,
                createdAt: new Date()
            });

            // Store user data in users collection
            await setDoc(doc(db, 'users', user.uid), {
                email: email.toLowerCase(),
                username: username,
                createdAt: new Date()
            });

            await sendEmailVerification(user);
            navigate('/verify-email');
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError('Denne e-posten er allerede i bruk.');
            } else if (err.code === 'auth/weak-password') {
                setError('Passordet er for svakt. Velg et sterkere passord.');
            } else {
                console.error('Registration error:', err);
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
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-secondary" />
                        <input type="text" required placeholder="Brukernavn (minst 3 tegn)" value={username} onChange={(e) => setUsername(e.target.value)}
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
                                       : confirmPassword && password === confirmPassword
                                       ? 'border-green-500 focus:ring-green-500'
                                       : 'border-border-color focus:ring-primary'
                               }`}/>
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