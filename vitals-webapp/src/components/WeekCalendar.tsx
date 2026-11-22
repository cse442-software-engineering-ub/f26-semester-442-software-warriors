import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAppointmentsInRange } from "../api";
import type { AppointmentRecord } from "../api";
import {
  addDays,
  formatClock,
  isSameDay,
  parseAppointmentDate,
  startOfWeek,
  toDateKey,
} from "../appointmentDates";

// The calendar card from Figma: month + year, ‹ › arrows, Monday-Sunday with today
// highlighted, and "Appointments this week" for the week being shown (#73, Story 4).
// #133: it loads the shown week from appointments.php?from=&to= (#132), so past days get
// their appointments too. A dot marks each day with an appointment, and clicking a day
// lists only that day (click it again for the whole week).

const dayLetters = ["M", "T", "W", "T", "F", "S", "S"];

const isUnauthorized = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "status" in error &&
  error.status === 401;

// -> "Wednesday, December 9"
const formatLongDay = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

const WeekCalendar = ({ reloadKey }: { reloadKey: number }) => {
  const navigate = useNavigate();
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  // The last answer from the server and which request it was for, so an old week's dots
  // never show on a new week
  const [loaded, setLoaded] = useState<{
    request: string;
    range: string;
    appointments: AppointmentRecord[];
    error: string;
  } | null>(null);

  const days = dayLetters.map((_, index) => addDays(weekStart, index));
  const from = toDateKey(days[0]);
  const to = toDateKey(days[6]);
  const range = `${from}/${to}`;
  const request = `${range}#${reloadKey}#${retryCount}`;
  const isLoading = loaded?.request !== request;
  const loadError = isLoading ? "" : (loaded?.error ?? "");

  // Load the shown week again when the week changes, after an add/edit/remove (reloadKey)
  // and when "Try again" is clicked
  useEffect(() => {
    let isCurrent = true;
    const range = `${from}/${to}`;
    const request = `${range}#${reloadKey}#${retryCount}`;
    getAppointmentsInRange(from, to)
      .then((appointments) => {
        if (isCurrent) setLoaded({ request, range, appointments, error: "" });
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        if (isUnauthorized(error)) {
          navigate("/login", { replace: true });
          return;
        }
        setLoaded({
          request,
          range,
          appointments: [],
          error: "Could not load the calendar.",
        });
      });
    return () => {
      isCurrent = false;
    };
  }, [from, to, reloadKey, retryCount, navigate]);

  // "October 2026", or "Oct – Nov 2026" when the week crosses into the next month
  const lastDay = days[6];
  const monthLabel =
    weekStart.getMonth() === lastDay.getMonth()
      ? weekStart.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : `${weekStart.toLocaleDateString("en-US", { month: "short" })} - ${lastDay.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

  // The backend sends them soonest first, so the list stays sorted
  const thisWeek = (loaded?.range === range ? loaded.appointments : []).map(
    (appointment) => ({
      appointment,
      date: parseAppointmentDate(appointment.appointment_date),
    }),
  );
  const countOn = (day: Date) =>
    thisWeek.filter(({ date }) => isSameDay(date, day)).length;
  const shown = selectedDay
    ? thisWeek.filter(({ date }) => isSameDay(date, selectedDay))
    : thisWeek;

  const changeWeek = (step: number) => {
    setSelectedDay(null);
    setWeekStart(addDays(weekStart, step));
  };

  return (
    <section
      className="home-card appointments-calendar"
      aria-label="Weekly calendar"
      aria-busy={isLoading}
    >
      <div className="appointments-calendar-header">
        <h2>{monthLabel}</h2>
        <div className="appointments-calendar-arrows">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => changeWeek(-7)}
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
            onClick={() => changeWeek(7)}
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
          const isSelected = selectedDay !== null && isSameDay(day, selectedDay);
          const count = countOn(day);
          const className = [
            "appointments-calendar-day",
            isToday ? "appointments-calendar-today" : "",
            isSelected ? "appointments-calendar-selected" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <li key={day.toISOString()}>
              <button
                type="button"
                className={className}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${formatLongDay(day)}, ${count === 0 ? "no appointments" : count === 1 ? "1 appointment" : `${count} appointments`}`}
                onClick={() => setSelectedDay(isSelected ? null : day)}
              >
                <span>{dayLetters[index]}</span>
                <strong>{day.getDate()}</strong>
                <span
                  className={
                    count > 0
                      ? "appointments-calendar-dot"
                      : "appointments-calendar-dot appointments-calendar-dot-none"
                  }
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ol>

      <h3 className="appointments-calendar-subtitle">
        {selectedDay
          ? `APPOINTMENTS ON ${formatLongDay(selectedDay).toUpperCase()}`
          : "APPOINTMENTS THIS WEEK"}
      </h3>
      {loadError ? (
        <div className="appointments-calendar-message" role="alert">
          <p>{loadError}</p>
          <button
            type="button"
            className="appointments-calendar-retry"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Try again
          </button>
        </div>
      ) : isLoading && (loaded?.range !== range || loaded.error) ? (
        <p className="appointments-calendar-message" role="status">
          Loading...
        </p>
      ) : shown.length === 0 ? (
        <p className="appointments-calendar-message">
          {selectedDay
            ? `No appointments on ${formatLongDay(selectedDay)}.`
            : "No appointments this week."}
        </p>
      ) : (
        <ul className="appointments-calendar-list">
          {shown.map(({ appointment, date }) => (
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
      )}
    </section>
  );
};

export default WeekCalendar;
