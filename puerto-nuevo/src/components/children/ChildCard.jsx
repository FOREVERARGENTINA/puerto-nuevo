const ChildCard = ({ child, familyUsers = {}, onEdit, onDelete, isAdmin = false }) => {
  const getAmbienteLabel = (ambiente) => {
    return ambiente === 'taller1' ? 'Taller 1 (6-9)' : 'Taller 2 (9-12)';
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

  return (
    <div className="card child-card">
      <div className="child-card-header">
        <div>
          <h3>{child.nombreCompleto}</h3>
          <span className="badge badge-primary">{getAmbienteLabel(child.ambiente)}</span>
        </div>
        {isAdmin && (
          <div className="card-actions">
            <button onClick={() => onEdit(child)} className="btn btn-sm btn-secondary">
              Editar
            </button>
            <button onClick={() => onDelete(child.id)} className="btn btn-sm btn-danger">
              Eliminar
            </button>
          </div>
        )}
      </div>

      <div className="child-card-body">
        <div className="info-section">
          <h4>Información Personal</h4>
          <p>
            <strong>Fecha de Nacimiento:</strong> {formatDate(child.fechaNacimiento)}
            {child.fechaNacimiento && ` (${calculateAge(child.fechaNacimiento)} años)`}
          </p>
        </div>

        {child.responsables && child.responsables.length > 0 && (
          <div className="info-section">
            <h4>Familias Vinculadas</h4>
            {child.responsables.map((responsableId, index) => {
              const familia = familyUsers[responsableId];
              return (
                <p key={responsableId}>
                  <strong>Familia {index + 1}:</strong> {
                    familia
                      ? (familia.displayName || familia.email)
                      : <span style={{ color: 'var(--color-text-light)' }}>Cargando datos...</span>
                  }
                </p>
              );
            })}
          </div>
        )}

        {child.datosMedicos && (
          <div className="info-section">
            <h4>Información Médica</h4>
            
            {child.datosMedicos.alergias && (
              <p>
                <strong>Alergias:</strong> {child.datosMedicos.alergias}
              </p>
            )}

            {child.datosMedicos.medicamentos && (
              <p>
                <strong>Medicamentos:</strong> {child.datosMedicos.medicamentos}
              </p>
            )}

            {child.datosMedicos.indicaciones && (
              <p>
                <strong>Indicaciones:</strong> {child.datosMedicos.indicaciones}
              </p>
            )}

            {child.datosMedicos.contactosEmergencia && (
              <div>
                <strong>Contactos de Emergencia:</strong>
                <pre className="contact-list">{child.datosMedicos.contactosEmergencia}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChildCard;
