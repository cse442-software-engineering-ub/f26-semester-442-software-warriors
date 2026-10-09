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
