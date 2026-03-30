import { describe, it, expect } from 'vitest';
import {
  sortConversationsByLatestMessage,
  getConversationStatusLabel,
  getConversationStatusBadge,
  getAreaLabel,
} from './conversationHelpers';

describe('sortConversationsByLatestMessage', () => {
  it('ordena por ultimoMensajeAt descendente', () => {
    const convs = [
      { id: 'a', ultimoMensajeAt: new Date('2024-01-01') },
      { id: 'b', ultimoMensajeAt: new Date('2024-01-03') },
      { id: 'c', ultimoMensajeAt: new Date('2024-01-02') },
    ];
    const sorted = sortConversationsByLatestMessage(convs);
    expect(sorted.map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });

  it('usa creadoAt como fallback cuando no hay ultimoMensajeAt', () => {
    const convs = [
      { id: 'a', creadoAt: new Date('2024-01-01') },
      { id: 'b', creadoAt: new Date('2024-01-02') },
    ];
    const sorted = sortConversationsByLatestMessage(convs);
    expect(sorted.map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('maneja Timestamps de Firestore (objetos con .toDate())', () => {
    const makeTimestamp = (date) => ({ toDate: () => new Date(date) });
    const convs = [
      { id: 'x', ultimoMensajeAt: makeTimestamp('2024-06-01') },
      { id: 'y', ultimoMensajeAt: makeTimestamp('2024-06-10') },
    ];
    const sorted = sortConversationsByLatestMessage(convs);
    expect(sorted[0].id).toBe('y');
  });
});

describe('getConversationStatusLabel', () => {
  it('devuelve texto diferente para rol family vs admin en pendiente', () => {
    const labelFamily = getConversationStatusLabel('pendiente', 'family');
    const labelAdmin = getConversationStatusLabel('pendiente', 'coordinacion');
    expect(labelFamily).not.toBe(labelAdmin);
    expect(labelFamily).toBe('Respuesta pendiente');
    expect(labelAdmin).toBe('Sin responder');
  });

  it('devuelve "Respondida" para ambos roles', () => {
    expect(getConversationStatusLabel('respondida', 'family')).toBe('Respondida');
    expect(getConversationStatusLabel('respondida', 'coordinacion')).toBe('Respondida');
  });
});

describe('getConversationStatusBadge', () => {
  it('pendiente → badge--error', () => {
    expect(getConversationStatusBadge('pendiente')).toContain('badge--error');
  });

  it('respondida → badge--warning', () => {
    expect(getConversationStatusBadge('respondida')).toContain('badge--warning');
  });

  it('activa → badge--success', () => {
    expect(getConversationStatusBadge('activa')).toContain('badge--success');
  });

  it('cerrada → badge--info', () => {
    expect(getConversationStatusBadge('cerrada')).toContain('badge--info');
  });
});

describe('getAreaLabel', () => {
  it('coordinacion → Coordinación', () => {
    expect(getAreaLabel('coordinacion')).toBe('Coordinación');
  });

  it('administracion → Facturación', () => {
    expect(getAreaLabel('administracion')).toBe('Facturación');
  });

  it('direccion → Dirección', () => {
    expect(getAreaLabel('direccion')).toBe('Dirección');
  });

  it('desconocido → Escuela (default)', () => {
    expect(getAreaLabel('otro')).toBe('Escuela');
  });
});
