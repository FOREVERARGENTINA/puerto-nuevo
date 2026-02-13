const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { resendLimiter } = require('../utils/rateLimiter');

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

    const subject = 'Turno reservado';

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

        const html = `
          <p>La escuela te asignó un turno.</p>
          <p><strong>Fecha:</strong> ${fechaTexto}</p>
          ${childName ? `<p><strong>Alumno:</strong> ${childName}</p>` : ''}
          <p>Ingresá a la plataforma para ver el detalle.</p>
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
