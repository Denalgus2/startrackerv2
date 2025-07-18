import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { MailPlus, Trash2, ShieldAlert } from 'lucide-react';

function Admin() {
    const { currentUser } = useAuth();
    const [whitelist, setWhitelist] = useState([]);
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(true);

    // Hardcoded check for the admin user
    if (currentUser?.email !== 'denis.ale.gusev@gmail.com') {
        return (
            <div className="text-center p-10">
                <ShieldAlert className="mx-auto h-12 w-12 text-danger"/>
                <h2 className="mt-4 text-2xl font-bold">Ingen tilgang</h2>
                <p className="mt-2 text-on-surface-secondary">Du har ikke rettigheter til å se denne siden.</p>
            </div>
        );
    }

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'whitelist'), (snapshot) => {
            setWhitelist(snapshot.docs.map(doc => doc.id));
            setLoading(false);
        }, (error) => {
            console.error('Firestore permission error:', error);
            setLoading(false);
            // Set empty whitelist if permission denied
            setWhitelist([]);
        });
        return () => unsub();
    }, []);

    const handleAddEmail = async (e) => {
        e.preventDefault();
        if (!newEmail) return;
        const emailToAdd = newEmail.toLowerCase();
        const whitelistRef = doc(db, 'whitelist', emailToAdd);
        await setDoc(whitelistRef, { addedAt: new Date() });
        setNewEmail('');
    };

    const handleDeleteEmail = async (email) => {
        if (window.confirm(`Er du sikker på at du vil fjerne ${email}?`)) {
            const whitelistRef = doc(db, 'whitelist', email);
            await deleteDoc(whitelistRef);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-on-surface mb-6">Admin: E-post Whitelist</h2>

            <div className="bg-surface rounded-xl border border-border-color p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-on-surface mb-4">Legg til godkjent e-post</h3>
                <form onSubmit={handleAddEmail} className="flex gap-2">
                    <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="ny.ansatt@elkjop.no"
                        className="flex-grow p-2 bg-background border border-border-color rounded-lg text-on-surface focus:ring-2 focus:ring-primary outline-none"
                    />
                    <button type="submit" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-focus">
                        <MailPlus size={16}/> Legg til
                    </button>
                </form>
            </div>

            <div className="mt-8 bg-surface rounded-xl border border-border-color shadow-sm">
                <h3 className="text-lg font-semibold text-on-surface p-4 border-b border-border-color">Godkjente E-poster ({whitelist.length})</h3>
                {loading ? <p className="p-4">Laster...</p> : (
                    <ul className="divide-y divide-border-color">
                        {whitelist.map(email => (
                            <li key={email} className="flex justify-between items-center p-4">
                                <span className="text-on-surface-secondary">{email}</span>
                                <button onClick={() => handleDeleteEmail(email)} className="text-danger p-1 rounded-md hover:bg-danger/10">
                                    <Trash2 size={18}/>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default Admin;