// src/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// Jika Anda butuh Analytics, uncomment baris di bawah
// import { getAnalytics } from "firebase/analytics";

// Konfigurasi Firebase Anda sekarang memanggil Environment Variables
// dengan aman menggunakan process.env.NAMA_KEY
const firebaseConfig = {
  apiKey: "AIzaSyAowm2qfnTNKNy7jV3xRDn25vwvJAj8X3k",
  authDomain: "testpost-da1ab.firebaseapp.com",
  projectId: "testpost-da1ab",
  storageBucket: "testpost-da1ab.firebasestorage.app",
  messagingSenderId: "916388427815",
  appId: "1:916388427815:web:90e0c8d27c7f6347f73602",
  measurementId: "G-R4KDPY932D"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Inisialisasi layanan lain yang ingin Anda gunakan
const db = getFirestore(app);
// const analytics = getAnalytics(app); // Uncomment jika perlu

// Ekspor layanan agar bisa digunakan di file lain
export { db };
