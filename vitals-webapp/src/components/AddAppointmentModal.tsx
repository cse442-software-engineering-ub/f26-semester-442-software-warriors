import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, SubmitEvent } from "react";
import { addAppointment, updateAppointment } from "../api";
import type { AppointmentInput, AppointmentRecord } from "../api";
import { formatTimeForInput, parseAppointmentDate } from "../appointmentDates";

// The blue appointment popup from Figma, used two ways:
//   no `appointment` prop -> "New Appointment", empty boxes, POST    (#73)
//   `appointment` given   -> "Edit Appointment", filled boxes, PUT   (#90)
// The browser only checks that the required boxes are filled in. The real rules
// (a real date, in the future, a valid time, lengths) live in appointments.php,
// and its messages are shown under the matching box.

type FieldErrors = Partial<
  Record<"doctor_name" | "date" | "time" | "location" | "address", string>
>;

interface AddAppointmentModalProps {
  appointment?: AppointmentRecord; // the one being edited; leave out to add a new one
  onClose: () => void;
  onSaved: (appointment: AppointmentRecord) => void;
  onUnauthorized: () => void;
}

const emptyForm: AppointmentInput = {
  doctor_name: "",
  month: "",
  day: "",
  year: "",
  time: "",
  location: "",
  address: "",
};

// The saved appointment as popup boxes: "2026-12-15 10:30:00" -> 12 / 15 / 2026 / "10:30 AM"
const formFromAppointment = (
  appointment: AppointmentRecord,
): AppointmentInput => {
  const date = parseAppointmentDate(appointment.appointment_date);
  return {
    doctor_name: appointment.doctors_name,
    month: String(date.getMonth() + 1),
    day: String(date.getDate()),
    year: String(date.getFullYear()),
    time: formatTimeForInput(date),
    location: appointment.location ?? "",
    address: appointment.address ?? "",
  };
};

const AddAppointmentModal = ({
  appointment,
  onClose,
  onSaved,
  onUnauthorized,
}: AddAppointmentModalProps) => {
  // const [form, setForm] = useState<AppointmentInput>(emptyForm);
  const isEditing = appointment !== undefined;
  // Starts filled in when editing, empty when adding (only read when the popup opens)
  const [form, setForm] = useState<AppointmentInput>(() =>
    appointment ? formFromAppointment(appointment) : emptyForm,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const doctorInput = useRef<HTMLInputElement>(null);

  // Cursor starts in DOCTOR NAME (runs once, when the popup opens)
  useEffect(() => {
    doctorInput.current?.focus();
  }, []);

  // Escape closes the popup without saving
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  // One handler for every box: the input's name is the field to update
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Same messages as the server, so the user sees the same text either way
    const missing: FieldErrors = {};
    if (!form.doctor_name.trim())
      missing.doctor_name = "Doctor name is required.";
    if (!form.month.trim() || !form.day.trim() || !form.year.trim())
      missing.date = "Month, day and year are required.";
    if (!form.time.trim()) missing.time = "Time is required.";
    setErrors(missing);
    setGeneralError("");
    if (Object.keys(missing).length > 0) return;

    setIsSaving(true);
    try {
      //const saved = await addAppointment(form);
      const saved = appointment
        ? await updateAppointment(appointment.aid, form)
        : await addAppointment(form);
      onSaved(saved);
    } catch (error: unknown) {
      const err = error as {
        status?: number;
        error?: string;
        errors?: FieldErrors;
      };
      if (err?.status === 401) {
        onUnauthorized();
        return;
      }
      if (err?.errors) {
        setErrors(err.errors); // 400: one message per box
      } else {
        setGeneralError(
          err?.error || "Couldn't save the appointment. Please try again.",
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const fieldError = (field: keyof FieldErrors) =>
    errors[field] && (
      <p
        className="appointments-modal-error"
        id={`appointment-${field}-error`}
        role="alert"
      >
        {errors[field]}
      </p>
    );

  return (
    <div
      className="appointments-modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="appointments-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointments-modal-title"
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
        <h2 id="appointment-modal-title">
          {isEditing ? "Edit Appointment" : "New Appointment"}
        </h2>

        <form
          className="appointments-modal-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <label className="appointments-modal-field">
            <span>DOCTOR NAME</span>
            <input
              ref={doctorInput}
              name="doctor_name"
              type="text"
              placeholder="Dr. Mike Hart"
              maxLength={100}
              value={form.doctor_name}
              onChange={handleChange}
              aria-invalid={Boolean(errors.doctor_name)}
            />
            {fieldError("doctor_name")}
          </label>

          <fieldset className="appointments-modal-date">
            <legend className="appointments-visually-hidden">Date</legend>
            <label className="appointments-modal-field">
              <span>MONTH</span>
              <input
                name="month"
                type="text"
                inputMode="numeric"
                placeholder="MM"
                maxLength={2}
                value={form.month}
                onChange={handleChange}
                aria-invalid={Boolean(errors.date)}
              />
            </label>
            <label className="appointments-modal-field">
              <span>DAY</span>
              <input
                name="day"
                type="text"
                inputMode="numeric"
                placeholder="DD"
                maxLength={2}
                value={form.day}
                onChange={handleChange}
                aria-invalid={Boolean(errors.date)}
              />
            </label>
            <label className="appointments-modal-field">
              <span>YEAR</span>
              <input
                name="year"
                type="text"
                inputMode="numeric"
                placeholder="YYYY"
                maxLength={4}
                value={form.year}
                onChange={handleChange}
                aria-invalid={Boolean(errors.date)}
              />
            </label>
          </fieldset>
          {fieldError("date")}

          <label className="appointments-modal-field">
            <span>TIME</span>
            <input
              name="time"
              type="text"
              placeholder="10:30 AM"
              maxLength={8}
              value={form.time}
              onChange={handleChange}
              aria-invalid={Boolean(errors.time)}
            />
            {fieldError("time")}
          </label>

          <label className="appointments-modal-field">
            <span>LOCATION</span>
            <input
              name="location"
              type="text"
              placeholder="The Heart Clinic"
              maxLength={100}
              value={form.location}
              onChange={handleChange}
              aria-invalid={Boolean(errors.location)}
            />
            {fieldError("location")}
          </label>

          <label className="appointments-modal-field">
            <span>ADDRESS</span>
            <input
              name="address"
              type="text"
              placeholder="100 Medical Center Pkwy, Cityville"
              maxLength={255}
              value={form.address}
              onChange={handleChange}
              aria-invalid={Boolean(errors.address)}
            />
            {fieldError("address")}
          </label>

          <div className="appointments-modal-actions">
            {generalError && (
              <p className="appointments-modal-error" role="alert">
                {generalError}
              </p>
            )}
            <button
              className="appointments-modal-submit"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? (
                "Saving..."
              ) : isEditing ? (
                "Save Changes"
              ) : (
                <>
                  <span aria-hidden="true">+</span> Add Appointment
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default AddAppointmentModal;
