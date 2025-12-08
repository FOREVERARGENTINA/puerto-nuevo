const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable, connectFunctionsEmulator } = require('firebase/functions');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyDFGZHQp_-UGSWJhDxTNrFrJUGkvWr9tAY",
  authDomain: "puerto-nuevo-montessori.firebaseapp.com",
  projectId: "puerto-nuevo-montessori",
  storageBucket: "puerto-nuevo-montessori.firebasestorage.app",
  messagingSenderId: "651913667566",
  appId: "1:651913667566:web:22a40c30e0c5a3e96b2a25"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
const auth = getAuth(app);

async function crearFamilia() {
  try {
    // 1. Login como admin
    console.log('1. Login como admin...');
    await signInWithEmailAndPassword(auth, 'admin@puerto.com', 'sonamos');
    console.log('✅ Admin autenticado');

    // 2. Llamar a createUserWithRole
    console.log('2. Creando usuario familia...');
    const createUserWithRole = httpsCallable(functions, 'createUserWithRole');
    const result = await createUserWithRole({
      email: 'familia@puerto.com',
      password: 'sonamos',
      role: 'family',
      displayName: 'Familia Test'
    });

    console.log('✅ Usuario familia creado:', result.data);
    console.log('\nPuedes hacer login con:');
    console.log('Email: familia@puerto.com');
    console.log('Password: sonamos');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

crearFamilia();
