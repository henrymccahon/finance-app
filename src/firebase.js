import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCTIIiIQchu_DslCu9M0DjBijAKprn_eQI",
  authDomain: "finance-app-e286c.firebaseapp.com",
  projectId: "finance-app-e286c",
  storageBucket: "finance-app-e286c.firebasestorage.app",
  messagingSenderId: "415426890661",
  appId: "1:415426890661:web:ed424d56c3142b4054f64c",
  measurementId: "G-1S7F0G7KD9",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
