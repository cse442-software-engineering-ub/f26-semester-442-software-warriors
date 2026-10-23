import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { addMedication as addMedicationRequest, deleteMedication, getMedications, updateMedication } from "../api";
import type { MedicationRecord } from "../api";
import "./MedicationsPage.css";

const isUnauthorized = (error: unknown) =>
  typeof error === "object" && error !== null && "status" in error && error.status === 401;

const getErrorMessage = (error: unknown) =>
  typeof error === "object" && error !== null && "error" in error && typeof error.error === "string"
    ? error.error
    : "Something went wrong. Please try again later.";

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

type DayOption = "all" | "weekdays" | "custom";

const dayOptions: { value: DayOption; label: string }[] = [
  { value: "all", label: "All Days" },
  { value: "weekdays", label: "Week Days" },
  { value: "custom", label: "Custom" },
];

// Days to save for the chosen option
const getSelectedDays = (option: DayOption, customDays: string[]) => {
  if (option === "all") return weekDays;
  if (option === "weekdays") return weekDays.slice(0, 5);
  return weekDays.filter((day) => customDays.includes(day));
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

const maxNameLength = 70;
const statusOptions: { value: MedicationRecord["status"]; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "as needed", label: "As Needed" },
];
const maxDoseLength = 15;

const MedicationCard = ({ medication, onEdit, onRemove }: { medication: MedicationRecord; onEdit: (medication: MedicationRecord) => void; onRemove: (mid: number) => void }) => (
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
        <button className="medications-edit-button" type="button" aria-label={`Edit ${medication.medication_name}`} onClick={() => onEdit(medication)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6" />
            <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z" />
          </svg>
        </button>
        <button className="medications-remove-button" type="button" onClick={() => onRemove(medication.mid)}>Remove</button>
      </div>
    </div>
  </article>
);

const MedicationsPage = () => {
  const navigate = useNavigate();
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load the user's medications, and again whenever reloadCount changes
  useEffect(() => {
    getMedications()
      .then((list) => {
        setMedications(list);
        setRequestError("");
      })
      .catch((error: unknown) => {
        if (isUnauthorized(error)) {
          navigate("/login", { replace: true });
          return;
        }
        setRequestError(getErrorMessage(error));
      })
      .finally(() => setIsLoading(false));
  }, [navigate, reloadCount]);

  const removeMedication = (mid: number) => {
    deleteMedication(mid)
      .then(() => setReloadCount((count) => count + 1))
      .catch((error: unknown) => {
        if (isUnauthorized(error)) {
          navigate("/login", { replace: true });
          return;
        }
        setRequestError(getErrorMessage(error));
      });
  };

  const [isAdding, setIsAdding] = useState(false);

  // Filter: statusFilter is what the list shows (all three = everything). The modal edits
  // filterDraft, and it only becomes the real filter when Submit is pressed.
  const [isFiltering, setIsFiltering] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MedicationRecord["status"][]>(["active", "inactive", "as needed"]);
  const [filterDraft, setFilterDraft] = useState(statusFilter);
  const visibleMedications = medications.filter((medication) => statusFilter.includes(medication.status));

  const openFilterModal = () => {
    setFilterDraft(statusFilter);
    setIsFiltering(true);
  };

  const toggleFilterStatus = (status: MedicationRecord["status"]) => {
    setFilterDraft((current) =>
      current.includes(status) ? current.filter((s) => s !== status) : [...current, status],
    );
  };

  const submitFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusFilter(filterDraft);
    setIsFiltering(false);
  };
  // mid of the medication being edited, or null when adding a new one
  const [editingMid, setEditingMid] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<MedicationRecord["status"]>("active");
  const [timeInput, setTimeInput] = useState("");
  const [timeError, setTimeError] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [doseInput, setDoseInput] = useState("");
  const [nameError, setNameError] = useState("");
  const [doseError, setDoseError] = useState("");
  const [dayOption, setDayOption] = useState<DayOption>("all");
  const [customDays, setCustomDays] = useState<string[]>([]);
  const [daysError, setDaysError] = useState("");

  const openAddModal = () => {
    setEditingMid(null);
    setNewStatus("active");
    setTimeInput("");
    setTimeError("");
    setNameInput("");
    setDoseInput("");
    setNameError("");
    setDoseError("");
    setDayOption("all");
    setCustomDays([]);
    setDaysError("");
    setSaveError("");
    setIsAdding(true);
  };

  // Same modal as adding, pre-filled with the medication's current values
  const openEditModal = (medication: MedicationRecord) => {
    openAddModal();
    setEditingMid(medication.mid);
    setNameInput(medication.medication_name);
    setDoseInput(medication.dosage);
    setNewStatus(medication.status);
    setTimeInput(medication.time ? formatTime(medication.time) : "");

    const saved = medication.days.split(",").map((day) => day.trim()).filter(Boolean);
    const isSame = (option: DayOption) => {
      const days = getSelectedDays(option, []);
      return saved.length === days.length && days.every((day) => saved.includes(day));
    };
    if (isSame("all")) setDayOption("all");
    else if (isSame("weekdays")) setDayOption("weekdays");
    else {
      setDayOption("custom");
      setCustomDays(saved);
    }
  };

  const toggleCustomDay = (day: string) => {
    setCustomDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    );
  };

  const addMedication = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let nameMessage = "";
    if (!nameInput.trim()) nameMessage = "Medication name is required.";
    else if (nameInput.length > maxNameLength) nameMessage = `Medication name cannot be longer than ${maxNameLength} characters.`;
    let doseMessage = "";
    if (!doseInput.trim()) doseMessage = "Medication dose is required.";
    else if (doseInput.length > maxDoseLength) doseMessage = `Medication dose cannot be longer than ${maxDoseLength} characters.`;
    setNameError(nameMessage);
    setDoseError(doseMessage);
    let hasError = Boolean(nameMessage || doseMessage);

    // Time and days apply to active and inactive medications
    if (newStatus !== "as needed") {
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

    setSaveError("");
    setIsSaving(true);
    const medicationData = {
      medication_name: nameInput,
      dosage: doseInput,
      // Time and days are only collected for active and inactive medications
      time: newStatus !== "as needed" ? parseTime(timeInput) ?? "" : "",
      days: newStatus !== "as needed" ? getSelectedDays(dayOption, customDays).join(",") : "",
      status: newStatus,
    };
    const request = editingMid === null
      ? addMedicationRequest(medicationData)
      : updateMedication({ mid: editingMid, ...medicationData });
    request
      .then(() => {
        setIsAdding(false);
        setReloadCount((count) => count + 1);
      })
      .catch((error: unknown) => {
        if (isUnauthorized(error)) {
          navigate("/login", { replace: true });
          return;
        }
        setSaveError(getErrorMessage(error));
      })
      .finally(() => setIsSaving(false));
  };

  return (
  <AppLayout activeItem="Medications">
    <div className="medications-content">
      <header className="medications-page-heading">
        <h1>My Medications</h1>
        <p className="medications-intro">Track, organize, and manage your daily medication schedules.</p>
      </header>

      <div className="medications-toolbar">
        <button className="medications-filter-button" type="button" aria-pressed={statusFilter.length < statusOptions.length} onClick={openFilterModal}>Filter</button>
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
        {!isLoading && !requestError && medications.length > 0 && visibleMedications.length === 0 && (
          <p className="home-empty">No medications match the selected filter.</p>
        )}
        {visibleMedications.map((medication) => (
          <MedicationCard key={medication.mid} medication={medication} onEdit={openEditModal} onRemove={removeMedication} />
        ))}
      </section>
    </div>

    {isFiltering && (
      <div className="medications-modal-backdrop">
        <section className="medications-modal medications-filter-modal" role="dialog" aria-modal="true" aria-labelledby="medications-filter-title">
          <button className="medications-modal-close" type="button" aria-label="Close dialog" onClick={() => setIsFiltering(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="m5 5 14 14M19 5 5 19" />
            </svg>
          </button>
          <h2 id="medications-filter-title">Filter Medications</h2>
          <form className="medications-modal-form" onSubmit={submitFilter}>
            <fieldset className="medications-modal-fieldset">
              {statusOptions.map((option) => (
                <label className="medications-choice" key={option.value}>
                  <input type="checkbox" checked={filterDraft.includes(option.value)} onChange={() => toggleFilterStatus(option.value)} />
                  <span className="medications-choice-mark medications-choice-square" aria-hidden="true" />
                  {option.label}
                </label>
              ))}
            </fieldset>
            <div className="medications-modal-actions">
              <button className="medications-modal-submit" type="submit">Submit</button>
            </div>
          </form>
        </section>
      </div>
    )}

    {isAdding && (
      <div className="medications-modal-backdrop">
        <section className="medications-modal" role="dialog" aria-modal="true" aria-labelledby="medications-modal-title">
          <button className="medications-modal-close" type="button" aria-label="Close dialog" onClick={() => setIsAdding(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="m5 5 14 14M19 5 5 19" />
            </svg>
          </button>
          <h2 id="medications-modal-title">{editingMid === null ? "New Medication" : "Edit Medication"}</h2>
          <form className="medications-modal-form"           onSubmit={addMedication} noValidate>
            <label className="medications-modal-field" htmlFor="medication-name">
              <span>MEDICATION NAME</span>
                        <input id="medication-name" name="medication_name" type="text" placeholder="Lisinopril" value={nameInput} onChange={(event) => { if (event.target.value.length > maxNameLength) { setNameError(`Medication name cannot be longer than ${maxNameLength} characters.`); return; } setNameInput(event.target.value); setNameError(""); }} aria-invalid={Boolean(nameError)} />
                        {nameError && <p className="medications-modal-error" role="alert">{nameError}</p>}
                      </label>
                      <label className="medications-modal-field" htmlFor="medication-dose">
                        <span>MEDICATION DOSE</span>
                        <input id="medication-dose" name="dosage" type="text" placeholder="10 mg" value={doseInput} onChange={(event) => { if (event.target.value.length > maxDoseLength) { setDoseError(`Medication dose cannot be longer than ${maxDoseLength} characters.`); return; } setDoseInput(event.target.value); setDoseError(""); }} aria-invalid={Boolean(doseError)} />
                        {doseError && <p className="medications-modal-error" role="alert">{doseError}</p>}
                      </label>

            <div className="medications-modal-status" role="group" aria-label="Medication status">
              <button className={`medications-modal-status-button${newStatus === "active" ? " medications-modal-status-active" : ""}`} type="button" aria-pressed={newStatus === "active"} onClick={() => setNewStatus("active")}>Active</button>
              <button className={`medications-modal-status-button${newStatus === "inactive" ? " medications-modal-status-inactive" : ""}`} type="button" aria-pressed={newStatus === "inactive"} onClick={() => setNewStatus("inactive")}>Inactive</button>
              <button className={`medications-modal-status-button${newStatus === "as needed" ? " medications-modal-status-as-needed" : ""}`} type="button" aria-pressed={newStatus === "as needed"} onClick={() => setNewStatus("as needed")}>As Needed</button>
            </div>

            {newStatus !== "as needed" && (
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
              {saveError && <p className="medications-modal-error" role="alert">{saveError}</p>}
              <button className="medications-modal-submit" type="submit" disabled={isSaving}>
                {editingMid === null ? <><span aria-hidden="true">+</span> Add Medication</> : "Save Changes"}
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
