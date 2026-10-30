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
          if (status === "Within range" || status === "Normal") {
            return "home-status-badge";
          }
          if (status === "Slightly elevated") {
            return "home-status-badge home-status-badge-warn";
          }
          return "home-status-badge home-status-badge-alert";
        };
        const readingStatus =
          bloodPressureReading?.status?.toLowerCase() === "normal"
            ? "Within range"
            : bloodPressureReading?.status;
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
                  {readingStatus && (
                    <span className={statusBadgeClass(readingStatus)}>
                      {readingStatus}
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
          <article className="home-card home-dashboard-card home-medication-card">
            {isLoading ? (
              <p className="home-empty" role="status">Loading...</p>
            ) : medication ? (
              <div className="home-dashboard-card-content">
                <span className="home-dashboard-card-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5.2 14.8 9.6-9.6a4.2 4.2 0 0 1 5.9 5.9l-9.6 9.6a4.2 4.2 0 0 1-5.9-5.9Z" />
                    <path d="m8.2 17.8 9.6-9.6" />
                  </svg>
                </span>
                <div className="home-dashboard-card-details home-medication-details">
                  <h3>{medication.medication_name}</h3>
                  <p>{medication.dosage}</p>
                  {medication.days && (
                    <p className="home-dashboard-card-schedule">
                      {medication.days.split(",").map((day) => day.trim().slice(0, 3)).join(", ")}
                    </p>
                  )}
                </div>
                <div className="home-dashboard-card-meta home-medication-time">
                  <span>TIME</span>
                  <strong>{medication.time}</strong>
                </div>
              </div>
            ) : (
              <p className="home-empty">{emptyString}</p>
            )}
          </article>
        )
    }
    else if (type == 'AppointmentCard') {
        const splitAppointmentDate = (value: string) => {
            const separator = value.lastIndexOf(", ");
            if (separator === -1) return { date: value, time: "" };
            const formattedDate = value.slice(0, separator);
            const time = value.slice(separator + 2).toUpperCase();
            const parsedDate = new Date(formattedDate.replace(/(\d+)(st|nd|rd|th)/i, "$1"));
            if (Number.isNaN(parsedDate.getTime())) {
              return { date: formattedDate, time };
            }
            const today = new Date();
            const dateOnly = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            const dayDifference = Math.round((dateOnly(parsedDate) - dateOnly(today)) / 86400000);
            const dateLabel = dayDifference === 0
              ? `Today, ${parsedDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
              : dayDifference === 1
                ? `Tomorrow, ${parsedDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
                : formattedDate.replace(/(\d+)(st|nd|rd|th)/i, "$1");
            return { date: dateLabel, time };
            };
        const appointmentTime = nextAppointment ? splitAppointmentDate(nextAppointment.appointment_date) : null;
        
        return (
          <article className="home-card home-dashboard-card home-appointment-card">
            {isLoading ? (
              <p className="home-empty" role="status">Loading...</p>
            ) : nextAppointment && appointmentTime ? (
              <div className="home-dashboard-card-content">
                <span className="home-dashboard-card-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3.5" y="5" width="17" height="16" rx="2" />
                    <path d="M7.5 3v4M16.5 3v4M3.5 10h17" />
                    <path d="m9 15 2 2 4-4" />
                  </svg>
                </span>
                <div className="home-dashboard-card-details home-appointment-details">
                  <h3>{nextAppointment.doctors_name}</h3>
                  {nextAppointment.notes && <p>{nextAppointment.notes}</p>}
                </div>
                <div className="home-dashboard-card-meta home-appointment-time">
                  <strong>{appointmentTime.date}</strong>
                  {appointmentTime.time && <span>{appointmentTime.time}</span>}
                </div>
              </div>
            ) : (
              <p className="home-empty">{emptyString}</p>
            )}
          </article>
        )
    }
}

export default HealthCard;