function maskEmail(email) {
  if (!email || typeof email !== 'string') return '[no-email]';

  const [local, domain] = email.split('@');
  if (!domain) return '[invalid-email]';

  const visibleLocal = local.length <= 2 ? local[0] || '*' : `${local[0]}***${local[local.length - 1]}`;
  return `${visibleLocal}@${domain}`;
}

module.exports = {
  maskEmail,
};
