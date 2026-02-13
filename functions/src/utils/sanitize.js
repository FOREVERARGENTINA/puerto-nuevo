function escapeHtml(value) {
  const input = value == null ? '' : String(value);
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(value) {
  if (value == null) return null;
  try {
    const parsed = new URL(String(value));
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function toSafeHtmlParagraph(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

function toPlainText(value) {
  const input = value == null ? '' : String(value);

  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderAttachmentList(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) return '';

  const items = attachments
    .map((attachment) => {
      const name = escapeHtml(attachment?.name || 'Archivo adjunto');
      const url = sanitizeUrl(attachment?.url);
      if (!url) {
        return `<li style="margin-bottom:6px;">&#128196; ${name}</li>`;
      }
      return `<li style="margin-bottom:6px;"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color:#1a73e8;text-decoration:none;">&#128196; ${name}</a></li>`;
    })
    .join('');

  return `<ul style="list-style:none;padding:0;margin:0;">${items}</ul>`;
}

module.exports = {
  escapeHtml,
  sanitizeUrl,
  toSafeHtmlParagraph,
  toPlainText,
  renderAttachmentList,
};
