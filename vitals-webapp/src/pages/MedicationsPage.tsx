import { useState } from "react";
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


 

  return (
  <AppLayout activeItem="Medications">
    <div className="medications-content">
      <header className="medications-page-heading">
        <h1>My Medications</h1>
        <p className="medications-intro">Track, organize, and manage your daily medication schedules.</p>
      </header>

      <div className="medications-toolbar">
        <button className="medications-filter-button" type="button" aria-pressed="true">All</button>
        <button className="medications-add-button" type="button">
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
  </AppLayout>
  );
};

export default MedicationsPage;
