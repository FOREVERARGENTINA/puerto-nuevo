import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsService } from '../../services/documents.service';
import { documentReadReceiptsService } from '../../services/documentReadReceipts.service';
import { useAuth } from '../../hooks/useAuth';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AlertDialog } from '../common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';
import { DocumentReadReceiptsPanel } from './DocumentReadReceiptsPanel';
import {
  DOCUMENT_CATEGORY_OPTIONS,
  DOCUMENT_NEW_DAYS,
  DOCUMENT_SCOPE_OPTIONS,
  normalizeDocumentScope
} from '../../config/documentCategories';
import { getDocumentDetailRouteByRole } from '../../config/documentRoutes';
import Icon from '../ui/Icon';

const CATEGORY_SECTIONS = DOCUMENT_CATEGORY_OPTIONS.filter((option) => option.value !== 'all');

const toLocalDate = (value) => {
  if (!value) return null;
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date?.getTime?.()) ? null : date;
};

const getFileTypeInfo = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) {
    return { icon: 'image', tag: 'Imagen', tone: 'image' };
  }

  if (ext === 'pdf') return { icon: 'file', tag: 'PDF', tone: 'pdf' };
  if (['doc', 'docx'].includes(ext)) return { icon: 'file', tag: 'Word', tone: 'doc' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { icon: 'file', tag: 'Excel', tone: 'sheet' };
  return { icon: 'file', tag: ext ? ext.toUpperCase() : 'Archivo', tone: 'generic' };
};

const isRecentDocument = (createdAt) => {
  const date = toLocalDate(createdAt);
  if (!date) return false;
  const ageMs = Date.now() - date.getTime();
  return ageMs >= 0 && ageMs <= DOCUMENT_NEW_DAYS * 24 * 60 * 60 * 1000;
};

export function DocumentViewer({ isAdmin = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterCategory, setFilterCategory] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterScope, setFilterScope] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [showNewBanner, setShowNewBanner] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [expandedSections, setExpandedSections] = useState(() => (
    CATEGORY_SECTIONS.reduce((acc, category) => {
      acc[category.value] = false;
      return acc;
    }, {})
  ));

  const [receipts, setReceipts] = useState({});
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const hasAutoExpandedSections = useRef(false);

  const confirmDialog = useDialog();
  const alertDialog = useDialog();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError('');

    let result;

    if (isAdmin) {
      result = await documentsService.getAllDocuments();
    } else if (user?.role) {
      result = await documentsService.getDocumentsByRole(user.role, { userId: user?.uid || '' });
    } else {
      setLoading(false);
      return;
    }

    if (!result.success) {
      setDocuments([]);
      setReceipts({});
      setError(result.error || 'No se pudieron cargar documentos');
      setLoading(false);
      return;
    }

    const loadedDocuments = result.documents || [];
    setDocuments(loadedDocuments);

    if (user?.uid && loadedDocuments.length > 0) {
      const documentIds = loadedDocuments.map((doc) => doc.id).filter(Boolean);
      const receiptsResult = await documentReadReceiptsService.getUserReceiptsMap(user.uid, documentIds);
      if (receiptsResult.success) {
        setReceipts(receiptsResult.receiptsMap || {});
      } else {
        setReceipts({});
      }
    } else {
      setReceipts({});
    }

    setLoading(false);
  }, [isAdmin, user]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleDelete = async (documentItem) => {
    if (!documentItem?.id) return;

    confirmDialog.openDialog({
      title: 'Eliminar documento',
      message: `¿Estás seguro de eliminar "${documentItem.titulo}"?`,
      type: 'danger',
      onConfirm: async () => {
        const result = await documentsService.deleteDocument(
          documentItem.id,
          documentItem.categoria,
          documentItem.archivoNombre
        );

        if (result.success) {
          alertDialog.openDialog({
            title: 'Exito',
            message: 'Documento eliminado correctamente',
            type: 'success'
          });
          await loadDocuments();
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

  const handleOpenDetail = (documentItem) => {
    if (!documentItem?.id) return;
    navigate(getDocumentDetailRouteByRole(user?.role, documentItem.id));
  };

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = documents.filter((doc) => {
      if (filterCategory !== 'all' && doc.categoria !== filterCategory) {
        return false;
      }

      if (filterYear !== 'all') {
        const year = String(toLocalDate(doc.createdAt)?.getFullYear?.() || '');
        if (year !== filterYear) return false;
      }

      if (filterScope !== 'all') {
        const documentScope = normalizeDocumentScope(doc.ambiente);
        if (documentScope !== filterScope) return false;
      }

      if (showOnlyNew && !isRecentDocument(doc.createdAt)) {
        return false;
      }

      if (!normalizedSearch) return true;

      const title = (doc.titulo || '').toLowerCase();
      const description = (doc.descripcion || '').toLowerCase();
      const fileName = (doc.archivoNombre || '').toLowerCase();
      return title.includes(normalizedSearch)
        || description.includes(normalizedSearch)
        || fileName.includes(normalizedSearch);
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'az') {
        return (a.titulo || '').localeCompare((b.titulo || ''), 'es', { sensitivity: 'base' });
      }

      const aDate = toLocalDate(a.createdAt)?.getTime?.() || 0;
      const bDate = toLocalDate(b.createdAt)?.getTime?.() || 0;
      return bDate - aDate;
    });
  }, [documents, filterCategory, filterScope, filterYear, searchTerm, showOnlyNew, sortBy]);

  const availableYears = useMemo(() => {
    const yearSet = new Set();
    documents.forEach((doc) => {
      const year = toLocalDate(doc.createdAt)?.getFullYear?.();
      if (year) yearSet.add(String(year));
    });

    return Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
  }, [documents]);

  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i += 1) days.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) days.push(day);
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
        const aDate = toLocalDate(a.createdAt)?.getTime?.() || 0;
        const bDate = toLocalDate(b.createdAt)?.getTime?.() || 0;
        return bDate - aDate;
      });
    });

    return grouped;
  }, [filteredDocuments, calendarMonth, calendarYear]);

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

  const documentsInMonth = useMemo(
    () => Array.from(documentsByDay.values()).flat(),
    [documentsByDay]
  );

  const documentsByCategory = useMemo(() => {
    const grouped = CATEGORY_SECTIONS.reduce((acc, category) => {
      acc[category.value] = [];
      return acc;
    }, {});

    documentsToRender.forEach((doc) => {
      const category = CATEGORY_SECTIONS.some((item) => item.value === doc.categoria)
        ? doc.categoria
        : 'institucional';
      grouped[category].push(doc);
    });

    return grouped;
  }, [documentsToRender]);

  const requiredDocuments = useMemo(
    () => documents.filter((doc) => doc.requiereLectura),
    [documents]
  );

  const requiredReadCount = useMemo(
    () => requiredDocuments.filter((doc) => receipts[doc.id]?.status === 'read').length,
    [requiredDocuments, receipts]
  );

  const requiredProgress = requiredDocuments.length > 0
    ? Math.round((requiredReadCount / requiredDocuments.length) * 100)
    : 0;

  const newDocumentsCount = useMemo(
    () => documents.filter((doc) => isRecentDocument(doc.createdAt)).length,
    [documents]
  );

  useEffect(() => {
    if (newDocumentsCount === 0) {
      setShowOnlyNew(false);
    }
  }, [newDocumentsCount]);

  useEffect(() => {
    setShowNewBanner(true);
  }, [documents]);

  const toggleCategorySection = (categoryValue) => {
    setExpandedSections((prev) => ({
      ...prev,
      [categoryValue]: !prev[categoryValue]
    }));
  };

  const toggleOnlyNewFilter = () => {
    setShowOnlyNew((prev) => !prev);
  };

  const handleCloseNewBanner = () => {
    setShowNewBanner(false);
    setShowOnlyNew(false);
  };

  useEffect(() => {
    if (hasAutoExpandedSections.current) return;
    if (!Array.isArray(documents) || documents.length === 0) return;

    const nextExpanded = CATEGORY_SECTIONS.reduce((acc, category) => {
      const categoryDocs = documents.filter((doc) => doc.categoria === category.value);
      const hasPriorityDoc = categoryDocs.some((doc) => {
        const receipt = receipts[doc.id];
        const docRead = receipt?.status === 'read';
        const docNewUnread = isRecentDocument(doc.createdAt) && !docRead;
        const docMandatoryUnread = !!doc.requiereLectura && !docRead;

        if (user?.role === 'family') {
          return docMandatoryUnread || docNewUnread;
        }

        return isRecentDocument(doc.createdAt);
      });

      acc[category.value] = hasPriorityDoc;
      return acc;
    }, {});

    setExpandedSections(nextExpanded);
    hasAutoExpandedSections.current = true;
  }, [documents, receipts, user?.role]);

  const changeCalendarMonth = (offset) => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    setSelectedCalendarDay(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCalendarDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedCalendarDay(
      today.getFullYear() === calendarYear && today.getMonth() === calendarMonth
        ? today.getDate()
        : null
    );
  };

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return (
      today.getDate() === day
      && today.getMonth() === calendarMonth
      && today.getFullYear() === calendarYear
    );
  };

  if (loading) {
    return (
      <div className="documents-loading-state" role="status" aria-live="polite">
        <span className="documents-loading-state__icon" aria-hidden="true">
          <Icon name="file" size={16} />
        </span>
        <div className="documents-loading-state__body">
          <p className="documents-loading-state__title">Cargando documentos</p>
          <p className="documents-loading-state__hint">Preparando la biblioteca para esta cuenta.</p>
        </div>
        <span className="documents-loading-state__bar" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="documents-viewer">
      <div className={`documents-layout ${isAdmin ? 'documents-layout--admin' : ''}`}>
        <div className="documents-main-panel">
          {error && (
            <div className="alert alert--error" style={{ marginBottom: 'var(--spacing-md)' }}>
              {error}
            </div>
          )}

          <div className="documents-toolbar-toggle">
            <button
              type="button"
              className="btn btn--sm btn--outline documents-toolbar-toggle__button"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              aria-expanded={mobileFiltersOpen}
              aria-controls="documents-toolbar-filters"
            >
              {mobileFiltersOpen ? 'Ocultar filtros' : 'Filtros'}
            </button>
          </div>

          <div
            id="documents-toolbar-filters"
            className={`documents-toolbar documents-toolbar--rich ${mobileFiltersOpen ? 'is-open' : ''}`}
          >
            <div className="documents-search-group">
              <label htmlFor="documents-search">Buscar</label>
              <input
                id="documents-search"
                type="search"
                className="form-control"
                placeholder="Titulo o descripcion"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="documents-filter-group">
              <label htmlFor="documents-category">Categoria</label>
              <select
                id="documents-category"
                className="form-control"
                value={filterCategory}
                onChange={(event) => setFilterCategory(event.target.value)}
              >
                {DOCUMENT_CATEGORY_OPTIONS.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="documents-filter-group">
              <label htmlFor="documents-year">Año lectivo</label>
              <select
                id="documents-year"
                className="form-control"
                value={filterYear}
                onChange={(event) => setFilterYear(event.target.value)}
              >
                <option value="all">Todos</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="documents-filter-group">
              <label htmlFor="documents-scope">Ambiente</label>
              <select
                id="documents-scope"
                className="form-control"
                value={filterScope}
                onChange={(event) => setFilterScope(event.target.value)}
              >
                {DOCUMENT_SCOPE_OPTIONS.map((scope) => (
                  <option key={scope.value} value={scope.value}>
                    {scope.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="documents-filter-group">
              <label htmlFor="documents-order">Ordenar por</label>
              <select
                id="documents-order"
                className="form-control"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="recent">Mas reciente</option>
                <option value="az">Nombre A-Z</option>
              </select>
            </div>
          </div>

          {newDocumentsCount > 0 && showNewBanner && (
            <div className="documents-summary-banner documents-summary-banner--new" role="status">
              <div className="documents-summary-banner__content">
                <span>
                  Hay {newDocumentsCount} documento{newDocumentsCount === 1 ? '' : 's'} nuevo{newDocumentsCount === 1 ? '' : 's'} en los ultimos {DOCUMENT_NEW_DAYS} dias.
                </span>
                <div className="documents-summary-banner__actions">
                  <button
                    type="button"
                    className="btn btn--sm btn--link documents-summary-banner__action"
                    onClick={toggleOnlyNewFilter}
                  >
                    {showOnlyNew ? 'Ver todos' : 'Ver solo nuevos'}
                  </button>
                  <button
                    type="button"
                    className="documents-summary-banner__close"
                    onClick={handleCloseNewBanner}
                    aria-label="Cerrar aviso de documentos nuevos"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isAdmin && user?.role === 'family' && requiredDocuments.length > 0 && (
            <div className="documents-summary-banner documents-summary-banner--progress">
              <div className="documents-required-progress__text">
                Leiste {requiredReadCount} de {requiredDocuments.length} documentos obligatorios ({requiredProgress}%).
              </div>
              <div className="documents-required-progress__bar" role="progressbar" aria-valuenow={requiredProgress} aria-valuemin={0} aria-valuemax={100}>
                <div className="documents-required-progress__fill" style={{ width: `${requiredProgress}%` }} />
              </div>
            </div>
          )}

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
            <div className="documents-empty-state" role="status" aria-live="polite">
              <div className="documents-empty-state__icon" aria-hidden="true">
                <Icon name="file" size={26} />
              </div>
              <h3 className="documents-empty-state__title">
                {isAdmin && selectedCalendarDay
                  ? 'No hay documentos para ese dia'
                  : 'No encontramos documentos'}
              </h3>
              <p className="documents-empty-state__message">
                {isAdmin && selectedCalendarDay
                  ? `No se cargaron documentos el ${selectedCalendarLabel}.`
                  : 'Proba con otra busqueda o ajusta los filtros.'}
              </p>
            </div>
          ) : (
            <div className="documents-sections">
              {CATEGORY_SECTIONS.map((category) => {
                const sectionDocuments = documentsByCategory[category.value] || [];
                if (sectionDocuments.length === 0) return null;

                const isExpanded = expandedSections[category.value] !== false;

                return (
                  <section key={category.value} className="documents-section" data-category={category.value}>
                    <button
                      type="button"
                      className="documents-section__header"
                      onClick={() => toggleCategorySection(category.value)}
                      aria-expanded={isExpanded}
                    >
                      <span className="documents-section__title">
                        {category.label}
                        <span className="documents-section__count">({sectionDocuments.length})</span>
                      </span>
                      <Icon name={isExpanded ? 'chevron-left' : 'chevron-right'} size={14} className="documents-section__icon" />
                    </button>

                    {isExpanded && (
                      <div className="documents-list">
                        {sectionDocuments.map((doc) => {
                          const receipt = receipts[doc.id];
                          const isRead = receipt?.status === 'read';
                          const isPending = receipt?.status === 'pending' || (doc.requiereLectura && !isRead);
                          const isNew = isRecentDocument(doc.createdAt);
                          const fileInfo = getFileTypeInfo(doc.archivoNombre || '');
                          const isFeatured = Boolean(doc.destacado || doc.fijado || doc.pinned);
                          const documentScope = normalizeDocumentScope(doc.ambiente);
                          const scopeLabel = documentScope === 'taller1'
                            ? 'Taller 1'
                            : documentScope === 'taller2'
                              ? 'Taller 2'
                              : '';
                          const showRequiredBadge = !!doc.requiereLectura && !isRead;
                          const showReadBadge = !showRequiredBadge && isRead;
                          const showNewBadge = !showRequiredBadge && !showReadBadge && isNew;
                          const hasStatusBadges = Boolean(scopeLabel || showRequiredBadge || showReadBadge || showNewBadge);

                          return (
                            <div
                              key={doc.id}
                              className={`card documents-item documents-item--clickable ${isPending ? 'documents-item--pending' : ''} ${isRead ? 'documents-item--read' : ''} ${isFeatured ? 'documents-item--featured' : ''}`}
                              data-categoria={doc.categoria}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleOpenDetail(doc)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  handleOpenDetail(doc);
                                }
                              }}
                            >
                              <div className="documents-item__layout">
                                <div className="documents-item__top">
                                  <span className={`documents-item__file-icon documents-item__file-icon--${fileInfo.tone}`} aria-hidden="true">
                                    <Icon name={fileInfo.icon} size={18} />
                                    <span className="documents-item__file-ext">{fileInfo.tag}</span>
                                  </span>

                                  <div className="documents-item__content">
                                    <h3 className="documents-item__title">{doc.titulo}</h3>
                                    {doc.descripcion && (
                                      <p className="documents-item__description">{doc.descripcion}</p>
                                    )}

                                    {isAdmin && doc.requiereLectura && (
                                      <DocumentReadReceiptsPanel documentId={doc.id} documentTitle={doc.titulo} />
                                    )}
                                  </div>
                                </div>

                                <div className="documents-item__footer">
                                  {hasStatusBadges && (
                                    <div className="documents-item__roles">
                                      {scopeLabel && (
                                        <span className="badge badge--secondary documents-item__role">
                                          {scopeLabel}
                                        </span>
                                      )}
                                      {showNewBadge && (
                                        <span className="badge documents-item__status-badge documents-item__status-badge--new">Nuevo</span>
                                      )}
                                      {showRequiredBadge && (
                                        <span className="badge documents-item__status-badge documents-item__status-badge--required">Obligatorio</span>
                                      )}
                                      {showReadBadge && (
                                        <span className="badge documents-item__status-badge documents-item__status-badge--read">Leido</span>
                                      )}
                                    </div>
                                  )}

                                  {isAdmin && (
                                    <div className="documents-item__actions">
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleDelete(doc);
                                        }}
                                        className="btn btn--sm btn--danger documents-item__action-btn documents-item__action-btn--danger"
                                      >
                                        Eliminar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
        {isAdmin && (
          <aside className="card events-calendar-panel documents-calendar-panel">
            <div className="card__header">
              <div>
                <h3 className="card__title">Calendario de documentacion</h3>
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
                  {dayNames.map((name, index) => (
                    <div key={index} className="event-calendar__weekday">{name}</div>
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
                    ? `Documentacion del ${selectedCalendarLabel}`
                    : 'Selecciona un dia para ver detalle'}
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
                                {toLocalDate(doc.createdAt)?.toLocaleTimeString('es-AR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) || 'Hora no disponible'}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn--sm btn--outline documents-calendar-day-list__open"
                              onClick={() => handleOpenDetail(doc)}
                            >
                              Ver detalle
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="documents-calendar-day-list__empty">No se enviaron documentos ese dia.</p>
                  )
                ) : (
                  <p className="documents-calendar-day-list__hint">
                    Fechas en coral = dias con documentacion enviada.
                  </p>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

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
