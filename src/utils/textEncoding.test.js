import { describe, it, expect } from 'vitest';
import { fixMojibake, fixMojibakeDeep } from './textEncoding';

describe('fixMojibake', () => {
  it("corrige string con mojibake: 'CafÃ©' → 'Café'", () => {
    expect(fixMojibake('Caf\u00C3\u00A9')).toBe('Café');
  });

  it('deja intacto un string sin mojibake', () => {
    expect(fixMojibake('Hola mundo')).toBe('Hola mundo');
  });

  it('no rompe strings con unicode normal', () => {
    expect(fixMojibake('áéíóú ñ')).toBe('áéíóú ñ');
  });
});

describe('fixMojibakeDeep', () => {
  it('corrige strings dentro de objetos anidados', () => {
    const input = { nombre: 'Caf\u00C3\u00A9', info: { ciudad: 'Buenos Aires' } };
    const result = fixMojibakeDeep(input);
    expect(result.nombre).toBe('Café');
    expect(result.info.ciudad).toBe('Buenos Aires');
  });

  it('corrige strings dentro de arrays', () => {
    const result = fixMojibakeDeep(['Caf\u00C3\u00A9', 'normal']);
    expect(result[0]).toBe('Café');
    expect(result[1]).toBe('normal');
  });

  it('no modifica objetos Date', () => {
    const date = new Date('2024-01-01');
    expect(fixMojibakeDeep(date)).toBe(date);
  });

  it('no modifica Timestamps de Firestore (objeto con .toDate())', () => {
    const ts = { toDate: () => new Date() };
    expect(fixMojibakeDeep(ts)).toBe(ts);
  });
});
