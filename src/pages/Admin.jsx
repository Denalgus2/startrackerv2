import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc, query, where, updateDoc, addDoc, getDocs, writeBatch, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, UserCheck, UserX, UserPlus, Users, Trash2, Save, Briefcase, Link as LinkIcon } from 'lucide-react';
import DeleteUserModal from '../components/DeleteUserModal';

function Admin() {
    const { userRole } = useAuth();
    const [pendingUsers, setPendingUsers] = useState([]);
    const [approvedUsers, setApprovedUsers] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);

    const [userToDelete, setUserToDelete] = useState(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    if (userRole !== 'admin') {
        return (
            <div className="text-center p-10">
                <ShieldAlert className="mx-auto h-12 w-12 text-danger"/>
                <h2 className="mt-4 text-2xl font-bold">Ingen tilgang</h2>
                <p className="mt-2 text-on-surface-secondary">Du har ikke rettigheter til å se denne siden.</p>
            </div>
        );
    }

    useEffect(() => {
        const usersQuery = query(collection(db, 'users'));
        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingUsers(users.filter(u => u.role === 'pending'));
            setApprovedUsers(users.filter(u => u.role !== 'pending'));
            setLoading(false);
        });

        const staffQuery = query(collection(db, 'staff'));
        const unsubStaff = onSnapshot(staffQuery, (snapshot) => {
            setStaffList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubUsers();
            unsubStaff();
        };
    }, []);

    const unlinkedStaff = staffList.filter(s => !s.uid);

    const handleApproveUser = async (user, newRole, linkedStaffId, employeeType) => {
        if (!newRole || !employeeType) {
            alert("Vennligst velg en rolle og ansettelsestype.");
            return;
        }

        const confirmationMessage = linkedStaffId
            ? `Koble ${user.displayName} til den eksisterende profilen og gi rollen '${newRole}'?`
            : `Opprette en ny stabsprofil for ${user.displayName} med rollen '${newRole}'?`;

        if (!window.confirm(confirmationMessage)) return;

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

        } catch (error) {
            console.error("Error approving user:", error);
            alert(`Feil ved godkjenning: ${error.message}`);
        }
    };

    const handleDeclineUser = async (user) => {
        if (!window.confirm(`Er du sikker på at du vil avslå og slette forespørselen for ${user.displayName}?`)) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid));
            alert(`Forespørsel for ${user.displayName} er slettet.\n\nBrukeren må også slettes manuelt fra Firebase Authentication.`);
        } catch (error) {
            console.error("Error declining user:", error);
            alert("En feil oppstod under avslag.");
        }
    };

    const handleUpdateUser = async (user, newRole, newEmployeeType) => {
        if (!newRole || !newEmployeeType) {
            alert("Vennligst velg både rolle og ansettelsestype.");
            return;
        }
        if (user.email === 'denis.ale.gusev@gmail.com' && newRole !== 'admin') {
            alert("Kan ikke endre rollen for hovedadministrator.");
            return;
        }
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { role: newRole, employeeType: newEmployeeType });
        alert(`${user.displayName} sine detaljer er oppdatert.`);
    };

    const openDeleteModal = (user) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    const handleDeleteUser = async (user, option) => {
        try {
            const staffQuery = query(collection(db, 'staff'), where("uid", "==", user.uid));
            const staffSnapshot = await getDocs(staffQuery);
            const staffDoc = staffSnapshot.docs[0]; // Assuming one-to-one mapping

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
                // --- THIS IS THE FIX ---
                // If a staff profile is linked, unlink it by removing the uid field.
                if (staffDoc) {
                    const staffRef = doc(db, 'staff', staffDoc.id);
                    await updateDoc(staffRef, {
                        uid: deleteField() // This removes the uid field, making the profile available again.
                    });
                }
            }

            // For both options, delete the user's profile from the 'users' collection.
            await deleteDoc(doc(db, 'users', user.id));
            alert(`Brukerdata for ${user.displayName} er slettet fra Firestore.\n\nVIKTIG: Du må nå slette brukeren manuelt fra Firebase Authentication-fanen for å fullføre slettingen.`);

        } catch (error) {
            console.error("Error deleting user data:", error);
            alert("En feil oppstod under sletting av brukerdata.");
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-on-surface mb-6">Adminpanel</h2>

            <div className="mb-8 bg-surface rounded-xl border border-border-color p-6 shadow-sm">
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

            <DeleteUserModal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                user={userToDelete}
                onConfirm={handleDeleteUser}
            />
        </div>
    );
}

export default Admin;
