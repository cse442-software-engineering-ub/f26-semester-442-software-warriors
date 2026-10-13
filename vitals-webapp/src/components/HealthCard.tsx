import React from "react";
import type { BpReading, Appointment, Medication } from "../api";


interface HealthCardProps {
    ariaLabel?: string
    emptyString: string
    type: "BPCard" | "MedicationCard" | "AppointmentCard"
    isLoading: boolean
    bloodPressureReading?: BpReading | null
    nextAppointment?: Appointment | null
    medication?: Medication | null
}

const HealthCard: React.FC<HealthCardProps> = ({ 
    emptyString='No blood pressure readings. Visit the Journal page to add a reading', 
    type='BPCard',
    isLoading,
    bloodPressureReading,
    nextAppointment,
    medication
}) => {
    if (type == 'BPCard') {
        // Badge colour for the status the server calculated (readings.php)
        const statusBadgeClass = (status: string) => {
        if (status === "Within range") return "home-status-badge";
        if (status === "Slightly elevated")
            return "home-status-badge home-status-badge-warn";
        return "home-status-badge home-status-badge-alert";
        };
        return (
          <div className="home-card home-bp-card">
            <span className="home-bp-label">Last Reading</span>
            {isLoading ? (
              <p className="home-empty" role="status">Loading...</p>
            ) : bloodPressureReading ? (
              <>
                <p className="home-bp-value">
                  {bloodPressureReading.systolic}/{bloodPressureReading.diastolic}
                  <span className="home-bp-unit">mmHg</span>
                </p>
                {bloodPressureReading.status && (
                  <span className={statusBadgeClass(bloodPressureReading.status)}>
                    {bloodPressureReading.status}
                  </span>
                )}
              </>
            ) : (
              <p className="home-empty">{emptyString}</p>
            )}
          </div>
        )
    }
    else if (type == 'MedicationCard') {
        return (
            <div className="home-card-list grid">
              {isLoading ? (
                <div className="home-card"><p className="home-empty" role="status">Loading...</p></div>
              ) : medication ? (
                  <article className="home-card home-medication-card flex items-center gap-3.5 p-2" key={`${medication.medication_name}-${medication.time}`}>
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
                    <div className="home-pill-box home-medication-time grid justify-items-center gap-1 rounded-lg bg-white text-center">
                      <span>TIME</span>
                      <strong>{medication.time}</strong>
                    </div>
                  </article>
              ) : (
                <div className="home-card"><p className="home-empty">No medications. Visit the Medications page to add a medication</p></div>
              )}
            </div>
        )
    }
    else if (type == 'AppointmentCard') {
        const splitAppointmentDate = (value: string) => {
            const separator = value.lastIndexOf(", ");
            if (separator === -1) return { date: value, time: "" };
            return { date: value.slice(0, separator), time: value.slice(separator + 2).toUpperCase() };
            };
        const appointmentTime = nextAppointment ? splitAppointmentDate(nextAppointment.appointment_date) : null;
        
        return (
            <div className="home-card-list grid gap-3">
              {isLoading ? (
                <div className="home-card"><p className="home-empty" role="status">Loading...</p></div>
              ) : nextAppointment && appointmentTime ? (
                <article className="home-card home-appointment-card flex items-center gap-3.5">
                  <div className="home-appointment-details">
                    <h3>{nextAppointment.doctors_name}</h3>
                    {nextAppointment.notes && <p>{nextAppointment.notes}</p>}
                  </div>
                  <div className="home-pill-box home-appointment-time grid justify-items-center gap-1 rounded-lg bg-white text-center">
                    <strong>{appointmentTime.date}</strong>
                    {appointmentTime.time && <span>{appointmentTime.time}</span>}
                  </div>
                </article>
              ) : (
                <div className="home-card"><p className="home-empty">{emptyString}</p></div>
              )}
            </div>
        )
    }
}

export default HealthCard;