import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { appointmentsService } from '../../services/appointments.service';
import { childrenService } from '../../services/children.service';
import AppointmentCalendar from '../../components/appointments/AppointmentCalendar';
import AppointmentForm from '../../components/appointments/AppointmentForm';

const BookAppointment = () => {
  const { user } = useAuth();
  const [availableAppointments, setAvailableAppointments] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [userChildren, setUserChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [activeTab, setActiveTab] = useState('available');

  const loadAvailableAppointments = async () => {
    const result = await appointmentsService.getAllAppointments();
    if (result.success) {
      const available = result.appointments.filter(app => 
        app.estado === 'disponible' && !app.familiaUid
      );
      setAvailableAppointments(available);
    }
  };

  const loadMyAppointments = async () => {
    const result = await appointmentsService.getAppointmentsByFamily(user.uid);
    if (result.success) {
      setMyAppointments(result.appointments);
    }
  };

  const loadUserData = async () => {
    const result = await childrenService.getChildrenByResponsable(user.uid);
    if (result.success) {
      setUserChildren(result.children);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadAvailableAppointments(),
      loadMyAppointments(),
      loadUserData()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
      loadData();
    }
  }, [user]);

  const handleSelectSlot = (appointment) => {
    setSelectedSlot(appointment);
    setShowBookingForm(true);
  };

  const handleBookingSubmit = async (data) => {
    const result = await appointmentsService.updateAppointment(data.appointmentId, {
      familiaUid: user.uid,
      hijoId: data.hijoId,
      nota: data.nota,
      estado: 'reservado'
    });

    if (result.success) {
      alert('Turno reservado exitosamente');
      setShowBookingForm(false);
      setSelectedSlot(null);
      loadData();
    } else {
      alert('Error al reservar turno: ' + result.error);
    }
  };

  const handleCancelBooking = () => {
    setShowBookingForm(false);
    setSelectedSlot(null);
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm('¿Estás seguro de cancelar este turno?')) {
      return;
    }

    const result = await appointmentsService.cancelAppointment(appointmentId);
    if (result.success) {
      alert('Turno cancelado exitosamente');
      loadData();
    } else {
      alert('Error al cancelar: ' + result.error);
    }
  };

  const handleMyAppointmentClick = (appointment) => {
    if (appointment.estado === 'reservado') {
      if (confirm('¿Deseas cancelar este turno?')) {
        handleCancelAppointment(appointment.id);
      }
    }
  };

  if (loading) {
    return <div className="loading">Cargando turnos...</div>;
  }

  if (showBookingForm && selectedSlot) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Reservar Turno</h1>
        </div>
        <AppointmentForm
          appointment={selectedSlot}
          userChildren={userChildren}
          onSubmit={handleBookingSubmit}
          onCancel={handleCancelBooking}
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Turnos y Reuniones</h1>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'available' ? 'active' : ''}`}
          onClick={() => setActiveTab('available')}
        >
          Turnos Disponibles ({availableAppointments.length})
        </button>
        <button
          className={`tab ${activeTab === 'my-appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-appointments')}
        >
          Mis Turnos ({myAppointments.length})
        </button>
      </div>

      {activeTab === 'available' && (
        <div className="tab-content">
          {availableAppointments.length === 0 ? (
            <div className="empty-state card">
              <p>No hay turnos disponibles en este momento.</p>
              <p>Por favor revisa nuevamente más tarde.</p>
            </div>
          ) : (
            <>
              <div className="info-card">
                <p>Selecciona un turno disponible para reservarlo</p>
              </div>
              <AppointmentCalendar
                appointments={availableAppointments}
                onSelectSlot={handleSelectSlot}
                showOnlyAvailable={true}
              />
            </>
          )}
        </div>
      )}

      {activeTab === 'my-appointments' && (
        <div className="tab-content">
          {myAppointments.length === 0 ? (
            <div className="empty-state card">
              <p>No tienes turnos reservados.</p>
            </div>
          ) : (
            <>
              <div className="info-card">
                <p>Haz clic en un turno reservado para cancelarlo</p>
              </div>
              <AppointmentCalendar
                appointments={myAppointments}
                onSelectSlot={handleMyAppointmentClick}
                showOnlyAvailable={false}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BookAppointment;
