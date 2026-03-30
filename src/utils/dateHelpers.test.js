import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isNext24Hours, isNext48Hours, formatRelativeTime } from './dateHelpers';

const NOW = new Date('2024-06-15T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const hoursFromNow = (h) => new Date(NOW.getTime() + h * 60 * 60 * 1000);

describe('isNext24Hours', () => {
  it('devuelve true para fecha en 12 horas', () => {
    expect(isNext24Hours(hoursFromNow(12))).toBe(true);
  });

  it('devuelve false para fecha en 48 horas', () => {
    expect(isNext24Hours(hoursFromNow(48))).toBe(false);
  });

  it('devuelve false para fecha pasada', () => {
    expect(isNext24Hours(hoursFromNow(-1))).toBe(false);
  });

  it('acepta Timestamp de Firestore (objeto con .toDate())', () => {
    const ts = { toDate: () => hoursFromNow(6) };
    expect(isNext24Hours(ts)).toBe(true);
  });
});

describe('isNext48Hours', () => {
  it('devuelve true para fecha en 36 horas', () => {
    expect(isNext48Hours(hoursFromNow(36))).toBe(true);
  });

  it('devuelve false para fecha en 72 horas', () => {
    expect(isNext48Hours(hoursFromNow(72))).toBe(false);
  });
});

describe('formatRelativeTime', () => {
  it('devuelve "Hace menos de 1 hora" para fecha reciente', () => {
    expect(formatRelativeTime(hoursFromNow(-0.5))).toBe('Hace menos de 1 hora');
  });

  it('devuelve "Hace 3 horas" para fecha de 3 horas atrás', () => {
    expect(formatRelativeTime(hoursFromNow(-3))).toBe('Hace 3 horas');
  });

  it('devuelve "Ayer" para fecha de 1 día atrás', () => {
    expect(formatRelativeTime(hoursFromNow(-25))).toBe('Ayer');
  });

  it('devuelve "Hace 5 días" para fecha de 5 días atrás', () => {
    expect(formatRelativeTime(hoursFromNow(-5 * 24))).toBe('Hace 5 días');
  });

  it('acepta Timestamp de Firestore', () => {
    const ts = { toDate: () => hoursFromNow(-2) };
    expect(formatRelativeTime(ts)).toBe('Hace 2 horas');
  });
});
