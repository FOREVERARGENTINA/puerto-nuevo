import { describe, it, expect } from 'vitest';
import { hasPermission, getRolePermissions, ROLES, PERMISSIONS } from './constants';

describe('hasPermission', () => {
  it('superadmin puede MANAGE_USERS', () => {
    expect(hasPermission(ROLES.SUPERADMIN, PERMISSIONS.MANAGE_USERS)).toBe(true);
  });

  it('family no puede MANAGE_USERS', () => {
    expect(hasPermission(ROLES.FAMILY, PERMISSIONS.MANAGE_USERS)).toBe(false);
  });

  it('docente puede SEND_COMMUNICATIONS', () => {
    expect(hasPermission(ROLES.DOCENTE, PERMISSIONS.SEND_COMMUNICATIONS)).toBe(true);
  });

  it('devuelve false con role null', () => {
    expect(hasPermission(null, PERMISSIONS.MANAGE_USERS)).toBe(false);
  });

  it('devuelve false con permission null', () => {
    expect(hasPermission(ROLES.SUPERADMIN, null)).toBe(false);
  });
});

describe('getRolePermissions', () => {
  it('superadmin tiene todos los permisos', () => {
    const perms = getRolePermissions(ROLES.SUPERADMIN);
    expect(perms).toContain(PERMISSIONS.MANAGE_USERS);
    expect(perms).toContain(PERMISSIONS.MANAGE_CHILDREN);
    expect(perms).toContain(PERMISSIONS.SEND_COMMUNICATIONS);
    expect(perms).toContain(PERMISSIONS.APPROVE_COMMUNICATIONS);
  });

  it('family devuelve array vacío', () => {
    expect(getRolePermissions(ROLES.FAMILY)).toEqual([]);
  });
});
