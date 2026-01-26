import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { conversationsService } from '../../services/conversations.service';
import { CONVERSATION_CATEGORIES, ESCUELA_AREAS, ROUTES } from '../../config/constants';

export function FamilyNewConversation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    destinatarioEscuela: ESCUELA_AREAS.COORDINACION,
    categoria: 'entrevista',
    asunto: '',
    mensaje: ''
  });
  const [file, setFile] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);

    const result = await conversationsService.createConversationWithMessage({
      familiaUid: user.uid,
      familiaDisplayName: user.displayName,
      familiaEmail: user.email,
      destinatarioEscuela: form.destinatarioEscuela,
      asunto: form.asunto.trim(),
      categoria: form.categoria,
      iniciadoPor: 'familia',
      autorUid: user.uid,
      autorDisplayName: user.displayName || user.email,
      autorRol: 'family',
      texto: form.mensaje.trim(),
      archivos: file ? [file] : []
    });

    if (!result.success) {
      setError(result.error || 'No se pudo enviar la consulta');
      setLoading(false);
      return;
    }

    navigate(`${ROUTES.FAMILY_CONVERSATIONS}/${result.id}`);
  };

  return (
    <div className="container page-container">
      <div className="mb-md">
        <h1>Nueva Consulta</h1>
        <p className="text-muted">Escribí tu consulta y la escuela te responderá en este hilo.</p>
      </div>

      <form onSubmit={handleSubmit} className="card create-form-card">
        <div className="form-grid">
          <div className="form-group">
            <label className="required" htmlFor="destinatarioEscuela">Dirigido a</label>
            <select
              id="destinatarioEscuela"
              name="destinatarioEscuela"
              className="form-select"
              value={form.destinatarioEscuela}
              onChange={handleChange}
              disabled={loading}
              required
            >
              <option value={ESCUELA_AREAS.COORDINACION}>Coordinación</option>
              <option value={ESCUELA_AREAS.ADMINISTRACION}>Administración</option>
              <option value={ESCUELA_AREAS.DIRECCION}>Dirección</option>
            </select>
          </div>

          <div className="form-group">
            <label className="required" htmlFor="categoria">Categoría</label>
            <select
              id="categoria"
              name="categoria"
              className="form-select"
              value={form.categoria}
              onChange={handleChange}
              disabled={loading}
              required
            >
              {CONVERSATION_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="required" htmlFor="asunto">Asunto</label>
            <input
              id="asunto"
              name="asunto"
              className="form-input"
              value={form.asunto}
              onChange={handleChange}
              maxLength={100}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="required" htmlFor="mensaje">Mensaje</label>
            <textarea
              id="mensaje"
              name="mensaje"
              className="form-textarea"
              value={form.mensaje}
              onChange={handleChange}
              maxLength={1000}
              rows={6}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="adjunto">Adjuntar archivo (opcional)</label>
            <input
              id="adjunto"
              type="file"
              className="form-input"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={loading}
            />
            <p className="form-help">PDF, JPG, PNG, DOC o DOCX (máx. 5MB)</p>
          </div>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <div className="form-actions" style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn--outline" onClick={() => navigate(ROUTES.FAMILY_CONVERSATIONS)} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Consulta'}
          </button>
        </div>
      </form>
    </div>
  );
}
