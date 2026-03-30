const admin = require('firebase-admin');
const {
  PROJECT_ID,
  STORAGE_BUCKET,
  withAdminEmulatorEnv,
  buildStorageDownloadUrl,
} = require('./emulator-config.cjs');
const { waitForEmulators } = require('./wait-for-emulators.cjs');

process.env = withAdminEmulatorEnv(process.env);

const PASSWORD = 'PuertoLocal123!';

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn5mW8AAAAASUVORK5CYII=';
const TINY_PDF_CONTENT = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 18 Tf 40 120 Td (Puerto Nuevo Demo) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000061 00000 n 
0000000118 00000 n 
0000000244 00000 n 
0000000340 00000 n 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
410
%%EOF`;

function ensureAdminApp() {
  return admin.apps[0] || admin.initializeApp({
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
  });
}

function getArgentinaParts(baseDate = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(baseDate)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function toDateKey({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDaysToDateKey(dateKey, days) {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return date.toISOString().slice(0, 10);
}

function getNextMondayDateKey(baseDateKey) {
  const [year, month, day] = baseDateKey.split('-').map(Number);
  const baseDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = baseDate.getUTCDay();
  const daysUntilNextMonday = ((8 - dayOfWeek) % 7) || 7;
  baseDate.setUTCDate(baseDate.getUTCDate() + daysUntilNextMonday);
  return baseDate.toISOString().slice(0, 10);
}

function buildArgentinaTimestamp(dateKey, hour, minute = 0) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return admin.firestore.Timestamp.fromDate(
    new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0, 0))
  );
}

async function upsertAuthUsers(users) {
  const auth = admin.auth();

  for (const user of users) {
    try {
      await auth.getUser(user.uid);
      await auth.updateUser(user.uid, {
        email: user.email,
        password: PASSWORD,
        displayName: user.displayName,
        disabled: false,
      });
    } catch {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: PASSWORD,
        displayName: user.displayName,
        disabled: false,
      });
    }

    await auth.setCustomUserClaims(user.uid, { role: user.role });
  }
}

async function uploadFixture(bucket, objectPath, buffer, contentType) {
  const file = bucket.file(objectPath);
  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: {
      contentType,
      metadata: {
        seeded: 'true',
      },
    },
  });

  return {
    path: objectPath,
    url: buildStorageDownloadUrl(objectPath),
  };
}

async function clearCollection(collectionName) {
  const db = admin.firestore();
  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
}

async function seedEmulators() {
  await waitForEmulators();
  ensureAdminApp();

  const db = admin.firestore();
  const bucket = admin.storage().bucket(STORAGE_BUCKET);
  const now = new Date();
  const argentinaNow = getArgentinaParts(now);
  const todayKey = toDateKey(argentinaNow);
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  const nextMondayKey = getNextMondayDateKey(todayKey);
  const nextFridayKey = addDaysToDateKey(nextMondayKey, 4);
  const upcomingEventKey = addDaysToDateKey(todayKey, 2);
  const laterEventKey = addDaysToDateKey(todayKey, 7);
  const appointmentHour = Math.min(Math.max(argentinaNow.hour + 1, 9), 20);

  const users = [
    { uid: 'u_superadmin', role: 'superadmin', email: 'superadmin@demo.pn', displayName: 'Superadmin Demo' },
    { uid: 'u_coordinacion', role: 'coordinacion', email: 'coordinacion@demo.pn', displayName: 'Coordinacion Demo' },
    { uid: 'u_docente', role: 'docente', email: 'docente@demo.pn', displayName: 'Docente Demo' },
    { uid: 'u_facturacion', role: 'facturacion', email: 'facturacion@demo.pn', displayName: 'Facturacion Demo' },
    { uid: 'u_tallerista', role: 'tallerista', email: 'tallerista@demo.pn', displayName: 'Tallerista Demo' },
    { uid: 'u_family_1', role: 'family', email: 'familia1@demo.pn', displayName: 'Familia Uno Demo' },
    { uid: 'u_family_2', role: 'family', email: 'familia2@demo.pn', displayName: 'Familia Dos Demo' },
    { uid: 'u_aspirante', role: 'aspirante', email: 'aspirante@demo.pn', displayName: 'Aspirante Demo' },
  ];

  await upsertAuthUsers(users);

  const avatarFixture = await uploadFixture(
    bucket,
    'public/social/families/u_family_1/profile/avatar-demo.png',
    Buffer.from(TINY_PNG_BASE64, 'base64'),
    'image/png'
  );
  const galleryCoverFixture = await uploadFixture(
    bucket,
    'institutional-gallery/familias/category/cover-demo.png',
    Buffer.from(TINY_PNG_BASE64, 'base64'),
    'image/png'
  );
  const eventFixture = await uploadFixture(
    bucket,
    'public/events/event_demo/media-demo.png',
    Buffer.from(TINY_PNG_BASE64, 'base64'),
    'image/png'
  );
  const documentFixture = await uploadFixture(
    bucket,
    'documents/institucional/documento-demo.pdf',
    Buffer.from(TINY_PDF_CONTENT, 'utf8'),
    'application/pdf'
  );

  const commonTimestamp = admin.firestore.FieldValue.serverTimestamp();

  const seedOperations = [
    db.collection('users').doc('u_superadmin').set({
      email: 'superadmin@demo.pn',
      displayName: 'Superadmin Demo',
      role: 'superadmin',
      disabled: false,
      children: [],
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('users').doc('u_coordinacion').set({
      email: 'coordinacion@demo.pn',
      displayName: 'Coordinacion Demo',
      role: 'coordinacion',
      disabled: false,
      children: [],
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('users').doc('u_docente').set({
      email: 'docente@demo.pn',
      displayName: 'Docente Demo',
      role: 'docente',
      disabled: false,
      children: [],
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('users').doc('u_facturacion').set({
      email: 'facturacion@demo.pn',
      displayName: 'Facturacion Demo',
      role: 'facturacion',
      disabled: false,
      children: [],
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('users').doc('u_tallerista').set({
      email: 'tallerista@demo.pn',
      displayName: 'Tallerista Demo',
      role: 'tallerista',
      disabled: false,
      children: [],
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('users').doc('u_family_1').set({
      email: 'familia1@demo.pn',
      displayName: 'Familia Uno Demo',
      role: 'family',
      disabled: false,
      children: ['child_ana_t1', 'child_bruno_t2'],
      fcmTokens: ['seed-family-1-token'],
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('users').doc('u_family_2').set({
      email: 'familia2@demo.pn',
      displayName: 'Familia Dos Demo',
      role: 'family',
      disabled: false,
      children: ['child_ana_t1'],
      fcmTokens: ['seed-family-2-token'],
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('users').doc('u_aspirante').set({
      email: 'aspirante@demo.pn',
      displayName: 'Aspirante Demo',
      role: 'aspirante',
      disabled: false,
      children: [],
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('userPushTokens').doc('u_family_1').set({
      tokens: ['seed-family-1-token'],
      updatedAt: commonTimestamp,
    }),
    db.collection('userPushTokens').doc('u_family_2').set({
      tokens: ['seed-family-2-token'],
      updatedAt: commonTimestamp,
    }),
    db.collection('children').doc('child_ana_t1').set({
      nombreCompleto: 'Ana Demo',
      firstName: 'Ana',
      lastName: 'Demo',
      ambiente: 'taller1',
      responsables: ['u_family_1', 'u_family_2'],
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('children').doc('child_bruno_t2').set({
      nombreCompleto: 'Bruno Demo',
      firstName: 'Bruno',
      lastName: 'Demo',
      ambiente: 'taller2',
      responsables: ['u_family_1'],
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('appConfig').doc('directMessages').set({
      enabled: true,
      pilotFamilyUids: ['u_family_1'],
      updatedAt: commonTimestamp,
    }),
    db.collection('socialProfiles').doc('u_family_1').set({
      userId: 'u_family_1',
      displayName: 'Familia Uno Demo',
      photoUrl: avatarFixture.url,
      updatedAt: commonTimestamp,
    }),
    db.collection('childSocialProfiles').doc('child_ana_t1_u_family_1').set({
      childId: 'child_ana_t1',
      familyUid: 'u_family_1',
      photoUrl: avatarFixture.url,
      updatedAt: commonTimestamp,
    }),
    db.collection('gallery-categories').doc('gallery_category_demo').set({
      name: 'Vida en la escuela',
      slug: 'vida-en-la-escuela',
      description: 'Galeria demo para el entorno local.',
      allowedRoles: ['family', 'aspirante', 'docente', 'coordinacion', 'superadmin', 'tallerista'],
      coverUrl: galleryCoverFixture.url,
      coverPath: galleryCoverFixture.path,
      isActive: true,
      createdBy: 'u_docente',
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('gallery-albums').doc('gallery_album_demo').set({
      categoryId: 'gallery_category_demo',
      name: 'Album Demo',
      description: 'Album inicial para pruebas locales.',
      createdBy: 'u_docente',
      createdAt: commonTimestamp,
      thumbUrl: galleryCoverFixture.url,
      thumbPath: galleryCoverFixture.path,
      familyNotification: {
        pending: false,
        pendingRevision: 0,
        pendingLastMediaAt: null,
        lastNotifiedAt: null,
        sendingAt: null,
      },
    }),
    db.collection('gallery-media').doc('gallery_media_demo').set({
      categoryId: 'gallery_category_demo',
      albumId: 'gallery_album_demo',
      fileName: 'foto-demo.png',
      url: galleryCoverFixture.url,
      path: galleryCoverFixture.path,
      tipo: 'imagen',
      mimeType: 'image/png',
      size: Buffer.from(TINY_PNG_BASE64, 'base64').length,
      thumbUrl: galleryCoverFixture.url,
      thumbPath: galleryCoverFixture.path,
      createdAt: commonTimestamp,
      uploadedBy: 'u_docente',
    }),
    db.collection('events').doc('event_demo_upcoming').set({
      titulo: 'Reunion de familias',
      descripcion: 'Evento demo para validar calendario local.',
      tipo: 'institucional',
      fecha: admin.firestore.Timestamp.fromDate(new Date(`${upcomingEventKey}T12:00:00.000Z`)),
      hora: '18:00',
      media: [
        {
          name: 'evento-demo.png',
          url: eventFixture.url,
          path: eventFixture.path,
          type: 'image/png',
          size: Buffer.from(TINY_PNG_BASE64, 'base64').length,
        },
      ],
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('events').doc('event_demo_later').set({
      titulo: 'Taller abierto',
      descripcion: 'Segundo evento demo.',
      tipo: 'taller',
      fecha: admin.firestore.Timestamp.fromDate(new Date(`${laterEventKey}T12:00:00.000Z`)),
      hora: '10:00',
      media: [],
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('documents').doc('document_demo_family').set({
      titulo: 'Reglamento Demo',
      categoria: 'institucional',
      roles: ['family', 'docente', 'coordinacion', 'superadmin'],
      ambiente: 'global',
      archivoNombre: 'documento-demo.pdf',
      archivoURL: documentFixture.url,
      storagePath: documentFixture.path,
      requiereLecturaObligatoria: false,
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('talleres').doc('taller_demo').set({
      nombre: 'Huerta Creativa',
      descripcion: 'Taller demo para entorno local.',
      ambiente: 'taller1',
      talleristaId: 'u_tallerista',
      horario: 'Lunes 15:00-16:00',
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('appointments').doc('appointment_demo_today').set({
      familiaUid: 'u_family_1',
      familiasUids: ['u_family_1'],
      hijoId: 'child_ana_t1',
      hijoNombre: 'Ana Demo',
      fechaHora: buildArgentinaTimestamp(todayKey, appointmentHour, 0),
      estado: 'reservado',
      modalidad: 'presencial',
      recordatorioReunionMismoDia: {
        fecha: null,
        uids: [],
        updatedAt: null,
      },
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('appointments').doc('appointment_demo_available').set({
      estado: 'disponible',
      origenSlot: 'agenda',
      ambiente: 'taller1',
      fechaHora: buildArgentinaTimestamp(tomorrowKey, 14, 0),
      duracionMinutos: 30,
      modalidad: 'presencial',
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('appointments').doc('appointment_demo_tomorrow').set({
      familiaUid: 'u_family_2',
      familiasUids: ['u_family_2'],
      hijoId: 'child_ana_t1',
      hijoNombre: 'Ana Demo',
      fechaHora: buildArgentinaTimestamp(tomorrowKey, 11, 0),
      estado: 'reservado',
      modalidad: 'virtual',
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('snackAssignments').doc('snack_demo_pending').set({
      childName: 'Ana Demo',
      ambiente: 'taller1',
      fechaInicio: nextMondayKey,
      fechaFin: nextFridayKey,
      estado: 'pendiente',
      familiasUids: ['u_family_1'],
      familias: [
        {
          uid: 'u_family_1',
          name: 'Familia Uno Demo',
          confirmed: false,
          recordatorioEnviado: false,
        },
      ],
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('snackAssignments').doc('snack_demo_confirmed').set({
      childName: 'Bruno Demo',
      ambiente: 'taller2',
      fechaInicio: addDaysToDateKey(nextMondayKey, 7),
      fechaFin: addDaysToDateKey(nextFridayKey, 7),
      estado: 'confirmado',
      confirmadoPorFamilia: true,
      familiasUids: ['u_family_1'],
      familias: [
        {
          uid: 'u_family_1',
          name: 'Familia Uno Demo',
          confirmed: true,
          recordatorioEnviado: false,
        },
      ],
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('snackAssignments').doc('snack_demo_cancelled').set({
      childName: 'Ana Demo',
      ambiente: 'taller1',
      fechaInicio: addDaysToDateKey(nextMondayKey, 14),
      fechaFin: addDaysToDateKey(nextFridayKey, 14),
      estado: 'cancelado',
      familiasUids: [],
      familias: [],
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
    }),
    db.collection('snackLists').doc('taller1').set({
      items: [
        'Fruta fresca variada',
        'Pan casero sin semillas grandes',
        'Queso cremoso',
      ],
      observaciones: 'Seed local para Taller 1.',
      updatedAt: commonTimestamp,
    }),
    db.collection('snackLists').doc('taller2').set({
      items: [
        'Galletas de arroz',
        'Frutos secos sin azucar',
        'Leche o bebida vegetal',
      ],
      observaciones: 'Seed local para Taller 2.',
      updatedAt: commonTimestamp,
    }),
    db.collection('conversations').doc('conversation_demo_active').set({
      familiaUid: 'u_family_1',
      familiaDisplayName: 'Familia Uno Demo',
      familiaEmail: 'familia1@demo.pn',
      participantesUids: ['u_family_1'],
      destinatarioEscuela: 'coordinacion',
      asunto: 'Consulta demo',
      categoria: 'administrativa',
      iniciadoPor: 'familia',
      estado: 'activa',
      hasFamilyReply: true,
      hasSchoolReply: true,
      mensajesSinLeerFamilia: 0,
      mensajesSinLeerEscuela: 1,
      ultimoMensajeUid: 'message_demo_school',
      ultimoMensajeAutor: 'coordinacion',
      ultimoMensajeTexto: 'Te respondimos desde la escuela.',
      creadoAt: commonTimestamp,
      actualizadoAt: commonTimestamp,
      ultimoMensajeAt: commonTimestamp,
    }),
    db.collection('conversations').doc('conversation_demo_closed').set({
      familiaUid: 'u_family_2',
      familiaDisplayName: 'Familia Dos Demo',
      familiaEmail: 'familia2@demo.pn',
      participantesUids: ['u_family_2'],
      destinatarioEscuela: 'coordinacion',
      asunto: 'Conversacion cerrada demo',
      categoria: 'pedagogica',
      iniciadoPor: 'escuela',
      estado: 'cerrada',
      hasFamilyReply: true,
      hasSchoolReply: true,
      mensajesSinLeerFamilia: 0,
      mensajesSinLeerEscuela: 0,
      creadoAt: commonTimestamp,
      actualizadoAt: commonTimestamp,
      ultimoMensajeAt: commonTimestamp,
    }),
    db.collection('conversations').doc('conversation_demo_active').collection('messages').doc('message_demo_school').set({
      autorUid: 'u_coordinacion',
      autorDisplayName: 'Coordinacion Demo',
      autorRol: 'coordinacion',
      texto: 'Te respondimos desde la escuela.',
      adjuntos: [],
      creadoAt: commonTimestamp,
      tipoMensaje: 'normal',
    }),
    db.collection('conversations').doc('conversation_demo_active').collection('messages').doc('message_demo_family').set({
      autorUid: 'u_family_1',
      autorDisplayName: 'Familia Uno Demo',
      autorRol: 'family',
      texto: 'Hola, dejamos una consulta.',
      adjuntos: [],
      creadoAt: commonTimestamp,
      tipoMensaje: 'normal',
    }),
    db.collection('directMessages').doc('u_family_1_u_family_2').set({
      participants: ['u_family_1', 'u_family_2'],
      participantNames: {
        u_family_1: 'Familia Uno Demo',
        u_family_2: 'Familia Dos Demo',
      },
      createdBy: 'u_family_1',
      createdAt: commonTimestamp,
      updatedAt: commonTimestamp,
      unreadCount: {
        u_family_1: 0,
        u_family_2: 0,
      },
      status: 'active',
      blockedBy: null,
      lastMessageText: 'Bienvenidos al piloto de mensajes.',
      lastMessageAt: commonTimestamp,
      lastMessageAuthorUid: 'u_family_1',
    }),
    db.collection('directMessages').doc('u_family_1_u_family_2').collection('messages').doc('message_dm_demo').set({
      authorUid: 'u_family_1',
      authorName: 'Familia Uno Demo',
      text: 'Bienvenidos al piloto de mensajes.',
      createdAt: commonTimestamp,
    }),
  ];

  await Promise.all(seedOperations);

  await clearCollection('emulatorOutbox');

  console.log('Firebase emulators seeded');
  console.log(`Credenciales demo: cualquier usuario con password ${PASSWORD}`);
}

module.exports = {
  seedEmulators,
};

if (require.main === module) {
  seedEmulators().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
