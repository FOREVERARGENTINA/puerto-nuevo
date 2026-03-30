import { describe, it, expect } from 'vitest';
import { canAccessSocial } from './socialAccess';

describe('canAccessSocial', () => {
  it('devuelve true para superadmin siempre', () => {
    expect(canAccessSocial({ role: 'superadmin', uid: 'u1', config: { enabled: false } })).toBe(true);
  });

  it('devuelve true para coordinacion siempre', () => {
    expect(canAccessSocial({ role: 'coordinacion', uid: 'u1', config: { enabled: false } })).toBe(true);
  });

  it('devuelve true para family con enabled: true', () => {
    expect(canAccessSocial({ role: 'family', uid: 'u1', config: { enabled: true } })).toBe(true);
  });

  it('devuelve true para docente con enabled: true', () => {
    expect(canAccessSocial({ role: 'docente', uid: 'u1', config: { enabled: true } })).toBe(true);
  });

  it('devuelve true para tallerista con enabled: true', () => {
    expect(canAccessSocial({ role: 'tallerista', uid: 'u1', config: { enabled: true } })).toBe(true);
  });

  it('devuelve true para family con enabled: false y uid en piloto', () => {
    expect(
      canAccessSocial({ role: 'family', uid: 'piloto1', config: { enabled: false, pilotFamilyUids: ['piloto1'] } })
    ).toBe(true);
  });

  it('devuelve false para family con enabled: false y uid fuera del piloto', () => {
    expect(
      canAccessSocial({ role: 'family', uid: 'otro', config: { enabled: false, pilotFamilyUids: ['piloto1'] } })
    ).toBe(false);
  });

  it('devuelve false para rol desconocido', () => {
    expect(canAccessSocial({ role: 'desconocido', uid: 'u1', config: { enabled: true } })).toBe(false);
  });
});
