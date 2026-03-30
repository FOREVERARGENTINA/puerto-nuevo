import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { mailLimiter } = require('./rateLimiter');

describe('isRateLimitError', () => {
  it('detecta status 429', () => {
    expect(mailLimiter.isRateLimitError({ status: 429 })).toBe(true);
  });

  it('detecta mensaje "too many requests"', () => {
    expect(mailLimiter.isRateLimitError({ message: 'Too many requests' })).toBe(true);
  });

  it("detecta código '429'", () => {
    expect(mailLimiter.isRateLimitError({ code: '429' })).toBe(true);
  });

  it('devuelve false para error 400', () => {
    expect(mailLimiter.isRateLimitError({ status: 400 })).toBe(false);
  });
});

describe('isTransientNetworkError', () => {
  it('detecta status 500', () => {
    expect(mailLimiter.isTransientNetworkError({ status: 500 })).toBe(true);
  });

  it('detecta status 503', () => {
    expect(mailLimiter.isTransientNetworkError({ status: 503 })).toBe(true);
  });

  it('detecta código ECONNRESET', () => {
    expect(mailLimiter.isTransientNetworkError({ code: 'ECONNRESET' })).toBe(true);
  });

  it('detecta código ETIMEDOUT', () => {
    expect(mailLimiter.isTransientNetworkError({ code: 'ETIMEDOUT' })).toBe(true);
  });

  it('devuelve false para error 400', () => {
    expect(mailLimiter.isTransientNetworkError({ status: 400 })).toBe(false);
  });
});
