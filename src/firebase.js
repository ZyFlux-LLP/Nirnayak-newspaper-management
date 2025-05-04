// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import{getAuth} from "firebase/auth"
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA3_FbRtACZLJ473TidW2yL8D1UG5OmORg",
  authDomain: "niranayaknews.firebaseapp.com",
  projectId: "niranayaknews",
  storageBucket: "niranayaknews.firebasestorage.app",
  messagingSenderId: "677412316419",
  appId: "1:677412316419:web:1659aacaf152704db6b536",
  measurementId: "G-94JVHPN90S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app)
const db = getFirestore(app);
const storage = getStorage();
const firestore = getFirestore();

export {auth,db,storage,firestore}