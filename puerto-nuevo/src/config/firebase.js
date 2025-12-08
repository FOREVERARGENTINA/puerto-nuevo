import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Configuración de Firebase - Proyecto: puerto-nuevo-montessori
const firebaseConfig = {
  apiKey: "AIzaSyB9ZC5CLGhtdm1_6Vjm5ASHW1xepoBO9PU",
  authDomain: "puerto-nuevo-montessori.firebaseapp.com",
  projectId: "puerto-nuevo-montessori",
  storageBucket: "puerto-nuevo-montessori.firebasestorage.app",
  messagingSenderId: "651913667566",
  appId: "1:651913667566:web:1421f44f25481685d664ff",
  measurementId: "G-3LQTZK2KNN"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Servicios Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
