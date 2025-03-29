import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Add only the minimum calendar scope to request availability (not event details)
googleProvider.addScope('https://www.googleapis.com/auth/calendar.freebusy');
googleProvider.addScope('email');


export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Get credential from the sign-in result
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    // Check if we have the token (needed for calendar access)
    if (!credential || !credential.accessToken) {
      throw new Error("Could not get access token. Please try again and ensure you grant calendar access.");
    }
    
    const token = credential.accessToken;
    const user = result.user;
    
    // Store the token for later use with the Calendar API
    await setDoc(doc(firestore, "users", user.uid), {
      calendarToken: token,
      email: user.email,
      displayName: user.displayName,
      lastLogin: new Date().toISOString(),
      // Default absurd hours (midnight to 7am)
      absurdHoursStart: "00:00",
      absurdHoursEnd: "07:00",
    }, { merge: true });
    
    console.log("Successfully signed in with Google and saved calendar token");
    return user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    // Handle permission denied or canceled sign-in
    if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      throw new Error("Sign-in was cancelled. Please try again.");
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error("Sign-in popup was blocked. Please enable popups for this site.");
    } else {
      throw error;
    }
  }
};

export const signOutUser = () => signOut(auth);

export const getUserSettings = async (userId) => {
  try {
    const docRef = doc(firestore, "users", userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.log("No user settings found!");
      return null;
    }
  } catch (error) {
    console.error("Error getting user settings", error);
    throw error;
  }
};

export const updateUserSettings = async (userId, settings) => {
  try {
    await setDoc(doc(firestore, "users", userId), settings, { merge: true });
  } catch (error) {
    console.error("Error updating user settings", error);
    throw error;
  }
};

export { auth, firestore };
