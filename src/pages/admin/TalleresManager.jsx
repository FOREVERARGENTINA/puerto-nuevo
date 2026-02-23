import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { talleresService } from '../../services/talleres.service';
import { usersService } from '../../services/users.service';
import { eventsService } from '../../services/events.service';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AlertDialog } from '../../components/common/AlertDialog';
import { FileSelectionList, FileUploadSelector } from '../../components/common/FileUploadSelector';
import { useDialog } from '../../hooks/useDialog';
import { useAuth } from '../../hooks/useAuth';
import Icon from '../../components/ui/Icon';

const GALLERY_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const GALLERY_MAX_FILE_SIZE_LABEL = '50MB';
const GALLERY_ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif',
  'mp4', 'mov', 'webm', 'ogv'
]);
const GALLERY_BLOCKED_EXTENSIONS = new Set(['zip', 'exe', 'bat']);
const GALLERY_ALLOWED_MIME_PREFIXES = ['image/', 'video/'];

const EVENT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const EVENT_MAX_FILE_SIZE_LABEL = '50MB';
const EVENT_ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif',
  'mp4', 'mov', 'webm', 'ogv',
  'mp3', 'wav', 'm4a', 'ogg',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv'
]);
const EVENT_BLOCKED_EXTENSIONS = new Set(['zip', 'exe', 'bat']);
const EVENT_ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];
const EVENT_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence'
]);

const RESOURCE_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const RESOURCE_MAX_FILE_SIZE_LABEL = '20MB';
const RESOURCE_BLOCKED_EXTENSIONS = new Set(['zip', 'exe', 'bat']);
const RESOURCE_ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'rtf', 'odt', 'ods', 'odp'
]);
const RESOURCE_ALLOWED_MIME_TYPES_CLIENT = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation'
]);

const TalleresManager = () => {
  const navigate = useNavigate();
  const { tallerId } = useParams();
  const isNew = tallerId === 'nuevo';
  const { user, isAdmin, isTallerista } = useAuth();
  const [talleres, setTalleres] = useState([]);
  const [talleristas, setTalleristas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTaller, setEditingTaller] = useState(null);
  const [selectedTaller, setSelectedTaller] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    talleristaId: '',
    horarios: [],
    ambiente: ''
  });
  const [albums, setAlbums] = useState([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumName, setAlbumName] = useState('');
  const [albumSaving, setAlbumSaving] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [legacyGallery, setLegacyGallery] = useState([]);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyDeleting, setLegacyDeleting] = useState(false);
  const [tallerEvents, setTallerEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventEditingId, setEventEditingId] = useState(null);
  const [eventUpdating, setEventUpdating] = useState(false);
  const [eventEditFiles, setEventEditFiles] = useState([]);
  const [eventEditMedia, setEventEditMedia] = useState([]);
  const [eventEditRemovingId, setEventEditRemovingId] = useState(null);
  const [eventForm, setEventForm] = useState({
    titulo: '',
    descripcion: '',
    fecha: '',
    hora: '',
    scope: 'taller'
  });
  const [eventEditForm, setEventEditForm] = useState({
    titulo: '',
    descripcion: '',
    fecha: '',
    hora: '',
    scope: 'taller'
  });
  const [eventFiles, setEventFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('config');
  const [galleryDeletingId, setGalleryDeletingId] = useState(null);
  const [resourcePosts, setResourcePosts] = useState([]);
  const [resourcePostsLoading, setResourcePostsLoading] = useState(false);
  const [resourcePublishing, setResourcePublishing] = useState(false);
  const [resourceDeletingId, setResourceDeletingId] = useState(null);
  const [resourceForm, setResourceForm] = useState({ title: '', description: '' });
  const [resourceFiles, setResourceFiles] = useState([]);
  const [resourceLinkInput, setResourceLinkInput] = useState('');
  const [resourceLinks, setResourceLinks] = useState([]);

  const confirmDialog = useDialog();
  const alertDialog = useDialog();
  const loadTalleres = async () => {
    const result = await talleresService.getAllTalleres();
    if (result.success) {
      setTalleres(result.talleres);
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: 'Error al cargar talleres: ' + result.error,
        type: 'error'
      });
    }
  };

  const loadTalleristas = async () => {
    const result = await usersService.getUsersByRole('tallerista');
    if (result.success) {
      setTalleristas(result.users);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadTalleres(), loadTalleristas()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const canManageContent = (taller) => {
    if (!taller) return false;
    if (isAdmin) return true;
    if (!isTallerista) return false;
    const ids = Array.isArray(taller.talleristaId) ? taller.talleristaId : [taller.talleristaId].filter(Boolean);
    return ids.includes(user?.uid);
  };

  const loadAlbums = async (id) => {
    setAlbumsLoading(true);
    const result = await talleresService.getAlbums(id);
    if (result.success) {
      setAlbums(result.albums || []);
    } else {
      setAlbums([]);
    }
    setAlbumsLoading(false);
  };

  const loadAlbumMedia = async (id, albumId) => {
    if (!albumId) {
      setGallery([]);
      return;
    }
    setGalleryLoading(true);
    const result = await talleresService.getAlbumMedia(id, albumId);
    if (result.success) {
      setGallery(result.items || []);
    } else {
      setGallery([]);
    }
    setGalleryLoading(false);
  };

  const loadLegacyGallery = async (id) => {
    setLegacyLoading(true);
    const result = await talleresService.getLegacyGallery(id);
    if (result.success) {
      setLegacyGallery(result.items || []);
    } else {
      setLegacyGallery([]);
    }
    setLegacyLoading(false);
  };

  const loadResourcePosts = async (id) => {
    setResourcePostsLoading(true);
    const result = await talleresService.getResourcePosts(id);
    if (result.success) {
      setResourcePosts(result.posts || []);
    } else {
      setResourcePosts([]);
    }
    setResourcePostsLoading(false);
  };

  const loadTallerEvents = async (id) => {
    setEventsLoading(true);
    const now = new Date();
    const start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const end = new Date(now.getFullYear() + 1, now.getMonth() + 1, 0, 23, 59, 59);
    const result = await eventsService.getEventsByRange(start, end);
    if (result.success) {
      const filtered = (result.events || []).filter(event => (
        event.source === 'taller' && event.tallerId === id
      ));
      filtered.sort((a, b) => {
        const dateA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
        const dateB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
        return dateB - dateA;
      });
      setTallerEvents(filtered);
    } else {
      setTallerEvents([]);
    }
    setEventsLoading(false);
  };

  const handleResourceFilesChange = (selectedFiles) => {
    const parsedFiles = Array.isArray(selectedFiles) ? selectedFiles : [];
    if (parsedFiles.length === 0) return;
    const validFiles = [];
    const rejectedMessages = [];
    parsedFiles.forEach((file) => {
      const lowerName = (file.name || '').toLowerCase();
      const extension = lowerName.includes('.') ? lowerName.split('.').pop() : '';
      const mimeType = (file.type || '').toLowerCase();
      if (extension && RESOURCE_BLOCKED_EXTENSIONS.has(extension)) {
        rejectedMessages.push(`${file.name}: extension no permitida`);
        return;
      }
      if (file.size > RESOURCE_MAX_FILE_SIZE_BYTES) {
        rejectedMessages.push(`${file.name}: supera ${RESOURCE_MAX_FILE_SIZE_LABEL}`);
        return;
      }
      const validByExtension = extension && RESOURCE_ALLOWED_EXTENSIONS.has(extension);
      const validByMimeType = mimeType && RESOURCE_ALLOWED_MIME_TYPES_CLIENT.has(mimeType);
      if (!validByExtension && !validByMimeType) {
        rejectedMessages.push(`${file.name}: tipo no permitido`);
        return;
      }
      validFiles.push(file);
    });
    if (rejectedMessages.length > 0) {
      alertDialog.openDialog({
        title: 'Algunos archivos no son validos',
        message: rejectedMessages.slice(0, 4).join('\n'),
        type: 'warning'
      });
    }
    if (validFiles.length > 0) {
      setResourceFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleAddResourceLink = () => {
    const raw = resourceLinkInput.trim();
    if (!raw) return;
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      alertDialog.openDialog({ title: 'Link no valido', message: 'Ingrese una URL valida con http o https.', type: 'warning' });
      return;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      alertDialog.openDialog({ title: 'Link no valido', message: 'Solo se permiten links con protocolo http o https.', type: 'warning' });
      return;
    }
    const normalizedUrl = parsed.toString();
    if (resourceLinks.some((link) => link.url === normalizedUrl)) {
      setResourceLinkInput('');
      return;
    }
    setResourceLinks((prev) => [...prev, { url: normalizedUrl, label: parsed.hostname }]);
    setResourceLinkInput('');
  };

  const handleRemoveResourceFile = (index) => {
    setResourceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveResourceLink = (index) => {
    setResourceLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublishResourcePost = async () => {
    if (!selectedTaller?.id || !user?.uid) return;
    const title = resourceForm.title.trim();
    if (!title) {
      alertDialog.openDialog({ title: 'Titulo requerido', message: 'Ingrese un titulo para la publicacion.', type: 'warning' });
      return;
    }
    if (resourceFiles.length === 0 && resourceLinks.length === 0) {
      alertDialog.openDialog({ title: 'Contenido requerido', message: 'Agrega al menos un archivo o un link.', type: 'warning' });
      return;
    }
    setResourcePublishing(true);
    const result = await talleresService.createResourcePost(selectedTaller.id, {
      title,
      description: resourceForm.description,
      files: resourceFiles,
      links: resourceLinks,
      createdBy: user.uid,
      createdByName: user.displayName || user.email || ''
    });
    if (!result.success) {
      setResourcePublishing(false);
      alertDialog.openDialog({ title: 'Error al publicar', message: result.error || 'No se pudo publicar el recurso.', type: 'error' });
      return;
    }
    setResourceForm({ title: '', description: '' });
    setResourceFiles([]);
    setResourceLinks([]);
    setResourceLinkInput('');
    await loadResourcePosts(selectedTaller.id);
    setResourcePublishing(false);
    alertDialog.openDialog({ title: 'Publicado', message: 'El recurso se publico correctamente.', type: 'success' });
  };

  const handleDeleteResourcePost = (post) => {
    if (!selectedTaller?.id || !post?.id) return;
    confirmDialog.openDialog({
      title: 'Eliminar publicacion',
      message: 'Se eliminara esta publicacion y sus archivos adjuntos. Esta accion no se puede deshacer.',
      type: 'danger',
      onConfirm: async () => {
        setResourceDeletingId(post.id);
        const result = await talleresService.deleteResourcePost(selectedTaller.id, post.id, post.items || []);
        setResourceDeletingId(null);
        if (!result.success) {
          alertDialog.openDialog({ title: 'No se pudo eliminar', message: result.error || 'Error eliminando la publicacion.', type: 'error' });
          return;
        }
        if (Array.isArray(result.warnings) && result.warnings.length > 0) {
          alertDialog.openDialog({ title: 'Publicacion eliminada con avisos', message: result.warnings.slice(0, 3).join('\n'), type: 'warning' });
        }
        await loadResourcePosts(selectedTaller.id);
      }
    });
  };

  const selectTallerForContent = async (taller) => {
    setSelectedTaller(taller);
    if (!taller?.id) return;
    setSelectedAlbum(null);
    setGalleryFiles([]);
    setGallery([]);
    setAlbumName('');
    setEventFiles([]);
    setEventForm({
      titulo: '',
      descripcion: '',
      fecha: '',
      hora: '',
      scope: 'taller'
    });
    setResourceForm({ title: '', description: '' });
    setResourceFiles([]);
    setResourceLinks([]);
    setResourceLinkInput('');
    await Promise.all([loadAlbums(taller.id), loadLegacyGallery(taller.id), loadTallerEvents(taller.id), loadResourcePosts(taller.id)]);
  };

  useEffect(() => {
    if (loading) return;

    if (isNew) {
      setEditingTaller(null);
      setSelectedTaller(null);
      setFormData({
        nombre: '',
        descripcion: '',
        talleristaId: '',
        horarios: [],
        ambiente: ''
      });
      setActiveTab('config');
      return;
    }

    const found = talleres.find(t => t.id === tallerId);
    if (!found) {
      setEditingTaller(null);
      setSelectedTaller(null);
      return;
    }

    setEditingTaller(found);
    const talleristaId = Array.isArray(found.talleristaId) ? found.talleristaId[0] : (found.talleristaId || '');
    setFormData({
      nombre: found.nombre || '',
      descripcion: found.descripcion || '',
      talleristaId,
      horarios: found.horarios || [],
      ambiente: found.ambiente || ''
    });
    setActiveTab('config');
    selectTallerForContent(found);
  }, [loading, talleres, tallerId, isNew]);

  const resetForm = () => {
    if (editingTaller) {
      const talleristaId = Array.isArray(editingTaller.talleristaId)
        ? editingTaller.talleristaId[0]
        : (editingTaller.talleristaId || '');
      setFormData({
        nombre: editingTaller.nombre || '',
        descripcion: editingTaller.descripcion || '',
        talleristaId,
        horarios: editingTaller.horarios || [],
        ambiente: editingTaller.ambiente || ''
      });
      return;
    }
    setFormData({
      nombre: '',
      descripcion: '',
      talleristaId: '',
      horarios: [],
      ambiente: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (name === 'ambiente' && prev.ambiente !== value) {
        return {
          ...prev,
          [name]: value,
          horarios: []
        };
      }
      return {
        ...prev,
        [name]: value
      };
    });
  };

  const handleHorarioToggle = (dia, bloque) => {
    setFormData(prev => {
      const horarioKey = `${dia}|${bloque}`;
      const exists = prev.horarios.some(h => `${h.dia}|${h.bloque}` === horarioKey);

      if (exists) {
        return {
          ...prev,
          horarios: prev.horarios.filter(h => `${h.dia}|${h.bloque}` !== horarioKey)
        };
      }
      return {
        ...prev,
        horarios: [...prev.horarios, { dia, bloque }]
      };
    });
  };

  const isHorarioSelected = (dia, bloque) => {
    return formData.horarios.some(h => h.dia === dia && h.bloque === bloque);
  };

  const getHorarioOcupado = (dia, bloque) => {
    if (!formData.ambiente) return null;

    return talleres.find(t =>
      t.ambiente === formData.ambiente &&
      t.id !== editingTaller?.id &&
      t.horarios?.some(h => h.dia === dia && h.bloque === bloque)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      alertDialog.openDialog({
        title: 'Campo requerido',
        message: 'El nombre del taller es obligatorio',
        type: 'warning'
      });
      return;
    }

    if (!formData.talleristaId) {
      alertDialog.openDialog({
        title: 'Campo requerido',
        message: 'Debes asignar un tallerista',
        type: 'warning'
      });
      return;
    }

    if (!formData.ambiente) {
      alertDialog.openDialog({
        title: 'Campo requerido',
        message: 'Debes seleccionar un ambiente (Taller 1 o Taller 2)',
        type: 'warning'
      });
      return;
    }

    if (!formData.horarios || formData.horarios.length === 0) {
      alertDialog.openDialog({
        title: 'Campo requerido',
        message: 'Debes seleccionar al menos un horario para el taller',
        type: 'warning'
      });
      return;
    }

    const conflictos = formData.horarios.filter(horario => {
      const tallerConflicto = talleres.find(t =>
        t.ambiente === formData.ambiente &&
        t.id !== editingTaller?.id &&
        t.horarios?.some(h => h.dia === horario.dia && h.bloque === horario.bloque)
      );
      return tallerConflicto;
    });

    if (conflictos.length > 0) {
      alertDialog.openDialog({
        title: 'Conflicto de horarios',
        message: 'Algunos horarios ya están ocupados por otros talleres. Por favor, revisa la matriz de horarios.',
        type: 'error'
      });
      return;
    }

    let result;
    if (editingTaller) {
      result = await talleresService.updateTaller(editingTaller.id, formData);
    } else {
      result = await talleresService.createTaller(formData);
    }

    if (result.success) {
      alertDialog.openDialog({
        title: 'Éxito',
        message: editingTaller ? 'Taller actualizado correctamente' : 'Taller creado correctamente',
        type: 'success'
      });
      if (editingTaller) {
        loadData();
      } else if (result.id) {
        await loadData();
        navigate(`/portal/admin/talleres/${result.id}`);
      }
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: 'Error: ' + result.error,
        type: 'error'
      });
    }
  };

  const handleDelete = async (id) => {
    confirmDialog.openDialog({
      title: 'Eliminar taller',
      message: '¿Estás seguro de eliminar este taller? Esta acción no se puede deshacer.',
      type: 'danger',
      onConfirm: async () => {
        const result = await talleresService.deleteTaller(id);
        if (result.success) {
          alertDialog.openDialog({
            title: 'Éxito',
            message: 'Taller eliminado correctamente',
            type: 'success'
          });
          navigate('/portal/admin/talleres');
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

  const handleToggleEstado = (taller) => {
    if (!taller) return;
    const newEstado = taller.estado === 'activo' ? 'inactivo' : 'activo';
    confirmDialog.openDialog({
      title: `${newEstado === 'activo' ? 'Habilitar taller' : 'Deshabilitar taller'}`,
      message: `¿Estás seguro de ${newEstado === 'activo' ? 'habilitar' : 'deshabilitar'} este taller?`,
      type: newEstado === 'activo' ? 'success' : 'danger',
      onConfirm: async () => {
        const result = await talleresService.updateTaller(taller.id, { estado: newEstado });
        if (result.success) {
          alertDialog.openDialog({
            title: 'Éxito',
            message: `Taller ${newEstado === 'activo' ? 'habilitado' : 'deshabilitado'} correctamente`,
            type: 'success'
          });
          // actualizar estado en UI rápidamente
          setEditingTaller(prev => prev ? { ...prev, estado: newEstado } : prev);
          setSelectedTaller(prev => prev ? { ...prev, estado: newEstado } : prev);
          await loadData();
        } else {
          alertDialog.openDialog({
            title: 'Error',
            message: result.error || 'No se pudo actualizar el estado.',
            type: 'error'
          });
        }
      }
    });
  };

  const validateFiles = (files, allowedExtensions, blockedExtensions, allowedMimePrefixes, allowedMimeTypes, maxSizeBytes) => {
    const validFiles = [];
    let hasInvalidType = false;
    let hasBlockedType = false;
    let hasOversize = false;

    files.forEach((file) => {
      const name = (file.name || '').toLowerCase();
      const ext = name.includes('.') ? name.split('.').pop() : '';
      const type = (file.type || '').toLowerCase();
      const isBlocked = ext && blockedExtensions.has(ext);
      const isAllowedExt = ext && allowedExtensions.has(ext);
      const isAllowedMime = type
        ? (allowedMimePrefixes.some(prefix => type.startsWith(prefix)) || (allowedMimeTypes && allowedMimeTypes.has(type)))
        : false;

      if (isBlocked) {
        hasBlockedType = true;
        return;
      }
      if (!isAllowedExt && !isAllowedMime) {
        hasInvalidType = true;
        return;
      }
      if (file.size > maxSizeBytes) {
        hasOversize = true;
        return;
      }
      validFiles.push(file);
    });

    return { validFiles, hasInvalidType, hasBlockedType, hasOversize };
  };

  const handleGalleryFilesChange = (selectedFiles) => {
    const files = Array.isArray(selectedFiles) ? selectedFiles : [];
    if (files.length === 0) return;

    const { validFiles, hasInvalidType, hasBlockedType, hasOversize } = validateFiles(
      files,
      GALLERY_ALLOWED_EXTENSIONS,
      GALLERY_BLOCKED_EXTENSIONS,
      GALLERY_ALLOWED_MIME_PREFIXES,
      null,
      GALLERY_MAX_FILE_SIZE_BYTES
    );

    if (hasInvalidType || hasBlockedType || hasOversize) {
      let message = '';
      if (hasInvalidType || hasBlockedType) {
        message = 'Solo se permiten imágenes o videos. Bloqueados: .zip, .exe, .bat.';
      }
      if (hasOversize) {
        message = `${message ? `${message} ` : ''}Algunos archivos superan el límite de ${GALLERY_MAX_FILE_SIZE_LABEL}.`;
      }
      alertDialog.openDialog({
        title: 'Archivo no válido',
        message,
        type: 'warning'
      });
    }

    if (validFiles.length > 0) {
      setGalleryFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleEventFilesChange = (selectedFiles) => {
    const files = Array.isArray(selectedFiles) ? selectedFiles : [];
    if (files.length === 0) return;

    const { validFiles, hasInvalidType, hasBlockedType, hasOversize } = validateFiles(
      files,
      EVENT_ALLOWED_EXTENSIONS,
      EVENT_BLOCKED_EXTENSIONS,
      EVENT_ALLOWED_MIME_PREFIXES,
      EVENT_ALLOWED_MIME_TYPES,
      EVENT_MAX_FILE_SIZE_BYTES
    );

    if (hasInvalidType || hasBlockedType || hasOversize) {
      let message = '';
      if (hasInvalidType || hasBlockedType) {
        message = 'Solo se permiten imágenes, videos, audio, documentos o texto. Bloqueados: .zip, .exe, .bat.';
      }
      if (hasOversize) {
        message = `${message ? `${message} ` : ''}Algunos archivos superan el límite de ${EVENT_MAX_FILE_SIZE_LABEL}.`;
      }
      alertDialog.openDialog({
        title: 'Archivo no válido',
        message,
        type: 'warning'
      });
    }

    if (validFiles.length > 0) {
      setEventFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeGalleryFile = (index) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeEventFile = (index) => {
    setEventFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateAlbum = async () => {
    if (!selectedTaller?.id) return;
    if (!canManageContent(selectedTaller)) {
      alertDialog.openDialog({
        title: 'No autorizado',
        message: 'No tienes permisos para crear albumes en este taller.',
        type: 'warning'
      });
      return;
    }
    if (!albumName.trim()) {
      alertDialog.openDialog({
        title: 'Nombre requerido',
        message: 'El nombre del album es obligatorio.',
        type: 'warning'
      });
      return;
    }

    setAlbumSaving(true);
    const result = await talleresService.createAlbum(selectedTaller.id, albumName, user?.uid);
    if (result.success) {
      setAlbumName('');
      await loadAlbums(selectedTaller.id);
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: result.error || 'No se pudo crear el album.',
        type: 'error'
      });
    }
    setAlbumSaving(false);
  };

  const handleSelectAlbum = async (album) => {
    if (!selectedTaller?.id || !album?.id) return;
    setSelectedAlbum(album);
    setGalleryFiles([]);
    await loadAlbumMedia(selectedTaller.id, album.id);
  };

  const handleBackToAlbums = () => {
    setSelectedAlbum(null);
    setGallery([]);
    setGalleryFiles([]);
  };

  const handleDeleteLegacyGalleryAll = () => {
    if (!selectedTaller?.id) return;
    if (!canManageContent(selectedTaller)) {
      alertDialog.openDialog({
        title: 'No autorizado',
        message: 'No tienes permisos para eliminar la galeria anterior.',
        type: 'warning'
      });
      return;
    }
    if (!legacyGallery.length) return;

    confirmDialog.openDialog({
      title: 'Eliminar galeria anterior',
      message: `Se eliminaran ${legacyGallery.length} archivo(s) antiguos. Esta accion no se puede deshacer.`,
      type: 'danger',
      onConfirm: async () => {
        setLegacyDeleting(true);
        const result = await talleresService.deleteLegacyGalleryAll(selectedTaller.id);
        if (!result.success) {
          alertDialog.openDialog({
            title: 'Error',
            message: result.error || 'No se pudo eliminar la galeria anterior.',
            type: 'error'
          });
        }
        await loadLegacyGallery(selectedTaller.id);
        setLegacyDeleting(false);
      }
    });
  };

  const handleUploadGallery = async () => {
    if (!selectedTaller?.id) return;
    if (!canManageContent(selectedTaller)) {
      alertDialog.openDialog({
        title: 'No autorizado',
        message: 'No tienes permisos para subir archivos en este taller.',
        type: 'warning'
      });
      return;
    }
    if (!selectedAlbum?.id) {
      alertDialog.openDialog({
        title: 'Album requerido',
        message: 'Selecciona un album antes de subir archivos.',
        type: 'warning'
      });
      return;
    }
    if (galleryFiles.length === 0) {
      alertDialog.openDialog({
        title: 'Archivos requeridos',
        message: 'Selecciona al menos un archivo para subir.',
        type: 'warning'
      });
      return;
    }

    setGalleryUploading(true);
    const result = await talleresService.uploadAlbumMedia(selectedTaller.id, selectedAlbum.id, galleryFiles, user?.uid);
    if (result.success) {
      setGalleryFiles([]);
      await loadAlbumMedia(selectedTaller.id, selectedAlbum.id);
      await loadAlbums(selectedTaller.id);
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: result.error || 'No se pudo subir la galería.',
        type: 'error'
      });
    }
    setGalleryUploading(false);
  };

  const handleDeleteGalleryItem = (item) => {
    if (!selectedTaller?.id || !item) return;
    if (!canManageContent(selectedTaller)) {
      alertDialog.openDialog({
        title: 'No autorizado',
        message: 'No tienes permisos para eliminar archivos en este taller.',
        type: 'warning'
      });
      return;
    }
    if (!selectedAlbum?.id) return;

    confirmDialog.openDialog({
      title: 'Eliminar archivo',
      message: '¿Estás seguro de eliminar este archivo de la galería?',
      type: 'danger',
      onConfirm: async () => {
        setGalleryDeletingId(item.id || item.fileName || 'deleting');
        const result = await talleresService.deleteAlbumMedia(selectedTaller.id, selectedAlbum.id, item);
        if (!result.success) {
          alertDialog.openDialog({
            title: 'Error',
            message: result.error || 'No se pudo eliminar el archivo.',
            type: 'error'
          });
        } else {
          await loadAlbumMedia(selectedTaller.id, selectedAlbum.id);
        }
        setGalleryDeletingId(null);
      }
    });
  };

  const handleEventFormChange = (e) => {
    const { name, value } = e.target;
    setEventForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEventEditChange = (e) => {
    const { name, value } = e.target;
    setEventEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEventEditFilesChange = (selectedFiles) => {
    const files = Array.isArray(selectedFiles) ? selectedFiles : [];
    if (files.length === 0) return;

    const { validFiles, hasInvalidType, hasBlockedType, hasOversize } = validateFiles(
      files,
      EVENT_ALLOWED_EXTENSIONS,
      EVENT_BLOCKED_EXTENSIONS,
      EVENT_ALLOWED_MIME_PREFIXES,
      EVENT_ALLOWED_MIME_TYPES,
      EVENT_MAX_FILE_SIZE_BYTES
    );

    if (hasInvalidType || hasBlockedType || hasOversize) {
      let message = '';
      if (hasInvalidType || hasBlockedType) {
        message = 'Solo se permiten imágenes, videos, audio, documentos o texto. Bloqueados: .zip, .exe, .bat.';
      }
      if (hasOversize) {
        message = `${message ? `${message} ` : ''}Algunos archivos superan el límite de ${EVENT_MAX_FILE_SIZE_LABEL}.`;
      }
      alertDialog.openDialog({
        title: 'Archivo no válido',
        message,
        type: 'warning'
      });
    }

    if (validFiles.length > 0) {
      setEventEditFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeEventEditFile = (index) => {
    setEventEditFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveEventMedia = async (mediaItem) => {
    if (!eventEditingId || !mediaItem) return;
    setEventEditRemovingId(mediaItem.path || mediaItem.url || mediaItem.name || 'removing');
    const result = await eventsService.deleteEventMedia(eventEditingId, mediaItem, eventEditMedia);
    if (result.success) {
      setEventEditMedia(result.media || []);
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: result.error || 'No se pudo eliminar el adjunto.',
        type: 'error'
      });
    }
    setEventEditRemovingId(null);
  };

  const formatDateInput = (value) => {
    if (!value) return '';
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const startEditEvent = (event) => {
    if (!event) return;
    setEventEditingId(event.id);
    setEventEditMedia(Array.isArray(event.media) ? event.media : []);
    setEventEditFiles([]);
    setEventEditForm({
      titulo: event.titulo || '',
      descripcion: event.descripcion || '',
      fecha: formatDateInput(event.fecha),
      hora: event.hora || '',
      scope: event.scope || 'taller'
    });
  };

  const cancelEditEvent = () => {
    setEventEditingId(null);
    setEventEditFiles([]);
    setEventEditMedia([]);
    setEventEditForm({
      titulo: '',
      descripcion: '',
      fecha: '',
      hora: '',
      scope: 'taller'
    });
  };

  const handleUpdateEvent = async () => {
    if (!eventEditingId) return;
    if (!eventEditForm.titulo.trim() || !eventEditForm.fecha) {
      alertDialog.openDialog({
        title: 'Campos requeridos',
        message: 'El título y la fecha del evento son obligatorios.',
        type: 'warning'
      });
      return;
    }

    setEventUpdating(true);
    const payload = {
      titulo: eventEditForm.titulo.trim(),
      descripcion: eventEditForm.descripcion.trim(),
      fecha: eventEditForm.fecha,
      hora: eventEditForm.hora || '',
      scope: eventEditForm.scope || 'taller'
    };

    const result = await eventsService.updateEvent(eventEditingId, payload);
    if (!result.success) {
      alertDialog.openDialog({
        title: 'Error',
        message: result.error || 'No se pudo actualizar el evento.',
        type: 'error'
      });
      setEventUpdating(false);
      return;
    }

    if (eventEditFiles.length > 0) {
      const mediaResult = await eventsService.uploadEventMedia(
        eventEditingId,
        eventEditFiles,
        eventEditMedia
      );
      if (!mediaResult.success) {
        alertDialog.openDialog({
          title: 'Atención',
          message: 'El evento se actualizó, pero hubo un error al subir los adjuntos.',
          type: 'warning'
        });
      }
    }

    await loadTallerEvents(selectedTaller.id);
    setEventUpdating(false);
    cancelEditEvent();
  };

  const resetEventForm = () => {
    setEventForm({
      titulo: '',
      descripcion: '',
      fecha: '',
      hora: '',
      scope: 'taller'
    });
    setEventFiles([]);
  };

  const handleCreateTallerEvent = async () => {
    if (!selectedTaller?.id) return;
    if (!canManageContent(selectedTaller)) {
      alertDialog.openDialog({
        title: 'No autorizado',
        message: 'No tienes permisos para crear eventos en este taller.',
        type: 'warning'
      });
      return;
    }
    if (!eventForm.titulo.trim() || !eventForm.fecha) {
      alertDialog.openDialog({
        title: 'Campos requeridos',
        message: 'El título y la fecha del evento son obligatorios.',
        type: 'warning'
      });
      return;
    }

    setEventSaving(true);
    const payload = {
      titulo: eventForm.titulo.trim(),
      descripcion: eventForm.descripcion.trim(),
      fecha: eventForm.fecha,
      hora: eventForm.hora || '',
      tipo: 'talleres',
      source: 'taller',
      scope: eventForm.scope,
      tallerId: selectedTaller.id,
      tallerNombre: selectedTaller.nombre || '',
      ambiente: selectedTaller.ambiente || '',
      createdBy: user?.uid || '',
      createdByName: user?.displayName || user?.email || '',
      createdByRole: user?.role || ''
    };

    const result = await eventsService.createEvent(payload);
    if (!result.success) {
      alertDialog.openDialog({
        title: 'Error',
        message: result.error || 'No se pudo crear el evento.',
        type: 'error'
      });
      setEventSaving(false);
      return;
    }

    if (eventFiles.length > 0) {
      const mediaResult = await eventsService.uploadEventMedia(
        result.id,
        eventFiles,
        []
      );
      if (!mediaResult.success) {
        alertDialog.openDialog({
          title: 'Atención',
          message: 'El evento se creó, pero hubo un error al subir los adjuntos.',
          type: 'warning'
        });
      }
    }

    resetEventForm();
    await loadTallerEvents(selectedTaller.id);
    setEventSaving(false);
  };
  const diasSemanaOptions = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  const bloquesHorariosOptions = [
    { id: '08:30-09:30', label: '08:30 - 09:30' },
    { id: '09:30-10:30', label: '09:30 - 10:30' },
    { id: '10:30-11:30', label: '10:30 - 11:30' },
    { id: '11:30-12:30', label: '11:30 - 12:30' },
    { id: '13:30-14:30', label: '13:30 - 14:30' },
    { id: '14:30-15:30', label: '14:30 - 15:30' }
  ];

  const headerTitle = isNew
    ? 'Nuevo taller'
    : (selectedTaller?.nombre || 'Detalle de taller');
  const headerSubtitle = isNew
    ? 'Completa la configuración básica del taller.'
    : 'Gestiona configuración, eventos especiales y galería.';

  const header = (
    <div className="dashboard-header dashboard-header--compact" style={{ paddingInline: 0 }}>
      <div>
        <h1 className="dashboard-title">{headerTitle}</h1>
        <p className="dashboard-subtitle">{headerSubtitle}</p>
      </div>
      <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
        <button onClick={() => navigate('/portal/admin/talleres')} className="btn btn--outline btn--back">
          <Icon name="chevron-left" size={16} />
          Volver al listado
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="container page-container">
        {header}
        <div className="card">
          <div className="card__body">
            <p>Cargando taller...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isNew && !selectedTaller) {
    return (
      <div className="container page-container">
        {header}
        <div className="card">
          <div className="card__body">
            <div className="alert alert--warning">
              <p>No se encontró el taller solicitado.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-container">
      {header}
      <div className="tabs talleres-detail-tabs">
        <div className="tabs__header">
          <button
            type="button"
            className={`tabs__tab ${activeTab === 'config' ? 'tabs__tab--active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            Configuración
          </button>
          {selectedTaller && (
            <>
              <button
                type="button"
                className={`tabs__tab ${activeTab === 'gallery' ? 'tabs__tab--active' : ''}`}
                onClick={() => setActiveTab('gallery')}
              >
                Galería
              </button>
              <button
                type="button"
                className={`tabs__tab ${activeTab === 'events' ? 'tabs__tab--active' : ''}`}
                onClick={() => setActiveTab('events')}
              >
                Eventos
              </button>
              <button
                type="button"
                className={`tabs__tab ${activeTab === 'resources' ? 'tabs__tab--active' : ''}`}
                onClick={() => setActiveTab('resources')}
              >
                Recursos
              </button>
            </>
          )}
        </div>
      </div>

      {activeTab === 'config' && (
      <div className="card">
        <div className="card__header">
          <div>
            <h2 className="card__title">Administración</h2>
            <p className="card__subtitle">Datos básicos y horarios.</p>
          </div>
        </div>
        <div className="card__body talleres-admin-compact">
          <form onSubmit={handleSubmit} className="talleres-form">
            <div className="talleres-form-row talleres-form-row--2col">
              <div className="form-group">
                <label htmlFor="nombre" title="Se verá en el calendario y en los paneles de familias y talleristas.">
                  Nombre del taller *
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Robótica, Yoga, Teatro"
                  required
                />
                    </div>

                    <div className="form-group">
                <label htmlFor="talleristaId" title="La persona asignada podrá editar la ficha y la galería del taller.">
                  Tallerista asignado *
                </label>
                <select
                  id="talleristaId"
                  name="talleristaId"
                  value={formData.talleristaId}
                  onChange={handleInputChange}
                  className="form-select"
                  required
                >
                  <option value="">Seleccionar tallerista...</option>
                  {talleristas.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="talleres-form-row talleres-form-row--desc">
              <div className="form-group">
              <label htmlFor="descripcion" title="Visible para familias y talleristas.">
                Descripción
              </label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  rows={2}
                  className="form-textarea"
                  placeholder="Breve resumen de objetivos y dinámica."
                />
              </div>

              <div className="form-group">
              <label htmlFor="ambiente" title="Los horarios se bloquean por ambiente.">
                Ambiente *
              </label>
                <select
                  id="ambiente"
                  name="ambiente"
                  value={formData.ambiente}
                  onChange={handleInputChange}
                  className="form-select"
                  required
                >
                  <option value="">Seleccionar ambiente...</option>
                  <option value="taller1">Taller 1</option>
                  <option value="taller2">Taller 2</option>
                </select>
                <p className="form-help">Los horarios se bloquean por ambiente.</p>
              </div>
            </div>

            <div className="form-group">
              <label title="Marca los bloques disponibles. Los ocupados aparecen en rojo.">
                Horarios del taller *
              </label>
              <p className="form-help" style={{ marginBottom: 'var(--spacing-xs)' }}>
                Marca los bloques disponibles. Los ocupados aparecen en rojo.
              </p>
              {!formData.ambiente && (
                <div className="alert alert--warning">
                  <strong>Selecciona un ambiente para habilitar la grilla.</strong>
                  <span style={{ display: 'block', marginTop: '2px', fontSize: 'var(--font-size-xs)' }}>
                    Así evitamos cruces entre talleres del mismo grupo.
                  </span>
                </div>
              )}
              <div style={{ overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-primary-soft)', fontWeight: '600', textAlign: 'left', color: 'var(--color-text)' }}>
                        Horario
                      </th>
                      {diasSemanaOptions.map(dia => (
                        <th key={dia} style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderBottom: '2px solid var(--color-border)', borderLeft: '1px solid var(--color-border)', backgroundColor: 'var(--color-primary-soft)', fontWeight: '600', textAlign: 'center', minWidth: '90px', color: 'var(--color-text)' }}>
                          {dia.substring(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bloquesHorariosOptions.map((bloque, index) => (
                      <tr key={bloque.id} style={{ backgroundColor: index % 2 === 0 ? 'var(--color-background)' : 'var(--color-background-alt)' }}>
                        <td style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderRight: '2px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', fontWeight: '600', whiteSpace: 'nowrap', color: 'var(--color-text)' }}>
                          {bloque.label}
                        </td>
                        {diasSemanaOptions.map(dia => {
                          const tallerOcupado = getHorarioOcupado(dia, bloque.id);
                          const seleccionado = isHorarioSelected(dia, bloque.id);

                          return (
                            <td key={dia} style={{
                              padding: 'var(--spacing-xs)',
                              borderLeft: '1px solid var(--color-border)',
                              borderBottom: '1px solid var(--color-border)',
                              textAlign: 'center',
                              backgroundColor: tallerOcupado ? '#fee' : (seleccionado ? 'var(--color-primary-soft)' : 'transparent'),
                              position: 'relative',
                              minHeight: '40px'
                            }}>
                              {tallerOcupado ? (
                                <div style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--spacing-xs)' }} title={`Ocupado por: ${tallerOcupado.nombre}`}>
                                  <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: 'var(--font-size-xs)', color: 'var(--color-error)' }}>Ocupado</div>
                                  <div style={{ fontSize: '10px', fontWeight: '600', color: '#666' }}>{tallerOcupado.nombre}</div>
                                </div>
                              ) : (
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: formData.ambiente ? 'pointer' : 'not-allowed', minHeight: '32px' }}>
                                  <input
                                    type="checkbox"
                                    checked={seleccionado}
                                    onChange={() => handleHorarioToggle(dia, bloque.id)}
                                    disabled={!formData.ambiente}
                                    style={{ cursor: formData.ambiente ? 'pointer' : 'not-allowed', width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                                    title={!formData.ambiente ? 'Primero selecciona un ambiente' : 'Marcar este horario'}
                                  />
                                </label>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {formData.horarios.length > 0 && (
                <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-xs)', backgroundColor: 'var(--color-primary-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary)' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: '600' }}>
                    Total: {formData.horarios.length} horario{formData.horarios.length !== 1 ? 's' : ''} seleccionado{formData.horarios.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="talleres-form__actions">
              <button type="submit" className="btn btn--sm btn--success">
                {editingTaller ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" onClick={resetForm} className="btn btn--sm btn--warning">
                Restablecer
              </button>
              {editingTaller && (
                <>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn--sm btn--info"
                      onClick={() => handleToggleEstado(editingTaller)}
                      title={editingTaller.estado === 'activo' ? 'Deshabilitar taller' : 'Habilitar taller'}
                    >
                      {editingTaller.estado === 'activo' ? 'Deshabilitar' : 'Habilitar'}
                    </button>
                  )}
                  <button type="button" onClick={() => handleDelete(editingTaller.id)} className="btn btn--sm btn--danger">
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
      )}

      {activeTab === 'resources' && (
      <div className="card">
        <div className="card__body">
          {!selectedTaller ? (
            <div className="empty-state">
              <p>Guarda el taller para habilitar recursos.</p>
            </div>
          ) : (
            <div>
              <div className="card card--warm" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div className="card__body">
                  <h4 style={{ margin: '0 0 var(--spacing-md)' }}>Publicar recurso</h4>
                  <div className="form-group">
                    <label>Titulo *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={resourceForm.title}
                      onChange={(e) => setResourceForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Ej: Recursos para casa"
                      maxLength={120}
                    />
                  </div>
                  <div className="form-group">
                    <label>Descripcion</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={resourceForm.description}
                      onChange={(e) => setResourceForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Contexto breve para las familias"
                    />
                  </div>
                  <div className="form-group">
                    <label>Archivos (documentos)</label>
                    <FileUploadSelector
                      id="admin-resources-files"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp"
                      onFilesSelected={handleResourceFilesChange}
                      disabled={resourcePublishing}
                      hint={`Formatos permitidos: PDF, Office, OpenDocument, TXT y CSV · Máximo ${RESOURCE_MAX_FILE_SIZE_LABEL}`}
                    />
                  </div>
                  {resourceFiles.length > 0 && (
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                      <strong>Archivos agregados ({resourceFiles.length})</strong>
                      <FileSelectionList files={resourceFiles} onRemove={handleRemoveResourceFile} />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Links</label>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://..."
                        value={resourceLinkInput}
                        onChange={(e) => setResourceLinkInput(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddResourceLink(); } }}
                      />
                      <button type="button" className="btn btn--secondary" onClick={handleAddResourceLink}>
                        Agregar
                      </button>
                    </div>
                  </div>
                  {resourceLinks.length > 0 && (
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                      <strong>Links agregados ({resourceLinks.length})</strong>
                      <ul style={{ listStyle: 'none', padding: 0, marginTop: 'var(--spacing-xs)' }}>
                        {resourceLinks.map((link, index) => (
                          <li key={`${link.url}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-sm)', padding: 'var(--spacing-xs) 0' }}>
                            <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label || link.url}</a>
                            <button type="button" className="btn btn--link" onClick={() => handleRemoveResourceLink(index)}>Quitar</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handlePublishResourcePost}
                    disabled={resourcePublishing}
                  >
                    {resourcePublishing ? 'Publicando...' : 'Publicar recurso'}
                  </button>
                </div>
              </div>

              {resourcePostsLoading ? (
                <p>Cargando recursos...</p>
              ) : resourcePosts.length === 0 ? (
                <div className="alert alert--info">
                  <p>Aun no hay recursos publicados para este taller.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                  {resourcePosts.map((post) => {
                    const createdAt = post.createdAt?.toDate ? post.createdAt.toDate() : new Date(post.createdAt);
                    const createdLabel = Number.isNaN(createdAt?.getTime?.()) ? '' : createdAt.toLocaleDateString('es-AR');
                    const items = Array.isArray(post.items) ? post.items : [];
                    return (
                      <div key={post.id} className="card">
                        <div className="card__body">
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-sm)', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                            <div>
                              <h3 className="card__title" style={{ marginBottom: 'var(--spacing-xs)' }}>{post.title}</h3>
                              {createdLabel && (
                                <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: 'var(--font-size-xs)' }}>
                                  Publicado el {createdLabel}{post.createdByName ? ` por ${post.createdByName}` : ''}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn btn--danger btn--sm"
                              onClick={() => handleDeleteResourcePost(post)}
                              disabled={resourceDeletingId === post.id}
                            >
                              {resourceDeletingId === post.id ? 'Eliminando...' : 'Eliminar'}
                            </button>
                          </div>
                          {post.description && (
                            <p style={{ marginTop: 0, marginBottom: 'var(--spacing-sm)' }}>{post.description}</p>
                          )}
                          {items.length > 0 ? (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--spacing-xs)' }}>
                              {items.map((item, index) => (
                                <li key={`${item.url || item.path || index}`}>
                                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                                    {item.kind === 'link' ? '🔗 Link' : '📄 Archivo'}: {item.label || item.url}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ margin: 0, color: 'var(--color-text-light)' }}>Sin elementos.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {(activeTab === 'gallery' || activeTab === 'events') && (
      <div className="card">
        <div className="card__body">
          {!selectedTaller ? (
            <div className="empty-state">
              <p>Guarda el taller para habilitar eventos y galería.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
              <div>
                {activeTab === 'gallery' ? (
                  <div className="talleres-gallery">
                    {canManageContent(selectedTaller) && (
                      <div className="card card--warm talleres-gallery__upload">
                        <div className="card__body">
                          <div className="form-group">
                            <label>Nuevo album *</label>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                              <input
                                type="text"
                                className="form-input"
                                value={albumName}
                                onChange={(e) => setAlbumName(e.target.value)}
                                placeholder="Nombre del album"
                              />
                              <button
                                type="button"
                                className="btn btn--primary"
                                onClick={handleCreateAlbum}
                                disabled={albumSaving || !albumName.trim()}
                              >
                                {albumSaving ? 'Creando...' : 'Crear album'}
                              </button>
                            </div>
                          </div>
                          <p className="form-help">El nombre del album es obligatorio.</p>
                        </div>
                      </div>
                    )}

                    {selectedAlbum ? (
                      <div className="card">
                        <div className="card__header">
                          <div>
                            <h3 className="card__title">{selectedAlbum.name}</h3>
                            <p className="card__subtitle">Archivos del album seleccionado.</p>
                          </div>
                          <button type="button" className="btn btn--outline btn--sm" onClick={handleBackToAlbums}>
                            Volver a albumes
                          </button>
                        </div>
                        <div className="card__body">
                          {canManageContent(selectedTaller) ? (
                            <div className="card card--warm talleres-gallery__upload">
                              <div className="card__body">
                                <div className="form-group">
                                  <label>Subir archivos</label>
                                  <FileUploadSelector
                                    id="admin-taller-gallery-files"
                                    multiple
                                    accept="image/*,video/*,.heic,.heif,.webp,.webm,.mov"
                                    onFilesSelected={handleGalleryFilesChange}
                                    disabled={galleryUploading}
                                    hint={`Formatos: imagenes o videos. Bloqueados: .zip, .exe, .bat. Maximo ${GALLERY_MAX_FILE_SIZE_LABEL} por archivo`}
                                  />
                                </div>
                                {galleryFiles.length > 0 && (
                                  <FileSelectionList files={galleryFiles} onRemove={removeGalleryFile} />
                                )}
                                <button
                                  type="button"
                                  className="btn btn--primary"
                                  onClick={handleUploadGallery}
                                  disabled={galleryUploading || galleryFiles.length === 0}
                                >
                                  {galleryUploading ? 'Subiendo...' : 'Subir al album'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="muted-text">No tienes permisos para subir contenido en este taller.</p>
                          )}

                          <div className="talleres-gallery__grid">
                            {galleryLoading ? (
                              <p>Cargando album...</p>
                            ) : gallery.length > 0 ? (
                              <div className="talleres-gallery-grid">
                                {gallery.map(item => {
                                  const createdAt = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
                                  const createdLabel = Number.isNaN(createdAt.getTime()) ? '' : createdAt.toLocaleDateString('es-AR');
                                  const isDeleting = galleryDeletingId && (galleryDeletingId === item.id || galleryDeletingId === item.fileName);

                                  return (
                                    <div key={item.id} className="talleres-gallery-item">
                                      {item.tipo === 'video' ? (
                                        <video src={item.url} controls />
                                      ) : (
                                        <img src={item.url} alt={item.fileName} />
                                      )}
                                      <div className="talleres-gallery-item__meta">
                                        <div className="talleres-gallery-item__name">{item.fileName || 'Archivo'}</div>
                                        {createdLabel && (
                                          <div className="talleres-gallery-item__date">{createdLabel}</div>
                                        )}
                                      </div>
                                      {canManageContent(selectedTaller) && (
                                        <button
                                          type="button"
                                          className="btn btn--sm btn--danger talleres-gallery-item__delete"
                                          onClick={() => handleDeleteGalleryItem(item)}
                                          disabled={isDeleting}
                                        >
                                          {isDeleting ? 'Eliminando...' : 'Eliminar'}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="muted-text">Este album no tiene archivos.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="talleres-gallery__grid">
                        {albumsLoading ? (
                          <p>Cargando albumes...</p>
                        ) : albums.length > 0 ? (
                          <div className="talleres-albums-grid">
                            {albums.map(album => {
                              const createdAt = album.createdAt?.toDate ? album.createdAt.toDate() : new Date(album.createdAt);
                              const createdLabel = Number.isNaN(createdAt.getTime()) ? '' : createdAt.toLocaleDateString('es-AR');
                              return (
                                <button
                                  key={album.id}
                                  type="button"
                                  className="talleres-album-card"
                                  onClick={() => handleSelectAlbum(album)}
                                >
                                  <div
                                    className="talleres-album-card__thumb"
                                    style={album.thumbUrl ? { backgroundImage: `url(${album.thumbUrl})` } : undefined}
                                  />
                                  <div className="talleres-album-card__title">{album.name}</div>
                                  {createdLabel && (
                                    <div className="talleres-album-card__meta">{createdLabel}</div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="muted-text">Aún no hay albumes creados.</p>
                        )}
                      </div>
                    )}

                    {!legacyLoading && legacyGallery.length > 0 && (
                      <div className="card card--warm">
                        <div className="card__body" style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                          <div>
                            <strong>Galeria anterior</strong>
                            <p className="muted-text" style={{ margin: 0 }}>
                              Hay {legacyGallery.length} archivo(s) en la galeria anterior.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn btn--danger"
                            onClick={handleDeleteLegacyGalleryAll}
                            disabled={legacyDeleting}
                          >
                            {legacyDeleting ? 'Eliminando...' : 'Eliminar todo'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="talleres-events">
                    <div className="talleres-events__list">
                      {eventsLoading ? (
                        <p>Cargando eventos...</p>
                      ) : tallerEvents.length > 0 ? (
                        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                          {tallerEvents.map(event => {
                            const date = event.fecha?.toDate ? event.fecha.toDate() : new Date(event.fecha);
                            const dateLabel = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-AR');
                            const isEditing = eventEditingId === event.id;
                            return (
                              <div key={event.id} className="card">
                                <div className="card__body">
                                  {isEditing ? (
                                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                      <div className="form-group">
                                        <label>Título *</label>
                                        <input
                                          name="titulo"
                                          type="text"
                                          className="form-input"
                                          value={eventEditForm.titulo}
                                          onChange={handleEventEditChange}
                                        />
                                      </div>
                                      <div className="form-group">
                                        <label>Descripción</label>
                                        <textarea
                                          name="descripcion"
                                          className="form-textarea"
                                          rows={2}
                                          value={eventEditForm.descripcion}
                                          onChange={handleEventEditChange}
                                        />
                                      </div>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                        <div className="form-group">
                                          <label>Fecha *</label>
                                          <input
                                            name="fecha"
                                            type="date"
                                            className="form-input"
                                            value={eventEditForm.fecha}
                                            onChange={handleEventEditChange}
                                          />
                                        </div>
                                        <div className="form-group">
                                          <label>Hora</label>
                                          <input
                                            name="hora"
                                            type="time"
                                            className="form-input"
                                            value={eventEditForm.hora}
                                            onChange={handleEventEditChange}
                                          />
                                        </div>
                                      </div>
                                      <div className="form-group">
                                        <label>Visibilidad</label>
                                        <select
                                          name="scope"
                                          className="form-select"
                                          value={eventEditForm.scope}
                                          onChange={handleEventEditChange}
                                        >
                                          <option value="taller">Solo familias del taller</option>
                                          <option value="publico">Público (aparece en eventos generales)</option>
                                        </select>
                                      </div>
                                      <div className="form-group">
                                        <label>Adjuntos</label>
                                        {eventEditMedia.length > 0 && (
                                          <div style={{ display: 'grid', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)' }}>
                                            {eventEditMedia.map((media, idx) => {
                                              const key = media.path || media.url || media.name || `media-${idx}`;
                                              const isRemoving = eventEditRemovingId === (media.path || media.url || media.name);
                                              return (
                                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                                                    {media.name || media.fileName || 'Adjunto'}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    className="btn btn--link"
                                                    onClick={() => handleRemoveEventMedia(media)}
                                                    disabled={isRemoving}
                                                  >
                                                    {isRemoving ? 'Eliminando...' : 'Eliminar'}
                                                  </button>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                        <FileUploadSelector
                                          id="admin-taller-event-edit-files"
                                          multiple
                                          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.heic,.heif,.webp,.webm,.mov,.mp3,.wav,.m4a,.ogg"
                                          onFilesSelected={handleEventEditFilesChange}
                                          disabled={eventUpdating}
                                          hint={`Formatos: imagenes, videos, audio, documentos o texto. Bloqueados: .zip, .exe, .bat. Maximo ${EVENT_MAX_FILE_SIZE_LABEL} por archivo`}
                                        />
                                        {eventEditFiles.length > 0 && (
                                          <FileSelectionList files={eventEditFiles} onRemove={removeEventEditFile} />
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                        <button
                                          type="button"
                                          className="btn btn--primary"
                                          onClick={handleUpdateEvent}
                                          disabled={eventUpdating}
                                        >
                                          {eventUpdating ? 'Guardando...' : 'Guardar cambios'}
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn--outline"
                                          onClick={cancelEditEvent}
                                          disabled={eventUpdating}
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                                      <div>
                                        <strong>{event.titulo}</strong>
                                        <div className="muted-text" style={{ fontSize: 'var(--font-size-xs)' }}>
                                          {dateLabel} {event.hora ? `- ${event.hora}` : ''}
                                        </div>
                                        {event.descripcion && (
                                          <p className="muted-text" style={{ margin: 'var(--spacing-xs) 0 0' }}>
                                            {event.descripcion}
                                          </p>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                        <span className="badge badge--outline">
                                          {event.scope === 'publico' ? 'Público' : 'Solo taller'}
                                        </span>
                                        {canManageContent(selectedTaller) && (
                                          <button
                                            type="button"
                                            className="btn btn--outline btn--sm"
                                            onClick={() => startEditEvent(event)}
                                          >
                                            Editar
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="muted-text">Aún no hay eventos especiales para este taller.</p>
                      )}
                    </div>

                    {canManageContent(selectedTaller) ? (
                      <div className="card card--warm talleres-events__form">
                        <div className="card__body">
                          <h4 style={{ margin: 0 }}>Crear evento</h4>
                          <div className="form-group">
                            <label htmlFor="event-titulo">Título *</label>
                            <input
                              id="event-titulo"
                              name="titulo"
                              type="text"
                              className="form-input"
                              value={eventForm.titulo}
                              onChange={handleEventFormChange}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="event-descripcion">Descripción</label>
                            <textarea
                              id="event-descripcion"
                              name="descripcion"
                              className="form-textarea"
                              rows={3}
                              value={eventForm.descripcion}
                              onChange={handleEventFormChange}
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                            <div className="form-group">
                              <label htmlFor="event-fecha">Fecha *</label>
                              <input
                                id="event-fecha"
                                name="fecha"
                                type="date"
                                className="form-input"
                                value={eventForm.fecha}
                                onChange={handleEventFormChange}
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="event-hora">Hora</label>
                              <input
                                id="event-hora"
                                name="hora"
                                type="time"
                                className="form-input"
                                value={eventForm.hora}
                                onChange={handleEventFormChange}
                              />
                            </div>
                          </div>
                          <div className="form-group">
                            <label htmlFor="event-scope">Visibilidad</label>
                            <select
                              id="event-scope"
                              name="scope"
                              className="form-select"
                              value={eventForm.scope}
                              onChange={handleEventFormChange}
                            >
                              <option value="taller">Solo familias del taller</option>
                              <option value="publico">Público (aparece en eventos generales)</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Adjuntos</label>
                            <FileUploadSelector
                              id="admin-taller-event-files"
                              multiple
                              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.heic,.heif,.webp,.webm,.mov,.mp3,.wav,.m4a,.ogg"
                              onFilesSelected={handleEventFilesChange}
                              disabled={eventSaving}
                              hint={`Formatos: imagenes, videos, audio, documentos o texto. Bloqueados: .zip, .exe, .bat. Maximo ${EVENT_MAX_FILE_SIZE_LABEL} por archivo`}
                            />
                            {eventFiles.length > 0 && (
                              <FileSelectionList files={eventFiles} onRemove={removeEventFile} />
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn btn--primary"
                            onClick={handleCreateTallerEvent}
                            disabled={eventSaving}
                          >
                            {eventSaving ? 'Guardando...' : 'Crear evento'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="muted-text">No tienes permisos para crear eventos en este taller.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
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
};

export default TalleresManager;
