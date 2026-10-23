import { useState } from "react";
import type { FormEvent } from "react";
import AppLayout from "../components/AppLayout";
import type { MedicationRecord } from "../api";
import "./MedicationsPage.css";

// "08:00:00" -> "8:00 AM"
const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  const hour = Number(hours);
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minutes} ${period}`;
};

// "Monday,Tuesday" -> "Mon, Tue"
const formatDays = (days: string) =>
  days
    .split(",")
    .map((day) => day.trim().slice(0, 3))
    .join(", ");

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type DayOption = "non-specific" | "all" | "weekdays" | "custom";

const dayOptions: { value: DayOption; label: string }[] = [
  { value: "non-specific", label: "Non-specific" },
  { value: "all", label: "All Days" },
  { value: "weekdays", label: "Week Days" },
  { value: "custom", label: "Custom" },
];

// Days to save for the chosen option (empty list means non-specific)
const getSelectedDays = (option: DayOption, customDays: string[]) => {
  if (option === "all") return weekDays;
  if (option === "weekdays") return weekDays.slice(0, 5);
  if (option === "custom") return weekDays.filter((day) => customDays.includes(day));
  return [];
};

// "8:00 AM", "8:00pm", "1230", "930 p" or "14:30" -> "HH:MM:SS", or null when it is not a real time.
// The colon and space are optional, am/pm is not case sensitive, and a missing or
// unrecognized am/pm means AM. Hours 13-23 with no am/pm are read as 24-hour time.
const parseTime = (text: string) => {
  const match = text.trim().match(/^(\d{1,2}):?(\d{2})\s*([a-z]*)$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const letters = match[3];
  if (minute > 59) return null;

  if (letters || (hour >= 1 && hour <= 12)) {
    if (hour < 1 || hour > 12) return null;
    const isPm = letters.toLowerCase().startsWith("p");
    hour = (hour % 12) + (isPm ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
};

// Rebuilds the time box text while typing as "h:mm AM". Adds the colon and space
// automatically and returns null when the new text could never become a real time.
const formatTimeTyping = (raw: string, isDeleting: boolean) => {
  const letters = raw.replace(/[^a-z]/gi, "").toUpperCase();
  let hour = "";
  let minute = "";

  const colonIndex = raw.indexOf(":");
  if (colonIndex >= 0) {
    hour = raw.slice(0, colonIndex).replace(/\D/g, "");
    minute = raw.slice(colonIndex + 1).replace(/\D/g, "");
  } else {
    const digits = raw.replace(/\D/g, "");
    const twoDigitHour = digits[0] === "0" || (digits[0] === "1" && digits[1] >= "0" && digits[1] <= "2");
    hour = digits.slice(0, twoDigitHour ? 2 : 1);
    minute = digits.slice(hour.length);
  }

  if (hour.length > 2 || minute.length > 2) return null;
  if (hour.length === 2 && (Number(hour) < 1 || Number(hour) > 12)) return null;
  if (hour === "" && (minute !== "" || letters !== "")) return null;
  if (minute !== "" && Number(minute[0]) > 5) return null;
  if (hour.length === 1 && hour !== "0" && minute === "" && raw.includes(":") && Number(hour) < 1) return null;

  // Letters can only be typed after the minutes, and only A/P followed by M
  if (letters !== "" && minute.length < 2) return null;
  if (letters !== "" && !/^(A|P|AM|PM)$/.test(letters)) return null;

  const hourIsComplete = hour.length === 2 || (hour.length === 1 && hour !== "0" && hour !== "1");
  let text = hour;
  if (minute !== "" || raw.includes(":") || hourIsComplete) text += ":" + minute;
  if (letters !== "") text += " " + letters;

  if (isDeleting) text = text.replace(/[: ]+$/, "");
  return text;
};

const MedicationCard = ({ medication }: { medication: MedicationRecord }) => (
  <article className="home-card home-medication-card medications-card">
    <div className="medications-main">
      <span className="home-medication-icon grid place-items-center rounded-lg bg-blue-800 text-white" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7 17 10-10" />
          <path d="M5 15a4 4 0 0 0 6 6l8-8a4 4 0 0 0-6-6Z" />
        </svg>
      </span>
      <div className="home-medication-details">
        <h3>{medication.medication_name}</h3>
        <p>{medication.dosage}</p>
      </div>
    </div>

    {(medication.days || medication.time) && (
      <div className="medications-schedule">
        {!(medication.time) && (
          <div className="home-pill-box home-medication-time grid justify-items-center gap-1 rounded-lg bg-white text-center">
            <span>TIME: <strong>Unspecified</strong></span>
          </div>
        )}
        {(medication.time) && (
          <div className="home-pill-box home-medication-time grid justify-items-center gap-1 rounded-lg bg-white text-center">
            <span>TIME: <strong>{formatTime(medication.time)}</strong></span>
          </div>
        )}
        {!(medication.days) && (
          <div className="home-pill-box home-medication-time grid justify-items-center gap-1 rounded-lg bg-white text-center">
            <span>DAYS: <strong>Unspecified</strong></span>
          </div>
        )}
        {(medication.days) && (
          <div className="home-pill-box home-medication-time grid justify-items-center gap-1 rounded-lg bg-white text-center">
            <span>DAYS: <strong>{formatDays(medication.days)}</strong></span>
          </div>
        )}
      </div>
    )}

    <div className="medications-controls">
      <span className={`home-status-badge medications-status medications-status-${medication.status.replace(" ", "-")}`}>
        {medication.status}
      </span>
      <div className="medications-actions">
        {/* =====NEEDS BACKEND: EDIT MEDICATION=====
            Open an edit form for this medication and save it with an update request.
            The backend endpoint for editing does not exist yet.
            onClick={() => editMedication(medication.mid)} */}
        <button className="medications-edit-button" type="button" aria-label={`Edit ${medication.medication_name}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6" />
            <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z" />
          </svg>
        </button>
        {/* =====NEEDS BACKEND: REMOVE MEDICATION=====
            Send DELETE_medication with the medication's mid (raw JSON body { "mid": ... }),
            expect { "success": true }, then remove the card from the list.
            onClick={() => removeMedication(medication.mid)} */}
        <button className="medications-remove-button" type="button">Remove</button>
      </div>
    </div>
  </article>
);

const MedicationsPage = () => {
  /*
  =====MEDICATION BACKEND NEEDED HERE=====
  We need Backend for:
  - getting medications for the logged-in user
  - { "success": false } when the user has no medications (the page shows an empty list)
  
  Currently there is a placeholder
  */

  // Placeholder example data until the backend is connected.
  const [medications] = useState<MedicationRecord[]>([
    { mid: 11, medication_name: "Lisinopril", dosage: "10mg", time: "08:00:00", days: "Monday,Tuesday,Wednesday", status: "active" },
    { mid: 12, medication_name: "drugIDX", dosage: "55mg", time: "", days: "Monday, Tuesday, Wednsday, Thursday, Friday", status: "active" },
    { mid: 12, medication_name: "Inactive Test", dosage: "25mg", time: "14:00:00", days: "", status: "inactive" },
    { mid: 13, medication_name: "Ibuprofen", dosage: "200mg", time: "", days: "", status: "as needed" },
  ]);
  const isLoading = false;
  const requestError = "";

  const [isAdding, setIsAdding] = useState(false);
  const [newStatus, setNewStatus] = useState<MedicationRecord["status"]>("active");
  const [timeInput, setTimeInput] = useState("");
  const [timeError, setTimeError] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [doseInput, setDoseInput] = useState("");
  const [nameError, setNameError] = useState("");
  const [doseError, setDoseError] = useState("");
  const [dayOption, setDayOption] = useState<DayOption>("non-specific");
  const [customDays, setCustomDays] = useState<string[]>([]);
  const [daysError, setDaysError] = useState("");

  const openAddModal = () => {
    setNewStatus("active");
    setTimeInput("");
    setTimeError("");
    setNameInput("");
    setDoseInput("");
    setNameError("");
    setDoseError("");
    setDayOption("non-specific");
    setCustomDays([]);
    setDaysError("");
    setIsAdding(true);
  };

  const toggleCustomDay = (day: string) => {
    setCustomDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    );
  };

  const addMedication = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nameMessage = nameInput.trim() ? "" : "Medication name is required.";
    const doseMessage = doseInput.trim() ? "" : "Medication dose is required.";
    setNameError(nameMessage);
    setDoseError(doseMessage);
    let hasError = Boolean(nameMessage || doseMessage);

    // Time and days only apply to active medications
    if (newStatus === "active") {
      const selectedDays = getSelectedDays(dayOption, customDays);
      let timeMessage = "";
      if (!timeInput.trim()) timeMessage = "Time is required.";
      else if (!parseTime(timeInput)) timeMessage = "Please enter a valid time, like 8:00 AM.";
      const daysMessage = dayOption === "custom" && selectedDays.length === 0 ? "Please select at least one day." : "";
      setTimeError(timeMessage);
      setDaysError(daysMessage);
      if (timeMessage || daysMessage) hasError = true;
    }
    if (hasError) return;

    /* =====NEEDS BACKEND: ADD MEDICATION=====
       POST_medication as form-data with medication_name, dosage, time, days and status
       ("active", "inactive" or "as needed"), expect 201 { "success": true, "mid": <number> }.
       Errors come back as 400 { "success": false, "error": "..." } and should be shown in the modal.
       const time = parseTime(timeInput) ?? "";                       // "HH:MM:SS"
       const days = getSelectedDays(dayOption, customDays).join(","); // "Monday,Tuesday", empty for non-specific
       const form = new FormData(event.currentTarget);
       form.append("time", time);
       form.append("days", days);
       form.append("status", newStatus);
       await addMedicationRequest(form);
       then reload the medication list */
    setIsAdding(false);
  };

  return (
  <AppLayout activeItem="Medications">
    <div className="medications-content">
      <header className="medications-page-heading">
        <h1>My Medications</h1>
        <p className="medications-intro">Track, organize, and manage your daily medication schedules.</p>
      </header>

      <div className="medications-toolbar">
        <button className="medications-filter-button" type="button" aria-pressed="true">All</button>
        <button className="medications-add-button" type="button" onClick={openAddModal}>
          <span aria-hidden="true">+</span> Add Medication
        </button>
      </div>

      <section className="medications-list" aria-label="Your medications">
        {isLoading && <p className="home-empty">Loading...</p>}
        {requestError && <p className="home-empty" role="alert">{requestError}</p>}
        {!isLoading && !requestError && medications.length === 0 && (
          <p className="home-empty">No medications. Add a medication to get started.</p>
        )}
        {medications.map((medication) => (
          <MedicationCard key={medication.mid} medication={medication} />
        ))}
      </section>
    </div>

    {isAdding && (
      <div className="medications-modal-backdrop">
        <section className="medications-modal" role="dialog" aria-modal="true" aria-labelledby="medications-modal-title">
          <button className="medications-modal-close" type="button" aria-label="Close dialog" onClick={() => setIsAdding(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="m5 5 14 14M19 5 5 19" />
            </svg>
          </button>
          <h2 id="medications-modal-title">New Medication</h2>
          <form className="medications-modal-form"           onSubmit={addMedication} noValidate>
            <label className="medications-modal-field" htmlFor="medication-name">
              <span>MEDICATION NAME</span>
                        <input id="medication-name" name="medication_name" type="text" placeholder="Lisinopril" value={nameInput} onChange={(event) => { setNameInput(event.target.value); setNameError(""); }} aria-invalid={Boolean(nameError)} />
                        {nameError && <p className="medications-modal-error" role="alert">{nameError}</p>}
                      </label>
                      <label className="medications-modal-field" htmlFor="medication-dose">
                        <span>MEDICATION DOSE</span>
                        <input id="medication-dose" name="dosage" type="text" placeholder="10 mg" value={doseInput} onChange={(event) => { setDoseInput(event.target.value); setDoseError(""); }} aria-invalid={Boolean(doseError)} />
                        {doseError && <p className="medications-modal-error" role="alert">{doseError}</p>}
                      </label>

            <div className="medications-modal-status" role="group" aria-label="Medication status">
              <button className={`medications-modal-status-button${newStatus === "active" ? " medications-modal-status-active" : ""}`} type="button" aria-pressed={newStatus === "active"} onClick={() => setNewStatus("active")}>Active</button>
              <button className={`medications-modal-status-button${newStatus === "inactive" ? " medications-modal-status-inactive" : ""}`} type="button" aria-pressed={newStatus === "inactive"} onClick={() => setNewStatus("inactive")}>Inactive</button>
              <button className={`medications-modal-status-button${newStatus === "as needed" ? " medications-modal-status-as-needed" : ""}`} type="button" aria-pressed={newStatus === "as needed"} onClick={() => setNewStatus("as needed")}>As Needed</button>
            </div>

            {newStatus === "active" && (
                    <>
                      <label className="medications-modal-field" htmlFor="medication-time">
                        <span>TIME</span>
                        <input
                          id="medication-time"
                          name="time"
                          type="text"
                          placeholder="12:30 AM"
                          value={timeInput}
                          onChange={(event) => {
                            const isDeleting = event.target.value.length < timeInput.length;
                            const formatted = formatTimeTyping(event.target.value, isDeleting);
                            if (formatted !== null) {
                              setTimeInput(formatted);
                              setTimeError("");
                            }
                          }}
                          onBlur={() => {
                            const parsedTime = parseTime(timeInput);
                            if (parsedTime) setTimeInput(formatTime(parsedTime));
                          }}
                          aria-invalid={Boolean(timeError)}
                        />
                        {timeError && <p className="medications-modal-error" role="alert">{timeError}</p>}
                      </label>

                      <fieldset className="medications-modal-fieldset">
                        <legend>DAYS</legend>
                        {dayOptions.map((option) => (
                          <label className="medications-choice" key={option.value}>
                            <input type="radio" name="day-option" checked={dayOption === option.value} onChange={() => setDayOption(option.value)} />
                            <span className="medications-choice-mark medications-choice-circle" aria-hidden="true" />
                            {option.label}
                          </label>
                        ))}
                        {dayOption === "custom" && (
                          <div className="medications-custom-days">
                            {weekDays.map((day) => (
                              <label className="medications-choice" key={day}>
                                <input
                                  type="checkbox"
                                  checked={customDays.includes(day)}
                                  onChange={() => toggleCustomDay(day)}
                                />
                                <span className="medications-choice-mark medications-choice-square" aria-hidden="true" />
                                {day}
                              </label>
                            ))}
                          </div>
                        )}
                        {daysError && <p className="medications-modal-error" role="alert">{daysError}</p>}
                      </fieldset>
                    </>
                  )}

            <div className="medications-modal-actions">
              <button className="medications-modal-submit" type="submit">
                <span aria-hidden="true">+</span> Add Medication
              </button>
            </div>
          </form>
        </section>
      </div>
    )}
  </AppLayout>
  );
};

export default MedicationsPage;
