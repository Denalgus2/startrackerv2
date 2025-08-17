import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export async function fetchAllExportData() {
  // Fetch all relevant collections
  const [shiftsSnap, salesSnap, starsSnap, kundeklubbSnap] = await Promise.all([
    getDocs(collection(db, 'shifts')),
    getDocs(collection(db, 'sales')),
    getDocs(collection(db, 'starAdjustments')),
    getDocs(collection(db, 'kundeklubb')),
  ]);
  return {
    shifts: shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    sales: salesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    starAdjustments: starsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    kundeklubb: kundeklubbSnap.docs.map(d => ({ id: d.id, ...d.data() })),
  };
}

export function exportToJson(data, filename = 'export.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Optionally, add CSV export helpers here if needed
