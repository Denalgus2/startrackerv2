import { useState, useEffect } from 'react';
import {
    collection,
    onSnapshot,
    doc,
    deleteDoc,
    query,
    where,
    updateDoc,
    addDoc,
    getDocs,
    writeBatch,
    deleteField,
    setDoc,
    increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
    ShieldAlert,
    UserCheck,
    UserX,
    UserPlus,
    Users,
    Trash2,
    Save,
    Briefcase,
    MailPlus,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import DeleteUserModal from '../components/DeleteUserModal';
import { useNotification } from '../hooks/useNotification';
import NotificationModal from '../components/NotificationModal';
import { serviceCategories } from '../data/services';

function Admin() {
    const { userRole, currentUser } = useAuth(); // Merged from both
    const { notification, showSuccess, showError, showWarning, showConfirmation, hideNotification } = useNotification();

    // State from gemini-normalstaff
    const [pendingUsers, setPendingUsers] = useState([]);
    const [approvedUsers, setApprovedUsers] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    // State from master
    const [whitelist, setWhitelist] = useState([]);
    const [newEmail, setNewEmail] = useState('');
    const [correctionInProgress, setCorrectionInProgress] = useState(false);
    const [correctionResults, setCorrectionResults] = useState(null);

    // Common state
    const [loading, setLoading] = useState(true);

    // Combined useEffect to fetch all necessary data
    useEffect(() => {
        if (userRole !== 'admin') {
            setLoading(false);
            return;
        }

        // Fetch users (pending and approved)
        const usersQuery = query(collection(db, 'users'));
        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingUsers(users.filter(u => u.role === 'pending'));
            setApprovedUsers(users.filter(u => u.role !== 'pending'));
            setLoading(false);
        });

        // Fetch staff list
        const staffQuery = query(collection(db, 'staff'));
        const unsubStaff = onSnapshot(staffQuery, (snapshot) => {
            setStaffList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch whitelist
        const unsubWhitelist = onSnapshot(collection(db, 'whitelist'), (snapshot) => {
            setWhitelist(snapshot.docs.map(doc => doc.id));
        }, (error) => {
            console.error('Firestore permission error:', error);
            setWhitelist([]);
        });

        return () => {
            unsubUsers();
            unsubStaff();
            unsubWhitelist();
        };
    }, [userRole]);

    // Admin role check
    if (userRole !== 'admin') {
        return (
            <div className="text-center p-10">
                <ShieldAlert className="mx-auto h-12 w-12 text-danger"/>
                <h2 className="mt-4 text-2xl font-bold">Ingen tilgang</h2>
                <p className="mt-2 text-on-surface-secondary">Du har ikke rettigheter til å se denne siden.</p>
            </div>
        );
    }

    const unlinkedStaff = staffList.filter(s => !s.uid);

    // --- Functions from gemini-normalstaff branch ---

    const handleApproveUser = async (user, newRole, linkedStaffId, employeeType) => {
        if (!newRole || !employeeType) {
            showError('Manglende informasjon', 'Vennligst velg en rolle og ansettelsestype.');
            return;
        }
        const confirmationMessage = linkedStaffId
            ? `Koble ${user.displayName} til den eksisterende profilen og gi rollen '${newRole}'?`
            : `Opprette en ny stabsprofil for ${user.displayName} med rollen '${newRole}'?`;

        showConfirmation('Bekreft godkjenning', confirmationMessage, async () => {
            try {
                const userRef = doc(db, 'users', user.uid);
                let staffProfileId = linkedStaffId;

                if (linkedStaffId) {
                    const staffRef = doc(db, 'staff', linkedStaffId);
                    await updateDoc(staffRef, { uid: user.uid });
                } else {
                    const newStaffDoc = await addDoc(collection(db, 'staff'), {
                        name: user.displayName,
                        stars: 0,
                        shifts: 0,
                        uid: user.uid,
                    });
                    staffProfileId = newStaffDoc.id;
                }
                await updateDoc(userRef, { role: newRole, staffId: staffProfileId, employeeType: employeeType });
                showSuccess('Bruker godkjent', `${user.displayName} er nå godkjent med rollen '${newRole}'.`);
            } catch (error) {
                console.error("Error approving user:", error);
                showError('Feil ved godkjenning', `Kunne ikke godkjenne bruker: ${error.message}`);
            }
        });
    };

    const handleDeclineUser = async (user) => {
        showConfirmation('Bekreft avslag', `Er du sikker på at du vil avslå og slette forespørselen for ${user.displayName}?`, async () => {
            try {
                await deleteDoc(doc(db, 'users', user.uid));
                showSuccess('Forespørsel avslått', `Forespørsel for ${user.displayName} er slettet.\n\nBrukeren må også slettes manuelt fra Firebase Authentication.`);
            } catch (error) {
                console.error("Error declining user:", error);
                showError('Feil', 'En feil oppstod under avslag.');
            }
        });
    };

    const handleUpdateUser = async (user, newRole, newEmployeeType) => {
        if (!newRole || !newEmployeeType) {
            showError('Manglende informasjon', 'Vennligst velg både rolle og ansettelsestype.');
            return;
        }
        if (user.email === 'denis.ale.gusev@gmail.com' && newRole !== 'admin') {
            showError('Ikke tillatt', 'Kan ikke endre rollen for hovedadministrator.');
            return;
        }
        try {
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, { role: newRole, employeeType: newEmployeeType });
            showSuccess('Bruker oppdatert', `${user.displayName} sine detaljer er oppdatert.`);
        } catch (error) {
            console.error("Error updating user:", error);
            showError('Feil', 'Kunne ikke oppdatere brukerdetaljer.');
        }
    };

    const openDeleteModal = (user) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    const handleDeleteUser = async (user, option) => {
        try {
            const staffQuery = query(collection(db, 'staff'), where("uid", "==", user.uid));
            const staffSnapshot = await getDocs(staffQuery);
            const staffDoc = staffSnapshot.docs[0];

            if (option === 'full_purge') {
                if (staffDoc) {
                    const staffRef = doc(db, 'staff', staffDoc.id);
                    const salesQuery = query(collection(db, 'sales'), where('staffId', '==', staffDoc.id));
                    const salesSnapshot = await getDocs(salesQuery);
                    if (!salesSnapshot.empty) {
                        const batch = writeBatch(db);
                        salesSnapshot.forEach(doc => batch.delete(doc.ref));
                        await batch.commit();
                    }
                    await deleteDoc(staffRef);
                }
            } else if (option === 'auth_profile') {
                if (staffDoc) {
                    const staffRef = doc(db, 'staff', staffDoc.id);
                    await updateDoc(staffRef, { uid: deleteField() });
                }
            }
            await deleteDoc(doc(db, 'users', user.id));
            showSuccess('Bruker slettet', `Brukerdata for ${user.displayName} er slettet fra Firestore.\n\nVIKTIG: Du må nå slette brukeren manuelt fra Firebase Authentication-fanen for å fullføre slettingen.`);
        } catch (error) {
            console.error("Error deleting user data:", error);
            showError('Feil', 'En feil oppstod under sletting av brukerdata.');
        }
    };


    // --- Functions from master branch ---

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

    const findAndFixKundelubbEntries = async () => {
        setCorrectionInProgress(true);
        setCorrectionResults(null);
        try {
            const salesQuery = query(collection(db, 'sales'), where('category', '==', 'Kundeklubb'));
            const salesSnapshot = await getDocs(salesQuery);
            const incorrectEntries = [];
            const staffUpdates = {};

            salesSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const service = data.service;
                const currentStars = data.stars;
                const correctStars = serviceCategories['Kundeklubb'][service];
                if (currentStars !== correctStars) {
                    const starDifference = correctStars - currentStars;
                    incorrectEntries.push({
                        id: doc.id,
                        staffId: data.staffId,
                        staffName: data.staffName,
                        service: service,
                        currentStars: currentStars,
                        correctStars: correctStars,
                        difference: starDifference,
                    });
                    if (!staffUpdates[data.staffId]) {
                        staffUpdates[data.staffId] = { name: data.staffName, totalDifference: 0 };
                    }
                    staffUpdates[data.staffId].totalDifference += starDifference;
                }
            });

            if (incorrectEntries.length === 0) {
                setCorrectionResults({ success: true, message: 'Ingen feil funnet!', correctedEntries: 0, staffAffected: 0 });
                setCorrectionInProgress(false);
                return;
            }

            const batch = writeBatch(db);
            incorrectEntries.forEach(entry => {
                const salesRef = doc(db, 'sales', entry.id);
                batch.update(salesRef, { stars: entry.correctStars });
            });
            Object.entries(staffUpdates).forEach(([staffId, update]) => {
                if (update.totalDifference !== 0) {
                    const staffRef = doc(db, 'staff', staffId);
                    batch.update(staffRef, { stars: increment(update.totalDifference) });
                }
            });
            await batch.commit();

            setCorrectionResults({
                success: true,
                message: 'Kundeklubb-oppføringer er rettet!',
                correctedEntries: incorrectEntries.length,
                staffAffected: Object.keys(staffUpdates).length,
                details: incorrectEntries,
                staffUpdates: staffUpdates
            });
        } catch (error) {
            console.error('Error correcting Kundeklubb entries:', error);
            setCorrectionResults({ success: false, message: 'Feil under retting: ' + error.message });
        }
        setCorrectionInProgress(false);
    };


    // --- JSX Render ---

    return (
        <>
            <div className="max-w-6xl mx-auto space-y-8">
                <h2 className="text-3xl font-bold text-on-surface mb-6">Adminpanel</h2>

                {/* Pending Approvals Section */}
                <div className="bg-surface rounded-xl border border-border-color p-6 shadow-sm">
                    <h3 className="text-xl font-semibold text-on-surface mb-4 flex items-center gap-2">
                        <UserPlus size={22}/> Ventende Godkjenninger ({pendingUsers.length})
                    </h3>
                    {loading ? <p>Laster...</p> : (
                        <ul className="divide-y divide-border-color">
                            {pendingUsers.length > 0 ? pendingUsers.map(user => (
                                <li key={user.id} className="flex flex-wrap justify-between items-center py-3 gap-4">
                                    <div>
                                        <p className="font-semibold text-on-surface">{user.displayName}</p>
                                        <p className="text-sm text-on-surface-secondary">{user.email}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 items-center">
                                         <select id={`staff-link-${user.id}`} className="p-2 bg-background border border-border-color rounded-lg text-sm">
                                             <option value="">Opprett ny profil</option>
                                             {unlinkedStaff.map(staff => <option key={staff.id} value={staff.id}>Koble til: {staff.name}</option>)}
                                         </select>
                                         <select id={`employee-type-approve-${user.id}`} className="p-2 bg-background border border-border-color rounded-lg text-sm" defaultValue="">
                                             <option value="" disabled>Ansettelsestype...</option>
                                             <option value="fulltid">Fulltid</option>
                                             <option value="deltid">Deltid</option>
                                         </select>
                                         <select id={`role-approve-${user.id}`} className="p-2 bg-background border border-border-color rounded-lg text-sm" defaultValue="">
                                             <option value="" disabled>Velg rolle...</option>
                                             <option value="staff">Ansatt</option>
                                             <option value="moderator">Moderator</option>
                                         </select>
                                         <button
                                             onClick={() => {
                                                 const role = document.getElementById(`role-approve-${user.id}`).value;
                                                 const staffId = document.getElementById(`staff-link-${user.id}`).value;
                                                 const empType = document.getElementById(`employee-type-approve-${user.id}`).value;
                                                 handleApproveUser(user, role, staffId, empType);
                                             }}
                                             className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg"
                                         >
                                             <UserCheck size={14}/> Godkjenn
                                         </button>
                                         <button onClick={() => handleDeclineUser(user)} className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg">
                                             <UserX size={14}/> Avslå
                                         </button>
                                     </div>
                                </li>
                            )) : <p className="text-on-surface-secondary">Ingen nye forespørsler.</p>}
                        </ul>
                    )}
                </div>

                {/* Approved Users Section */}
                <div className="bg-surface rounded-xl border border-border-color p-6 shadow-sm">
                     <h3 className="text-xl font-semibold text-on-surface mb-4 flex items-center gap-2">
                         <Users size={22}/> Godkjente Brukere ({approvedUsers.length})
                     </h3>
                     {loading ? <p>Laster...</p> : (
                         <div className="divide-y divide-border-color">
                             {approvedUsers.map(user => (
                                 <div key={user.id} className="flex flex-wrap justify-between items-center py-4 gap-4">
                                     <div>
                                         <p className="font-semibold text-on-surface">{user.displayName}</p>
                                         <p className="text-sm text-on-surface-secondary">{user.email}</p>
                                         {user.employeeType && (
                                             <div className="mt-1 flex items-center gap-1 text-xs font-medium text-white px-2 py-0.5 rounded-full bg-gray-500 w-fit">
                                                 <Briefcase size={12}/>
                                                 <span className="capitalize">{user.employeeType}</span>
                                             </div>
                                         )}
                                     </div>
                                     <div className="flex gap-2 items-center">
                                         <select id={`employee-type-update-${user.id}`} className="p-2 bg-background border border-border-color rounded-lg text-sm" defaultValue={user.employeeType || ""}>
                                             <option value="" disabled>Ansettelsestype...</option>
                                             <option value="fulltid">Fulltid</option>
                                             <option value="deltid">Deltid</option>
                                         </select>
                                         <select id={`role-update-${user.id}`} className="p-2 bg-background border border-border-color rounded-lg text-sm" defaultValue={user.role}>
                                             <option value="staff">Ansatt</option>
                                             <option value="moderator">Moderator</option>
                                             <option value="admin">Admin</option>
                                         </select>
                                         <button
                                             onClick={() => {
                                                 const newRole = document.getElementById(`role-update-${user.id}`).value;
                                                 const newEmpType = document.getElementById(`employee-type-update-${user.id}`).value;
                                                 handleUpdateUser(user, newRole, newEmpType);
                                             }}
                                             className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg" title="Lagre endringer">
                                             <Save size={16}/>
                                         </button>
                                         <button
                                             onClick={() => openDeleteModal(user)}
                                             className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg" title="Slett bruker"
                                             disabled={user.email === 'denis.ale.gusev@gmail.com'}
                                         >
                                             <Trash2 size={16}/>
                                         </button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>

                {/* Kundeklubb Correction Tool */}
                <div className="bg-surface rounded-xl border border-border-color p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
                        <RefreshCw size={20} />
                        Rett Kundeklubb Stjerneverdier
                    </h3>
                    <p className="text-sm text-on-surface-secondary mb-4">
                        Dette verktøyet finner og retter alle Kundeklubb-oppføringer som har feil stjerneverdier.
                    </p>
                    <button
                        onClick={findAndFixKundelubbEntries}
                        disabled={correctionInProgress}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-focus disabled:opacity-50"
                    >
                        {correctionInProgress ? (<><RefreshCw size={16} className="animate-spin" /> Retter...</>) : (<><RefreshCw size={16} /> Finn og Rett Feil</>)}
                    </button>
                    {correctionResults && (
                        <div className={`mt-4 p-4 rounded-lg ${correctionResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                {correctionResults.success ? (<div className="text-green-600">✅</div>) : (<AlertCircle size={20} className="text-red-600" />)}
                                <span className={`font-semibold ${correctionResults.success ? 'text-green-800' : 'text-red-800'}`}>{correctionResults.message}</span>
                            </div>
                            {correctionResults.success && correctionResults.correctedEntries > 0 && (
                                <div className="text-sm text-green-700 mt-2">
                                    <p>📊 {correctionResults.correctedEntries} oppføringer rettet</p>
                                    <p>👥 {correctionResults.staffAffected} ansatte påvirket</p>
                                    {correctionResults.staffUpdates && (
                                        <div className="mt-3">
                                            <p className="font-medium">Stjerne-endringer per ansatt:</p>
                                            <div className="mt-1 space-y-1">
                                                {Object.entries(correctionResults.staffUpdates).map(([staffId, update]) => (
                                                    <div key={staffId} className="text-xs">• {update.name}: {update.totalDifference > 0 ? '+' : ''}{update.totalDifference} stjerner</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Whitelist Section */}
                <div className="bg-surface rounded-xl border border-border-color p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-on-surface mb-4">E-post Whitelist ({whitelist.length})</h3>
                    <form onSubmit={handleAddEmail} className="flex gap-2 mb-4">
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
                    {loading ? <p>Laster...</p> : (
                        <ul className="divide-y divide-border-color">
                            {whitelist.map(email => (
                                <li key={email} className="flex justify-between items-center py-2">
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

            {/* Modals */}
            <DeleteUserModal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                user={userToDelete}
                onConfirm={handleDeleteUser}
            />
            <NotificationModal
                isOpen={!!notification}
                onClose={hideNotification}
                type={notification?.type}
                title={notification?.title}
                message={notification?.message}
                confirmText={notification?.confirmText}
                showCancel={notification?.showCancel}
                cancelText={notification?.cancelText}
                onConfirm={notification?.onConfirm}
            />
        </>
    );
}

export default Admin;