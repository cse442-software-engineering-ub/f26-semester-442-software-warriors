// src/pages/RegisterPage.tsx
import React, { useState } from "react";
import SplitLayout from "../components/Layout";
import InputField from "../components/InputField";
import Button from "../components/Button";
import VitalLogo from "../assets/logo.png";
import RegisterIcon from "../assets/register_page_icon.png";
import type { RegisterFormData } from "../types";
import { registerUser } from "../api";

function mapBackendErrors(backendErrors: { [field: string]: string }) {
  const mapped: { [key: string]: string } = {};
  // The backend only knows one "name" field. Since our
  // form has "firstName" and "lastName", we need to map
  // the backend's "name" error to both of our fields.
  if (backendErrors.name) {
    mapped.firstName = backendErrors.name;
    mapped.lastName = backendErrors.name;
  }
  if (backendErrors.email) {
    mapped.email = backendErrors.email;
  }
  if (backendErrors.phone) {
    mapped.phoneNumber = backendErrors.phone;
  }
  if (backendErrors.password) {
    mapped.password = backendErrors.password;
  }
  return mapped;
}
const RegisterPage: React.FC = () => {
  //to make sets of data along with a boolean counterpart use the useState built in component/function
  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  //const [showPassword, setShowPassword] = useState(false);
  //const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  //allows for user to only type numbers when putting in their phone number
  //fills in the rest to follow the regex
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const phoneNumber = value.replace(/\D/g, "");

    // Format based on length
    if (phoneNumber.length === 0) return "";
    if (phoneNumber.length <= 3) return `(${phoneNumber}`;
    if (phoneNumber.length <= 6)
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  //e is the event, the type is specified after the ':'
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    let newValue = value;

    if (name == "phoneNumber") {
      newValue = formatPhoneNumber(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Email Regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone Regex validation
    const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid phone number";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one uppercase letter";
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one lowercase letter";
    } else if (!/\d/.test(formData.password)) {
      newErrors.password = "Password must contain at least one number";
    } else if (!/[!@#$%^&*]/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one special character";
    }

    if (formData.password != formData.confirmPassword) {
      newErrors.confirmPassword = "Password do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // all these consts are javascript/typescript code being created within the page
  // handleSubmit deals with what happens with the data when a submit button is clicked
  //const handleSubmit = (e: React.SubmitEvent) => {
  //  e.preventDefault()
  //  if (validateForm()) {
  //    console.log('Form submitted', formData) //debug /purposes
  //    alert('Registration successful')
  //  // need registration logic here (connect with backend)
  //  }
  //}

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGeneralError("");

    if (!validateForm()) {
      return; //client-side validation failed, do not proceed with submission
    }

    setIsSubmitting(true);

    try {
      await registerUser(formData);
      setSuccessMessage(
        "Thank you! Your account has been created successfully.",
      );
      // Redirect to login page or another page if needed
    } catch (err: any) {
      if (err.errors) {
        // backend found validation errors (442), map them to the form fields
        setErrors(mapBackendErrors(err.errors));
      } else if (err.error) {
        // backend returned a general error (500), display it
        setGeneralError(err.error);
      } else {
        setGeneralError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // the returns use HTML to return
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
            <h2 className="text-3xl font-bold text-gray-800 text-center">
              Create Account
            </h2>
            <h3 className="text-m font-bold text-gray-400 mb-8 text-center">
              Enter your details to set up your new account.
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="flex space-x-4">
                <InputField
                  label="First Name"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  required
                  error={errors.firstName}
                />
                <InputField
                  label="Last Name"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  required
                  error={errors.lastName}
                />
              </div>

              <InputField
                label="Phone Number"
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="(123) 345-5678"
                required
                isPhone={true}
                error={errors.phoneNumber}
              />

              <InputField
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john.doe@example.com"
                required
                error={errors.email}
              />

              <InputField
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                error={errors.password}
              />

              <InputField
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                error={errors.confirmPassword}
              />

              <Button
                type="submit"
                variant="primary"
                className={isSubmitting ? "opacity-60 cursor-not-allowed" : ""}
              >
                {isSubmitting ? "Creating account..." : "Register"}
              </Button>
              {successMessage && (
                <div className="mt-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                  <span className="font-bold">Thank you!</span>
                  {successMessage.replace("Thank you! ", "")}
                </div>
              )}
              {generalError && (
                <div className="mt-4 p-4 rounded-lg bg-red-50 text-red-600 text-sm">
                  <span className="font-bold">Something went wrong.</span>
                  {generalError.replace("Something went wrong. ", "")}
                </div>
              )}
            </form>

            {/* uncomment when login page and page routing is ready */}
            {/*<p className="text-center text-gray-600 mt-6">
                  Already have an account?{' '}
                  <a href="/login" className="text-blue-600 hover:underline">
                    Log in
                  </a>
                </p>*/}
          </div>
        }
      />
    </div>
  );
};

export default RegisterPage;
