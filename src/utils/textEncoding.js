const MOJIBAKE_PATTERN = /[\u00C2\u00C3\u00E2\u00F0]/;

const hasMojibake = (value) => MOJIBAKE_PATTERN.test(value);

const decodeUtf8FromLatin1 = (value) => {
  const bytes = Uint8Array.from(Array.from(value), (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
};

export const fixMojibake = (value) => {
  if (typeof value !== 'string' || !hasMojibake(value)) return value;
  try {
    const decoded = decodeUtf8FromLatin1(value);
    if (!decoded || decoded === value) return value;
    if (decoded.includes('\uFFFD')) return value;
    if (hasMojibake(decoded)) return value;
    return decoded;
  } catch (error) {
    return value;
  }
};

export const fixMojibakeDeep = (value) => {
  if (typeof value === 'string') return fixMojibake(value);
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value;
  if (Array.isArray(value)) return value.map(fixMojibakeDeep);

  const result = {};
  Object.entries(value).forEach(([key, entry]) => {
    result[key] = fixMojibakeDeep(entry);
  });
  return result;
};
