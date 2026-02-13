const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { resendLimiter } = require('../utils/rateLimiter');
const { escapeHtml, toSafeHtmlParagraph } = require('../utils/sanitize');
const { maskEmail } = require('../utils/logging');

const resendApiKey = defineSecret('RESEND_API_KEY');

/**
 * Trigger cuando se crea un documento con lectura obligatoria.
 * Envia notificaciones in-app y emails a los destinatarios.
 */
exports.onDocumentWithMandatoryReading = onDocumentCreated(
  {
    document: 'documents/{documentId}',
    secrets: [resendApiKey],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    const document = snapshot.data();
    const documentId = event.params.documentId;

    if (!document.requiereLectura) {
      return;
    }

    try {
      const db = admin.firestore();

      const receiptsSnapshot = await db.collection('documentReadReceipts')
        .where('documentId', '==', documentId)
        .where('status', '==', 'pending')
        .get();

      if (receiptsSnapshot.empty) {
        console.log(`No hay receipts pendientes para documento ${documentId}`);
        return;
      }

      console.log(`Documento "${document.titulo}" requiere lectura: ${receiptsSnapshot.size} destinatarios`);

      const batch = db.batch();
      const now = admin.firestore.FieldValue.serverTimestamp();

      receiptsSnapshot.docs.forEach((receiptDoc) => {
        const receipt = receiptDoc.data();

        const notificationRef = db.collection('notifications').doc();
        batch.set(notificationRef, {
          userId: receipt.userId,
          type: 'document_mandatory_reading',
          title: 'Documento para leer',
          message: `Nuevo documento obligatorio: "${document.titulo}"`,
          metadata: {
            documentId,
            documentTitle: document.titulo,
            receiptId: receiptDoc.id,
            categoria: document.categoria,
            fechaLimite: document.fechaLimite || null,
          },
          read: false,
          createdAt: now,
          url: '/familia/documentos',
        });
      });

      await batch.commit();
      console.log(`Notificaciones in-app creadas: ${receiptsSnapshot.size}`);

      if (!resendApiKey.value()) {
        console.log('RESEND_API_KEY no configurada, se omite envio de emails');
        return;
      }

      const recipients = receiptsSnapshot.docs.map((doc) => doc.data());
      let totalSent = 0;
      let totalFailed = 0;

      const uids = recipients.map((r) => r.userId);
      const BATCH_SIZE = 10;

      for (let i = 0; i < uids.length; i += BATCH_SIZE) {
        const batchUids = uids.slice(i, i + BATCH_SIZE);
        const usersSnap = await db.collection('users')
          .where(admin.firestore.FieldPath.documentId(), 'in', batchUids)
          .get();

        for (const userDoc of usersSnap.docs) {
          const user = userDoc.data();
          const email = user.email;

          if (!email) {
            console.log(`Usuario ${userDoc.id} sin email`);
            continue;
          }

          try {
            const safeTitle = escapeHtml(document.titulo || 'Documento');
            const safeDescription = document.descripcion ? toSafeHtmlParagraph(document.descripcion) : '';
            const fechaLimiteText = document.fechaLimite
              ? `<p><strong>Fecha limite:</strong> ${new Date(document.fechaLimite.toDate()).toLocaleDateString('es-AR')}</p>`
              : '';

            const payload = {
              from: 'Montessori Puerto Nuevo <info@montessoripuertonuevo.com.ar>',
              to: email,
              subject: `Documento obligatorio: ${document.titulo}`,
              html: `
                <h2>Nuevo documento de lectura obligatoria</h2>
                <h3>${safeTitle}</h3>
                ${safeDescription ? `<p>${safeDescription}</p>` : ''}
                ${fechaLimiteText}
                <p><strong>Este documento requiere confirmacion de lectura.</strong></p>
                <p>Ingresa a la plataforma para leer el documento y confirmar tu lectura:</p>
                <p><a href="https://montessoripuertonuevo.com.ar/familia/documentos" style="background-color: #488284; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Ver documento</a></p>
                <p style="color: #666; font-size: 0.9em;">Puerto Nuevo Montessori</p>
              `,
            };

            await resendLimiter.retryWithBackoff(async () => {
              const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${resendApiKey.value()}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
              });

              if (!res.ok) {
                const text = await res.text();
                throw new Error(`Resend error: ${res.status} ${text}`);
              }

              return await res.json();
            });

            console.log(`Email enviado a ${maskEmail(email)}`);
            totalSent++;
          } catch (err) {
            console.error(`Error enviando email a ${maskEmail(email)}:`, err);
            totalFailed++;
          }
        }
      }

      console.log(`Emails enviados: ${totalSent} exitosos, ${totalFailed} fallidos`);
    } catch (error) {
      console.error('Error en trigger onDocumentWithMandatoryReading:', error);
    }
  }
);

