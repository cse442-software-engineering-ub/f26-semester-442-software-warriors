import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SplitLayout from "../components/Layout";
import VitalLogo from "../assets/logo.png";
import RegisterIcon from "../assets/register_page_icon.png";
import { loginUser } from "../api";

interface LoginFormValues {
  email: string;
  password: string;
}

const INPUT_MAX_LENGTH: Record<keyof LoginFormValues, number> = {
  email: 254,
  password: 128,
};
const CHARACTER_LIMIT_ERROR = "Character limit exceeded";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormValues>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (!(name in INPUT_MAX_LENGTH)) return;

    const field = name as keyof LoginFormValues;
    const limit = INPUT_MAX_LENGTH[field];

    setFormData((prev) => ({ ...prev, [field]: value.slice(0, limit) }));

    setErrors((prev) => {
      const nextErrors = { ...prev };
      if (value.length > limit) {
        nextErrors[field] = CHARACTER_LIMIT_ERROR;
      } else {
        delete nextErrors[field];
      }
      return nextErrors;
    });

    if (serverError) {
      setServerError("");
    }
  };

  const validateForm = () => {
    const nextErrors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (errors.email === CHARACTER_LIMIT_ERROR) {
      nextErrors.email = CHARACTER_LIMIT_ERROR;
    } else if (!formData.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!emailRegex.test(formData.email)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (errors.password === CHARACTER_LIMIT_ERROR) {
      nextErrors.password = CHARACTER_LIMIT_ERROR;
    } else if (!formData.password) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await loginUser(formData);
      if (result.login) {
        navigate("/");
      }
    } catch (error: any) {
      const message = error?.error || "Something went wrong. Please try again later.";

      if (message === "Incorrect email or password.") {
        setErrors({ password: message });
        setFormData((prev) => ({ ...prev, password: "" }));
        return;
      }

      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <SplitLayout
        left_css="hidden lg:w-1/2 lg:bg-blue-800 lg:flex lg:items-center lg:justify-center lg:p-45 lg:h-screen"
        left_css_mobile="w-full sm:p-60 min-h-[500px]"
        right_css="lg:w-1/2 bg-white flex items-center justify-center lg:p-8 lg:h-screen"
        right_css_mobile="w-full min-h-screen px-7 py-10 lg:min-h-0"
        spacer_css="hidden lg:block p-10"
        leftContent={
          <div className="flex p-8">
            <div className="max-w-md w-full text-white">
              <img
                src={VitalLogo}
                alt="Vital Logo Illustration"
                className="w-full h-auto rounded-lg mb-6 p-6 justify-items-start"
              />
              <div className="text-center">
                <h1 className="text-3xl font-bold text-white mb-4">
                  Track and Manage Your Health, Effortlessly.
                </h1>
                <p className="text-gray-200">
                  Create an account to start logging your vitals, medications,
                  and appointment schedules. All in one place.
                </p>
              </div>
              <img
                src={RegisterIcon}
                alt="Blood Pressure 120/80 updated today and Lisinopril (10mg): Taken at 8:00 AM"
                className="p-4 mb-6"
              />
            </div>
          </div>
        }
        rightContent={
          <div className="mx-auto w-full max-w-[18rem] lg:max-w-md">
          <div
            role="img"
            aria-label="Vitals"
            className="mx-auto mb-16 h-[36px] w-[166px] bg-blue-800 lg:hidden"
            style={{
              maskImage: `url(${VitalLogo})`,
              maskPosition: "center",
              maskRepeat: "no-repeat",
              maskSize: "contain",
              WebkitMaskImage: `url(${VitalLogo})`,
              WebkitMaskPosition: "center",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
            }}
          />
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">Welcome Back</h1>
            <p className="mt-1 text-xs font-semibold text-gray-600 lg:text-sm">
              Enter your details to access your dashboard.
            </p>
          </div>

          {serverError && (
            <div
              id="server-error-banner"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="email" className="mb-2 block text-base font-bold leading-5 text-blue-800 lg:text-xs lg:leading-normal">
                EMAIL ADDRESS
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                aria-describedby={errors.email ? "email-error" : undefined}
                  className={`w-full rounded-xl border px-4 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 lg:rounded-lg lg:py-2.5 lg:text-sm ${
                  errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
                }`}
              />
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="mb-2 block text-base font-bold leading-5 text-blue-800 lg:text-xs lg:leading-normal">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className={`login-password-input w-full rounded-xl border px-4 py-2 pr-12 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 lg:rounded-lg lg:py-2.5 lg:text-sm ${
                    errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
                <button
                  id="toggle-password"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-controls="password"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.5-6.75 9.75-6.75S21.75 12 21.75 12s-3.5 6.75-9.75 6.75S2.25 12 2.25 12Z" />
                    <circle cx="12" cy="12" r="3" />
                    {showPassword && <path strokeLinecap="round" d="M3 3 21 21" />}
                  </svg>
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600">
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-xl bg-blue-800 px-6 py-2.5 text-base font-semibold text-white transition hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-lg"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-3 flex flex-col gap-3 lg:mt-2 lg:flex-row">
            <Link
              to="/register"
              className="flex flex-1 items-center justify-center rounded-xl border border-blue-800 px-3 py-2.5 text-center text-base font-semibold text-blue-800 transition hover:bg-blue-50 lg:rounded-lg lg:text-sm"
            >
              Create Account
            </Link>
            <button
              type="button"
              className="flex-1 rounded-xl border border-blue-800 px-3 py-2.5 text-base font-semibold text-blue-800 transition hover:bg-blue-50 lg:rounded-lg lg:text-sm"
            >
              Forgot Password
            </button>
          </div>

          <p className="mt-4 hidden text-center text-xs font-semibold text-gray-600 lg:block">
            Don&apos;t have an account yet? You can create one above, or reset your
            password if you&apos;re having trouble signing in.
          </p>
        </div>
      }
    />
    </div>
  );
};

export default LoginPage;
