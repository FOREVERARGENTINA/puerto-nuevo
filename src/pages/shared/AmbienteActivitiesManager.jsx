import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/ui/Icon';
import { FileSelectionList, FileUploadSelector } from '../../components/common/FileUploadSelector';
import { useAuth } from '../../hooks/useAuth';
import {
  AMBIENTE_ACTIVITY_CATEGORY_OPTIONS,
  resolveCategoryLabel,
  sanitizeCustomCategory
} from '../../config/ambienteActivities';
import { ambienteActivitiesService } from '../../services/ambienteActivities.service';

const AMBIENTE_OPTIONS = [
  { value: 'taller1', label: 'Taller 1' },
  { value: 'taller2', label: 'Taller 2' }
];

const formatDateInput = (value) => {
  if (!value) return '';

  const asDate = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(asDate.getTime())) return '';

  const yyyy = asDate.getFullYear();
  const mm = String(asDate.getMonth() + 1).padStart(2, '0');
  const dd = String(asDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDate = (value) => {
  if (!value) return '';
  const asDate = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(asDate.getTime())) return '';
  return asDate.toLocaleDateString('es-AR');
};

export default function AmbienteActivitiesManager() {
  const { user, role } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [linkInput, setLinkInput] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    ambiente: 'taller1',
    category: 'matematica',
    customCategory: '',
    dueDate: '',
    files: [],
    links: []
  });

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: 'matematica',
    customCategory: '',
    dueDate: ''
  });

  const canSubmit = useMemo(() => (
    form.title.trim().length > 0 &&
    (form.files.length > 0 || form.links.length > 0) &&
    (form.category !== 'otra' || sanitizeCustomCategory(form.customCategory).length > 0)
  ), [form]);

  const loadActivities = async () => {
    setLoading(true);
    const result = await ambienteActivitiesService.getActivities({ sinceDays: 120, limit: 120 });
    if (result.success) {
      setActivities(result.activities || []);
    } else {
      setActivities([]);
      setError(result.error || 'No se pudieron cargar las actividades');
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadActivities();
  }, []);

  const addLink = () => {
    const raw = linkInput.trim();
    if (!raw) return;

    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      setError('El link ingresado no es válido');
      return;
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      setError('Solo se permiten links http/https');
      return;
    }

    const exists = form.links.some((entry) => entry.url === parsed.toString());
    if (exists) {
      setLinkInput('');
      return;
    }

    setForm((prev) => ({
      ...prev,
      links: [...prev.links, { label: parsed.hostname, url: parsed.toString() }]
    }));
    setLinkInput('');
    setError('');
  };

  const handlePublish = async (event) => {
    event.preventDefault();
    if (!user?.uid) return;

    setSubmitting(true);
    setError('');
    setMessage('');

    const result = await ambienteActivitiesService.createActivity({
      title: form.title,
      description: form.description,
      ambiente: form.ambiente,
      category: form.category,
      customCategory: form.customCategory,
      dueDate: form.dueDate ? new Date(`${form.dueDate}T00:00:00`) : null,
      files: form.files,
      links: form.links,
      createdBy: user.uid,
      createdByName: user.displayName || user.email || 'Docente',
      createdByRole: role
    });

    if (!result.success) {
      setError(result.error || 'No se pudo publicar la actividad');
      setSubmitting(false);
      return;
    }

    setForm({
      title: '',
      description: '',
      ambiente: form.ambiente,
      category: 'matematica',
      customCategory: '',
      dueDate: '',
      files: [],
      links: []
    });
    setLinkInput('');
    setMessage('Actividad publicada correctamente');
    setSubmitting(false);
    await loadActivities();
  };

  const startEdit = (activity) => {
    setEditingId(activity.id);
    setEditForm({
      title: activity.title || '',
      description: activity.description || '',
      category: activity.category || 'matematica',
      customCategory: activity.customCategory || '',
      dueDate: formatDateInput(activity.dueDate)
    });
    setError('');
    setMessage('');
  };

  const saveEdit = async (activityId) => {
    setError('');
    setMessage('');

    const result = await ambienteActivitiesService.updateActivityMeta(activityId, {
      title: editForm.title,
      description: editForm.description,
      category: editForm.category,
      customCategory: editForm.customCategory,
      dueDate: editForm.dueDate ? new Date(`${editForm.dueDate}T00:00:00`) : null
    });

    if (!result.success) {
      setError(result.error || 'No se pudo actualizar la actividad');
      return;
    }

    setEditingId('');
    setMessage('Actividad actualizada');
    await loadActivities();
  };

  const removeActivity = async (activity) => {
    const confirmed = window.confirm('¿Eliminar esta actividad? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    setDeletingId(activity.id);
    setError('');
    setMessage('');

    const result = await ambienteActivitiesService.deleteActivity(activity.id, activity.items || []);
    setDeletingId('');

    if (!result.success) {
      setError(result.error || 'No se pudo eliminar la actividad');
      return;
    }

    if ((result.warnings || []).length > 0) {
      setMessage('Actividad eliminada con advertencias en algunos archivos');
    } else {
      setMessage('Actividad eliminada');
    }

    await loadActivities();
  };

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Actividades</h1>
          <p className="dashboard-subtitle">Publicación de actividades por ambiente para familias.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="card__body">
          <h2 className="section-title" style={{ marginTop: 0 }}>Nueva actividad</h2>

          <form onSubmit={handlePublish}>
            <div className="form-group">
              <label htmlFor="activity-title" className="form-label">Título *</label>
              <input
                id="activity-title"
                className="form-control"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ej: Actividad para esta semana"
                maxLength={160}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="activity-description" className="form-label">Descripción</label>
              <textarea
                id="activity-description"
                className="form-control"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                disabled={submitting}
              />
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-md)' }}>
              <div className="form-group">
                <label htmlFor="activity-ambiente" className="form-label">Ambiente *</label>
                <select
                  id="activity-ambiente"
                  className="form-control form-select"
                  value={form.ambiente}
                  onChange={(e) => setForm((prev) => ({ ...prev, ambiente: e.target.value }))}
                  disabled={submitting}
                >
                  {AMBIENTE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="activity-category" className="form-label">Categoría *</label>
                <select
                  id="activity-category"
                  className="form-control form-select"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  disabled={submitting}
                >
                  {AMBIENTE_ACTIVITY_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="activity-due-date" className="form-label">Fecha límite</label>
                <input
                  id="activity-due-date"
                  type="date"
                  className="form-control"
                  value={form.dueDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  disabled={submitting}
                />
              </div>
            </div>

            {form.category === 'otra' && (
              <div className="form-group">
                <label htmlFor="activity-custom-category" className="form-label">Especificar categoría *</label>
                <input
                  id="activity-custom-category"
                  className="form-control"
                  value={form.customCategory}
                  onChange={(e) => setForm((prev) => ({ ...prev, customCategory: e.target.value }))}
                  placeholder="Ej: Robótica"
                  maxLength={60}
                  disabled={submitting}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="activity-files" className="form-label">Adjuntos</label>
              <FileUploadSelector
                id="activity-files"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp"
                disabled={submitting}
                onFilesSelected={(newFiles) => {
                  setForm((prev) => ({ ...prev, files: [...prev.files, ...newFiles] }));
                }}
                hint="PDF, Office, OpenDocument, TXT y CSV · máx. 20 MB por archivo"
              />
              {form.files.length > 0 && (
                <FileSelectionList
                  files={form.files}
                  onRemove={(index) => {
                    setForm((prev) => ({
                      ...prev,
                      files: prev.files.filter((_, i) => i !== index)
                    }));
                  }}
                />
              )}
            </div>

            <div className="form-group">
              <label htmlFor="activity-link" className="form-label">Links</label>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <input
                  id="activity-link"
                  className="form-control"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://..."
                  disabled={submitting}
                />
                <button type="button" className="btn btn--secondary" onClick={addLink} disabled={submitting}>
                  Agregar
                </button>
              </div>
              {form.links.length > 0 && (
                <ul style={{ marginTop: 'var(--spacing-sm)' }}>
                  {form.links.map((link, index) => (
                    <li key={`${link.url}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-sm)' }}>
                      <a href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
                      <button
                        type="button"
                        className="btn btn--link"
                        onClick={() => setForm((prev) => ({
                          ...prev,
                          links: prev.links.filter((_, i) => i !== index)
                        }))}
                        disabled={submitting}
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button type="submit" className="btn btn--primary" disabled={!canSubmit || submitting}>
              {submitting ? 'Publicando...' : 'Publicar actividad'}
            </button>
          </form>

          {message && <div className="alert alert--success" style={{ marginTop: 'var(--spacing-md)' }}>{message}</div>}
          {error && <div className="alert alert--danger" style={{ marginTop: 'var(--spacing-md)' }}>{error}</div>}
        </div>
      </div>

      <div className="card">
        <div className="card__body">
          <h2 className="section-title" style={{ marginTop: 0 }}>Publicadas</h2>

          {loading ? (
            <p>Cargando actividades...</p>
          ) : activities.length === 0 ? (
            <p>Aún no hay actividades publicadas.</p>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
              {activities.map((activity) => {
                const isEditing = editingId === activity.id;

                return (
                  <article key={activity.id} className="card" style={{ border: '1px solid var(--color-border)' }}>
                    <div className="card__body">
                      {isEditing ? (
                        <>
                          <div className="form-group">
                            <label className="form-label">Título</label>
                            <input
                              className="form-control"
                              value={editForm.title}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Descripción</label>
                            <textarea
                              className="form-control"
                              rows={3}
                              value={editForm.description}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                            <div className="form-group">
                              <label className="form-label">Categoría</label>
                              <select
                                className="form-control form-select"
                                value={editForm.category}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                              >
                                {AMBIENTE_ACTIVITY_CATEGORY_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Fecha límite</label>
                              <input
                                type="date"
                                className="form-control"
                                value={editForm.dueDate}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                              />
                            </div>
                          </div>

                          {editForm.category === 'otra' && (
                            <div className="form-group">
                              <label className="form-label">Especificar categoría</label>
                              <input
                                className="form-control"
                                value={editForm.customCategory}
                                maxLength={60}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, customCategory: e.target.value }))}
                              />
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                            <button type="button" className="btn btn--primary" onClick={() => saveEdit(activity.id)}>Guardar</button>
                            <button type="button" className="btn btn--outline" onClick={() => setEditingId('')}>Cancelar</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
                            <div>
                              <h3 className="card__title" style={{ marginBottom: 'var(--spacing-xs)' }}>{activity.title}</h3>
                              <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{activity.description || 'Sin descripción'}</p>
                            </div>
                            <span className="badge badge--secondary">{activity.ambiente === 'taller1' ? 'Taller 1' : 'Taller 2'}</span>
                          </div>

                          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', marginTop: 'var(--spacing-sm)' }}>
                            <span className="badge badge--primary">{resolveCategoryLabel(activity.category, activity.customCategory)}</span>
                            {activity.dueDate && <span className="badge badge--secondary">Vence: {formatDate(activity.dueDate)}</span>}
                            <span className="badge badge--secondary">{activity.itemCount || (activity.items || []).length} ítems</span>
                          </div>

                          {(activity.items || []).length > 0 && (
                            <ul style={{ marginTop: 'var(--spacing-sm)', marginBottom: 0 }}>
                              {(activity.items || []).slice(0, 4).map((item, index) => (
                                <li key={`${activity.id}-${index}`}>
                                  {item.kind === 'link' ? (
                                    <a href={item.url} target="_blank" rel="noreferrer">{item.label || item.url}</a>
                                  ) : (
                                    <a href={item.url} target="_blank" rel="noreferrer">{item.label || 'Archivo adjunto'}</a>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}

                          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                            <button type="button" className="btn btn--outline" onClick={() => startEdit(activity)}>
                              <Icon name="file" size={14} /> Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn--outline"
                              onClick={() => removeActivity(activity)}
                              disabled={deletingId === activity.id}
                            >
                              {deletingId === activity.id ? 'Eliminando...' : 'Eliminar'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
