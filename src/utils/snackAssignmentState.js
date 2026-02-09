export const SNACK_ASSIGNMENT_STATE = Object.freeze({
  EMPTY: 'empty',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CHANGE_REQUESTED: 'change_requested',
  CANCELLED: 'cancelled',
  SUSPENDED: 'suspended'
});

const STATUS_META = Object.freeze({
  [SNACK_ASSIGNMENT_STATE.EMPTY]: {
    key: SNACK_ASSIGNMENT_STATE.EMPTY,
    style: 'empty',
    label: 'Sin asignar',
    isSuspended: false,
    isTerminal: false,
    isConfirmedState: false
  },
  [SNACK_ASSIGNMENT_STATE.PENDING]: {
    key: SNACK_ASSIGNMENT_STATE.PENDING,
    style: 'pending',
    label: 'Pendiente confirmacion',
    isSuspended: false,
    isTerminal: false,
    isConfirmedState: false
  },
  [SNACK_ASSIGNMENT_STATE.CONFIRMED]: {
    key: SNACK_ASSIGNMENT_STATE.CONFIRMED,
    style: 'confirmed',
    label: 'Confirmado',
    isSuspended: false,
    isTerminal: false,
    isConfirmedState: true
  },
  [SNACK_ASSIGNMENT_STATE.COMPLETED]: {
    key: SNACK_ASSIGNMENT_STATE.COMPLETED,
    style: 'completed',
    label: 'Completado',
    isSuspended: false,
    isTerminal: true,
    isConfirmedState: true
  },
  [SNACK_ASSIGNMENT_STATE.CHANGE_REQUESTED]: {
    key: SNACK_ASSIGNMENT_STATE.CHANGE_REQUESTED,
    style: 'alert',
    label: 'Cambio solicitado',
    isSuspended: false,
    isTerminal: false,
    isConfirmedState: false
  },
  [SNACK_ASSIGNMENT_STATE.CANCELLED]: {
    key: SNACK_ASSIGNMENT_STATE.CANCELLED,
    style: 'cancelled',
    label: 'Cancelado',
    isSuspended: false,
    isTerminal: true,
    isConfirmedState: false
  },
  [SNACK_ASSIGNMENT_STATE.SUSPENDED]: {
    key: SNACK_ASSIGNMENT_STATE.SUSPENDED,
    style: 'suspended',
    label: 'No hay snacks',
    isSuspended: true,
    isTerminal: false,
    isConfirmedState: false
  }
});

export function normalizeSnackAssignmentState(assignment) {
  if (!assignment) {
    return SNACK_ASSIGNMENT_STATE.EMPTY;
  }

  const estado = typeof assignment.estado === 'string'
    ? assignment.estado.trim().toLowerCase()
    : '';

  if (assignment.suspendido === true || estado === 'suspendido') {
    return SNACK_ASSIGNMENT_STATE.SUSPENDED;
  }

  if (estado === 'cancelado') {
    return SNACK_ASSIGNMENT_STATE.CANCELLED;
  }

  if (assignment.solicitudCambio === true || estado === 'cambio_solicitado') {
    return SNACK_ASSIGNMENT_STATE.CHANGE_REQUESTED;
  }

  if (estado === 'completado') {
    return SNACK_ASSIGNMENT_STATE.COMPLETED;
  }

  if (assignment.confirmadoPorFamilia === true || estado === 'confirmado') {
    return SNACK_ASSIGNMENT_STATE.CONFIRMED;
  }

  return SNACK_ASSIGNMENT_STATE.PENDING;
}

export function getSnackStatusMeta(assignment) {
  const key = normalizeSnackAssignmentState(assignment);
  return STATUS_META[key] || STATUS_META[SNACK_ASSIGNMENT_STATE.PENDING];
}

export function isSnackAssignmentActiveForFamily(assignment) {
  const key = normalizeSnackAssignmentState(assignment);
  return (
    key === SNACK_ASSIGNMENT_STATE.PENDING
    || key === SNACK_ASSIGNMENT_STATE.CONFIRMED
    || key === SNACK_ASSIGNMENT_STATE.CHANGE_REQUESTED
  );
}

export function isSnackAssignmentConfirmedLike(assignment) {
  const key = normalizeSnackAssignmentState(assignment);
  return key === SNACK_ASSIGNMENT_STATE.CONFIRMED || key === SNACK_ASSIGNMENT_STATE.COMPLETED;
}
