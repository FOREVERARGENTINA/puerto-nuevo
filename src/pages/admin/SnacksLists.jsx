import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { snacksService } from '../../services/snacks.service';
import { AMBIENTES, ROUTES } from '../../config/constants';

export function SnacksLists() {
  const [activeSnackList, setActiveSnackList] = useState(AMBIENTES.TALLER_1);
  const [snackListDrafts, setSnackListDrafts] = useState({
    [AMBIENTES.TALLER_1]: { itemsText: '', observaciones: '' },
    [AMBIENTES.TALLER_2]: { itemsText: '', observaciones: '' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSnackLists = async () => {
    setLoading(true);
    setError('');
    try {
      const [t1, t2] = await Promise.all([
        snacksService.getSnackList(AMBIENTES.TALLER_1),
        snacksService.getSnackList(AMBIENTES.TALLER_2)
      ]);

      const buildDraft = (result) => {
        const list = result.success && result.snackList ? result.snackList : { items: [], observaciones: '' };
        const items = Array.isArray(list.items) ? list.items : [];
        return {
          itemsText: items.join('\n'),
          observaciones: list.observaciones || ''
        };
      };

      setSnackListDrafts({
        [AMBIENTES.TALLER_1]: buildDraft(t1),
        [AMBIENTES.TALLER_2]: buildDraft(t2)
      });

      if (!t1.success || !t2.success) {
        setError('No pudimos cargar las listas de snacks.');
      }
    } catch (err) {
      setError('Error al cargar listas de snacks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnackLists();
  }, []);

  const handleSnackListChange = (ambiente, field, value) => {
    setSnackListDrafts(prev => ({
      ...prev,
      [ambiente]: {
        ...prev[ambiente],
        [field]: value
      }
    }));
  };

  const handleSaveSnackList = async (ambiente) => {
    const draft = snackListDrafts[ambiente];
    const items = (draft.itemsText || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    if (items.length === 0) {
      setError('La lista no puede estar vacía.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    const result = await snacksService.updateSnackList(ambiente, items, (draft.observaciones || '').trim());
    setSaving(false);

    if (result.success) {
      setSuccess('Lista guardada correctamente.');
      setTimeout(() => setSuccess(''), 2500);
      return;
    }
    setError(result.error || 'Error al guardar la lista.');
  };

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Listas de snacks</h1>
          <p className="dashboard-subtitle">Editá los alimentos por taller</p>
        </div>
        <Link to={ROUTES.ADMIN_SNACKS} className="btn btn--outline">
          Volver a snacks
        </Link>
      </div>

      <div className="dashboard-content">
        <div className="card snack-list-editor">
          <div className="card__body">
            {loading ? (
              <p>Cargando listas...</p>
            ) : (
              <div className="tabs snack-list-tabs">
                <div className="tabs__header">
                  <button
                    className={`tabs__tab ${activeSnackList === AMBIENTES.TALLER_1 ? 'tabs__tab--active' : ''}`}
                    onClick={() => setActiveSnackList(AMBIENTES.TALLER_1)}
                    type="button"
                  >
                    Taller 1
                  </button>
                  <button
                    className={`tabs__tab ${activeSnackList === AMBIENTES.TALLER_2 ? 'tabs__tab--active' : ''}`}
                    onClick={() => setActiveSnackList(AMBIENTES.TALLER_2)}
                    type="button"
                  >
                    Taller 2
                  </button>
                </div>
                <div className="tabs__content">
                  {error && (
                    <div className="alert alert--error mb-md">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="alert alert--success mb-md">
                      {success}
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label" htmlFor="snack-items">
                      Alimentos (uno por línea)
                    </label>
                    <textarea
                      id="snack-items"
                      className="form-textarea"
                      rows="8"
                      value={snackListDrafts[activeSnackList]?.itemsText || ''}
                      onChange={(e) => handleSnackListChange(activeSnackList, 'itemsText', e.target.value)}
                      placeholder="Ej: Frutas variadas"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="snack-notes">
                      Observaciones (opcional)
                    </label>
                    <textarea
                      id="snack-notes"
                      className="form-textarea"
                      rows="3"
                      value={snackListDrafts[activeSnackList]?.observaciones || ''}
                      onChange={(e) => handleSnackListChange(activeSnackList, 'observaciones', e.target.value)}
                      placeholder="Notas para las familias..."
                    />
                  </div>
                  <div className="snack-list-editor__actions">
                    <button
                      className="btn btn--primary"
                      type="button"
                      onClick={() => handleSaveSnackList(activeSnackList)}
                      disabled={saving}
                    >
                      {saving ? 'Guardando...' : 'Guardar lista'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
