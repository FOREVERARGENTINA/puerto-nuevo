import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { ROUTES } from '../../config/constants';
import { useAuth } from '../../hooks/useAuth';
import { socialService } from '../../services/social.service';
import { canAccessSocial } from '../../utils/socialAccess';

export function TeacherDashboard() {
  const { role, user } = useAuth();
  const [socialConfig, setSocialConfig] = useState(null);

  useEffect(() => {
    let mounted = true;
    socialService
      .getSocialModuleConfig()
      .then((c) => { if (mounted) setSocialConfig(c); })
      .catch(() => { if (mounted) setSocialConfig({ enabled: false, pilotFamilyUids: [] }); });
    return () => { mounted = false; };
  }, []);

  const showSocial = socialConfig !== null && canAccessSocial({ role, uid: user?.uid, config: socialConfig });

  return (
    <div className="container page-container admin-dashboard-page">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Panel Docente</h1>
          <p className="dashboard-subtitle">Accesos y herramientas para el día a día.</p>
        </div>
        <span className="badge badge--primary">Docente</span>
      </div>

      <div className="dashboard-content">
        <section className="dashboard-section admin-dashboard-panel admin-dashboard-panel--featured">
          <div className="section-heading section-heading--inline">
            <h2 className="section-title">
              Comunicación <span className="section-subtitle">Mensajes y novedades con la comunidad.</span>
            </h2>
          </div>
          <div className="grid-cards-sm admin-dashboard-grid admin-dashboard-grid--featured">
            <Link to={ROUTES.TEACHER_COMMUNICATIONS} className="card card--compact card--clickable link-unstyled admin-dashboard-card admin-dashboard-card--featured">
              <div className="admin-dashboard-card__icon">
                <Icon name="eye" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Mis Comunicados</h3>
                <p>Ver comunicados enviados y su seguimiento</p>
              </div>
            </Link>
            <Link to={`${ROUTES.SEND_COMMUNICATION}/nuevo`} className="card card--compact card--clickable link-unstyled admin-dashboard-card admin-dashboard-card--featured">
              <div className="admin-dashboard-card__icon">
                <Icon name="send" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Enviar Comunicado</h3>
                <p>Comunicar novedades a familias y alumnos</p>
              </div>
            </Link>
            {showSocial && (
              <Link to={ROUTES.TEACHER_SOCIAL} className="card card--compact card--clickable link-unstyled admin-dashboard-card admin-dashboard-card--featured">
                <div className="admin-dashboard-card__icon">
                  <Icon name="chat" size={18} />
                </div>
                <div className="admin-dashboard-card__content">
                  <h3 className="card__title">Social</h3>
                  <p>Interacciones y publicaciones sociales</p>
                </div>
              </Link>
            )}
          </div>
        </section>

        <section className="dashboard-section admin-dashboard-panel">
          <div className="section-heading section-heading--inline">
            <h2 className="section-title">
              Recursos y organización <span className="section-subtitle">Contenido, horarios y seguimiento pedagógico.</span>
            </h2>
          </div>
          <div className="grid-cards-sm admin-dashboard-grid">
            <Link to={ROUTES.TEACHER_ACTIVITIES} className="card card--compact card--clickable link-unstyled admin-dashboard-card">
              <div className="admin-dashboard-card__icon">
                <Icon name="edit" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Actividades</h3>
                <p>Gestionar actividades de ambiente</p>
              </div>
            </Link>
            <Link to={ROUTES.TEACHER_DOCUMENTS} className="card card--compact card--clickable link-unstyled admin-dashboard-card">
              <div className="admin-dashboard-card__icon">
                <Icon name="file" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Documentos</h3>
                <p>Documentos pedagógicos e institucionales</p>
              </div>
            </Link>
            <Link to="/portal/docente/horarios" className="card card--compact card--clickable link-unstyled admin-dashboard-card">
              <div className="admin-dashboard-card__icon">
                <Icon name="calendar" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Horario Semanal</h3>
                <p>Calendario semanal de ambientes y talleres</p>
              </div>
            </Link>
            <Link to={ROUTES.INSTITUTIONAL_GALLERY_TEACHER} className="card card--compact card--clickable link-unstyled admin-dashboard-card">
              <div className="admin-dashboard-card__icon">
                <Icon name="image" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Galería</h3>
                <p>Fotos y multimedia institucional</p>
              </div>
            </Link>
            <Link to="/portal/docente/eventos" className="card card--compact card--clickable link-unstyled admin-dashboard-card">
              <div className="admin-dashboard-card__icon">
                <Icon name="event" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Eventos</h3>
                <p>Calendario de eventos institucionales</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
