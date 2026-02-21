export const AMBIENTE_ACTIVITY_CATEGORIES = [
  'matematica',
  'lengua',
  'ingles',
  'ciencias-naturales',
  'ciencias-sociales',
  'arte',
  'musica',
  'educacion-fisica',
  'vida-practica',
  'sensorial',
  'cultura',
  'otra'
];

export const AMBIENTE_ACTIVITY_CATEGORY_LABELS = {
  matematica: 'Matemática',
  lengua: 'Lengua',
  ingles: 'Inglés',
  'ciencias-naturales': 'Cs. Naturales',
  'ciencias-sociales': 'Cs. Sociales',
  arte: 'Arte',
  musica: 'Música',
  'educacion-fisica': 'Ed. Física',
  'vida-practica': 'Vida Práctica',
  sensorial: 'Sensorial',
  cultura: 'Cultura',
  otra: 'Otra'
};

export const AMBIENTE_ACTIVITY_CATEGORY_OPTIONS = AMBIENTE_ACTIVITY_CATEGORIES.map((value) => ({
  value,
  label: AMBIENTE_ACTIVITY_CATEGORY_LABELS[value]
}));

export const sanitizeCustomCategory = (value) => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 60);

export const resolveCategoryLabel = (category, customCategory = '') => {
  if (category === 'otra') {
    const sanitized = sanitizeCustomCategory(customCategory);
    return sanitized || 'Otra';
  }

  return AMBIENTE_ACTIVITY_CATEGORY_LABELS[category] || 'Actividad';
};
