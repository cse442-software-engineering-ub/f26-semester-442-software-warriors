import type { RegisterFormData } from "./types";

const API_BASE = import.meta.env.VITE_API_URL as string;

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
