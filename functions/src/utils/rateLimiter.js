/**
 * Rate limiter para Resend API
 * Free tier: 2 requests/segundo
 * Usamos 1.5 req/s para margen de seguridad
 */

class RateLimiter {
  constructor(requestsPerSecond = 1.5) {
    this.minDelay = 1000 / requestsPerSecond; // 666ms para 1.5 req/s
    this.lastRequest = 0;
  }

  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < this.minDelay) {
      const delay = this.minDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequest = Date.now();
  }

  /**
   * Retry con exponential backoff para rate limit errors
   */
  async retryWithBackoff(fn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.throttle();
        return await fn();
      } catch (error) {
        const isRateLimitError = error.message?.includes('429') ||
                                 error.message?.includes('rate_limit_exceeded');

        if (isRateLimitError && attempt < maxRetries) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000); // max 10s
          console.log(`Rate limit hit, retry ${attempt}/${maxRetries} after ${backoffDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          throw error;
        }
      }
    }
  }
}

// Singleton para compartir entre invocaciones
const resendLimiter = new RateLimiter(1.5);

module.exports = { resendLimiter };
