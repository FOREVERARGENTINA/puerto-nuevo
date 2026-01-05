const ChildCard = ({ child, familyUsers = {}, onEdit, onDelete, isAdmin = false }) => {
  const getAmbienteLabel = (ambiente) => {
    return ambiente === 'taller1' ? 'Taller 1' : 'Taller 2';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = child.fechaNacimiento ? calculateAge(child.fechaNacimiento) : null;
  const hasAlerts = child.datosMedicos && (child.datosMedicos.alergias || child.datosMedicos.medicamentos);

  return (
    <div className="child-card">
      {/* Header con nombre y badges */}
      <div className="child-card__header">
        <div className="child-card__avatar">
          {child.nombreCompleto.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div className="child-card__title">
          <h3 className="child-card__name">{child.nombreCompleto}</h3>
          <div className="child-card__badges">
            <span className="badge badge--primary">{getAmbienteLabel(child.ambiente)}</span>
            {age && <span className="badge badge--outline">{age} años</span>}
            {hasAlerts && <span className="badge badge--warning">⚠️ Info médica</span>}
          </div>
        </div>
      </div>

      {/* Info rápida */}
      <div className="child-card__body">
        <div className="child-card__info-row">
          <div className="child-card__info-item">
            <span className="child-card__label">Fecha de nacimiento</span>
            <span className="child-card__value">{formatDate(child.fechaNacimiento)}</span>
          </div>
        </div>

        {child.responsables && child.responsables.length > 0 && (
          <div className="child-card__section">
            <span className="child-card__section-title">👨‍👩‍👧 Familias ({child.responsables.length})</span>
            <div className="child-card__families">
              {child.responsables.map((responsableId) => {
                const familia = familyUsers[responsableId];
                return (
                  <div key={responsableId} className="child-card__family-item">
                    {familia ? (familia.displayName || familia.email) : 'Cargando...'}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {child.datosMedicos && (child.datosMedicos.alergias || child.datosMedicos.medicamentos || child.datosMedicos.indicaciones) && (
          <div className="child-card__section child-card__section--medical">
            <span className="child-card__section-title">🏥 Información Médica</span>
            <div className="child-card__medical-grid">
              {child.datosMedicos.alergias && (
                <div className="child-card__medical-item child-card__medical-item--alert">
                  <strong>Alergias:</strong>
                  <span>{child.datosMedicos.alergias}</span>
                </div>
              )}
              {child.datosMedicos.medicamentos && (
                <div className="child-card__medical-item">
                  <strong>Medicamentos:</strong>
                  <span>{child.datosMedicos.medicamentos}</span>
                </div>
              )}
              {child.datosMedicos.indicaciones && (
                <div className="child-card__medical-item">
                  <strong>Indicaciones:</strong>
                  <span>{child.datosMedicos.indicaciones}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer con acciones */}
      {isAdmin && (
        <div className="child-card__footer">
          <button onClick={() => onEdit(child)} className="btn btn--sm btn--outline">
            ✏️ Editar
          </button>
          <button onClick={() => onDelete(child.id)} className="btn btn--sm btn--text btn--danger">
            🗑️ Eliminar
          </button>
        </div>
      )}
    </div>
  );
};

export default ChildCard;
