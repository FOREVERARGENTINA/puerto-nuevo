const ChildCard = ({
  child,
  familyUsers = {},
  onEdit,
  onDelete,
  isAdmin = false,
  meetingNotes = [],
  meetingNotesLoading = false,
  meetingNotesLoaded = false
}) => {
  const getAmbienteLabel = (ambiente) => {
    return ambiente === 'taller1' ? 'Taller 1' : 'Taller 2';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
  };

  const formatDateTime = (value) => {
    if (!value) return 'Fecha no disponible';
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
    const dateLabel = date.toLocaleDateString('es-AR');
    const timeLabel = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return `${dateLabel} ${timeLabel}`;
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
  const hasMedicalInfo = child.datosMedicos && (
    child.datosMedicos.alergias ||
    child.datosMedicos.medicamentos ||
    child.datosMedicos.indicaciones ||
    child.datosMedicos.obraSocial ||
    child.datosMedicos.numeroAfiliado
  );
  const hasEmergencyInfo = isAdmin && child.datosMedicos && (
    child.datosMedicos.clinicaCercana ||
    child.datosMedicos.telefonoClinica
  );
  const medicalBadgeText = 'Info médica';
  const familiesTitle = 'Familias';
  const medicalTitle = 'Información médica';
  const documentsTitle = 'Documentos';
  const hasMeetingNotes = Array.isArray(meetingNotes) && meetingNotes.length > 0;
  const shouldShowMeetingNotes = meetingNotesLoading || hasMeetingNotes || meetingNotesLoaded;

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
            {hasAlerts && <span className="badge badge--warning">{medicalBadgeText}</span>}
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

        {isAdmin && hasEmergencyInfo && (
          <div className="child-card__section child-card__section--medical">
            <span className="child-card__section-title">Emergencia</span>
            <div className="child-card__medical-grid">
              {child.datosMedicos.clinicaCercana && (
                <div className="child-card__medical-item">
                  <strong>Clínica u hospital cercano:</strong>
                  <span>{child.datosMedicos.clinicaCercana}</span>
                </div>
              )}
              {child.datosMedicos.telefonoClinica && (
                <div className="child-card__medical-item">
                  <strong>Teléfono:</strong>
                  <span>{child.datosMedicos.telefonoClinica}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {child.responsables && child.responsables.length > 0 && (
          <div className="child-card__section">
            <span className="child-card__section-title">{familiesTitle} ({child.responsables.length})</span>
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

        {hasMedicalInfo && (
          <div className="child-card__section child-card__section--medical">
            <span className="child-card__section-title">{medicalTitle}</span>
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
              {child.datosMedicos.obraSocial && (
                <div className="child-card__medical-item">
                  <strong>Obra social / prepaga:</strong>
                  <span>{child.datosMedicos.obraSocial}</span>
                </div>
              )}
              {child.datosMedicos.numeroAfiliado && (
                <div className="child-card__medical-item">
                  <strong>Número de afiliado:</strong>
                  <span>{child.datosMedicos.numeroAfiliado}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {shouldShowMeetingNotes && (
          <div className="child-card__section">
            <span className="child-card__section-title">Reuniones</span>
            {meetingNotesLoading && (
              <p className="muted-text" style={{ marginTop: 'var(--spacing-xs)' }}>
                Cargando notas de reuniones...
              </p>
            )}
            {!meetingNotesLoading && !hasMeetingNotes && (
              <p className="muted-text" style={{ marginTop: 'var(--spacing-xs)' }}>
                Sin notas registradas.
              </p>
            )}
            {!meetingNotesLoading && hasMeetingNotes && (
              <div style={{ display: 'grid', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
                {meetingNotes.map((entry, index) => (
                  <div
                    key={`${child.id}-meeting-${index}`}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--spacing-sm)',
                      backgroundColor: 'var(--color-background-alt)'
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                      <span className="badge badge--outline">{formatDateTime(entry?.appointment?.fechaHora)}</span>
                      {isAdmin && entry?.note?.visibilidad && (
                        <span className="badge badge--secondary">
                          {entry.note.visibilidad === 'familia' ? 'Visible para familia' : 'Solo escuela'}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 'var(--spacing-xs)', display: 'grid', gap: '2px' }}>
                      <div><strong>Resumen:</strong> {entry?.note?.resumen}</div>
                      {entry?.note?.acuerdos && <div><strong>Acuerdos:</strong> {entry.note.acuerdos}</div>}
                      {entry?.note?.proximosPasos && <div><strong>Próximos pasos:</strong> {entry.note.proximosPasos}</div>}
                    </div>
                    {Array.isArray(entry?.note?.attachments) && entry.note.attachments.length > 0 && (
                      <div style={{ marginTop: 'var(--spacing-xs)' }}>
                        <strong>Adjuntos:</strong>
                        <ul style={{ margin: 'var(--spacing-xs) 0 0', paddingLeft: '1.1rem' }}>
                          {entry.note.attachments.map((file, fileIndex) => (
                            <li key={`${child.id}-meeting-file-${index}-${fileIndex}`}>
                              <a href={file.url} target="_blank" rel="noreferrer">
                                {`Adjunto ${fileIndex + 1}`}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {child.documentos && child.documentos.length > 0 && (
          <div className="child-card__section">
            <span className="child-card__section-title">{documentsTitle} ({child.documentos.length})</span>
            <div style={{ display: 'grid', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' }}>
              {child.documentos.map((doc, index) => (
                <a
                  key={index}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    padding: 'var(--spacing-xs)',
                    backgroundColor: 'var(--color-background-alt)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-soft)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-background-alt)'}
                >
                  {!isAdmin && <span style={{ fontSize: '1.2rem' }}>Doc</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.nombre}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-light)' }}>
                      {doc.descripcion}
                    </div>
                  </div>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)' }}>Ver</span>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Footer con acciones */}
      {isAdmin && (
        <div className="child-card__footer">
          <button onClick={() => onEdit(child)} className="btn btn--sm btn--outline">
            Editar
          </button>
          <button onClick={() => onDelete(child.id)} className="btn btn--sm btn--text btn--danger">
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
};

export default ChildCard;
