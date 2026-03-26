// Firebase Shim for HabitaPleno
// This file is a placeholder to prevent 404 errors during migration to Node.js API
export const auth = { currentUser: null, onAuthStateChanged: () => () => {} };
export const db = {};
export const storage = {};

// Auth functions
export const getAuth = () => auth;
export const signInWithEmailAndPassword = async () => ({ user: null });
export const signOut = async () => {};
export const onAuthStateChanged = () => () => {};

// Firestore functions
export const getFirestore = () => ({});
export const collection = () => ({});
export const doc = () => ({});
export const getDocs = async () => ({ docs: [] });
export const query = () => ({});
export const where = () => ({});

// App functions
export const initializeApp = () => ({});

export default { auth, db, storage };
