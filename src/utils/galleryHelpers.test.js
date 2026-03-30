import { describe, it, expect } from 'vitest';
import {
  validateGalleryFiles,
  sanitizeFileName,
  getMediaType,
  isHeicFile,
  parseYouTubeUrl,
  parseVimeoUrl,
  parseVideoUrl,
  MAX_FILE_SIZE_BYTES,
} from './galleryHelpers';

const makeFile = (name, size, type) => ({ name, size, type });

describe('validateGalleryFiles', () => {
  it('rechaza archivos > 20MB', () => {
    const file = makeFile('foto.jpg', MAX_FILE_SIZE_BYTES + 1, 'image/jpeg');
    const { valid, errors } = validateGalleryFiles([file]);
    expect(valid).toHaveLength(0);
    expect(errors[0]).toContain('20MB');
  });

  it('rechaza extensión .exe', () => {
    const file = makeFile('virus.exe', 100, 'application/octet-stream');
    const { errors } = validateGalleryFiles([file]);
    expect(errors[0]).toContain('no permitido');
  });

  it('rechaza extensión .zip', () => {
    const file = makeFile('archivo.zip', 100, 'application/zip');
    const { errors } = validateGalleryFiles([file]);
    expect(errors[0]).toContain('no permitido');
  });

  it('acepta jpg con MIME image/jpeg', () => {
    const file = makeFile('foto.jpg', 1024, 'image/jpeg');
    const { valid, errors } = validateGalleryFiles([file]);
    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(1);
  });

  it('acepta png con MIME image/png', () => {
    const file = makeFile('imagen.png', 1024, 'image/png');
    const { valid } = validateGalleryFiles([file]);
    expect(valid).toHaveLength(1);
  });

  it('acepta mp4 con MIME video/mp4', () => {
    const file = makeFile('video.mp4', 1024, 'video/mp4');
    const { valid } = validateGalleryFiles([file]);
    expect(valid).toHaveLength(1);
  });

  it('acepta pdf con MIME application/pdf', () => {
    const file = makeFile('doc.pdf', 1024, 'application/pdf');
    const { valid } = validateGalleryFiles([file]);
    expect(valid).toHaveLength(1);
  });

  it('acepta HEIC sin MIME type (comportamiento iOS)', () => {
    const file = makeFile('foto.heic', 1024, '');
    const { valid, errors } = validateGalleryFiles([file]);
    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(1);
  });
});

describe('sanitizeFileName', () => {
  it('elimina acentos', () => {
    expect(sanitizeFileName('ácido.jpg')).toBe('acido.jpg');
  });

  it('reemplaza caracteres especiales con guión bajo', () => {
    expect(sanitizeFileName('mi foto bonita.jpg')).toBe('mi_foto_bonita.jpg');
  });

  it('reduce múltiples guiones bajos consecutivos', () => {
    expect(sanitizeFileName('foto  doble.jpg')).toBe('foto_doble.jpg');
  });
});

describe('getMediaType', () => {
  it('clasifica video', () => {
    expect(getMediaType({ type: 'video/mp4' })).toBe('video');
  });

  it('clasifica imagen', () => {
    expect(getMediaType({ type: 'image/jpeg' })).toBe('imagen');
  });

  it('clasifica pdf', () => {
    expect(getMediaType({ type: 'application/pdf' })).toBe('pdf');
  });
});

describe('isHeicFile', () => {
  it('detecta por extensión .heic', () => {
    expect(isHeicFile({ name: 'foto.heic', type: '' })).toBe(true);
  });

  it('detecta por extensión .heif', () => {
    expect(isHeicFile({ name: 'foto.heif', type: '' })).toBe(true);
  });

  it('detecta por MIME type que contiene heic', () => {
    expect(isHeicFile({ name: 'foto.jpg', type: 'image/heic' })).toBe(true);
  });

  it('devuelve false para jpg normal', () => {
    expect(isHeicFile({ name: 'foto.jpg', type: 'image/jpeg' })).toBe(false);
  });
});

describe('parseYouTubeUrl', () => {
  it("extrae videoId de youtube.com/watch?v=", () => {
    const result = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result?.videoId).toBe('dQw4w9WgXcQ');
  });

  it("extrae videoId de youtu.be/", () => {
    const result = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(result?.videoId).toBe('dQw4w9WgXcQ');
  });

  it("extrae videoId de youtube.com/embed/", () => {
    const result = parseYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(result?.videoId).toBe('dQw4w9WgXcQ');
  });

  it('devuelve null para URL no-YouTube', () => {
    expect(parseYouTubeUrl('https://vimeo.com/123456789')).toBeNull();
  });
});

describe('parseVimeoUrl', () => {
  it('extrae videoId de vimeo.com', () => {
    const result = parseVimeoUrl('https://vimeo.com/123456789');
    expect(result?.videoId).toBe('123456789');
  });

  it('extrae videoId de player.vimeo.com', () => {
    const result = parseVimeoUrl('https://player.vimeo.com/video/123456789');
    expect(result?.videoId).toBe('123456789');
  });

  it('preserva el parámetro h para videos no listados', () => {
    const result = parseVimeoUrl('https://vimeo.com/123456789?h=abcdef');
    expect(result?.embedUrl).toContain('h=abcdef');
  });
});

describe('parseVideoUrl', () => {
  it('combina YouTube y Vimeo correctamente', () => {
    expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')?.valid).toBe(true);
    expect(parseVideoUrl('https://vimeo.com/123456789')?.valid).toBe(true);
  });

  it('devuelve error para URL inválida', () => {
    const result = parseVideoUrl('https://ejemplo.com/video');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
