import { describe, it, expect } from 'vitest';
import { getInitials, getAvatarColorToken, COLOR_TOKENS } from './avatarHelpers';

describe('getInitials', () => {
  it("'Juan Pérez' → 'JP'", () => {
    expect(getInitials('Juan Pérez')).toBe('JP');
  });

  it("'Juan' → 'J'", () => {
    expect(getInitials('Juan')).toBe('J');
  });

  it("string vacío → '?'", () => {
    expect(getInitials('')).toBe('?');
  });

  it("null → '?'", () => {
    expect(getInitials(null)).toBe('?');
  });

  it("'Juan Carlos López' → 'JL' (primera y última palabra)", () => {
    expect(getInitials('Juan Carlos López')).toBe('JL');
  });
});

describe('getAvatarColorToken', () => {
  it('devuelve un token CSS válido de COLOR_TOKENS', () => {
    const token = getAvatarColorToken('Ana García');
    expect(COLOR_TOKENS).toContain(token);
  });

  it('el mismo nombre siempre devuelve el mismo token (hash estable)', () => {
    const name = 'María López';
    expect(getAvatarColorToken(name)).toBe(getAvatarColorToken(name));
  });
});
