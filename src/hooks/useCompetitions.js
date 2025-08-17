import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export function useCompetitions() {
  const { currentUser } = useAuth();
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'competitions'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      // sort by createdAt desc when available
      data.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      setCompetitions(data);
      setLoading(false);
    }, (e) => {
      console.error('Error loading competitions', e);
      setError(e);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const myCompetitions = useMemo(() => {
    if (!currentUser) return [];
    return competitions.filter(c => Array.isArray(c.participants) && c.participants.length > 0);
  }, [competitions, currentUser]);

  const activeCompetitions = useMemo(() => competitions.filter(c => c.status === 'active'), [competitions]);

  return { competitions, myCompetitions, activeCompetitions, loading, error };
}
