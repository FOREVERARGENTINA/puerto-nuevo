const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDFGZHQp_-UGSWJhDxTNrFrJUGkvWr9tAY",
  authDomain: "puerto-nuevo-montessori.firebaseapp.com",
  projectId: "puerto-nuevo-montessori",
  storageBucket: "puerto-nuevo-montessori.firebasestorage.app",
  messagingSenderId: "651913667566",
  appId: "1:651913667566:web:22a40c30e0c5a3e96b2a25"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testFamiliaData() {
  try {
    console.log('\n🔍 PRUEBA DE DATOS DE FAMILIA\n');
    
    // 1. Login como familia (si existe)
    try {
      await signInWithEmailAndPassword(auth, 'familia@puerto.com', 'sonamos');
      console.log('✅ Login exitoso como familia@puerto.com');
      
      const user = auth.currentUser;
      console.log(`📧 Usuario: ${user.email}`);
      console.log(`🆔 UID: ${user.uid}`);
      
      // Obtener custom claims
      const token = await user.getIdTokenResult();
      console.log(`🎭 Rol: ${token.claims.role || 'Sin rol'}`);
      
      // 2. Buscar hijos
      console.log('\n🔍 Buscando hijos...');
      const childrenQuery = query(
        collection(db, 'children'),
        where('responsables', 'array-contains', user.uid)
      );
      
      const snapshot = await getDocs(childrenQuery);
      console.log(`📚 Alumnos encontrados: ${snapshot.size}`);
      
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.nombreCompleto} (${data.ambiente})`);
        console.log(`    Responsables: ${data.responsables?.length || 0}`);
      });
      
    } catch (authError) {
      console.log('❌ No se pudo hacer login como familia@puerto.com');
      console.log('Probando como admin para verificar datos...\n');
      
      // Login como admin para verificar datos
      await signInWithEmailAndPassword(auth, 'admin@puerto.com', 'sonamos');
      console.log('✅ Login como admin exitoso');
      
      // Verificar familias existentes
      const familiasQuery = query(
        collection(db, 'users'),
        where('role', '==', 'family')
      );
      const familiasSnapshot = await getDocs(familiasQuery);
      
      console.log(`👨‍👩‍👧‍👦 Familias en base de datos: ${familiasSnapshot.size}`);
      familiasSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.email} (${doc.id})`);
      });
      
      // Verificar alumnos
      const alumnosSnapshot = await getDocs(collection(db, 'children'));
      console.log(`\n📚 Alumnos en base de datos: ${alumnosSnapshot.size}`);
      alumnosSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.nombreCompleto}`);
        console.log(`    Responsables: ${data.responsables || 'Sin responsables'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

testFamiliaData();