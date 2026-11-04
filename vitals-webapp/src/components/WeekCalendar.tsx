import { useState } from "react";
import type { AppointmentRecord } from "../api";
import {
  addDays,
  formatClock,
  isSameDay,
  parseAppointmentDate,
  startOfWeek,
} from "../appointmentDates";

// The calendar card from Figma: month + year, ‹ › arrows, Monday-Sunday with today
// highlighted, and "Appointments this week" for the week being shown (#73, Story 4).
// It only reads the list the page already loaded, so it needs no backend of its own.

const dayLetters = ["M", "T", "W", "T", "F", "S", "S"];

const WeekCalendar = ({
  appointments,
}: {
  appointments: AppointmentRecord[];
}) => {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));

  const days = dayLetters.map((_, index) => addDays(weekStart, index));
  const weekEnd = addDays(weekStart, 7); // next Monday at midnight

  // "October 2026", or "Oct – Nov 2026" when the week crosses into the next month
  const lastDay = days[6];
  const monthLabel =
    weekStart.getMonth() === lastDay.getMonth()
      ? weekStart.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : `${weekStart.toLocaleDateString("en-US", { month: "short" })} - ${lastDay.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

  // The page list is already sorted soonest first, so this stays sorted
  const thisWeek = appointments
    .map((appointment) => ({
      appointment,
      date: parseAppointmentDate(appointment.appointment_date),
    }))
    .filter(({ date }) => date >= weekStart && date < weekEnd);

  return (
    <section
      className="home-card appointments-calendar"
      aria-label="Weekly calendar"
    >
      <div className="appointments-calendar-header">
        <h2>{monthLabel}</h2>
        <div className="appointments-calendar-arrows">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <ol className="appointments-calendar-days">
        {days.map((day, index) => {
          const isToday = isSameDay(day, today);
          return (
            <li
              key={day.toISOString()}
              className={isToday ? "appointments-calendar-today" : undefined}
              aria-current={isToday ? "date" : undefined}
            >
              <span>{dayLetters[index]}</span>
              <strong>{day.getDate()}</strong>
            </li>
          );
        })}
      </ol>

      <h3 className="appointments-calendar-subtitle">APPOINTMENTS THIS WEEK</h3>
      <ul className="appointments-calendar-list">
        {thisWeek.map(({ appointment, date }) => (
          <li key={appointment.aid}>
            <strong>{appointment.location || appointment.doctors_name}</strong>
            <span>
              {formatClock(date)}{" "}
              {date.toLocaleDateString("en-US", { weekday: "long" })} •{" "}
              {appointment.doctors_name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default WeekCalendar;
