import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['p', 'br', 'h3', 'strong', 'em', 'ul', 'ol', 'li', 'a'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

function normalizeAnchorAttributes(doc) {
  const anchors = doc.body.querySelectorAll('a');

  anchors.forEach((anchor) => {
    const href = (anchor.getAttribute('href') || '').trim();

    if (!href) {
      anchor.removeAttribute('href');
      anchor.removeAttribute('target');
      anchor.removeAttribute('rel');
      return;
    }

    try {
      const parsed = new URL(href, window.location.origin);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        anchor.removeAttribute('href');
        anchor.removeAttribute('target');
        anchor.removeAttribute('rel');
        return;
      }

      anchor.setAttribute('href', parsed.toString());
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    } catch {
      anchor.removeAttribute('href');
      anchor.removeAttribute('target');
      anchor.removeAttribute('rel');
    }
  });
}

function normalizeEmptyRichText(html) {
  const compact = String(html || '')
    .replace(/\s+/g, ' ')
    .trim();

  return compact === '<p></p>' ? '' : html;
}

export function sanitizeCommunicationHtml(html) {
  const dirty = String(html || '');
  if (!dirty.trim()) return '';

  const sanitized = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTR,
  });

  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, 'text/html');
  normalizeAnchorAttributes(doc);

  return normalizeEmptyRichText(doc.body.innerHTML.trim());
}

export function normalizeCommunicationEditorValue(html) {
  const sanitized = sanitizeCommunicationHtml(html);
  return sanitized || '<p></p>';
}

export function isMeaningfulCommunicationText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().length > 0;
}
