1. Estructura de colecciones Firestore (Native Mode)
text/users                              ← perfil público + rol
    {uid} 
        displayName, email, role ("family" | "teacher" | "tallerista" | "admin" | "coordinacion" | "direccion" | "aspirante"), 
        children: ["uid-hijo-1", "uid-hijo-2"],        ← solo para familias
        tallerEspeciales: ["robotica-t1", "yoga-t2"]  ← solo para talleristas/docentes
        createdAt, disabled

/children                           ← ficha del alumno
    {childId}
        nombreCompleto, fechaNacimiento, ambiente ("taller1" | "taller2"), 
        responsables: ["uid-papa", "uid-mama"],
        talleresEspeciales: ["robotica-t1", "teatro-t2"],
        datosMedicos: { alergias, medicamentos, indicaciones, contactosEmergencia },
        documentosMedicos: ["storage-path-1", "storage-path-2"]

/communications                     ← todas las comunicaciones
    {commId}
        title, body, type ("global" | "ambiente" | "taller" | "individual"),
        ambiente: "taller1" | "taller2" | null,
        tallerEspecial: "robotica-t1" | null,
        destinatarios: ["uid-1", "uid-2"] | "all",
        requiereLecturaObligatoria: true/false,
        sentAt, sentBy (uid), sentByRole

/readReceipts                       ← confirmaciones de lectura
    {commId}/lecturas/{uid}
        leidoAt (timestamp)

/documents                          ← árbol de documentos
    {docId}
        title, fileUrl, folder ("general" | "taller1" | "taller2" | "robotica-t1" | ...),
        requiereLecturaObligatoria: true/false,
        uploadedBy, uploadedAt

/documentReads                      ← lecturas obligatorias de documentos
    {docId}/lecturas/{uid}
        leidoAt

/appointments                       ← turnero institucional
    {appointmentId}
        fechaHora (timestamp), duracionMinutos, familiaUid, hijoId, estado ("reservado" | "cancelado" | "asistio"),
        creadoAt, nota

/aspirantes                         ← familias interesadas e inscritas
    {uid}
        etapa ("interesado" | "entrevista" "documentacion" "aceptado" "rechazado"),
        documentosLeidos: ["doc-intro-1", "reglamento-2025"],
        hijosPotenciales: [{nombre, edad, ambienteDeseado}]
2. Firebase Security Rules (pegá esto directo en tu firebase.rules)
rulesrules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ---------- UTILIDADES ----------
    function esAdmin() {
      return request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ["admin", "direccion", "coordinacion"];
    }
    function esDocenteOTallerista() {
      return request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ["teacher", "tallerista"];
    }
    function esFamilia() {
      return request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "family";
    }
    function esAspirante() {
      return request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "aspirante";
    }

    // ---------- USERS ----------
    match /users/{userId} {
      allow read: if request.auth != null && (request.auth.uid == userId || esAdmin());
      allow write: if esAdmin();
      allow create: if request.auth != null; // registro inicial
    }

    // ---------- CHILDREN ----------
    match /children/{childId} {
      allow read: if esAdmin() 
                || (esFamilia() && request.auth.uid in resource.data.responsables)
                || (esDocenteOTallerista() && resource.data.ambiente in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tallerEspeciales);
      allow write: if esAdmin();
    }

    // ---------- COMMUNICATIONS ----------
    match /communications/{commId} {
      allow read: if request.auth != null;
      allow create, update: if esAdmin() || esDocenteOTallerista();
    }

    match /readReceipts/{commId}/lecturas/{userId} {
      allow read: if esAdmin();
      allow create, update: if request.auth.uid == userId;
    }

    // ---------- DOCUMENTS ----------
    match /documents/{docId} {
      allow read: if request.auth != null;
      allow create, update, delete: if esAdmin() || esDocenteOTallerista();
    }

    match /documentReads/{docId}/lecturas/{userId} {
      allow read: if esAdmin() || request.auth.uid == userId;
      allow create: if request.auth.uid == userId;
    }

    // ---------- TURNERO ----------
    match /appointments/{appId} {
      allow read, create: if request.auth != null;
      allow update, delete: if esAdmin() || resource.data.familiaUid == request.auth.uid;
    }

    // ---------- ASPIRANTES ----------
    match /aspirantes/{userId} {
      allow read, write: if request.auth.uid == userId || esAdmin();
    }
  }
}
3. Firebase Storage Rules (para PDFs, fotos, videos)
rulesrules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Archivos públicos de la escuela (galería, documentos generales)
    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role in ["admin", "direccion", "teacher", "tallerista"];
    }

    // Documentos privados de alumnos (certificados médicos)
    match /private/{childId}/{allPaths=**} {
      allow read, write: if request.auth != null && 
        (request.auth.token.role in ["admin", "direccion"] ||
         resource.metadata.childId == childId && request.auth.uid in get(/databases/$(database)/documents/children/$(childId)).data.responsables);
    }
  }
}