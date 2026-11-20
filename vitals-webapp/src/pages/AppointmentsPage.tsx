import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import AddAppointmentModal from "../components/AddAppointmentModal";
import WeekCalendar from "../components/WeekCalendar";
import { getAccount, getAllAppointments, removeAppointment } from "../api";
import type { AppointmentRecord } from "../api";
import {
  formatClock,
  formatDayLabel,
  parseAppointmentDate,
} from "../appointmentDates";
import "./AppointmentsPage.css";

// My Appointments (#73): list + New Appointment popup + Remove with confirm + weekly calendar.
// #90: Edit (pencil) on each card opens the same popup filled in.
// Backend: api/appointments.php (#70, #89)  GET list, POST add, PUT ?aid=N edit, DELETE ?aid=N remove.

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

const EditNotesModal = ({ onClose }: { onClose: () => void }) => {
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState("");

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="appointments-modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="appointments-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointments-notes-modal-title"
      >
        <button
          className="appointments-modal-close"
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="m5 5 14 14M19 5 5 19" />
          </svg>
        </button>
        <h2 id="appointments-notes-modal-title">Notes</h2>
        <div className="appointments-modal-form">
          <label className="appointments-modal-field">
            <span>EDIT NOTE</span>
            <textarea
              rows={5}
              placeholder="Add notes for this appointment"
              value={notes}
              onChange={(event) => {
                const value = event.target.value;
                if (value.length > 1000) {
                  setNotes(value.slice(0, 1000));
                  setNotesError("Notes cannot exceed 1,000 characters.");
                  return;
                }
                setNotes(value);
                setNotesError("");
              }}
              aria-invalid={Boolean(notesError)}
              aria-describedby={notesError ? "appointment-notes-error" : undefined}
            />
            {notesError && (
              <p
                className="appointments-modal-error"
                id="appointment-notes-error"
                role="alert"
              >
                {notesError}
              </p>
            )}
          </label>
          <div className="appointments-modal-actions">
            <button className="appointments-modal-submit" type="button">
              Save Changes
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

const AppointmentCard = ({
  appointment,
  onEdit,
  onAddNote,
  onRemove,
  isPast,
  canEdit,
}: {
  appointment: AppointmentRecord;
  onEdit: (Appointment: AppointmentRecord) => void;
  onAddNote: () => void;
  onRemove: (appointment: AppointmentRecord) => void;
  isPast: boolean;
  canEdit: boolean;
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
      <div className="appointments-card-date-group">
        <div className="appointments-card-when">
          <strong>{formatDayLabel(date)}</strong>
          <span>{formatClock(date)}</span>
        </div>
        {isPast && (
          <button
            className="appointments-note-button"
            type="button"
            onClick={onAddNote}
          >
            Add Note
          </button>
        )}
      </div>
      { !isPast && canEdit && (
            // Same pencil as the Medications page
            <div className="appointments-card-actions">
              <button
              className="appointments-edit-button"
              type="button"
              title="Edit"
              aria-label={`Edit appointment with ${appointment.doctors_name}`}
              onClick={() => onEdit(appointment)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6" />
                  <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z" />
                </svg>
            </button>
            <button
              className="appointments-note-button"
              type="button"
              onClick={onAddNote}
            >
              Add Note
            </button>
            <button
              className="appointments-remove-button"
              type="button"
              aria-label={`Remove appointment with ${appointment.doctors_name}`}
              onClick={() => onRemove(appointment)}
            >
              Remove
            </button>
          </div>
        )}
    </article>
  );
};

const AppointmentsPage = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [pastAppointments, setPastAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isUpcoming, setIsUpcoming] = useState(true);
  // The appointment being edited, or null when the Edit popup is closed
  const [editing, setEditing] = useState<AppointmentRecord | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [toRemove, setToRemove] = useState<AppointmentRecord | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const [isCaregiver, setIsCaregiver] = useState(false);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [canEditAppointments, setCanEditAppointments] = useState(true);
  const [isAccountLoaded, setIsAccountLoaded] = useState(false);

  const goToLogin = () => navigate("/login", { replace: true });

  // Load the list once when the page opens
  useEffect(() => {
    getAccount()
      .then((account) => {
        setIsCaregiver(
          account.isCaregiver && (account.viewMode ?? "caregiver") === "caregiver",
        );
        setPatientName(
          account.relatedPersonName?.trim().split(/\s+/)[0] || null,
        );
        setCanEditAppointments(
          !(
            !account.isCaregiver &&
            account.permissions?.can_edit_appointments === false
          ),
        );
      })
      .catch((error: unknown) => {
        if (isUnauthorized(error)) {
          navigate("/login", { replace: true });
        }
      })
      .finally(() => setIsAccountLoaded(true));

    getAllAppointments()
      .then(({ appointments, past_appointments }) => {
        setAppointments(appointments);
        setPastAppointments(past_appointments);
      })
      .catch((error: unknown) => {
        if (isUnauthorized(error)) {
          navigate("/login", { replace: true });
          return;
        }
        setLoadError(
          "Couldn't load your appointments. Please try again later.",
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
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

  // After an edit: swap the old card for the saved one (same aid), then re-sort,
  // because a new date can move it up or down the list
  const handleEdited = (saved: AppointmentRecord) => {
    setEditing(null);
    setAppointments((current) =>
      sortSoonestFirst(
        current.map((item) => (item.aid === saved.aid ? saved : item)),
      ),
    );
    setStatusMessage(`Appointment with ${saved.doctors_name} updated.`);
  };

  const closePopup = () => {
    setIsAdding(false);
    setEditing(null);
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
          <h1>
            {isCaregiver && patientName
              ? `${patientName}’s Appointments`
              : "My Appointments"}
          </h1>
          <p>
            {isCaregiver && patientName
              ? `Manage and book ${patientName}’s clinical consultations and telehealth sessions.`
              : "View, add, and manage your upcoming doctor appointments."}
          </p>
        </header>

        <div className="appointments-toolbar">
          { isUpcoming && (
            <span>
              <span className="appointments-tab border-spacing-5 p-5 gap-15" aria-current="page">
                Upcoming
              </span>
              <span className="gap-1 p-1"/>
              <button
                className="appointments-add-button border-spacing-5 p-5 gap-15"
                type="button"
                onClick={() => setIsUpcoming(false)}
              >
                Past
              </button>
            </span>
          )}
          { !isUpcoming && (
            <span>
              <button
                className="appointments-add-button border-spacing-5 p-5 gap-15"
                type="button"
                onClick={() => setIsUpcoming(true)}
              >
                Upcoming
              </button>
              <span className="gap-1 p-1"/>
              <span className="appointments-tab border-spacing-5 p-5 gap-15" aria-current="page">
                Past
              </span>
            </span>
          )}
          <span/>
          <span className="text-white border-spacing-5">
            |
          </span>
          <span/>
          {isAccountLoaded && canEditAppointments && (
            <button
              className="appointments-add-button border-spacing-5 gap-8"
              type="button"
              onClick={() => setIsAdding(true)}
            >
              <span aria-hidden="true">+</span> Add Appointment
            </button>
          )}
        </div>

        { isUpcoming && (
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
                  isPast={false}
                  canEdit={isAccountLoaded && canEditAppointments}
                  appointment={appointment}
                  onEdit={setEditing}
                  onAddNote={() => setIsEditingNotes(true)}
                  onRemove={askToRemove}
                />
              ))}
          </section>
        )}

        { !isUpcoming && (
          <section
          className="appointments-list"
          aria-label="Past appointments"
          >
            {statusMessage && (
              <p className="appointments-status" role="status">
                {statusMessage}
              </p>
            )}
            {isLoading && <p className="home-empty">Loading...</p>}
            {loadError && (
              <p className="home-request-error" role="alert">
                {loadError}
              </p>
            )}
            {showList && pastAppointments.length === 0 && (
              <p className="home-empty">
                There are currently no past appointments. 
                Please add new upcoming appointments and make your visit to have them appear on this page.
              </p>
            )}
            {showList &&
              pastAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.aid}
                  isPast={true}
                  canEdit={isAccountLoaded && canEditAppointments}
                  appointment={appointment}
                  onEdit={setEditing}
                  onAddNote={() => setIsEditingNotes(true)}
                  onRemove={askToRemove}
                />
              ))}
          </section>
        )}

        <WeekCalendar appointments={appointments} />
      </div>

      {isAdding && (
        <AddAppointmentModal
          //onClose={() => setIsAdding(false)}
          onClose={closePopup}
          onSaved={handleSaved}
          onUnauthorized={goToLogin}
        />
      )}

      {/* key: a fresh popup for each appointment, so its boxes start with that one's values */}
      {editing && (
        <AddAppointmentModal
          key={editing.aid}
          appointment={editing}
          onClose={closePopup}
          onSaved={handleEdited}
          onUnauthorized={goToLogin}
        />
      )}

      {isEditingNotes && (
        <EditNotesModal onClose={() => setIsEditingNotes(false)} />
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
