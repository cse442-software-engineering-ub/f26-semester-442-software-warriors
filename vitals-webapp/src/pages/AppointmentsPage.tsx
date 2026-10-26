import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import AddAppointmentModal from "../components/AddAppointmentModal";
import WeekCalendar from "../components/WeekCalendar";
import { getAppointments, removeAppointment } from "../api";
import type { AppointmentRecord } from "../api";
import {
  formatClock,
  formatDayLabel,
  parseAppointmentDate,
} from "../appointmentDates";
import "./AppointmentsPage.css";

// My Appointments (#73): list + New Appointment popup + Remove with confirm + weekly calendar.
// Backend: api/appointments.php (#70)  GET list, POST add, DELETE ?aid=N remove.

const isUnauthorized = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "status" in error &&
  error.status === 401;

// Soonest first, the same order as the backend (the date strings sort correctly as text)
const sortSoonestFirst = (list: AppointmentRecord[]) =>
  [...list].sort(
    (a, b) =>
      a.appointment_date.localeCompare(b.appointment_date) || a.aid - b.aid,
  );

const AppointmentCard = ({
  appointment,
  onRemove,
}: {
  appointment: AppointmentRecord;
  onRemove: (appointment: AppointmentRecord) => void;
}) => {
  const date = parseAppointmentDate(appointment.appointment_date);
  return (
    <article className="home-card appointments-card">
      <div className="appointments-card-details">
        <h3>{appointment.doctors_name}</h3>
        {appointment.location && (
          <p className="appointments-card-location">{appointment.location}</p>
        )}
        {appointment.address && (
          <p className="appointments-card-address">{appointment.address}</p>
        )}
      </div>
      <div className="appointments-card-when">
        <strong>{formatDayLabel(date)}</strong>
        <span>{formatClock(date)}</span>
      </div>
      <button
        className="appointments-remove-button"
        type="button"
        aria-label={`Remove appointment with ${appointment.doctors_name}`}
        onClick={() => onRemove(appointment)}
      >
        Remove
      </button>
    </article>
  );
};

const AppointmentsPage = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [toRemove, setToRemove] = useState<AppointmentRecord | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const goToLogin = () => navigate("/login", { replace: true });

  // Load the list once when the page opens
  useEffect(() => {
    getAppointments()
      .then((list) => setAppointments(list))
      .catch((error: unknown) => {
        if (isUnauthorized(error)) {
          navigate("/login", { replace: true });
          return;
        }
        setLoadError(
          "Couldn't load your appointments. Please try again later.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [navigate]);

  // The status message disappears by itself after 4 seconds
  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const handleSaved = (saved: AppointmentRecord) => {
    setIsAdding(false);
    setAppointments((current) => sortSoonestFirst([...current, saved]));
    setStatusMessage(`Appointment with ${saved.doctors_name} added.`);
  };

  const askToRemove = (appointment: AppointmentRecord) => {
    setRemoveError("");
    setToRemove(appointment);
  };

  const confirmRemove = async () => {
    if (!toRemove) return;
    const appointment = toRemove;
    setToRemove(null);
    setIsRemoving(true);
    try {
      await removeAppointment(appointment.aid);
      // Only take it off the screen after the server said it is deleted
      setAppointments((current) =>
        current.filter((item) => item.aid !== appointment.aid),
      );
      setStatusMessage(`Appointment with ${appointment.doctors_name} removed.`);
    } catch (error: unknown) {
      if (isUnauthorized(error)) {
        goToLogin();
        return;
      }
      setRemoveError("Couldn't remove the appointment. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  const showList = !isLoading && !loadError;

  return (
    <AppLayout activeItem="Appointments">
      <div className="appointments-content">
        <header className="appointments-page-heading">
          <h1>My Appointments</h1>
          <p>View, add, and manage your upcoming doctor appointments.</p>
        </header>

        <div className="appointments-toolbar">
          <span className="appointments-tab" aria-current="page">
            Upcoming
          </span>
          <button
            className="appointments-add-button"
            type="button"
            onClick={() => setIsAdding(true)}
          >
            <span aria-hidden="true">+</span> Add Appointment
          </button>
        </div>

        <section
          className="appointments-list"
          aria-label="Upcoming appointments"
          aria-busy={isRemoving}
        >
          {statusMessage && (
            <p className="appointments-status" role="status">
              {statusMessage}
            </p>
          )}
          {removeError && (
            <p
              className="home-request-error appointments-remove-error"
              role="alert"
            >
              {removeError}
            </p>
          )}
          {isLoading && <p className="home-empty">Loading...</p>}
          {loadError && (
            <p className="home-request-error" role="alert">
              {loadError}
            </p>
          )}
          {showList && appointments.length === 0 && (
            <p className="home-empty">
              You have no upcoming appointments. Click + Add Appointment to add
              one.
            </p>
          )}
          {showList &&
            appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.aid}
                appointment={appointment}
                onRemove={askToRemove}
              />
            ))}
        </section>

        <WeekCalendar appointments={appointments} />
      </div>

      {isAdding && (
        <AddAppointmentModal
          onClose={() => setIsAdding(false)}
          onSaved={handleSaved}
          onUnauthorized={goToLogin}
        />
      )}

      {/* Same confirm box as Logout, so it reuses the app-logout-dialog styles */}
      {toRemove && (
        <div
          className="app-logout-dialog-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setToRemove(null)
          }
        >
          <section
            className="app-logout-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="appointments-remove-title"
          >
            <h2 id="appointments-remove-title">
              Are you sure you want to remove this appointment?
            </h2>
            <div className="app-logout-dialog-actions">
              <button type="button" onClick={() => setToRemove(null)}>
                Cancel
              </button>
              <button type="button" onClick={confirmRemove}>
                Confirm
              </button>
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
};

export default AppointmentsPage;
