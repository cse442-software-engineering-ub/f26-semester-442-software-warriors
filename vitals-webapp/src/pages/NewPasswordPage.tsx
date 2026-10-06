// src/pages/NewPasswordPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SplitLayout from "../components/Layout";
import InputField from "../components/InputField";
import Button from "../components/Button";
import VitalLogo from "../assets/logo.png";
import RegisterIcon from "../assets/register_page_icon.png";
import { resetPassword } from "../api";

const NewPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const [overflow, setOverflow] = useState({ password: false, confirmPassword: false });

  const limit = (
    field: "password" | "confirmPassword",
    raw: string,
    set: (v: string) => void
  ) => {
    const tooLong = raw.length > 254;
    set(tooLong ? raw.slice(0, 254) : raw);
    setOverflow((prev) => ({ ...prev, [field]: tooLong }));
    setErrors((prev) => ({
      ...prev,
      [field]: tooLong ? "Character limit exceeded." : undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (overflow.password || overflow.confirmPassword) {
      if (overflow.password) newErrors.password = "Character limit exceeded.";
      if (overflow.confirmPassword) newErrors.confirmPassword = "Character limit exceeded.";
      setErrors(newErrors);
      return;
    }

    if (!password) {
      newErrors.password = "This field is required";
    } else if (password.length < 8 || !/\d/.test(password)) {
      newErrors.password =
        "Password must be at least 8 characters, including at least one number";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "This field is required";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    
    try {
      const data = await resetPassword(password, confirmPassword);
      if (data.status === "success") {
            navigate("/login");
      } else {
        setErrors(data.message || data.error || "Failed to reset password.");
      }
    } catch {
      setErrors({ password: "Could not reach the server. Please try again." });
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <SplitLayout
        left_css="leftPanel"
        right_css="rightPanel"
        leftContent={
          <div className="leftWrap">
            <div className="leftBox">
              <img
                src={VitalLogo}
                alt="Vital Logo Illustration"
                className="logoImg"
              />
              <div className="infoText">
                <h1 className="leftTitle">
                  Track and Manage Your Health, Effortlessly.
                </h1>
                <p className="leftSubtitle">
                  Sign in to view your vitals, medication schedule, and
                  upcoming appointments. All in one place.
                </p>
              </div>
              <img
                src={RegisterIcon}
                alt="Blood Pressure 120/80 updated today and Lisinopril (10mg): Taken at 8:00 AM"
                className="previewImg"
              />
            </div>
          </div>
        }
        rightContent={
          <div className="formBox">
            <h2 className="formTitle">Set New Password</h2>
            <h3 className="formSubtitle">
              Please fill in your new password bellow.
            </h3>
            <form onSubmit={handleSubmit} noValidate>
              <InputField
                label="New Password"
                type="password"
                name="password"
                value={password}
                onChange={(e) => limit("password", e.target.value, setPassword)}
                error={errors.password}
              />

              <InputField
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => limit("confirmPassword", e.target.value, setConfirmPassword)}
                error={errors.confirmPassword}
              />

              <Button type="submit" variant="primary" className="submitBtn">
                Set Password
              </Button>
            </form>

            <p className="helpNote">
              Create a new password for your account. Use at least 8
              characters, including at least one number.
            </p>
          </div>
        }
      />
    </div>
  );
};

export default NewPasswordPage;
