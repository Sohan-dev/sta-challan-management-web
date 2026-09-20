// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCw1Ns0nDkqf_fTuzajxLfyJfLZ1Hsk7EE",
  authDomain: "rn-startrack-app.firebaseapp.com",
  projectId: "rn-startrack-app",
  storageBucket: "rn-startrack-app.firebasestorage.app",
  messagingSenderId: "713806015170",
  appId: "1:713806015170:web:b0d9edcd792866f128295b",
  measurementId: "G-DGQN30LT17",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "sta-challan-db");
// const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});
