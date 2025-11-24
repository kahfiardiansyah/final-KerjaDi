// Konfigurasi aplikasi web Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyBd6vx174tjjVHTg1geqgZ2UZV_MIotIjQ",
  authDomain: "kerjadi-web.firebaseapp.com",
  projectId: "kerjadi-web",
  storageBucket: "kerjadi-web.appspot.com",
  messagingSenderId: "390203624778",
  appId: "1:390203624778:web:d00cdddc9f0868b64245b3",
  measurementId: "G-E68Z0RD9GQ"
};

// Inisialisasi Firebase App
firebase.initializeApp(firebaseConfig);

// Inisialisasi service Firebase agar bisa diakses semua script
const auth = firebase.auth();
const db = firebase.firestore();