/**
 * Rate limiter para Resend API
 * Free tier: 2 requests/segundo
 * Usamos 1.5 req/s para margen de seguridad
 */

class RateLimiter {
  constructor(requestsPerSecond = 1.5) {
    this.minDelay = 1000 / requestsPerSecond; // 666ms para 1.5 req/s
    this.nextAvailableAt = 0;
    this.queue = Promise.resolve();
  }

  async throttle() {
    const scheduled = this.queue.then(async () => {
      const now = Date.now();
      const waitMs = Math.max(0, this.nextAvailableAt - now);

      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      // Reserva la siguiente ventana de ejecución de manera serializada.
      this.nextAvailableAt = Math.max(this.nextAvailableAt, Date.now()) + this.minDelay;
    });

    // Mantener la cola viva incluso si alguna llamada falla.
    this.queue = scheduled.catch(() => {});
    await scheduled;
  }

  /**
   * Retry con exponential backoff para rate limit errors
   */
  async retryWithBackoff(fn, maxRetries = 3) {
    const retries = Number.isInteger(maxRetries) && maxRetries > 0 ? maxRetries : 3;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.throttle();
        return await fn();
      } catch (error) {
        const isRateLimitError = this.isRateLimitError(error);
        const isTransientError = this.isTransientNetworkError(error);
        const shouldRetry = isRateLimitError || isTransientError;

        if (shouldRetry && attempt < retries) {
          // Exponential backoff capped at 10s + jitter (0-250ms) to reduce herd effect.
          const baseDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
          const jitter = Math.floor(Math.random() * 250);
          const backoffDelay = baseDelay + jitter;
          const reason = isRateLimitError ? 'rate-limit' : 'transient-error';
          console.log(`Retry ${attempt}/${retries} due to ${reason}, waiting ${backoffDelay}ms`);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        } else {
          throw error;
        }
      }
    }
  }

  isRateLimitError(error) {
    const message = String(error?.message || '').toLowerCase();
    const status = Number(error?.status || error?.statusCode || 0);
    const code = String(error?.code || '').toLowerCase();

    return (
      status === 429 ||
      code === '429' ||
      message.includes('429') ||
      message.includes('too many requests') ||
      message.includes('rate_limit_exceeded')
    );
  }

  isTransientNetworkError(error) {
    const status = Number(error?.status || error?.statusCode || 0);
    const code = String(error?.code || '').toUpperCase();
    const message = String(error?.message || '').toLowerCase();

    if (status >= 500 && status < 600) return true;

    const transientCodes = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED'];
    if (transientCodes.includes(code)) return true;

    return (
      message.includes('network') ||
      message.includes('fetch failed') ||
      message.includes('timeout') ||
      message.includes('temporarily unavailable')
    );
  }
}

// Singleton para compartir entre invocaciones
const resendLimiter = new RateLimiter(1.5);

module.exports = { resendLimiter };
