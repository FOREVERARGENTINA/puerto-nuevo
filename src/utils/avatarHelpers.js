const DEFAULT_INITIAL = '?';

export const COLOR_TOKENS = [
  '--color-primary',
  '--color-primary-light',
  '--color-secondary',
  '--color-secondary-light',
  '--color-accent',
  '--color-info',
  '--color-success',
  '--color-warning'
];

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function getSafeHashSeed(name) {
  const normalized = normalizeName(name);
  if (!normalized) return 0;
  let hash = 5381;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = ((hash << 5) + hash) + normalized.charCodeAt(i);
  }
  return hash >>> 0;
}

export function getInitials(name) {
  const normalized = normalizeName(name);
  if (!normalized) return DEFAULT_INITIAL;

  const parts = normalized.split(' ').filter(Boolean);
  if (parts.length === 0) return DEFAULT_INITIAL;

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  const first = parts[0].charAt(0).toUpperCase();
  const last = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first}${last}`;
}

export function getAvatarColorToken(name) {
  const seed = getSafeHashSeed(name);
  const index = seed % COLOR_TOKENS.length;
  return COLOR_TOKENS[index];
}

function resolveTokenColor(token, computedStyles) {
  const raw = computedStyles.getPropertyValue(token);
  const trimmed = String(raw || '').trim();
  return trimmed || '#2C6B6F';
}

export function buildAvatarColorMap() {
  const hasWindow = typeof window !== 'undefined';
  const hasDocument = typeof document !== 'undefined';

  if (!hasWindow || !hasDocument) {
    return Object.fromEntries(COLOR_TOKENS.map((token) => [token, '#2C6B6F']));
  }

  const styles = window.getComputedStyle(document.documentElement);
  return Object.fromEntries(
    COLOR_TOKENS.map((token) => [token, resolveTokenColor(token, styles)])
  );
}
