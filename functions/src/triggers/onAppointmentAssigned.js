const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { resendLimiter } = require('../utils/rateLimiter');
const { escapeHtml } = require('../utils/sanitize');

const resendApiKey = defineSecret('RESEND_API_KEY');

exports.onAppointmentAssigned = onDocumentUpdated(
  {
    document: 'appointments/{appointmentId}',
    secrets: [resendApiKey]
  },
  async (event) => {
    const beforeSnap = event.data.before;
    const afterSnap = event.data.after;
    if (!afterSnap || !afterSnap.exists) return;

    const before = beforeSnap.data() || {};
    const after = afterSnap.data() || {};

    if (after.estado !== 'reservado') return;

    const beforeFamilies = new Set([
      ...(Array.isArray(before.familiasUids) ? before.familiasUids : []),
      ...(before.familiaUid ? [before.familiaUid] : [])
    ]);
    const afterFamilies = new Set([
      ...(Array.isArray(after.familiasUids) ? after.familiasUids : []),
      ...(after.familiaUid ? [after.familiaUid] : [])
    ]);

    const newRecipients = Array.from(afterFamilies).filter(uid => !beforeFamilies.has(uid));
    if (newRecipients.length === 0) return;

    let childName = '';
    if (after.hijoId) {
      const childSnap = await admin.firestore().collection('children').doc(after.hijoId).get();
      if (childSnap.exists) {
        childName = childSnap.data().nombreCompleto || '';
      }
    }

    const fechaHora = after.fechaHora?.toDate ? after.fechaHora.toDate() : null;
    const fechaTexto = fechaHora
      ? fechaHora.toLocaleString('es-AR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Fecha por confirmar';

    const subject = 'Turno reservado - Montessori Puerto Nuevo';
    const appointmentUrl = 'https://montessoripuertonuevo.com.ar/portal/familia/turnos';
    const safeAppointmentUrl = escapeHtml(appointmentUrl);

    const batchSize = 10;
    for (let i = 0; i < newRecipients.length; i += batchSize) {
      const batch = newRecipients.slice(i, i + batchSize);
      const usersSnap = await admin.firestore().collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', batch)
        .get();

      for (const uDoc of usersSnap.docs) {
        const user = uDoc.data();
        const email = user.email || null;
        if (!email || !resendApiKey.value()) continue;

        const safeFechaTexto = escapeHtml(fechaTexto);
        const safeChildName = childName ? escapeHtml(childName) : '';
        const html = `
          <div lang="es">
          <p>Hola,</p>
          <p>Te confirmamos que tenés un turno reservado en la escuela.</p>
          <p><strong>Fecha:</strong> ${safeFechaTexto}</p>
          ${safeChildName ? `<p><strong>Alumno:</strong> ${safeChildName}</p>` : ''}
          <p style="margin:16px 0;">
            <a href="${safeAppointmentUrl}" style="background-color:#488284;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;">Ver detalle del turno</a>
          </p>
          <p style="font-size:0.92em;color:#555;">
            Si no podes abrir el boton, copia este enlace:<br>
            <a href="${safeAppointmentUrl}" style="color:#1a73e8;">${safeAppointmentUrl}</a>
          </p>
          <p style="color:#666;font-size:0.9em;">Cariños,<br>Equipo de Puerto Nuevo</p>
          </div>
        `;

        try {
          await resendLimiter.retryWithBackoff(async () => {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey.value()}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: 'Montessori Puerto Nuevo <info@montessoripuertonuevo.com.ar>',
                to: email,
                subject,
                headers: {
                  'Content-Language': 'es-AR'
                },
                html
              })
            });

            if (!res.ok) {
              const text = await res.text();
              throw new Error(`Resend error: ${res.status} ${text}`);
            }
            return await res.json();
          });
        } catch (err) {
          console.error('Error enviando email de turno asignado:', err);
        }
      }
    }
  }
);
