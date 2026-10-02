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

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormValues>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => {
        const nextErrors = { ...prev };
        delete nextErrors[name as keyof typeof nextErrors];
        return nextErrors;
      });
    }

    if (serverError) {
      setServerError("");
    }
  };

  const validateForm = () => {
    const nextErrors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!emailRegex.test(formData.email)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!formData.password) {
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
        left_css="lg:w-1/2 bg-blue-800 flex items-center justify-center lg:p-45 lg:h-screen"
        left_css_mobile="w-full sm:p-60 min-h-[500px]"
        right_css="lg:w-1/2 bg-white flex items-center justify-center lg:p-8 lg:h-screen"
        right_css_mobile="w-full sm:p-40 min-h-[500px]"
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
          <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
            <p className="mt-1 text-sm font-semibold text-gray-600">
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
              <label htmlFor="email" className="mb-2 block text-xs font-bold text-blue-800">
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
                className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
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
              <label htmlFor="password" className="mb-2 block text-xs font-bold text-blue-800">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className={`w-full rounded-lg border px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                    errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
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
              className="mt-2 w-full rounded-lg bg-blue-800 px-6 py-2.5 font-semibold text-white transition hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-2 flex gap-3">
            <Link
              to="/register"
              className="flex flex-1 items-center justify-center rounded-lg border border-blue-800 px-3 py-2.5 text-center text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
            >
              Create Account
            </Link>
            <button
              type="button"
              className="flex-1 rounded-lg border border-blue-800 px-3 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
            >
              Forgot Password
            </button>
          </div>

          <p className="mt-4 text-center text-xs font-semibold text-gray-600">
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
