import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, KeyRound } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ElkjopBanner = () => (
    <img src="https://upload.wikimedia.org/wikipedia/commons/4/42/Elkjop_logo_blue.png" alt="Elkjøp Banner" className="mx-auto mb-4 w-48 h-auto" />
);

function Login() {
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [needsEmailLink, setNeedsEmailLink] = useState(false);
    const [emailForBackfill, setEmailForBackfill] = useState('');
    const [expectedUid, setExpectedUid] = useState(null);
    const navigate = useNavigate();

    // Persist form values during any brief route churn
    useEffect(() => {
        const saved = sessionStorage.getItem('loginForm');
        if (saved) {
            try {
                const { emailOrUsername, password } = JSON.parse(saved);
                if (emailOrUsername) setEmailOrUsername(emailOrUsername);
                if (password) setPassword(password);
            } catch {}
        }
    }, []);

    useEffect(() => {
        sessionStorage.setItem('loginForm', JSON.stringify({ emailOrUsername, password }));
        return () => {
            sessionStorage.setItem('loginForm', JSON.stringify({ emailOrUsername, password }));
        };
    }, [emailOrUsername, password]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const rawInput = emailOrUsername.trim();
            const pwd = password;
            let emailToUse = rawInput;

            // If we're in the backfill flow, attempt to sign in with provided email and verify UID
            if (needsEmailLink) {
                const emailLower = emailForBackfill.trim().toLowerCase();
                if (!emailLower || !emailLower.includes('@')) {
                    setError('Angi en gyldig e-post.');
                    return;
                }
                const cred = await signInWithEmailAndPassword(auth, emailLower, pwd);
                if (expectedUid && cred.user?.uid !== expectedUid) {
                    setError('E-posten samsvarer ikke med brukernavnet.');
                    return;
                }
                // Backfill the username mapping now that we verified same account
                const usernameLower = rawInput.toLowerCase();
                const usernameRef = doc(db, 'usernames', usernameLower);
                await setDoc(usernameRef, { uid: cred.user.uid, email: emailLower }, { merge: true });
                navigate('/', { replace: true });
                return;
            }

            // --- Check if input is a username (does not contain '@') ---
            if (rawInput && !rawInput.includes('@')) {
                const usernameLower = rawInput.toLowerCase();
                const usernameRef = doc(db, 'usernames', usernameLower);
                const usernameSnap = await getDoc(usernameRef);

                if (!usernameSnap.exists()) {
                    setError('Brukernavn eller e-post ikke funnet.');
                    return;
                }

                // Read email directly from the public usernames mapping to avoid protected reads
                const data = usernameSnap.data();
                emailToUse = (data.email || '').trim();
                if (!emailToUse) {
                    // Start a backfill flow: ask user for their email, then verify uid match on sign-in
                    setExpectedUid(data.uid || null);
                    setNeedsEmailLink(true);
                    setError('Dette brukernavnet mangler e-post. Skriv inn e-posten din for å koble den.');
                    return;
                }
            }

            const cred = await signInWithEmailAndPassword(auth, (emailToUse || '').toLowerCase(), pwd);
            // Best-effort: if the user has a displayName (username), ensure the usernames mapping contains their email
            try {
                const username = cred.user?.displayName?.trim()?.toLowerCase();
                const email = cred.user?.email?.toLowerCase();
                if (username && email) {
                    const usernameRef = doc(db, 'usernames', username);
                    // Use set with merge to avoid overwriting uid if present
                    await setDoc(usernameRef, { email }, { merge: true });
                }
            } catch (e) {
                // Non-fatal
                console.warn('Could not backfill username mapping:', e);
            }
            // Use replace to avoid back navigation returning to login
            navigate('/', { replace: true });
        } catch (err) {
            console.error('Login error:', err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Feil brukernavn/e-post eller passord.');
            } else {
                setError('Innlogging feilet. Prøv igjen.');
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <motion.div
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-surface rounded-xl shadow-lg border-4 overflow-hidden"
                style={{ borderColor: '#009A44' }}
            >
                <div className="h-2 bg-primary"></div>
                <div className="p-8 space-y-6">
                    <div className="text-center">
                        <ElkjopBanner />
                        <h2 className="mt-6 text-2xl font-bold text-on-surface">Logg inn</h2>
                    </div>
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-secondary" />
                            <input type="text" required placeholder="E-post eller brukernavn" value={emailOrUsername} onChange={(e) => setEmailOrUsername(e.target.value)}
                                   className="w-full pl-10 pr-3 py-3 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none"/>
                        </div>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-secondary" />
                            <input type="password" required placeholder="Passord" value={password} onChange={(e) => setPassword(e.target.value)}
                                   className="w-full pl-10 pr-3 py-3 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none"/>
                        </div>
                        {needsEmailLink && (
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-secondary" />
                                <input
                                    type="email"
                                    required
                                    placeholder="E-posten din (for å koble til brukernavn)"
                                    value={emailForBackfill}
                                    onChange={(e) => setEmailForBackfill(e.target.value)}
                                    className="w-full pl-10 pr-3 py-3 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                        )}
                        {error && <p className="text-danger text-sm text-center">{error}</p>}
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} type="submit"
                                       className="w-full py-3 px-4 rounded-lg text-white font-bold text-lg bg-[#009A44] hover:bg-green-700 shadow-lg border-2 border-[#009A44] transition-all duration-150">
                            {needsEmailLink ? 'Koble og logg inn' : 'Logg inn'}
                        </motion.button>
                    </form>
                    <p className="text-center text-sm text-on-surface-secondary">
                        Har du ikke en konto? <Link to="/signup" className="font-medium text-primary hover:underline">Registrer deg</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

export default Login;
