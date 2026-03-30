import { describe, it, expect } from 'vitest';
import {
  normalizeSnackAssignmentState,
  getSnackStatusMeta,
  isSnackAssignmentActiveForFamily,
  isSnackAssignmentConfirmedLike,
  SNACK_ASSIGNMENT_STATE,
} from './snackAssignmentState';

describe('normalizeSnackAssignmentState', () => {
  it('suspendido: true tiene máxima prioridad sobre cualquier estado', () => {
    expect(normalizeSnackAssignmentState({ suspendido: true, estado: 'cancelado' }))
      .toBe(SNACK_ASSIGNMENT_STATE.SUSPENDED);
  });

  it('cancelado es estado terminal', () => {
    expect(normalizeSnackAssignmentState({ estado: 'cancelado' }))
      .toBe(SNACK_ASSIGNMENT_STATE.CANCELLED);
  });

  it('solicitudCambio: true → change_requested', () => {
    expect(normalizeSnackAssignmentState({ solicitudCambio: true }))
      .toBe(SNACK_ASSIGNMENT_STATE.CHANGE_REQUESTED);
  });

  it('confirmadoPorFamilia: true → confirmed', () => {
    expect(normalizeSnackAssignmentState({ confirmadoPorFamilia: true }))
      .toBe(SNACK_ASSIGNMENT_STATE.CONFIRMED);
  });

  it('null → empty', () => {
    expect(normalizeSnackAssignmentState(null)).toBe(SNACK_ASSIGNMENT_STATE.EMPTY);
  });

  it('sin assignment → empty', () => {
    expect(normalizeSnackAssignmentState(undefined)).toBe(SNACK_ASSIGNMENT_STATE.EMPTY);
  });

  it('assignment sin flags ni estado conocido → pending', () => {
    expect(normalizeSnackAssignmentState({ estado: 'pendiente' }))
      .toBe(SNACK_ASSIGNMENT_STATE.PENDING);
  });
});

describe('isSnackAssignmentActiveForFamily', () => {
  it('pending → true', () => {
    expect(isSnackAssignmentActiveForFamily({ estado: 'pendiente' })).toBe(true);
  });

  it('confirmed → true', () => {
    expect(isSnackAssignmentActiveForFamily({ confirmadoPorFamilia: true })).toBe(true);
  });

  it('change_requested → true', () => {
    expect(isSnackAssignmentActiveForFamily({ solicitudCambio: true })).toBe(true);
  });

  it('cancelled → false', () => {
    expect(isSnackAssignmentActiveForFamily({ estado: 'cancelado' })).toBe(false);
  });

  it('suspended → false', () => {
    expect(isSnackAssignmentActiveForFamily({ suspendido: true })).toBe(false);
  });
});

describe('isSnackAssignmentConfirmedLike', () => {
  it('confirmed → true', () => {
    expect(isSnackAssignmentConfirmedLike({ confirmadoPorFamilia: true })).toBe(true);
  });

  it('completed → true', () => {
    expect(isSnackAssignmentConfirmedLike({ estado: 'completado' })).toBe(true);
  });

  it('pending → false', () => {
    expect(isSnackAssignmentConfirmedLike({ estado: 'pendiente' })).toBe(false);
  });
});

describe('getSnackStatusMeta', () => {
  it('devuelve label y style correctos para suspended', () => {
    const meta = getSnackStatusMeta({ suspendido: true });
    expect(meta.label).toBe('No hay snacks');
    expect(meta.style).toBe('suspended');
  });

  it('devuelve label y style correctos para confirmed', () => {
    const meta = getSnackStatusMeta({ confirmadoPorFamilia: true });
    expect(meta.label).toBe('Confirmado');
    expect(meta.style).toBe('confirmed');
  });

  it('devuelve label y style correctos para change_requested', () => {
    const meta = getSnackStatusMeta({ solicitudCambio: true });
    expect(meta.label).toBe('Cambio solicitado');
    expect(meta.style).toBe('alert');
  });
});
