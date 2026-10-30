// Date helpers shared by the Appointments page and its weekly calendar (#73).
// The backend sends appointment_date as "YYYY-MM-DD HH:MM:SS" in the server's local time.

// "2026-12-15 10:30:00" -> a Date in the browser's local time.
// (new Date("2026-12-15 10:30:00") is not reliable in every browser, so I built it by hand.)
export const parseAppointmentDate = (value: string) => {
  const [datePart, timePart = "00:00:00"] = value.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
};

// Midnight at the start of the given day
export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Monday of the week that contains date (the calendar weeks run Monday to Sunday)
export const startOfWeek = (date: Date) => {
  const monday = startOfDay(date);
  const daysSinceMonday = (monday.getDay() + 6) % 7; // getDay(): Sunday = 0, Monday = 1
  monday.setDate(monday.getDate() - daysSinceMonday);
  return monday;
};

export const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// -> "10:30 AM"
export const formatClock = (date: Date) =>
  date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

// -> "10:30 AM" for a form box. Built by hand on purpose: Chrome's toLocaleTimeString puts an
//    invisible special space (U+202F) before AM/PM, and appointments.php would reject it.
export const formatTimeForInput = (date: Date) => {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? "PM" : "AM"}`;
};

// -> "Today, October 24", "Tomorrow, October 25", "Tuesday, December 15",
//    and the year is added when it is not this year: "Friday, January 8, 2027"
export const formatDayLabel = (date: Date, now = new Date()) => {
  const monthDay = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
  if (isSameDay(date, now)) return `Today, ${monthDay}`;
  if (isSameDay(date, addDays(now, 1))) return `Tomorrow, ${monthDay}`;
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  return `${weekday}, ${monthDay}`;
};
