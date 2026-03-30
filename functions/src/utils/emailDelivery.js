const { mailLimiter } = require('./rateLimiter');
const { isEmulatorRuntime } = require('./emulatorMode');
const { writeEmulatorOutboxEntry } = require('./emulatorOutbox');

async function sendEmailMessage({
  apiKey,
  payload,
  source,
  metadata = {},
}) {
  const recipientEmails = Array.isArray(payload?.to)
    ? payload.to.map((entry) => entry?.email).filter(Boolean)
    : [];

  if (isEmulatorRuntime()) {
    const outboxEntry = await writeEmulatorOutboxEntry({
      type: 'email',
      source,
      recipientEmails,
      payload,
      metadata,
    });

    return {
      mode: 'emulator',
      messageId: outboxEntry?.id || null,
    };
  }

  if (!apiKey) {
    return {
      mode: 'missing-api-key',
      messageId: null,
    };
  }

  const result = await mailLimiter.retryWithBackoff(async () => {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      const error = new Error(`Brevo error: ${res.status} ${text}`);
      error.status = res.status;
      throw error;
    }

    return await res.json();
  });

  return {
    mode: 'provider',
    messageId: result.messageId || null,
    raw: result,
  };
}

module.exports = {
  sendEmailMessage,
};
