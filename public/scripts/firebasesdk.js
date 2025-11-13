// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD74HsKffYOAsX5tibRkvr2cYjro7NQILQ",
  authDomain: "stackflow-1.firebaseapp.com",
  projectId: "stackflow-1",
  storageBucket: "stackflow-1.firebasestorage.app",
  messagingSenderId: "932226498137",
  appId: "1:932226498137:web:44041990d219e086d5bb48",
  measurementId: "G-2KEJD063TX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);