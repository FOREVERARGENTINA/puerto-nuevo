import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { childrenService } from '../../services/children.service';
import { usersService } from '../../services/users.service';
import { appointmentsService } from '../../services/appointments.service';
import ChildCard from '../../components/children/ChildCard';
import './ChildProfile.css';

const ChildProfile = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [familyUsers, setFamilyUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [meetingNotesByChildId, setMeetingNotesByChildId] = useState({});
  const [meetingNotesLoading, setMeetingNotesLoading] = useState(false);

  const loadChildren = async () => {
    if (!user) return;

    setLoading(true);
    const result = await childrenService.getChildrenByResponsable(user.uid);

    if (result.success) {
      setChildren(result.children);

      // Cargar informacion de todas las familias responsables
      const uniqueResponsableIds = [...new Set(
        result.children.flatMap(child => child.responsables || [])
      )];

      const familyUsersData = {};
      for (const responsableId of uniqueResponsableIds) {
        const userResult = await usersService.getUserById(responsableId);
        if (userResult.success) {
          familyUsersData[responsableId] = userResult.user;
        } else {
          // Agregar un placeholder para que no quede "Cargando..."
          familyUsersData[responsableId] = {
            displayName: 'Usuario no encontrado',
            email: 'Sin datos'
          };
        }
      }
      setFamilyUsers(familyUsersData);
    } else {
      console.error('Error al cargar alumnos:', result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
      loadChildren();
    }
  }, [user]);

  useEffect(() => {
    if (!children.length) {
      setMeetingNotesByChildId({});
      return;
    }

    let isActive = true;

    const loadMeetingNotes = async () => {
      setMeetingNotesLoading(true);
      const entries = await Promise.all(children.map(async (child) => {
        const appointmentsResult = await appointmentsService.getAppointmentsByChild(child.id);
        if (!appointmentsResult.success) {
          return [child.id, []];
        }

        const attended = appointmentsResult.appointments.filter(app => app.estado === 'asistio');
        if (attended.length === 0) {
          return [child.id, []];
        }

        const noteResults = await Promise.all(
          attended.map(app => appointmentsService.getAppointmentNote(app.id))
        );

        const notes = [];
        attended.forEach((app, index) => {
          const result = noteResults[index];
          if (result.success && result.note && result.note.visibilidad === 'familia') {
            notes.push({ appointment: app, note: result.note });
          }
        });

        return [child.id, notes];
      }));

      if (!isActive) return;
      const map = {};
      entries.forEach(([childId, notes]) => {
        map[childId] = notes;
      });
      setMeetingNotesByChildId(map);
      setMeetingNotesLoading(false);
    };

    loadMeetingNotes();

    return () => {
      isActive = false;
    };
  }, [children]);

  const renderHeader = () => (
    <div className="dashboard-header dashboard-header--compact communications-header">
      <div>
        <h1 className="dashboard-title">Fichas de Alumnos</h1>
        <p className="dashboard-subtitle">Información y datos médicos de tus hijos.</p>
      </div>
      <div className="communications-summary">
        <span className="badge badge--info">
          {children.length} {children.length === 1 ? 'alumno' : 'alumnos'}
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="container page-container family-children-page">
        {renderHeader()}
        <div className="card">
          <div className="card__body" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <div className="spinner spinner--lg"></div>
            <p style={{ marginTop: 'var(--spacing-sm)' }}>Cargando información...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-container family-children-page">
      {renderHeader()}

      {children.length === 0 ? (
        <div className="empty-state card">
          <p>No hay alumnos registrados a tu nombre.</p>
          <p>Si crees que esto es un error, contacta a la administración.</p>
        </div>
      ) : (
        <div className="children-grid">
          {children.map(child => (
            <ChildCard
              key={child.id}
              child={child}
              isAdmin={false}
              familyUsers={familyUsers}
              meetingNotes={meetingNotesByChildId[child.id] || []}
              meetingNotesLoading={meetingNotesLoading}
              meetingNotesLoaded={Object.prototype.hasOwnProperty.call(meetingNotesByChildId, child.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ChildProfile;
