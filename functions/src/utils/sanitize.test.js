import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { escapeHtml, sanitizeUrl, toPlainText, renderAttachmentList } = require('./sanitize');

describe('escapeHtml', () => {
  it('escapa <, >, &, " y \'', () => {
    expect(escapeHtml('<a href="x" & \'y\'>')).toBe('&lt;a href=&quot;x&quot; &amp; &#39;y&#39;&gt;');
  });

  it('devuelve string vacío para null', () => {
    expect(escapeHtml(null)).toBe('');
  });

  it('devuelve string vacío para undefined', () => {
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('sanitizeUrl', () => {
  it('acepta URL http', () => {
    expect(sanitizeUrl('http://ejemplo.com')).toBe('http://ejemplo.com/');
  });

  it('acepta URL https', () => {
    expect(sanitizeUrl('https://ejemplo.com')).toBe('https://ejemplo.com/');
  });

  it('rechaza protocolo javascript:', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
  });

  it('devuelve null para URL inválida', () => {
    expect(sanitizeUrl('no-es-url')).toBeNull();
  });
});

describe('toPlainText', () => {
  it('elimina tags HTML', () => {
    expect(toPlainText('<p>Hola <strong>mundo</strong></p>')).toBe('Hola mundo');
  });

  it('decodifica entidades HTML', () => {
    expect(toPlainText('&amp; &lt; &gt; &#39; &quot;')).toBe('& < > \' "');
  });
});

describe('renderAttachmentList', () => {
  it('genera HTML con link cuando hay URL válida', () => {
    const result = renderAttachmentList([{ name: 'Doc', url: 'https://ejemplo.com/doc.pdf' }]);
    expect(result).toContain('<a href=');
    expect(result).toContain('Doc');
  });

  it('genera item sin link cuando la URL es inválida', () => {
    const result = renderAttachmentList([{ name: 'Doc', url: 'javascript:alert(1)' }]);
    expect(result).not.toContain('<a href=');
    expect(result).toContain('Doc');
  });

  it("devuelve '' para array vacío", () => {
    expect(renderAttachmentList([])).toBe('');
  });
});
