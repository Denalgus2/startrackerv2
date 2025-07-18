import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, KeyRound } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

// Component for the Elkjøp banner/logo
const ElkjopBanner = () => (
    <img src="https://upload.wikimedia.org/wikipedia/commons/4/42/Elkjop_logo_blue.png" alt="Elkjøp Banner" className="mx-auto mb-4 w-48 h-auto" />
);

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err) {
            setError('Feil e-post eller passord.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <motion.div
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-surface rounded-xl shadow-lg border-4 overflow-hidden"
                style={{ borderColor: '#009A44' }}
            >
                {/* Green accent border at the top */}
                <div className="h-2 bg-primary"></div>

                <div className="p-8 space-y-6">
                    <div className="text-center">
                        <ElkjopBanner />
                        <h2 className="mt-6 text-2xl font-bold text-on-surface">Logg inn</h2>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-secondary" />
                            <input type="email" required placeholder="E-post" value={email} onChange={(e) => setEmail(e.target.value)}
                                   className="w-full pl-10 pr-3 py-3 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none"/>
                        </div>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-secondary" />
                            <input type="password" required placeholder="Passord" value={password} onChange={(e) => setPassword(e.target.value)}
                                   className="w-full pl-10 pr-3 py-3 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none"/>
                        </div>

                        {error && <p className="text-danger text-sm text-center">{error}</p>}

                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} type="submit"
                                       className="w-full py-3 px-4 rounded-lg text-white font-bold text-lg bg-[#009A44] hover:bg-green-700 shadow-lg border-2 border-[#009A44] transition-all duration-150">
                            Logg inn
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