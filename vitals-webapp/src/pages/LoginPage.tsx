import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SplitLayout from "../components/Layout";
import VitalLogo from "../assets/logo.png";
import RegisterIcon from "../assets/register_page_icon.png";
import { loginUser } from "../api";
import { FieldErrorMessage } from "../components/InputField";

interface LoginFormValues {
  email: string;
  password: string;
}

const INPUT_MAX_LENGTH: Record<keyof LoginFormValues, number> = {
  email: 254,
  password: 128,
};
const CHARACTER_LIMIT_ERROR = "Character limit exceeded.";

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
        navigate("/dashboard");
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
        left_css="login-left-panel"
        right_css="login-right-panel"
        spacer_css="hidden"
        mobileBrand
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
                  Sign in to view your vitals, medication schedule, and
                  upcoming appointments. All in one place.
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
          <div className="loginFormBox">
          <div className="login-heading">
            <h1 className="formTitle">Welcome Back</h1>
            <p className="formSubtitle login-subtitle">
              Enter your details to access your dashboard.
            </p>
          </div>

          {serverError && (
            <div
              id="server-error-banner"
              className="login-server-error"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="email" className="auth-field-label">
                EMAIL ADDRESS
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="example.address@email.com"
                autoComplete="email"
                aria-describedby={errors.email ? "email-error" : undefined}
                  className={`auth-field-input ${
                  errors.email ? "auth-field-input-error" : ""
                }`}
              />
              {errors.email && (
                <FieldErrorMessage id="email-error" message={errors.email} />
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="auth-field-label">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className={`login-password-input auth-field-input ${
                    errors.password ? "auth-field-input-error" : ""
                  }`}
                />
                <button
                  id="toggle-password"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-controls="password"
                  className="login-password-toggle"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.5-6.75 9.75-6.75S21.75 12 21.75 12s-3.5 6.75-9.75 6.75S2.25 12 2.25 12Z" />
                    <circle cx="12" cy="12" r="3" />
                    {showPassword && <path strokeLinecap="round" d="M3 3 21 21" />}
                  </svg>
                </button>
              </div>
              {errors.password && (
                <FieldErrorMessage id="password-error" message={errors.password} />
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="login-submit"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="login-actions">
            <Link
              to="/register"
              className="outlineBtn"
            >
              Create Account
            </Link>
            <Link
              to="/forgot-password"
              className="outlineBtn"
            >
              Forgot Password
            </Link>
          </div>

          <p className="helpNote login-help-note">
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
