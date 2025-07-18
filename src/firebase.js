// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAnb_6YWPe9DJmgw2Z4VkyveKCfdVnsks0",
    authDomain: "simracing-746c5.firebaseapp.com",
    projectId: "simracing-746c5",
    storageBucket: "simracing-746c5.firebasestorage.app",
    messagingSenderId: "175022953012",
    appId: "1:175022953012:web:6da3261935c9b5fdd5f061",
    measurementId: "G-EFY74XQN7Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };