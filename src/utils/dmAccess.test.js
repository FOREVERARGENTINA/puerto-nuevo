import { describe, it, expect } from 'vitest';
import { canAccessDMs } from './dmAccess';

describe('canAccessDMs', () => {
  it('devuelve false para rol docente', () => {
    expect(canAccessDMs({ role: 'docente', uid: 'u1', config: { enabled: true } })).toBe(false);
  });

  it('devuelve false para rol admin', () => {
    expect(canAccessDMs({ role: 'coordinacion', uid: 'u1', config: { enabled: true } })).toBe(false);
  });

  it('devuelve true para family con enabled: true', () => {
    expect(canAccessDMs({ role: 'family', uid: 'u1', config: { enabled: true } })).toBe(true);
  });

  it('devuelve true para family con enabled: false y uid en piloto', () => {
    expect(
      canAccessDMs({ role: 'family', uid: 'piloto1', config: { enabled: false, pilotFamilyUids: ['piloto1', 'piloto2'] } })
    ).toBe(true);
  });

  it('devuelve false para family con enabled: false y uid fuera del piloto', () => {
    expect(
      canAccessDMs({ role: 'family', uid: 'otro', config: { enabled: false, pilotFamilyUids: ['piloto1'] } })
    ).toBe(false);
  });

  it('devuelve false sin uid', () => {
    expect(canAccessDMs({ role: 'family', uid: null, config: { enabled: true } })).toBe(false);
  });
});
