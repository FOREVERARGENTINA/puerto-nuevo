Stack 100% Firebase (todo dentro de Google, todo free tier eterno para una escuela)

FunciónTecnología Firebase (gratis)ComentarioFrontend + HostingFirebase Hosting + 
PWAHosting estático ilimitado, SSL, CDN globalAutenticación
Firebase AuthenticationEmail/password + Google, ilimitadoBase de datosFirestore in 
Native mode1 GB storage + 50 000 lecturas/día → sobraArchivos (PDFs, fotos, videos)
Firebase Storage5 GB storage + 1 GB/día descarga → suficienteBackend / lógicaCloud 
Functions for Firebase (2ª gen)2 millones invocaciones/mes gratisEmails transaccionales
Cloud Functions + Nodemailer + Gmail SMTP100 emails/día gratis con cuenta Gmail o usa 
Resend dentro de Cloud Functions (sigue siendo gratis)Notificaciones push PWAFirebase 
Cloud Messaging (FCM)Gratis ilimitadoTurnero, confirmación lectura, rolesCloud Functions
 + Firestore triggersTodo gratisDominio propio + SSLFirebase Hosting (agregas tu dominio)
Gratis
Framework recomendado para que sea fácil y rápido

Next.js 14+ (App Router) desplegado directamente en Firebase Hosting (
usando el preset oficial de Firebase)
O si quieres aún más simple: Vue 3 + Vite o SvelteKit → también se despliegan en 
Firebase Hosting en 1 clic

**Stack Recomendado: Firebase Spark Plan (Free Tier)**

Para tu portal escolar con ~50-100 usuarios (familias/docentes), este stack concreto se mantiene en límites gratuitos: 1 GiB Firestore, 50K lecturas/día, 20K escrituras/día, 5 GB Storage, 10 GiB/mes egress, FCM push gratis.[1][3]

- **Frontend**: React (con Vite) + Firebase SDK + PWA (Workbox). Responsive, roles/permisos client-side. Hosting: Firebase Hosting (ilimitado gratis).
- **Autenticación**: Firebase Auth (email/password + 2FA opcional, 50 MAUs gratis).
- **Base de Datos**: Firestore (usuarios, fichas alumnos, mensajes segmentados por taller/ambiente, historial lecturas).
- **Almacenamiento**: Firebase Storage (documentos PDF/imágenes/videos por ambiente/taller, 5 GB gratis).
- **Comunicación**: FCM (push PWA gratis), Cloud Functions (emails/notificaciones, 125K invocaciones/mes gratis).
- **Turnero/Admin**: Firestore + Cloud Functions (agendas, cupos, confirmaciones automáticas).
- **Seguridad**: Firestore Rules (por roles: familias ven solo sus hijos/talleres; admin todo).

**Optimizaciones Free Tier**: Usa consultas eficientes (índices), paginación en listas, compresión Storage, batch operations. Monitorea en Firebase Console; escala a Blaze solo si excedes (raro para escuela pequeña). Cubre todas tus funciones sin servers ni costos.[2][5][1]

[1](https://firebase.google.com/pricing?hl=es-419)
[2](https://openwebinars.net/blog/como-usar-firebase-como-backend-paso-a-paso/)
[3](https://firebase.google.com/docs/firestore/quotas?hl=es-419)
[4](https://www.youtube.com/watch?v=MR0WNBpOBr4)
[5](https://translate.google.com/translate?u=https%3A%2F%2Fdev.to%2Firedox10%2Fexploring-firebases-free-tier-how-much-can-you-get-for-free-3971&hl=es&sl=en&tl=es&client=srp)
[6](https://www.reddit.com/r/programacion/comments/1bog5js/free_tier_de_firebase_para_prod_en_proyectos/)
[7](https://translate.google.com/translate?u=https%3A%2F%2Fstackoverflow.com%2Fquestions%2F27501794%2Flimitation-of-free-plan-in-firebase&hl=es&sl=en&tl=es&client=srp)
[8](https://www.youtube.com/watch?v=d6rTYUlYjOM)
[9](https://hackernoon.com/lang/es/guia-para-implementar-un-sitio-web-en-firebase-y-usarlo-de-forma-gratuita)
[10](https://www.nocodehackers.es/herramientas-no-code/firebase)