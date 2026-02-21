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
  const parseLocalDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const day = Number(match[3]);
        return new Date(year, month, day);
      }
    }
    return new Date(value);
  };

  const getAmbienteLabel = (ambiente) => {
    return ambiente === 'taller1' ? 'Taller 1' : 'Taller 2';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    const date = parseLocalDate(dateString);
    if (!date || Number.isNaN(date.getTime())) return 'No especificada';
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
    const birth = parseLocalDate(birthDate);
    if (!birth || Number.isNaN(birth.getTime())) return '';
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
  const medicalTitle = 'Información médica';
  const documentsTitle = 'Documentos';
  const hasMeetingNotes = Array.isArray(meetingNotes) && meetingNotes.length > 0;
  const shouldShowMeetingNotes = meetingNotesLoading || hasMeetingNotes || meetingNotesLoaded;
  const cardClassName = isAdmin ? 'child-card child-card--admin' : 'child-card';

  return (
    <div className={cardClassName}>
      {/* Header con nombre y badges */}
      <div className="child-card__header">
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
                  <strong>Teléfono/Dirección:</strong>
                  <span>{child.datosMedicos.telefonoClinica}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {!isAdmin && child.responsables && child.responsables.length > 0 && (
          <div className="child-card__section">
            <span className="child-card__section-title">Familias ({child.responsables.length})</span>
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
              <div className="child-card__meeting-list">
                {meetingNotes.map((entry, index) => (
                  <div
                    key={`${child.id}-meeting-${index}`}
                    className="child-card__meeting-entry"
                  >
                    <div className="child-card__meeting-meta">
                      <span className="badge badge--outline">{formatDateTime(entry?.appointment?.fechaHora)}</span>
                      {isAdmin && entry?.note?.visibilidad && (
                        <span className="badge badge--secondary">
                          {entry.note.visibilidad === 'familia' ? 'Visible para familia' : 'Solo escuela'}
                        </span>
                      )}
                    </div>
                    <div className="child-card__meeting-content">
                      <div><strong>Resumen:</strong> {entry?.note?.resumen}</div>
                      {entry?.note?.acuerdos && <div><strong>Acuerdos:</strong> {entry.note.acuerdos}</div>}
                      {entry?.note?.proximosPasos && <div><strong>Próximos pasos:</strong> {entry.note.proximosPasos}</div>}
                    </div>
                    {Array.isArray(entry?.note?.attachments) && entry.note.attachments.length > 0 && (
                      <div className="child-card__meeting-attachments">
                        <strong>Adjuntos:</strong>
                        <ul>
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
            <div className="child-card__doc-list">
              {child.documentos.map((doc, index) => (
                <a
                  key={index}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="child-card__doc-item"
                >
                  {!isAdmin && <span className="child-card__doc-icon">DOC</span>}
                  <div className="child-card__doc-info">
                    <div className="child-card__doc-name">{doc.nombre}</div>
                    <div className="child-card__doc-desc">{doc.descripcion}</div>
                  </div>
                  <span className="child-card__doc-action">Ver</span>
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
