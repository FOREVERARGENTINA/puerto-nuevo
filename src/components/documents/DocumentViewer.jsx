import { useState, useEffect, useCallback, useMemo } from 'react';
import { documentsService } from '../../services/documents.service';
import { documentReadReceiptsService } from '../../services/documentReadReceipts.service';
import { useAuth } from '../../hooks/useAuth';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AlertDialog } from '../common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';
import { DocumentMandatoryReadModal } from './DocumentMandatoryReadModal';
import { DocumentReadReceiptsPanel } from './DocumentReadReceiptsPanel';
import Icon from '../ui/Icon';

export function DocumentViewer({ isAdmin = false }) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [receipts, setReceipts] = useState({});
  const [selectedDocForRead, setSelectedDocForRead] = useState(null);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);

  const confirmDialog = useDialog();
  const alertDialog = useDialog();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const categorias = [
    { value: 'all', label: 'Todas' },
    { value: 'institucional', label: 'Institucional' },
    { value: 'pedagogico', label: 'Pedagógico' },
    { value: 'administrativo', label: 'Administrativo' },
    { value: 'taller', label: 'Taller Especial' }
  ];

  const toLocalDate = (value) => {
    if (!value) return null;
    const date = value.toDate ? value.toDate() : new Date(value);
    return Number.isNaN(date?.getTime?.()) ? null : date;
  };

  const getFileTypeInfo = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) {
      return { icon: 'image', tag: 'Imagen' };
    }
    if (ext === 'pdf') return { icon: 'file', tag: 'PDF' };
    if (['doc', 'docx'].includes(ext)) return { icon: 'file', tag: 'Word' };
    if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: 'file', tag: 'Excel' };
    return { icon: 'file', tag: ext ? ext.toUpperCase() : 'Archivo' };
  };

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    let result;

    if (isAdmin) {
      result = await documentsService.getAllDocuments();
    } else if (user?.role) {
      result = await documentsService.getDocumentsByRole(user.role);
    } else {
      setLoading(false);
      return;
    }

    if (result.success) {
      setDocuments(result.documents);

      if (user?.role === 'family' && user?.uid) {
        const receiptsMap = {};
        const docs = result.documents || [];
        for (const doc of docs) {
          if (doc.requiereLectura) {
            const receiptResult = await documentReadReceiptsService.getUserReceipt(doc.id, user.uid);
            if (receiptResult.success && receiptResult.receipt) {
              receiptsMap[doc.id] = receiptResult.receipt;
            }
          }
        }
        setReceipts(receiptsMap);
      }
    }

    setLoading(false);
  }, [isAdmin, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, [loadDocuments]);

  const handleDelete = async (doc) => {
    confirmDialog.openDialog({
      title: 'Eliminar Documento',
      message: `¿Estás seguro de eliminar "${doc.titulo}"?`,
      type: 'danger',
      onConfirm: async () => {
        const result = await documentsService.deleteDocument(doc.id, doc.categoria, doc.archivoNombre);

        if (result.success) {
          alertDialog.openDialog({
            title: 'Éxito',
            message: 'Documento eliminado correctamente',
            type: 'success'
          });
          loadDocuments();
        } else {
          alertDialog.openDialog({
            title: 'Error',
            message: 'Error al eliminar: ' + result.error,
            type: 'error'
          });
        }
      }
    });
  };

  const handleOpenDocument = (doc) => {
    if (!isAdmin && user?.role === 'family' && doc.requiereLectura) {
      const receipt = receipts[doc.id];
      if (!receipt || receipt.status === 'pending') {
        setSelectedDocForRead(doc);
        return;
      }
    }
    window.open(doc.archivoURL, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmRead = async (documentId) => {
    if (!user?.uid) return;

    const result = await documentReadReceiptsService.markAsRead(documentId, user.uid);

    if (result.success) {
      setReceipts((prev) => ({
        ...prev,
        [documentId]: { ...prev[documentId], status: 'read', readAt: new Date() }
      }));
      setSelectedDocForRead(null);
      alertDialog.openDialog({
        title: 'Confirmado',
        message: 'Tu lectura ha sido registrada correctamente',
        type: 'success'
      });
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: 'Error al registrar la lectura: ' + result.error,
        type: 'error'
      });
    }
  };

  const filteredDocuments = filterCategoria === 'all'
    ? documents
    : documents.filter((doc) => doc.categoria === filterCategoria);

  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(day);
    return days;
  }, [calendarMonth, calendarYear]);

  const documentsByDay = useMemo(() => {
    const grouped = new Map();

    filteredDocuments.forEach((doc) => {
      const createdAt = toLocalDate(doc.createdAt);
      if (!createdAt) return;
      if (createdAt.getMonth() !== calendarMonth || createdAt.getFullYear() !== calendarYear) return;

      const day = createdAt.getDate();
      if (!grouped.has(day)) grouped.set(day, []);
      grouped.get(day).push(doc);
    });

    grouped.forEach((docs) => {
      docs.sort((a, b) => {
        const dateA = toLocalDate(a.createdAt)?.getTime?.() || 0;
        const dateB = toLocalDate(b.createdAt)?.getTime?.() || 0;
        return dateB - dateA;
      });
    });

    return grouped;
  }, [filteredDocuments, calendarMonth, calendarYear]);

  const documentsInMonth = useMemo(
    () => Array.from(documentsByDay.values()).flat(),
    [documentsByDay]
  );

  const selectedDayDocuments = selectedCalendarDay
    ? (documentsByDay.get(selectedCalendarDay) || [])
    : [];

  const documentsToRender = (isAdmin && selectedCalendarDay)
    ? selectedDayDocuments
    : filteredDocuments;

  const selectedCalendarLabel = selectedCalendarDay
    ? new Date(calendarYear, calendarMonth, selectedCalendarDay).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long'
    })
    : '';

  const goToToday = () => {
    const today = new Date();
    setCalendarDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedCalendarDay(
      today.getFullYear() === calendarYear && today.getMonth() === calendarMonth
        ? today.getDate()
        : null
    );
  };

  const changeCalendarMonth = (offset) => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setSelectedCalendarDay(null);
  };

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === calendarMonth &&
      today.getFullYear() === calendarYear
    );
  };

  if (loading) {
    return (
      <div className="alert alert--info">
        <p>Cargando documentos...</p>
      </div>
    );
  }

  return (
    <div className="documents-viewer">
      <div className={`documents-layout ${isAdmin ? 'documents-layout--admin' : ''}`}>
        <div className="documents-main-panel">
          <div className="documents-toolbar">
            <div className="form-group documents-filter-group">
              <label htmlFor="filter-categoria">Filtrar por categoría</label>
              <select
                id="filter-categoria"
                value={filterCategoria}
                onChange={(e) => setFilterCategoria(e.target.value)}
                className="form-control"
              >
                {categorias.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isAdmin && selectedCalendarDay && (
            <div className="documents-day-filter-banner">
              <span>Mostrando documentos del {selectedCalendarLabel}.</span>
              <button
                type="button"
                className="btn btn--sm btn--outline"
                onClick={() => setSelectedCalendarDay(null)}
              >
                Ver todo
              </button>
            </div>
          )}

          {documentsToRender.length === 0 ? (
            <div className="alert alert--info">
              <p>
                {isAdmin && selectedCalendarDay
                  ? `No hay documentos cargados el ${selectedCalendarLabel}.`
                  : `No hay documentos disponibles${filterCategoria !== 'all' ? ' en esta categoría' : ''}.`}
              </p>
            </div>
          ) : (
            <div className="documents-list">
              {documentsToRender.map((doc) => {
                const receipt = receipts[doc.id];
                const isPending = doc.requiereLectura && (!receipt || receipt.status === 'pending');
                const isRead = receipt?.status === 'read';
                const fileTypeInfo = getFileTypeInfo(doc.archivoNombre);

                return (
                  <div
                    key={doc.id}
                    className={`card documents-item ${isPending ? 'documents-item--pending' : ''} ${isRead ? 'documents-item--read' : ''}`}
                    data-categoria={doc.categoria}
                  >
                    <div className="documents-item__layout">
                      <div className="documents-item__content">
                        <div className="documents-item__header">
                          <span className="documents-item__icon" aria-hidden="true">
                            <Icon name={fileTypeInfo.icon} size={15} />
                          </span>
                          <span className="documents-item__type">{fileTypeInfo.tag}</span>
                          <h3 className="documents-item__title">{doc.titulo}</h3>
                          <span className="badge badge--info documents-item__category">
                            {categorias.find((c) => c.value === doc.categoria)?.label || doc.categoria}
                          </span>
                          {doc.requiereLectura && !isAdmin && (
                            isPending ? (
                              <span className="badge badge--warning documents-item__read-badge">
                                <Icon name="alert-circle" size={14} />
                                Lectura obligatoria
                              </span>
                            ) : isRead ? (
                              <span className="badge badge--success documents-item__read-badge">
                                <Icon name="check-circle" size={14} />
                                Leído
                              </span>
                            ) : null
                          )}
                        </div>

                        {doc.descripcion && (
                          <p className="documents-item__description">{doc.descripcion}</p>
                        )}

                        {isAdmin && doc.roles?.length > 0 && (
                          <div className="documents-item__roles">
                            {doc.roles.map((role) => (
                              <span key={role} className="badge badge--secondary documents-item__role">
                                {role}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="documents-item__meta">
                          Subido por: {doc.uploadedByEmail} ·{' '}
                          {toLocalDate(doc.createdAt)?.toLocaleDateString?.('es-AR') || 'Fecha desconocida'}
                        </p>

                        {isAdmin && doc.requiereLectura && (
                          <DocumentReadReceiptsPanel documentId={doc.id} documentTitle={doc.titulo} />
                        )}
                      </div>

                      <div className="documents-item__actions">
                        <button
                          onClick={() => handleOpenDocument(doc)}
                          className="btn btn--sm btn--primary"
                        >
                          {isAdmin ? 'Abrir' : (isPending ? 'Abrir y confirmar' : 'Abrir')}
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(doc)}
                            className="btn btn--sm btn--danger"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isAdmin && (
          <aside className="card events-calendar-panel documents-calendar-panel">
            <div className="card__header">
              <div>
                <h3 className="card__title">Calendario de documentación</h3>
                <p className="card__subtitle">{monthNames[calendarMonth]} {calendarYear}</p>
              </div>
              <span className="badge badge--info">{documentsInMonth.length} este mes</span>
            </div>

            <div className="card__body">
              <div className="event-calendar events-calendar--manager">
                <div className="event-calendar__header">
                  <button
                    onClick={() => changeCalendarMonth(-1)}
                    className="event-calendar__nav-btn"
                    aria-label="Mes anterior"
                  >
                    <Icon name="chevron-left" size={16} className="event-calendar__nav-icon" />
                  </button>
                  <div className="event-calendar__month">
                    {monthNames[calendarMonth]} {calendarYear}
                  </div>
                  <div className="event-calendar__actions">
                    <button
                      onClick={() => changeCalendarMonth(1)}
                      className="event-calendar__nav-btn"
                      aria-label="Siguiente mes"
                    >
                      <Icon name="chevron-right" size={16} className="event-calendar__nav-icon" />
                    </button>
                    <button
                      onClick={goToToday}
                      className="event-calendar__today-btn"
                      type="button"
                    >
                      Hoy
                    </button>
                  </div>
                </div>

                <div className="event-calendar__weekdays">
                  {dayNames.map((name, i) => (
                    <div key={i} className="event-calendar__weekday">
                      {name}
                    </div>
                  ))}
                </div>

                <div className="event-calendar__days">
                  {calendarDays.map((day, index) => {
                    const hasDocuments = day && documentsByDay.has(day);
                    return (
                      <div
                        key={index}
                        className={`event-calendar__day ${
                          day ? 'event-calendar__day--active' : 'event-calendar__day--empty'
                        } ${hasDocuments ? 'event-calendar__day--has-event documents-calendar-day--has-document' : ''} ${
                          selectedCalendarDay === day ? 'event-calendar__day--selected' : ''
                        } ${isToday(day) ? 'event-calendar__day--today' : ''}`}
                        onClick={() => day && setSelectedCalendarDay(selectedCalendarDay === day ? null : day)}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedCalendarDay && (
                <button
                  className="btn btn--sm btn--outline events-calendar-clear"
                  onClick={() => setSelectedCalendarDay(null)}
                >
                  Ver todo el mes
                </button>
              )}

              <div className="documents-calendar-day-list">
                <h4 className="documents-calendar-day-list__title">
                  {selectedCalendarDay
                    ? `Documentación del ${selectedCalendarLabel}`
                    : 'Selecciona un día para ver detalle'}
                </h4>

                {selectedCalendarDay ? (
                  selectedDayDocuments.length > 0 ? (
                    <div className="documents-calendar-day-list__items">
                      {selectedDayDocuments.map((doc) => (
                        <div key={`calendar-doc-${doc.id}`} className="documents-calendar-day-list__item">
                          <div className="documents-calendar-day-list__row">
                            <div>
                              <div className="documents-calendar-day-list__name">{doc.titulo}</div>
                              <div className="documents-calendar-day-list__meta">
                                {toLocalDate(doc.createdAt)?.toLocaleTimeString?.('es-AR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) || 'Hora no disponible'}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn--sm btn--outline documents-calendar-day-list__open"
                              onClick={() => handleOpenDocument(doc)}
                            >
                              Abrir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="documents-calendar-day-list__empty">No se enviaron documentos ese día.</p>
                  )
                ) : (
                  <p className="documents-calendar-day-list__hint">
                    Fechas en coral = días con documentación enviada.
                  </p>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {selectedDocForRead && (
        <DocumentMandatoryReadModal
          document={selectedDocForRead}
          onConfirm={handleConfirmRead}
          onClose={() => setSelectedDocForRead(null)}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.closeDialog}
        onConfirm={confirmDialog.dialogData.onConfirm}
        title={confirmDialog.dialogData.title}
        message={confirmDialog.dialogData.message}
        type={confirmDialog.dialogData.type}
      />

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={alertDialog.closeDialog}
        title={alertDialog.dialogData.title}
        message={alertDialog.dialogData.message}
        type={alertDialog.dialogData.type}
      />
    </div>
  );
}
