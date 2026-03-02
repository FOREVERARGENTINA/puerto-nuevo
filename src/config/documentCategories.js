export const DOCUMENT_NEW_DAYS = 7;

export const DOCUMENT_CATEGORY_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'institucional', label: 'Institucional' },
  { value: 'pedagogico', label: 'Pedagógico' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'taller', label: 'Taller Especial' }
];

export const DOCUMENT_SCOPE_OPTIONS = [
  { value: 'all', label: 'Todos los alcances' },
  { value: 'global', label: 'Global (toda la escuela)' },
  { value: 'taller1', label: 'Taller 1' },
  { value: 'taller2', label: 'Taller 2' }
];

export const DOCUMENT_SCOPE_OPTIONS_FOR_UPLOAD = [
  { value: 'global', label: 'Global (toda la escuela)' },
  { value: 'taller1', label: 'Taller 1' },
  { value: 'taller2', label: 'Taller 2' }
];

export const normalizeDocumentScope = (rawValue) => {
  const value = typeof rawValue === 'string' ? rawValue.trim().toLowerCase() : '';
  if (!value || value === 'todos' || value === 'all') return 'global';
  if (value === 'global') return 'global';
  if (value === 'taller1') return 'taller1';
  if (value === 'taller2') return 'taller2';
  return 'global';
};

export const getDocumentCategoryLabel = (categoryValue) => {
  const category = DOCUMENT_CATEGORY_OPTIONS.find((option) => option.value === categoryValue);
  return category?.label || categoryValue || 'Sin categoría';
};

export const getDocumentScopeLabel = (scopeValue) => {
  const normalized = normalizeDocumentScope(scopeValue);
  const scope = DOCUMENT_SCOPE_OPTIONS.find((option) => option.value === normalized);
  return scope?.label || 'Global';
};
