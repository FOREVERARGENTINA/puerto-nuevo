Plan Estratégico: Notificaciones Push PWA (iOS & Android)
Este plan evita la complejidad innecesaria y se alinea con el stack existente: React + Vite (Frontend) y Firebase Cloud Functions (Backend).

🎯 Objetivo
Lograr que las familias y docentes reciban notificaciones nativas en sus dispositivos al instalar la PWA, asegurando compatibilidad crítica con iOS 16.4+ (Web Push) y Android.

📅 Fase 1: Infraestructura y Configuración (Zone Base)
El objetivo es preparar el "terreno" sin tocar lógica de negocio aún.

Service Worker Moderno (firebase-messaging-sw.js):
Acción: Crear este archivo en public/.
Estrategia: Usar la versión v9 modular de Firebase servida desde CDN en el SW para mantenerlo ligero.
Background Handling: Configurar onBackgroundMessage para interceptar notificaciones cuando la app está cerrada (crítico para iOS).
Manifest & Meta Tags (Validación PWA):
Acción: Revisar 
manifest.webmanifest
 y 
index.html
.
Requisito iOS: Para recibir notificaciones en iOS, la PWA DEBE ser instalable (display: standalone) y estar agregada al Home Screen.
Modernidad: Asegurar iconos enmascarables y configuración adecuada de theme_color para evitar la "barra blanca" en iOS.
Seguridad de Credenciales:
Acción: Generar par de llaves VAPID (Voluntary Application Server Identification) en Firebase Console.
Regla: Nunca hardcodear la llave privada. La pública irá en el frontend (.env).
🛠️ Fase 2: Frontend - La Experiencia de Usuario (React)
Aquí implementamos la lógica de "pedir permiso" sin ser invasivos (UX moderno).

Hook Personalizado: usePushNotifications:
Responsabilidad:
Verificar soporte del navegador ('serviceWorker' in navigator).
Solicitar permiso (Notification.requestPermission()) solo tras interacción del usuario (ej: un toggle en "Mi Perfil"). Nunca al cargar la página (anti-patrón).
Obtener el token FCM.
Eficiencia: Guardar el token solo si ha cambiado o es nuevo.
Gestión de Tokens en Firestore:
Estructura Propuesta:
javascript
/users/{userId}/fcm_tokens/{tokenId}
{
  token: "...",
  device: "iPhone 15 - Safari",
  last_used: Timestamp,
  created_at: Timestamp
}
Por qué subcolección: Evita exceder el límite de tamaño del documento de usuario (1MB) y permite múltiples dispositivos por padre/madre (tablet + celular).
UI de "Instalar App" (iOS Prompt):
Detección de iOS: Si es iOS y no está en modo standalone, mostrar un componente elegante (Toast/Modal bottom) enseñando a hacer "Share -> Add to Home Screen".
Nota: Sin esto, las notificaciones en iOS NO funcionan.
⚡ Fase 3: Backend - Lógica de Disparo (Cloud Functions)
Aquí es donde 
agents.md
 nos dicta las reglas de negocio y costos.

Trigger Optimizado:
Evento: onWrite en /communications/{commId} (cuando pasa a estado sent).
Logica:
Leer el comunicado.
Identificar destinatarios (ej: "Taller 1").
Batch Read: Leer tokens solo de los padres afectados (usando where('taller', '==', 'taller1') en users o logic similar).
Multicast Send: Usar admin.messaging().sendEachForMulticast para enviar en lote (ahorra invocaciones).
Limpieza de Tokens (Mantenimiento):
Estrategia: Si FCM devuelve error registration-token-not-registered (usuario desinstaló o revocó permisos), borrar ese token de la subcolección del usuario inmediatamente.
Impacto: Mantiene la BD limpia y reduce costos de envío fallido.
Payload Seguro (Privacidad):
Regla de Oro: NO incluir nombres completos de niños ni datos médicos en el cuerpo de la notificación.
Formato:
Título: "Nueva comunicación de Puerto Nuevo"
Cuerpo: "Hay un mensaje importante sobre Taller 1."
Action: Clic lleva a /comunicados/{id}.
✅ Fase 4: Testing & Validación
Prueba de Integración:
Flujo completo: Login -> Permitir Notif -> Crear Comunicado (Admin) -> Recibir en Móvil.
Validación iOS:
Verificar que llegue con la app cerrada (burbuja roja en icono).
Validación de Costos:
Monitorear lecturas de Firestore en el primer envío masivo.
¿Por qué este plan es "Estratégico"?
Alineado a Guía: Usa herramientas nativas y estándar (FCM, Service Workers), evitando librerías de terceros pesadas.
Eficiente: Separa tokens en subcolecciones para no inflar los documentos de usuario (lecturas más rápidas y baratas).
Seguro: Filtra datos sensibles en el payload y maneja permisos explícitos.
Moderno: Ataca específicamente el caso de uso de iOS PWA que es el estándar actual (2025-2026).