import type { RegisterFormData } from "./types";

const API_BASE = (import.meta.env.VITE_API_URL ??
  "/CSE442/2026-Fall/cse-442ab/api") as string;

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginSuccessResponse {
  login: true;
}

export interface RegisterSuccess {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}

export interface RegisterFieldErrors {
  status: number;
  errors: { [field: string]: string };
}

export interface RegisterGeneralError {
  status: number;
  error: string;
}

export interface AccountInfo {
  id: number;
  name: string;
  phone: string;
  email: string;
  isCaregiver: boolean;
  relatedPersonName: string | null;
}

export type AccountUpdate = Pick<AccountInfo, "name" | "phone" | "email">;
export const ACCOUNT_UPDATED_EVENT = "vitals:account-updated";

// account.php reads URL-encoded POST fields from $_POST; keep these methods and field names aligned with that contract.
async function settingsRequest<T>(
  fileName: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}/${fileName}`, {
    ...options,
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw {
      status: response.status,
      error:
        typeof data?.error === "string"
          ? data.error
          : "Something went wrong. Please try again later.",
      errors: data?.errors,
    };
  }

  if (data?.error || data?.errors) {
    throw {
      status: response.status,
      error:
        typeof data?.error === "string"
          ? data.error
          : "Something went wrong. Please try again later.",
      errors: data.errors,
    };
  }

  return data as T;
}

export async function getAccount(): Promise<AccountInfo> {
  return settingsRequest<AccountInfo>("account.php");
}

export async function updateAccount(
  account: AccountUpdate,
): Promise<{ message: string }> {
  const params = new URLSearchParams();
  params.append("name", account.name);
  params.append("phone", account.phone);
  params.append("email", account.email);

  return settingsRequest("account.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: params.toString(),
  });
}

export async function deleteAccount(): Promise<void> {
  await settingsRequest<{ message: string }>("account.php", {
    method: "DELETE",
  });
}

export async function changeAccountPassword(
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const params = new URLSearchParams();
  params.append("current_password", oldPassword);
  params.append("new_password", newPassword);

  await settingsRequest<{ message: string }>("account.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: params.toString(),
  });
}

export async function loginUser(
  formData: LoginFormData,
): Promise<LoginSuccessResponse> {
  const params = new URLSearchParams();
  params.append("email", formData.email.trim());
  params.append("password", formData.password);

  const response = await fetch(`${API_BASE}/login.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    credentials: "include",
    body: params.toString(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw {
      status: response.status,
      error:
        typeof data?.error === "string"
          ? data.error
          : "Something went wrong. Please try again later.",
    };
  }

  if (data?.login === true) {
    return data as LoginSuccessResponse;
  }

  throw {
    status: response.status,
    error:
      typeof data?.error === "string"
        ? data.error
        : "Something went wrong. Please try again later.",
  };
}

// Forgot Password — Step 1: Send email
export async function forgotPassword(email: string) {
  const formData = new FormData();
  formData.append("email", email);

  const res = await fetch(`${API_BASE}/forgot_password.php`, {
    method: "POST",
    body: formData,
    credentials: "include", // required — backend uses PHP sessions
  });
  return res.json();
}

// Forgot Password — Step 2: Verify OTP
export async function verifyOtp(otp: string) {
  const formData = new FormData();
  formData.append("otp", otp);

  const res = await fetch(`${API_BASE}/verify_otp.php`, {
    method: "POST",
    body: formData,
    credentials: "include", // required — session must persist
  });
  return res.json();
}

// Forgot Password — Step 3: Reset password
export async function resetPassword(password: string, confirmPassword: string) {
  const formData = new FormData();
  formData.append("password", password);
  formData.append("confirmPassword", confirmPassword);

  const res = await fetch(`${API_BASE}/reset_password.php`, {
    method: "POST",
    body: formData,
    credentials: "include", // required — backend checks session for otp_verified
  });
  return res.json();
}

export async function registerUser(
  formData: RegisterFormData,
): Promise<RegisterSuccess> {
  // The backend has no idea what "firstName"  or
  // "lastName" are, it only understands one combined
  // "name" field. This is the translation step
  // nothing on Christian form changes, this just
  // builds the shape the backend actually expects.
  const name = `${formData.firstName.trim()} ${formData.lastName.trim()}`;

  // Christian's form displays "(716) 555-1234";
  // the backend's regex only accepts digists.
  // \D means "anything that is NOT a digit",
  // replacing every non-digit character with nothing
  // leaves just the raw numbers.
  const phone = formData.phoneNumber.replace(/\D/g, "");

  // comfirmPasword is not needed by the backend, so we don't send it.
  const response = await fetch(`${API_BASE}/register.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email: formData.email,
      phone,
      password: formData.password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw { status: response.status, ...data };
  }

  return data as RegisterSuccess;
}

// Logout (#53 backend, #56 frontend)
// 200 {"logout":true}  -> logged out
// 401                  -> there was no session anymore (already logged out), treat as done
// anything else        -> still logged in, so throw and let the button show an error
export async function logoutUser(): Promise<void> {
  const response = await fetch(`${API_BASE}/logout.php`, {
    method: "POST",
    credentials: "include", // sends the PHPSESSID cookie so the server knows which session to end
  });

  if (response.ok || response.status === 401) {
    return;
  }

  const data = await response.json().catch(() => ({}));
  throw {
    status: response.status,
    error:
      typeof data?.error === "string"
        ? data.error
        : "Couldn't log out. Please try again.",
  };
}

export interface AccountInfo {
  id: number;
  name: string;
  email: string;
  phone: string;
}

// Shape returned by homepage.php. Each section is null when the user has no data for it.
export interface BpReading {
  systolic: number;
  diastolic: number;
  status: string;
  recorded_at: string;
}

export interface Medication {
  medication_name: string;
  dosage: string;
  time: string; // already formatted by the backend, e.g. "8:00 AM"
  days: string;
}

export interface Appointment {
  doctors_name: string;
  appointment_date: string; // already formatted by the backend
  notes: string | null;
}

export interface HomepageData {
  success: true;
  bp_reading: BpReading | null;
  medications: Medication[] | null;
  next_appointment: Appointment | null;
  caregiver_info?: Pick<AccountInfo, "name" | "email" | "phone"> | null;
}

// GET homepage.php -> dashboard data (401 when not logged in)
export async function getHomepage(): Promise<HomepageData> {
  const response = await fetch(`${API_BASE}/homepage.php`, {
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.success !== true) {
    throw {
      status: response.status,
      error:
        typeof data?.error === "string"
          ? data.error
          : typeof data?.message === "string"
            ? data.message
            : "Unable to load your homepage.",
    };
  }

  return data as HomepageData;
}

// Add a blood pressure reading (POST readings.php)
// 201 {"reading": {...}}            -> saved; status is calculated by the server
// 400 {"errors": {field: message}}  -> show each message under its box
// 401                               -> not logged in
export interface ReadingInput {
  systolic: string;
  diastolic: string;
  pulse: string;
}

export interface SavedReading {
  rid: number;
  systolic: number;
  diastolic: number;
  pulse: number;
  status: string;
  recorded_at: string;
}

export async function addReading(input: ReadingInput): Promise<SavedReading> {
  const params = new URLSearchParams();
  params.append("systolic", input.systolic.trim());
  params.append("diastolic", input.diastolic.trim());
  params.append("pulse", input.pulse.trim());

  const response = await fetch(`${API_BASE}/readings.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    credentials: "include",
    body: params.toString(),
  });
  const data = await response.json().catch(() => ({}));
  const reading = data?.reading ?? data;

  if (!response.ok || !reading) {
    throw {
      status: response.status,
      error:
        typeof data?.error === "string"
          ? data.error
          : "Could not save your reading. Please try again.",
      errors: data?.errors,
    };
  }
  return reading as SavedReading;
}

export interface JournalReading {
  systolic: number;
  diastolic: number;
  pulse?: number;
  status: string;
  date_time: string;
}

export interface JournalAverages {
  systolic: number | null;
  diastolic: number | null;
  pulse?: number | null;
}

export interface JournalData {
  last_reading: JournalReading | null;
  averages: JournalAverages | null;
  readings: JournalReading[];
  caregiver_info: Pick<AccountInfo, "name" | "email" | "phone"> | null;
}

const averageValue = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeJournalAverages = (
  value: unknown,
): JournalAverages | null => {
  if (value === null || typeof value !== "object") return null;
  const averages = value as Record<string, unknown>;
  if (
    !("systolic" in averages) &&
    !("diastolic" in averages) &&
    !("pulse" in averages)
  ) {
    return null;
  }

  return {
    systolic: averageValue(averages.systolic),
    diastolic: averageValue(averages.diastolic),
    pulse: averageValue(averages.pulse),
  };
};

export async function getJournal(): Promise<JournalData> {
  const response = await fetch(`${API_BASE}/health_journal.php`, {
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));
  // health_journal.php returns bp_readings/recorded_at; keep supporting older overrides too.
  const rawReadings =
    data?.bp_readings !== undefined ? data.bp_readings : data?.readings;

  if (
    !response.ok ||
    typeof data !== "object" ||
    data === null ||
    (!Array.isArray(rawReadings) && rawReadings !== null)
  ) {
    throw {
      status: response.status,
      error:
        typeof data?.error === "string"
          ? data.error
          : typeof data?.message === "string"
            ? data.message
            : "Unable to load your journal.",
    };
  }

  const readings: JournalReading[] = (rawReadings ?? []).map(
    (reading: Record<string, unknown>) => ({
      systolic: Number(reading.systolic),
      diastolic: Number(reading.diastolic),
      ...(reading.pulse !== undefined ? { pulse: Number(reading.pulse) } : {}),
      status: String(reading.status ?? ""),
      date_time: String(reading.date_time ?? reading.recorded_at ?? ""),
    }),
  );
  const averages = normalizeJournalAverages(data.averages);
  const lastReading = data.last_reading
    ? {
        systolic: Number(data.last_reading.systolic),
        diastolic: Number(data.last_reading.diastolic),
        ...(data.last_reading.pulse !== undefined
          ? { pulse: Number(data.last_reading.pulse) }
          : {}),
        status: String(data.last_reading.status ?? ""),
        date_time: String(
          data.last_reading.date_time ?? data.last_reading.recorded_at ?? "",
        ),
      }
    : (readings[0] ?? null);

  return {
    last_reading: lastReading,
    averages,
    readings,
    caregiver_info: data?.caregiver_info ?? null,
  };
}

// One row from the medications table, as returned by GET medications.php
export interface MedicationRecord {
  mid: number;
  medication_name: string;
  dosage: string;
  time: string; // raw TIME value, e.g. "08:00:00"
  days: string; // comma separated weekdays, empty for as-needed medications
  status: "active" | "inactive";
  as_needed: boolean;
}

// Fields sent when adding or editing a medication
export type MedicationInput = Omit<MedicationRecord, "mid">;

// GET medications.php -> { success: true, medications: [...] } (401 when not logged in)
export async function getMedications(): Promise<MedicationRecord[]> {
  const data = await settingsRequest<{ medications?: MedicationRecord[] }>(
    "medications.php",
  );
  return data.medications ?? [];
}

// POST medications.php (form-data) -> 201 { success: true, mid }
export async function addMedication(input: MedicationInput): Promise<number> {
  const form = new FormData();
  form.append("medication_name", input.medication_name.trim());
  form.append("dosage", input.dosage.trim());
  form.append("time", input.time);
  form.append("days", input.days);
  form.append("status", input.status);
  form.append("as_needed", input.as_needed ? "true" : "false");

  const data = await settingsRequest<{ mid: number }>("medications.php", {
    method: "POST",
    body: form,
  });
  return data.mid;
}

// PUT medications.php (raw JSON) -> { success: true }
export async function updateMedication(
  medication: MedicationRecord,
): Promise<void> {
  await settingsRequest("medications.php", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(medication),
  });
}

// DELETE medications.php (raw JSON { mid }) -> { success: true }
export async function deleteMedication(mid: number): Promise<void> {
  await settingsRequest("medications.php", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mid }),
  });
}

// ---------- Appointments (#70 backend, #73 frontend) ----------
// One row from GET appointments.php. appointment_date is "YYYY-MM-DD HH:MM:SS".
export interface AppointmentRecord {
  aid: number;
  doctors_name: string;
  appointment_date: string;
  location: string | null;
  address: string | null;
}

// What the New Appointment popup sends (every box is text, the server checks it)
export interface AppointmentInput {
  doctor_name: string;
  month: string;
  day: string;
  year: string;
  time: string;
  location: string;
  address: string;
}

// GET appointments.php -> 200 { appointments: [...] }, soonest first (401 when not logged in)
export async function getAppointments(): Promise<AppointmentRecord[]> {
  const data = await settingsRequest<{ appointments?: AppointmentRecord[] }>(
    "appointments.php",
  );
  return data.appointments ?? [];
}

// POST appointments.php (form fields)
// 201 { appointment: {...} }          -> saved, returns the new row
// 400 { errors: { field: message } }  -> show each message under its box
export async function addAppointment(
  input: AppointmentInput,
): Promise<AppointmentRecord> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    params.append(key, value.trim());
  }

  const data = await settingsRequest<{ appointment: AppointmentRecord }>(
    "appointments.php",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: params.toString(),
    },
  );
  return data.appointment;
}

// DELETE appointments.php?aid=N -> 200 { deleted: true }, 404 when it is not yours or not found
export async function removeAppointment(aid: number): Promise<void> {
  await settingsRequest<{ deleted: true }>(`appointments.php?aid=${aid}`, {
    method: "DELETE",
  });
}
