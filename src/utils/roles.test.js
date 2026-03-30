import { describe, it, expect } from 'vitest';
import { normalizeRole } from './roles';

describe('normalizeRole', () => {
  it("convierte 'teacher' a 'docente'", () => {
    expect(normalizeRole('teacher')).toBe('docente');
  });

  it("convierte 'teachers' a 'docente'", () => {
    expect(normalizeRole('teachers')).toBe('docente');
  });

  it("convierte typo 'doeente' a 'docente'", () => {
    expect(normalizeRole('doeente')).toBe('docente');
  });

  it("deja 'family' sin cambio", () => {
    expect(normalizeRole('family')).toBe('family');
  });

  it('devuelve string vacío para null', () => {
    expect(normalizeRole(null)).toBe('');
  });

  it('devuelve string vacío para número', () => {
    expect(normalizeRole(42)).toBe('');
  });
});
